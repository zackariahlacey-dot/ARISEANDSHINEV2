/**
 * Stripe webhook: checkout.session.completed.
 * Inserts the booking only after payment is confirmed (no ghost bookings).
 * Requires bookings.stripe_checkout_session_id (TEXT UNIQUE) for idempotency:
 *   ALTER TABLE bookings ADD COLUMN stripe_checkout_session_id TEXT UNIQUE;
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmails, sendGiftCardEmail } from "@/lib/email";
import { sendBookerAccountInviteEmail } from "@/app/actions/sendBookingEmail";
import { profileHasAuthUser } from "@/lib/auth/profileHasAuthUser";
import { checkAvailability } from "@/app/actions/bookDetailing";
import { VEHICLE_SIZE_MAP } from "@/lib/constants";

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

    const supabase = createAdminClient();

    // ── Gift card purchase path ───────────────────────────────────────────
    if (m?.sessionType === "gift_card") {
      const amount = Number(m.amount) || 0;
      if (amount < 1) {
        console.error("[webhooks/stripe] Gift card: invalid amount", m.amount);
        return NextResponse.json({ received: true });
      }
      // Generate a cryptographically secure unique code (XXXX-XXXX-XXXX-XXXX)
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      let code = "";
      for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += "-";
        code += chars[randomBytes[i] % chars.length];
      }
      // 1-year expiry from purchase date
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await supabase.from("gift_cards").insert({
        code,
        initial_amount: amount,
        remaining_balance: amount,
        purchaser_email: m.purchaserEmail ?? null,
        recipient_email: m.recipientEmail || null,
        recipient_name: m.recipientName || null,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      });
      // Send gift card to recipient (if set) and purchaser
      const deliverTo = m.recipientEmail || m.purchaserEmail;
      const recipientName = m.recipientName || "there";
      if (deliverTo) {
        sendGiftCardEmail({
          recipientName,
          toEmail: deliverTo,
          purchaserEmail: m.purchaserEmail ?? deliverTo,
          code,
          amount,
        }).catch((err) => console.error("[webhooks/stripe] gift card email error:", err));
        // Also CC the purchaser if the card goes to someone else
        if (m.recipientEmail && m.purchaserEmail && m.recipientEmail !== m.purchaserEmail) {
          sendGiftCardEmail({
            recipientName: "you",
            toEmail: m.purchaserEmail,
            purchaserEmail: m.purchaserEmail,
            code,
            amount,
          }).catch((err) => console.error("[webhooks/stripe] gift card purchaser CC error:", err));
        }
      }
      return NextResponse.json({ received: true });
    }

    if (!m?.profileId || !m?.vehicleId || !m?.serviceId || !m?.bookingDate || !m?.bookingTime) {
      console.error("[webhooks/stripe] Missing required metadata (profileId, vehicleId, serviceId, bookingDate, bookingTime)");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Idempotency: if we already fulfilled this session, skip (prevents double-insert on webhook retry)
    const { data: alreadyFulfilled } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (alreadyFulfilled) {
      return NextResponse.json({ received: true });
    }

    // ── Admin-created booking path ─────────────────────────────────────────
    // If metadata contains a booking_id, this was an invoice sent by the admin.
    // Update the existing pending_payment booking instead of inserting a new one.
    if (m.booking_id) {
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ status: "confirmed", stripe_checkout_session_id: session.id })
        .eq("id", m.booking_id)
        .eq("status", "pending_payment"); // safety: only transition from pending

      if (updateErr) {
        console.error("[webhooks/stripe] Admin booking update failed:", updateErr);
        return NextResponse.json({ error: "Admin booking update failed" }, { status: 500 });
      }

      // Points awarded when admin marks completed, not at payment time for admin bookings
      return NextResponse.json({ received: true });
    }

    // ── Customer-initiated booking path ───────────────────────────────────
    // FINAL AVAILABILITY CHECK: Ensure slot wasn't taken while customer was on Stripe
    const isAvailable = await checkAvailability(
      m.bookingDate,
      m.bookingTime,
      m.serviceName,
      VEHICLE_SIZE_MAP[m.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium"
    );

    if (!isAvailable) {
      console.warn(`[webhooks/stripe] OVERBOOKING DETECTED: ${m.bookingDate} at ${m.bookingTime} for ${m.customerName}. Payment successful but slot is now taken. Manual resolution required.`);
      return NextResponse.json({ received: true, warning: "overbooked" });
    }

    // Parse add-ons JSON stored in Stripe metadata
    let addonsJson: { id: string; label: string; price: number }[] | null = null;
    if (m.addonsJson) {
      try { addonsJson = JSON.parse(m.addonsJson); } catch { addonsJson = null; }
    }

    // Parse additional vehicles from Stripe metadata (compact format)
    type CompactAddlVehicle = { sz: string; yr: string; mk: string; md: string; si: string; sn: string; sp: number };
    let compactAddlVehicles: CompactAddlVehicle[] = [];
    if (m.additionalVehiclesJson) {
      try { compactAddlVehicles = JSON.parse(m.additionalVehiclesJson); } catch { compactAddlVehicles = []; }
    }

    // Rebuild vehicle DB rows for additional vehicles using pre-created IDs
    const additionalVehicleDbIds = m.additionalVehicleIds
      ? m.additionalVehicleIds.split(",").filter(Boolean)
      : [];

    const additionalVehiclesForDb = compactAddlVehicles.length > 0
      ? compactAddlVehicles.map((av, i) => ({
          vehicleSize: av.sz,
          vehicleYear: av.yr,
          vehicleMake: av.mk,
          vehicleModel: av.md,
          serviceId: av.si,
          serviceName: av.sn,
          servicePrice: av.sp,
          vehicleDbId: additionalVehicleDbIds[i] ?? null,
        }))
      : null;

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
        // ── Direct lead capture snapshot ──────────────────────────────────
        customer_name:   m.customerName ?? null,
        customer_email:  m.customerEmail ?? null,
        customer_phone:  m.customerPhone ?? null,
        service_address: m.serviceAddress ?? null,
        vehicle_make:    m.vehicleMake ?? null,
        vehicle_model:   m.vehicleModel ?? null,
        vehicle_year:    m.vehicleYear ?? null,
        vehicle_size:    m.vehicleSize ?? null,
        service_name:    m.serviceName ?? null,
        addons_json:     addonsJson,
        additional_vehicles_json: additionalVehiclesForDb,
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

        // Record redemption
        await supabase.from("point_transactions").insert({
          user_id: m.profileId,
          amount: -pointsToRedeem,
          description: `Redeemed for ${m.serviceName}`,
        });
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

        // Record earning
        await supabase.from("point_transactions").insert({
          user_id: m.profileId,
          amount: earnedPoints,
          description: `Earned from ${m.serviceName}`,
        });
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
            .select("reward_points, lifetime_points")
            .eq("id", authProfile.referred_by)
            .maybeSingle();

          if (referrerProfile != null) {
            const newReward   = ((referrerProfile as any).reward_points   ?? 0) + 200;
            const newLifetime = ((referrerProfile as any).lifetime_points ?? 0) + 200;
            await supabase
              .from("profiles")
              .update({ reward_points: newReward, lifetime_points: newLifetime })
              .eq("id", authProfile.referred_by);

            await supabase.from("point_transactions").insert({
              user_id:     authProfile.referred_by,
              amount:      200,
              description: "Referral bonus — friend completed first detail",
            });
          }
        }
      } catch (refErr) {
        console.error("[webhooks/stripe] referral reward error:", refErr);
      }
    }

    // Deduct gift card balance (Pay Now — deferred until payment confirmed)
    if (m.giftCardId && m.giftCardDiscount) {
      const gcDiscount = Number(m.giftCardDiscount) || 0;
      if (gcDiscount > 0) {
        const { data: gc } = await supabase
          .from("gift_cards")
          .select("remaining_balance, is_active")
          .eq("id", m.giftCardId)
          .maybeSingle();
        if (gc && gc.is_active && Number(gc.remaining_balance) >= gcDiscount) {
          await supabase
            .from("gift_cards")
            .update({ remaining_balance: Number(gc.remaining_balance) - gcDiscount })
            .eq("id", m.giftCardId);
        }
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
      distanceMiles: m.distanceMiles ? Number(m.distanceMiles) : undefined,
      paymentMethod: "pay_now",
      notes: m.notes || undefined,
    }).catch((err) => console.error("[webhooks/stripe] Email error:", err));

    const inviteEmail = m.customerEmail?.trim();
    if (inviteEmail && m.profileId) {
      profileHasAuthUser(m.profileId)
        .then((hasAuth) => {
          if (!hasAuth) {
            return sendBookerAccountInviteEmail({
              customerEmail: inviteEmail,
              customerName: m.customerName ?? "",
            });
          }
          return { ok: true as const };
        })
        .catch((err) => console.error("[webhooks/stripe] account invite email error:", err));
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhooks/stripe]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 }
    );
  }
}
