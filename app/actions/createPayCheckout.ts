"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function createPayCheckout(params: {
  bookingId: string;
  tipAmount: number;
}): Promise<{ url: string } | { error: string }> {
  const { bookingId, tipAmount } = params;

  try {
    const supabase = createAdminClient();
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, service_name, total_price, customer_name, customer_email, vehicle_year, vehicle_make, vehicle_model, vehicle_size, booking_date, booking_time, status")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) return { error: "Booking not found." };
    if (booking.status === "cancelled") return { error: "This booking has been cancelled." };

    const base = Number(booking.total_price) || 0;
    if (base <= 0) return { error: "Invalid booking amount." };

    const tip = Math.max(0, Math.round(tipAmount * 100)) / 100;
    const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinevt.com").replace(/\/$/, "");

    const vehicleStr = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ");

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(base * 100),
          product_data: {
            name: booking.service_name ?? "Detailing Service",
            description: [
              vehicleStr || null,
              booking.booking_date ? `Service date: ${booking.booking_date}` : null,
            ].filter(Boolean).join(" · ") || undefined,
          },
        },
        quantity: 1,
      },
    ];

    if (tip > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: Math.round(tip * 100),
          product_data: {
            name: "Tip — Thank you!",
            description: "Tips are never expected and always deeply appreciated.",
          },
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: booking.customer_email || undefined,
      metadata: {
        booking_id: bookingId,
        source: "payment_page",
        tip_amount: String(tip),
      },
      success_url: `${origin}/pay/${bookingId}/success`,
      cancel_url: `${origin}/pay/${bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    });

    if (!session.url) return { error: "Failed to create checkout session." };
    return { url: session.url };
  } catch (err) {
    console.error("[createPayCheckout]", err);
    return { error: err instanceof Error ? err.message : "Failed to create checkout." };
  }
}
