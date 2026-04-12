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
import { getDurationMins, getAdditionalVehiclesDuration } from "@/lib/availability";
import { logError } from "@/app/actions/logError";

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

    // ── Monthly subscription lifecycle events ────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const stripeSub = event.data.object as Stripe.Subscription;
      const { error } = await createAdminClient()
        .from("monthly_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", stripeSub.id)
        .neq("status", "cancelled");
      if (error) console.error("[webhooks/stripe] subscription.deleted DB update failed:", error.message);
      return NextResponse.json({ received: true });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription as string : null;
      if (stripeSubId) {
        const supabase = createAdminClient();
        const { data: sub } = await supabase
          .from("monthly_subscriptions")
          .select("customer_name, customer_email")
          .eq("stripe_subscription_id", stripeSubId)
          .maybeSingle();
        if (sub?.customer_email) {
          // Notify subscriber (fire-and-forget)
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const firstName = (sub.customer_name ?? "there").split(" ")[0];
          const FROM_ADDR = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
          resend.emails.send({
            from:    FROM_ADDR,
            to:      sub.customer_email,
            subject: "Action needed: monthly plan payment failed — Arise & Shine VT",
            html: `<p>Hi ${firstName},</p><p>We weren't able to process your monthly detail plan payment. Please update your payment method to keep your plan active.</p><p>Reply to this email or call 802-585-5563 and we'll get it sorted.</p><p>— Arise &amp; Shine VT</p>`,
            replyTo: "contact@ariseandshinevt.com",
          }).catch(err => console.error("[webhooks/stripe] payment_failed email error:", err));
        }
      }
      return NextResponse.json({ received: true });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    // For one-time payments require paid status; subscriptions fire on active too
    if (session.payment_status !== "paid" && session.mode !== "subscription") {
      return NextResponse.json({ received: true });
    }

    const m = session.metadata;

    const supabase = createAdminClient();

    // ── Monthly subscription purchase path ────────────────────────────────
    if (m?.sessionType === "monthly_subscription") {
      // Idempotency: skip if subscription already created (Stripe webhook retries)
      const stripeSubId = typeof session.subscription === "string" ? session.subscription : null;
      if (stripeSubId) {
        const { data: existing } = await supabase
          .from("monthly_subscriptions")
          .select("id")
          .eq("stripe_subscription_id", stripeSubId)
          .maybeSingle();
        if (existing) return NextResponse.json({ received: true }); // already processed
      }

      const { createMonthlySubscriptionFromWebhook } = await import("@/app/actions/monthlySubscriptions");
      await createMonthlySubscriptionFromWebhook({
        planId:               m.planId    ?? "",
        planName:             m.planName  ?? "",
        planPrice:            Number(m.planPrice) || 0,
        profileId:            m.profileId ?? "",
        customerName:         m.customerName  ?? "",
        customerEmail:        m.customerEmail ?? "",
        customerPhone:        m.customerPhone ?? "",
        vehicleMake:          m.vehicleMake   ?? "",
        vehicleModel:         m.vehicleModel  ?? "",
        vehicleYear:          m.vehicleYear   ?? "",
        vehicleSize:          m.vehicleSize   ?? "",
        serviceAddress:       m.serviceAddress ?? "",
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId:     typeof session.customer === "string" ? session.customer : null,
      });
      return NextResponse.json({ received: true });
    }

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
      // Payment link / manual Stripe sessions have no app metadata — acknowledge and ignore
      return NextResponse.json({ received: true });
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

    // Parse additional vehicles early so combined duration can be used for the
    // availability check — same formula as BookingModal / bookDetailing.
    // Note: 'si' (serviceId) was removed from compact format to save space.
    type CompactAddlVehicle = { sz: string; yr: string; mk: string; md: string; sn: string; sp: number };
    let compactAddlVehicles: CompactAddlVehicle[] = [];
    if (m.additionalVehiclesJson) {
      try { compactAddlVehicles = JSON.parse(m.additionalVehiclesJson); } catch {
        console.error("[webhooks/stripe] Failed to parse additionalVehiclesJson:", m.additionalVehiclesJson?.slice(0, 100));
        compactAddlVehicles = [];
      }
    }

    // FINAL AVAILABILITY CHECK: Ensure slot wasn't taken while customer was on Stripe.
    // Use combined duration for multi-vehicle bookings.
    const webhookPrimarySize = VEHICLE_SIZE_MAP[m.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium";
    const webhookPrimaryDur  = getDurationMins(m.serviceName, webhookPrimarySize);
    const webhookAddlDur     = getAdditionalVehiclesDuration(
      compactAddlVehicles.map(av => ({ serviceName: av.sn, vehicleSize: av.sz }))
    );
    const webhookCombinedDur = webhookPrimaryDur + webhookAddlDur;

    const isAvailable = await checkAvailability(
      m.bookingDate,
      m.bookingTime,
      m.serviceName,
      webhookPrimarySize,
      webhookCombinedDur > webhookPrimaryDur ? webhookCombinedDur : undefined
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
        total_price:     Number(m.totalPrice) || 0,
        notes:           m.notes ?? null,
        distance_miles:  m.distanceMiles ? Number(m.distanceMiles) : null,
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
      console.error("[webhooks/stripe] Booking insert failed:", insertErr?.message, insertErr?.details, insertErr?.hint, {
        profileId: m.profileId, vehicleId: m.vehicleId, serviceId: m.serviceId,
        bookingDate: m.bookingDate, bookingTime: m.bookingTime,
        hasAdditionalVehicles: !!m.additionalVehiclesJson,
      });
      logError({ type: "webhook", source: "stripe_webhook/insert", message: insertErr?.message ?? "Booking insert failed after payment", details: { email: m.customerEmail, service: m.serviceName, date: m.bookingDate, time: m.bookingTime, sessionId: session.id } });
      return NextResponse.json({ error: "Booking insert failed" }, { status: 500 });
    }

    const bookingId = booking.id;
    const totalPrice = Number(m.totalPrice) || 0;
    const travelFee = Number(m.travelFee) || 0;
    const pointsToRedeem = Number(m.pointsToRedeem) || 0;
    // Earn 1 pt per $1 of service cost, excluding travel fee (matches pay-at-arrival logic)
    const earnedPoints = Math.floor(Math.max(0, totalPrice - travelFee + (pointsToRedeem / 10)));

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
