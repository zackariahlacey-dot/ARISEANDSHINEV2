/**
 * Stripe webhook: checkout.session.completed.
 * Inserts the booking only after payment is confirmed (no ghost bookings).
 * Requires bookings.stripe_checkout_session_id (TEXT UNIQUE) for idempotency:
 *   ALTER TABLE bookings ADD COLUMN stripe_checkout_session_id TEXT UNIQUE;
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
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
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const m = session.metadata;
    if (!m?.profileId || !m?.vehicleId || !m?.serviceId || !m?.bookingDate || !m?.bookingTime) {
      console.error("[webhooks/stripe] Missing required metadata (profileId, vehicleId, serviceId, bookingDate, bookingTime)");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Idempotency: if we already fulfilled this session, skip (prevents double-insert on webhook retry)
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true });
    }

    // Insert booking only after successful payment
    const { data: booking, error: insertErr } = await supabase
      .from("bookings")
      .insert({
        user_id: m.profileId,
        vehicle_id: m.vehicleId,
        service_id: m.serviceId,
        booking_date: m.bookingDate,
        booking_time: m.bookingTime,
        status: "confirmed",
        total_price: Number(m.totalPrice) || 0,
        notes: m.notes ?? null,
        ...(m.couponId ? { coupon_id: m.couponId } : {}),
        stripe_checkout_session_id: session.id,
      })
      .select("id")
      .single();

    if (insertErr || !booking) {
      console.error("[webhooks/stripe] Booking insert failed:", insertErr);
      return NextResponse.json({ error: "Booking insert failed" }, { status: 500 });
    }

    const bookingId = booking.id;
    const totalPrice = Number(m.totalPrice) || 0;
    const pointsToRedeem = Number(m.pointsToRedeem) || 0;
    // Earn 1 pt per $1 of final amount paid (totalPrice already has tier + points discount applied)
    const earnedPoints = Math.floor(Math.max(0, totalPrice));

    // Deduct redeemed points (deferred from Pay Now flow until after payment)
    if (pointsToRedeem > 0) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("reward_points")
        .eq("id", m.profileId)
        .single();
      if (prof && typeof prof.reward_points === "number" && prof.reward_points >= pointsToRedeem) {
        await supabase
          .from("profiles")
          .update({ reward_points: prof.reward_points - pointsToRedeem })
          .eq("id", m.profileId);
      }
    }

    // Add earned points to profile (1 pt per $1 on service, excluding travel)
    if (earnedPoints > 0) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("reward_points, lifetime_points")
        .eq("id", m.profileId)
        .single();
      if (prof && typeof prof.reward_points === "number") {
        const currentLifetime = typeof prof.lifetime_points === "number" ? prof.lifetime_points : 0;
        await supabase
          .from("profiles")
          .update({
            reward_points: prof.reward_points + earnedPoints,
            lifetime_points: currentLifetime + earnedPoints,
          })
          .eq("id", m.profileId);
      }
    }

    // Referral: mark discount used + credit referrer 200 pts
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
