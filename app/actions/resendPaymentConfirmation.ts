"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPaymentReceivedEmails } from "@/lib/email";

/**
 * Manually re-send the payment-received email pair for a booking that was
 * paid via the Stripe payment link but where the original webhook-triggered
 * send failed (or was never recorded). Admin-only.
 *
 * Looks at the booking's total_price + the recorded tip (if any) to
 * reconstruct the same amounts the webhook would have sent. If the owner
 * email succeeds, marks payment_received_email_sent_at so the system
 * stops flagging it as failed.
 */
export async function resendPaymentConfirmation(bookingId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  // Auth — require admin
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  // Check admin role (matches the layout gate)
  const { data: meRow } = await admin
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminEmail =
    !!user.email &&
    (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey04@gmail.com")
      .toLowerCase()
      .split(",")
      .map(s => s.trim())
      .includes(user.email.toLowerCase());
  const isAdmin = (meRow as { role?: string } | null)?.role === "admin" || isAdminEmail;
  if (!isAdmin) return { ok: false, error: "Admin only." };

  // Pull the booking
  const { data: b } = await admin
    .from("bookings")
    .select("id, customer_name, customer_email, customer_phone, service_name, vehicle_size, vehicle_make, vehicle_model, vehicle_year, booking_date, booking_time, total_price, service_address, tip_cents, stripe_checkout_session_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };

  if (!(b as any).stripe_checkout_session_id) {
    return { ok: false, error: "This booking was not paid through Stripe." };
  }

  const baseAmount = Number((b as any).total_price) || 0;
  const tipAmount  = Number((b as any).tip_cents ?? 0) / 100;
  const totalPaid  = baseAmount + tipAmount;

  const result = await sendPaymentReceivedEmails({
    bookingId:      (b as any).id,
    customerName:   (b as any).customer_name  ?? "",
    customerEmail:  (b as any).customer_email ?? "",
    customerPhone:  (b as any).customer_phone ?? undefined,
    serviceName:    (b as any).service_name   ?? "Detailing Service",
    baseAmount,
    tipAmount,
    totalPaid,
    vehicleYear:    (b as any).vehicle_year   ?? undefined,
    vehicleMake:    (b as any).vehicle_make   ?? undefined,
    vehicleModel:   (b as any).vehicle_model  ?? undefined,
    vehicleSize:    (b as any).vehicle_size   ?? undefined,
    bookingDate:    (b as any).booking_date   ?? "",
    bookingTime:    (b as any).booking_time   ?? "",
    serviceAddress: (b as any).service_address || undefined,
  });

  if (result.ownerSent) {
    await admin
      .from("bookings")
      .update({
        payment_received_email_sent_at: new Date().toISOString(),
        payment_received_email_last_error: null,
      })
      .eq("id", bookingId);
    try {
      await admin.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "resend_payment_confirmation",
        target_table: "bookings",
        target_id: bookingId,
        payload: { totalPaid, tipAmount },
      });
    } catch {}
    return { ok: true };
  }

  return { ok: false, error: result.error ?? "Email send failed." };
}

/**
 * Returns the list of paid-but-unemailed bookings — surfaced on the admin
 * Today screen as a "needs attention" widget so failed emails don't sit
 * silently.
 */
export async function listPaidBookingsMissingEmail(): Promise<Array<{
  id: string;
  customerName: string;
  totalPrice: number;
  bookingDate: string;
  failedAt: string | null;
  lastError: string | null;
}>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id, customer_name, total_price, booking_date, payment_received_email_failed_at, payment_received_email_last_error")
    .not("stripe_checkout_session_id", "is", null)
    .is("payment_received_email_sent_at", null)
    .order("payment_received_email_failed_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((b: any) => ({
    id: b.id,
    customerName: b.customer_name ?? "—",
    totalPrice: Number(b.total_price) || 0,
    bookingDate: b.booking_date,
    failedAt: b.payment_received_email_failed_at,
    lastError: b.payment_received_email_last_error,
  }));
}
