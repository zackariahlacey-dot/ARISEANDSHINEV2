import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { sendBookingEmails } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig || !WEBHOOK_SECRET) {
      console.warn("[webhooks/stripe] Missing signature or STRIPE_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error("[webhooks/stripe] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      console.error("[webhooks/stripe] No bookingId in session metadata");
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[webhooks/stripe] Booking update failed:", updateErr);
      return NextResponse.json({ error: "Booking update failed" }, { status: 500 });
    }

    const m = session.metadata!;
    const totalPrice = Number(m.totalPrice) || 0;
    const pointsToRedeem = Number(m.pointsToRedeem) || 0;
    const travelFee = Number(m.travelFee) || 0;
    const serviceSubtotal = totalPrice + pointsToRedeem / 10 - travelFee;
    const earnedPoints = Math.floor(Math.max(0, serviceSubtotal));

    // Add earned points to booking profile (1 pt per $1 on service, excluding travel)
    if (earnedPoints > 0) {
      const { data: bookingRow } = await supabase
        .from("bookings")
        .select("user_id")
        .eq("id", bookingId)
        .single();
      if (bookingRow?.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("reward_points")
          .eq("id", bookingRow.user_id)
          .single();
        if (prof && typeof prof.reward_points === "number") {
          await supabase
            .from("profiles")
            .update({ reward_points: prof.reward_points + earnedPoints })
            .eq("id", bookingRow.user_id);
        }
      }
    }

    // ── Referral: mark discount used + credit referrer 200 pts ─────────────
    const appliedReferral = m.isApplyingReferralDiscount === "true";
    const webhookAuthUserId = m.authUserId;
    if (appliedReferral && webhookAuthUserId) {
      try {
        const { data: authProfile } = await supabase
          .from("profiles")
          .select("referred_by, has_used_referral")
          .eq("id", webhookAuthUserId)
          .maybeSingle();

        if (authProfile?.referred_by && !authProfile.has_used_referral) {
          await supabase
            .from("profiles")
            .update({ has_used_referral: true })
            .eq("id", webhookAuthUserId);

          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("reward_points")
            .eq("id", authProfile.referred_by)
            .maybeSingle();

          if (referrerProfile != null) {
            await supabase
              .from("profiles")
              .update({ reward_points: (referrerProfile.reward_points ?? 0) + 200 })
              .eq("id", authProfile.referred_by);
          }
        }
      } catch (refErr) {
        console.error("[webhooks/stripe] referral reward error:", refErr);
      }
    }

    sendBookingEmails({
      bookingId,
      customerName: m.customerName ?? "",
      customerEmail: m.customerEmail ?? "",
      customerPhone: m.customerPhone ?? "",
      serviceName: m.serviceName ?? "",
      servicePrice: totalPrice,
      bookingDate: m.bookingDate ?? "",
      bookingTime: m.bookingTime ?? "",
      vehicleYear: m.vehicleYear ?? "",
      vehicleMake: m.vehicleMake ?? "",
      vehicleModel: m.vehicleModel ?? "",
      vehicleSize: m.vehicleSize ?? "sedan",
      rewardPointsEarned: earnedPoints,
      serviceAddress: m.serviceAddress || undefined,
      notes: m.notes || undefined,
    }).catch((err) => console.error("[webhooks/stripe] Email error:", err));

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhooks/stripe]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 }
    );
  }
}
