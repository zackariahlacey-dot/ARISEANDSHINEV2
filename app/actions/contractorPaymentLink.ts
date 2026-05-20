"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStripePaymentLink, getPaymentLinkUrl } from "@/app/actions/sendStripePaymentLink";

export type PaymentLinkChannel = "email" | "sms";

export type SendContractorPaymentLinkResult =
  | { ok: true; url: string; emailSent: boolean; smsBody: string; smsHref: string }
  | { ok: false; error: string };

/**
 * Contractor-triggered "send payment link" — fires from the Job Execution
 * screen after Complete. The contractor picks Email or SMS:
 *
 *   email: full HTML invoice email via Resend (existing flow).
 *   sms:   we never message customers directly from the platform — instead
 *          we return an `sms:` URI with the link pre-typed so the
 *          contractor's phone Messages app opens with a ready-to-send
 *          text in the customer's name. This keeps the contractor's
 *          personal number out of the loop (the link itself routes back
 *          to /pay/[bookingId]) without us paying for Twilio.
 *
 * Validation:
 *   - Caller must be the assigned contractor for the booking
 *   - Job must be Complete (job_completed_at not null) — we don't want
 *     contractors sending a payment link before the work is finished
 *   - Returns the same URL regardless of channel so a single test
 *     transaction works for both flows
 */
export async function sendContractorPaymentLink(
  bookingId: string,
  channel: PaymentLinkChannel,
): Promise<SendContractorPaymentLinkResult> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, assigned_to, status, customer_name, customer_email, customer_phone, service_name, vehicle_year, vehicle_make, vehicle_model, vehicle_size, booking_date, booking_time, total_price, job_completed_at, payment_link_sent_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  if ((b as any).assigned_to !== user.id) {
    return { ok: false, error: "This job isn't assigned to you." };
  }
  if ((b as any).status === "cancelled") {
    return { ok: false, error: "This booking is cancelled." };
  }
  if (!(b as any).job_completed_at) {
    return { ok: false, error: "Mark the job complete before sending the payment link." };
  }

  const url = await getPaymentLinkUrl(bookingId);
  const totalPrice = Number((b as any).total_price) || 0;
  const firstName = (((b as any).customer_name as string) ?? "there").trim().split(/\s+/)[0] ?? "there";
  const smsBody = `Hi ${firstName}, your detail is done. Pay + add an optional tip here: ${url} — Arise & Shine VT`;
  const smsHref = (b as any).customer_phone
    ? `sms:${String((b as any).customer_phone).replace(/\D/g, "")}?&body=${encodeURIComponent(smsBody)}`
    : `sms:?&body=${encodeURIComponent(smsBody)}`;

  let emailSent = false;
  if (channel === "email") {
    const email = ((b as any).customer_email as string | null)?.trim();
    if (!email) {
      return { ok: false, error: "No email on file — try SMS instead." };
    }
    const result = await sendStripePaymentLink(bookingId, {
      serviceName:    (b as any).service_name   ?? "Detailing Service",
      totalPrice,
      vehicleYear:    (b as any).vehicle_year   ?? "",
      vehicleMake:    (b as any).vehicle_make   ?? "",
      vehicleModel:   (b as any).vehicle_model  ?? "",
      vehicleSize:    (b as any).vehicle_size   ?? "",
      bookingDate:    (b as any).booking_date   ?? "",
      bookingTime:    (b as any).booking_time   ?? "",
      customerEmail:  email,
      customerName:   (b as any).customer_name  ?? undefined,
    });
    if ("error" in result) return { ok: false, error: result.error };
    emailSent = result.emailSent;
  }

  // Stamp on the booking so admin + dashboard can show "sent X minutes ago"
  await admin
    .from("bookings")
    .update({
      payment_link_url:     url,
      payment_link_sent_at: new Date().toISOString(),
      payment_link_method:  channel,
    })
    .eq("id", bookingId);

  // Audit
  try {
    await admin.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "contractor_send_payment_link",
      target_table: "bookings",
      target_id: bookingId,
      payload: { channel, total: totalPrice },
    });
  } catch {}

  return { ok: true, url, emailSent, smsBody, smsHref };
}
