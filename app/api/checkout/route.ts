import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// ─── Stripe client ────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// ─── Vehicle size label for the line-item description ─────────────────────────
const SIZE_LABELS: Record<string, string> = {
  compact: "Compact",
  sedan: "Sedan / Coupe",
  suv: "SUV / Crossover",
  truck: "Truck / Van",
};

// ─── POST /api/checkout ────────────────────────────────────────────────────────
//
// Accepts the full BookingPayload from the modal, creates a Stripe Checkout
// Session and returns { url } so the client can redirect immediately.
// No Supabase writes happen here — fulfillment is handled by a webhook
// (app/api/webhooks/stripe/route.ts) once payment is confirmed.
//
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      serviceId,
      serviceName,
      totalPrice,
      vehicleSize,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      bookingDate,
      bookingTime,
      serviceAddress = "",
      name = "",
      phone = "",
      email = "",
      notes = "",
    } = body as {
      serviceId: string;
      serviceName: string;
      totalPrice: number;
      vehicleSize: string;
      vehicleYear: string;
      vehicleMake: string;
      vehicleModel: string;
      bookingDate: string;
      bookingTime: string;
      serviceAddress?: string;
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    };

    // Guard: must have a positive dollar amount
    if (!totalPrice || totalPrice <= 0) {
      return NextResponse.json(
        { error: "Invalid service price." },
        { status: 400 }
      );
    }

    // Derive the site origin from the request so the route works in both
    // development (localhost:3000) and production without extra env vars.
    const origin =
      req.headers.get("origin") ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            // Stripe amounts are in cents
            unit_amount: Math.round(totalPrice * 100),
            product_data: {
              name: serviceName,
              description: [
                `${vehicleYear} ${vehicleMake} ${vehicleModel}`,
                SIZE_LABELS[vehicleSize] ?? vehicleSize,
                `${bookingDate} at ${bookingTime}`,
              ].join(" · "),
            },
          },
          quantity: 1,
        },
      ],

      // Pre-fill the customer email on the Stripe checkout page
      customer_email: email || undefined,

      // ── Metadata: everything the webhook needs to fulfill the booking ─────
      // Stripe metadata values must be strings and ≤ 500 chars each.
      metadata: {
        serviceId,
        serviceName: serviceName.slice(0, 499),
        totalPrice: String(totalPrice),
        vehicleSize,
        vehicleYear,
        vehicleMake: vehicleMake.slice(0, 100),
        vehicleModel: vehicleModel.slice(0, 100),
        bookingDate,
        bookingTime,
        serviceAddress: serviceAddress.slice(0, 499),
        customerName: name.slice(0, 200),
        customerPhone: phone.slice(0, 50),
        customerEmail: email.slice(0, 200),
        notes: notes.slice(0, 499),
      },

      // ── Redirect URLs ──────────────────────────────────────────────────────
      success_url: `${origin}/?stripe=success`,
      cancel_url: `${origin}/?stripe=cancelled`,

      // Expires in 30 minutes (Stripe default is 24h; shorter is cleaner for
      // real-time availability services like mobile detailing)
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[POST /api/checkout]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
