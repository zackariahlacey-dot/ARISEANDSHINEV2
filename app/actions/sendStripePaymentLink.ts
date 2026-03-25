"use server";

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const SIZE_LABELS: Record<string, string> = {
  compact: "Compact",
  sedan: "Sedan / Coupe",
  suv: "SUV / Crossover",
  truck: "Truck / Van",
};

export async function sendStripePaymentLink(bookingId: string, booking: {
  serviceName: string;
  totalPrice: number;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleSize?: string;
  bookingDate: string;
  bookingTime: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<{ url: string } | { error: string }> {
  try {
    const {
      serviceName,
      totalPrice,
      vehicleYear = "",
      vehicleMake = "",
      vehicleModel = "",
      vehicleSize = "",
      bookingDate,
      bookingTime,
      customerEmail,
    } = booking;

    if (!totalPrice || totalPrice <= 0) {
      return { error: "Invalid price for this booking." };
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(totalPrice * 100),
            product_data: {
              name: serviceName,
              description: [
                vehicleYear && vehicleMake && vehicleModel
                  ? `${vehicleYear} ${vehicleMake} ${vehicleModel}`
                  : null,
                vehicleSize ? (SIZE_LABELS[vehicleSize] ?? vehicleSize) : null,
                `${bookingDate} at ${bookingTime}`,
              ]
                .filter(Boolean)
                .join(" · "),
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      metadata: {
        bookingId,
        source: "admin_payment_link",
      },
      success_url: `${origin}/admin/schedule?payment=success`,
      cancel_url: `${origin}/admin/schedule?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    });

    return { url: session.url! };
  } catch (err) {
    console.error("[sendStripePaymentLink]", err);
    return { error: err instanceof Error ? err.message : "Failed to create payment link." };
  }
}
