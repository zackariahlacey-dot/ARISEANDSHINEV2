"use server";

/**
 * Creates a Stripe Checkout Session for a single split-tender payment.
 * Called from /pay/split/[token] when the recipient hits "Pay". The
 * webhook resolves the resulting checkout.session.completed to this
 * split row via metadata.split_id, stamps paid_at, and (once every
 * split for the booking is paid) marks the booking's aggregate paid_at.
 */

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/app/actions/logError";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function createSplitCheckout(params: {
  payToken: string;
  email?:   string; // optional override — recipient can correct on the pay page
}): Promise<{ url: string } | { error: string }> {
  const { payToken, email: enteredEmail } = params;
  if (!payToken) return { error: "Invalid payment link." };

  try {
    const supabase = createAdminClient();

    const { data: split } = await supabase
      .from("booking_split_payments")
      .select("id, booking_id, recipient_email, recipient_name, amount, status")
      .eq("pay_token", payToken)
      .maybeSingle();

    if (!split) return { error: "Payment link not found." };
    if (split.status === "paid")      return { error: "This split has already been paid." };
    if (split.status === "cancelled") return { error: "This payment link has been cancelled." };
    if (Number(split.amount) <= 0)    return { error: "Invalid split amount." };

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, service_name, customer_name, vehicle_year, vehicle_make, vehicle_model, booking_date, booking_time, status")
      .eq("id", split.booking_id)
      .maybeSingle();
    if (!booking) return { error: "Booking not found." };
    if (booking.status === "cancelled") return { error: "This booking has been cancelled." };

    // Prefer the entered email so a recipient can override a typo the
    // admin made. Fall back to what admin assigned.
    let receiptEmail = (enteredEmail ?? "").trim().toLowerCase() || split.recipient_email;
    if (receiptEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail)) {
      return { error: "Please enter a valid email address." };
    }
    // Persist any override — makes the invoice trail match the actual payer.
    if (enteredEmail && receiptEmail !== split.recipient_email) {
      await supabase
        .from("booking_split_payments")
        .update({ recipient_email: receiptEmail })
        .eq("id", split.id);
    }

    const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinedetailing.com").replace(/\/$/, "");
    const veh = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ");
    const amt = Number(split.amount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amt * 100),
          product_data: {
            name: booking.service_name ?? "Detailing Service",
            description: [
              `Split payment for ${booking.customer_name ?? "detail"}`,
              veh || null,
              booking.booking_date ? `Service date: ${booking.booking_date}` : null,
            ].filter(Boolean).join(" · ") || undefined,
          },
        },
        quantity: 1,
      }],
      customer_email: receiptEmail || undefined,
      metadata: {
        source:     "split_payment",
        split_id:   split.id,
        booking_id: split.booking_id,
        pay_token:  payToken,
      },
      success_url: `${origin}/pay/split/${encodeURIComponent(payToken)}/success`,
      cancel_url:  `${origin}/pay/split/${encodeURIComponent(payToken)}`,
      expires_at:  Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });

    if (!session.url) {
      logError({
        type: "payment_failure",
        source: "createSplitCheckout/no_url",
        message: "Stripe returned a session with no URL",
        details: { splitId: split.id, bookingId: split.booking_id, amount: amt },
      });
      return { error: "Could not create checkout session." };
    }

    // Store the stripe_session_id early so we can reconcile in the webhook
    // even if the customer never returns.
    await supabase
      .from("booking_split_payments")
      .update({ stripe_session_id: session.id })
      .eq("id", split.id);

    return { url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create checkout.";
    console.error("[createSplitCheckout]", err);
    logError({
      type: "payment_failure",
      source: "createSplitCheckout",
      message: msg,
      details: { payToken },
    });
    return { error: msg };
  }
}
