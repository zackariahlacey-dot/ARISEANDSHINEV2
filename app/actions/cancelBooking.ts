"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingCancellationEmails } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function cancelBooking(bookingId: string): Promise<{
  success: boolean;
  error?: string;
  refunded?: boolean;
}> {
  if (!bookingId?.trim()) {
    return { success: false, error: "Booking ID is required." };
  }

  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, booking_time, status, total_price, user_id, stripe_checkout_session_id, customer_name, customer_email, service_name, profiles(first_name, last_name, email), services(name)"
    )
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("[cancelBooking] fetch:", fetchError);
    return { success: false, error: "Booking not found." };
  }

  if (booking.status === "cancelled") {
    return { success: false, error: "This booking is already cancelled." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (updateError) {
    console.error("[cancelBooking] update:", updateError);
    return { success: false, error: updateError.message };
  }

  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const customerName =
    (booking.customer_name as string | null) ??
    (profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Customer" : "Customer");
  const customerEmail =
    (booking.customer_email as string | null) ??
    (profile?.email ?? "");
  const bookingTime = booking.booking_time
    ? new Date(`1970-01-01T${booking.booking_time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const serviceName = (service as { name?: string } | null)?.name ?? "Appointment";

  await sendBookingCancellationEmails({
    customerName,
    customerEmail,
    bookingDate: booking.booking_date,
    bookingTime,
    serviceName,
  });

  // Issue Stripe refund if this was a Pay Now booking
  let refunded = false;
  const sessionId = booking.stripe_checkout_session_id as string | null;
  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      if (paymentIntentId) {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        refunded = true;
      }
    } catch (refundErr) {
      // Log but don't block — booking is already cancelled, admin can refund manually
      console.error("[cancelBooking] Stripe refund failed:", refundErr);
    }
  }

  return { success: true, refunded };
}
