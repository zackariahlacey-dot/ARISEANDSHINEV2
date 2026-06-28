/**
 * Stripe webhook: checkout.session.completed.
 * Inserts the booking only after payment is confirmed (no ghost bookings).
 * Requires bookings.stripe_checkout_session_id (TEXT UNIQUE) for idempotency:
 *   ALTER TABLE bookings ADD COLUMN stripe_checkout_session_id TEXT UNIQUE;
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmails, sendGiftCardEmail, sendPaymentReceivedEmails } from "@/lib/email";
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
      logError({
        type: "webhook",
        source: "stripe_webhook/config",
        message: "Stripe webhook received with no signature or no STRIPE_WEBHOOK_SECRET env var",
        details: { hasSig: !!sig, hasSecret: !!WEBHOOK_SECRET },
      });
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error("[webhooks/stripe] Signature verification failed:", err);
      logError({
        type: "webhook",
        source: "stripe_webhook/signature",
        message: err instanceof Error ? err.message : "Signature verification failed",
        details: { sigPrefix: sig.slice(0, 16) },
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ── Stripe payment failure events — alert owner immediately ──────────
    if (event.type === "checkout.session.async_payment_failed" ||
        event.type === "payment_intent.payment_failed") {
      const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
      const lastErrMsg =
        ("last_payment_error" in obj && obj.last_payment_error?.message) ||
        ((obj as Stripe.Checkout.Session).payment_status ?? "Payment failed");
      const bookingId = (obj.metadata as Record<string, string> | null | undefined)?.booking_id ?? null;
      const customerEmail = ("customer_email" in obj ? obj.customer_email : null) ?? null;
      logError({
        type: "payment_failure",
        source: `stripe_webhook/${event.type}`,
        message: String(lastErrMsg),
        details: {
          stripeId: obj.id,
          eventType: event.type,
          bookingId,
          customerEmail,
          amount: "amount" in obj ? obj.amount : null,
        },
      });
      return NextResponse.json({ received: true });
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
          const FROM_ADDR = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
          resend.emails.send({
            from:    FROM_ADDR,
            to:      sub.customer_email,
            subject: "Action needed: monthly plan payment failed — Arise And Shine Detailing",
            html: `<p>Hi ${firstName},</p><p>We weren't able to process your monthly detail plan payment. Please update your payment method to keep your plan active.</p><p>Reply to this email or call 802-585-5563 and we'll get it sorted.</p><p>— Arise And Shine Detailing</p>`,
            replyTo: "contact@ariseandshinedetailing.com",
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

    // ── Premium Annual Membership purchase path ───────────────────────────
    if (m?.sessionType === "membership_purchase") {
      if (!m.profileId) {
        console.error("[webhooks/stripe] Membership purchase missing profileId");
        return NextResponse.json({ received: true });
      }
      const { createMembershipFromWebhook } = await import("@/app/actions/membership");
      await createMembershipFromWebhook({
        profileId: m.profileId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        amountPaidCents: session.amount_total ?? 0,
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

    // ── Admin payment link / customer pay page path ───────────────────────
    // Checked FIRST — these sessions only carry booking_id and won't pass
    // the full-metadata guard below.
    if (m?.booking_id) {
      // Look up the booking once; we'll use it for both idempotency and email.
      const { data: existing } = await supabase
        .from("bookings")
        .select("id, status, stripe_checkout_session_id, payment_received_email_sent_at, customer_name, customer_email, customer_phone, service_name, vehicle_size, vehicle_make, vehicle_model, vehicle_year, booking_date, booking_time, total_price, service_address")
        .eq("id", m.booking_id)
        .maybeSingle();

      if (!existing) {
        // Booking was deleted between session creation and webhook? Acknowledge
        // so Stripe stops retrying; nothing we can do.
        console.error("[webhooks/stripe] booking_id not found:", m.booking_id);
        return NextResponse.json({ received: true });
      }

      // True idempotency: only short-circuit if the booking is already tagged
      // with THIS session AND the email has been sent. If the email never
      // sent (transient Resend failure on a prior webhook attempt), fall
      // through and try again — Stripe retries are our friend here.
      const alreadyEmailed =
        (existing as any).stripe_checkout_session_id === session.id &&
        !!(existing as any).payment_received_email_sent_at;
      if (alreadyEmailed) {
        return NextResponse.json({ received: true });
      }

      const tipAmount = m.tip_amount ? parseFloat(m.tip_amount) || 0 : 0;
      const tipCents  = Math.round(tipAmount * 100);

      // Mark the booking as confirmed + tagged with this session, but ONLY
      // if it's not already tagged (avoid touching a different session id).
      // Also capture the tip in tip_cents so it shows up on contractor
      // dashboards + admin payroll reports. tip is 100% the contractor's
      // per the signed Payment & Tax Terms agreement.
      if ((existing as any).stripe_checkout_session_id !== session.id) {
        // Payment received → auto-complete the booking
        const nowIso = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({
            status: "completed",
            stripe_checkout_session_id: session.id,
            paid_at: nowIso,
            payment_source: "stripe",
            ...(tipCents > 0 ? { tip_cents: tipCents } : {}),
          })
          .eq("id", m.booking_id)
          .in("status", ["pending_payment", "confirmed"]);
        if (updateErr) {
          console.error("[webhooks/stripe] Admin booking update failed:", updateErr);
          return NextResponse.json({ error: "Admin booking update failed" }, { status: 500 });
        }
        // Cascade: mark every booking_vehicle complete too
        await supabase
          .from("booking_vehicles")
          .update({ status: "complete", completed_at: nowIso })
          .eq("booking_id", m.booking_id)
          .neq("status", "complete");
      } else if (tipCents > 0) {
        // Same session re-fired (retry after email failure): make sure tip
        // is still captured even if we're not re-updating status.
        await supabase
          .from("bookings")
          .update({ tip_cents: tipCents })
          .eq("id", m.booking_id);
      }

      const baseAmount = Number((existing as any).total_price) || 0;
      const totalPaid  = baseAmount + tipAmount;

      // Synchronous send with retry. We await so the booking row can record
      // success/failure state — Stripe will retry the webhook if we 5xx,
      // which is exactly the safety net we want when Resend is flaking.
      const emailResult = await sendPaymentReceivedEmails({
        bookingId:      (existing as any).id,
        customerName:   (existing as any).customer_name  ?? "",
        customerEmail:  (existing as any).customer_email ?? "",
        customerPhone:  (existing as any).customer_phone ?? undefined,
        serviceName:    (existing as any).service_name   ?? "Detailing Service",
        baseAmount,
        tipAmount,
        totalPaid,
        vehicleYear:    (existing as any).vehicle_year   ?? undefined,
        vehicleMake:    (existing as any).vehicle_make   ?? undefined,
        vehicleModel:   (existing as any).vehicle_model  ?? undefined,
        vehicleSize:    (existing as any).vehicle_size   ?? undefined,
        bookingDate:    (existing as any).booking_date   ?? "",
        bookingTime:    (existing as any).booking_time   ?? "",
        serviceAddress: (existing as any).service_address || undefined,
      }).catch((err) => ({
        ok: false as const,
        ownerSent: false,
        customerSent: false,
        error: err instanceof Error ? err.message : String(err),
      }));

      // Persist email state so future webhook retries know whether to
      // re-attempt. ownerSent is the source of truth for "did the owner get
      // their alert" — that's the bug the user is hitting.
      try {
        if (emailResult.ownerSent) {
          await supabase
            .from("bookings")
            .update({
              payment_received_email_sent_at: new Date().toISOString(),
              payment_received_email_last_error: null,
            })
            .eq("id", m.booking_id);
        } else {
          await supabase
            .from("bookings")
            .update({
              payment_received_email_failed_at: new Date().toISOString(),
              payment_received_email_last_error: emailResult.error ?? "owner email failed",
            })
            .eq("id", m.booking_id);
          // Also log to error_logs so admin Today shows it
          try {
            await supabase.from("error_logs").insert({
              type: "payment_email_failed",
              source: "webhooks/stripe",
              message: emailResult.error ?? "Owner payment email failed after 3 attempts",
              details: { bookingId: m.booking_id, sessionId: session.id, tipAmount },
            });
          } catch {}
        }
      } catch (trackErr) {
        console.error("[webhooks/stripe] payment email tracking write failed:", trackErr);
      }

      // If the owner email failed, return a 500 so Stripe retries the webhook.
      // Stripe will keep retrying for ~3 days at exponential backoff, giving
      // Resend lots of chances to recover from a transient outage.
      if (!emailResult.ownerSent) {
        return NextResponse.json(
          { error: "Owner email failed; webhook will retry" },
          { status: 500 }
        );
      }

      return NextResponse.json({ received: true });
    }

    if (!m?.profileId || !m?.vehicleId || !m?.serviceId || !m?.bookingDate || !m?.bookingTime) {
      // Payment link / manual Stripe sessions with no app metadata — acknowledge and ignore
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

    // Stripe metadata caps `notes` at 500 chars, so the promo line may have been
    // truncated. Reconstruct it from explicit metadata fields and prepend it so
    // admins can always see which code was redeemed.
    const promoLine = m.couponCode || m.couponDiscount
      ? `🏷️ Promo code${m.couponCode ? ` ${m.couponCode}` : ""}${m.couponDiscount ? ` applied: $${Number(m.couponDiscount).toFixed(2)} off` : ""}`
      : "";
    const baseNotes = m.notes ?? "";
    const finalNotes = promoLine && !baseNotes.includes("🏷️ Promo code")
      ? (baseNotes ? `${promoLine}\n\n${baseNotes}` : promoLine)
      : (baseNotes || null);

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
        notes:           finalNotes,
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
        ...(m.membershipId && m.membershipCreditAppliedCents
          ? {
              membership_id: m.membershipId,
              membership_credit_applied_cents: Math.max(0, parseInt(m.membershipCreditAppliedCents, 10) || 0),
            }
          : {}),
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

    // Cross-sell coupon redemption (exterior → detailing). Webhook is the
    // canonical "payment confirmed" moment for pay-now bookings, so this
    // is where we stamp redeemed_at + redeemed_booking_id on the
    // cross_sell_events row. Idempotent via the IS NULL guard inside
    // redeemCrossSellCoupon; safe on Stripe webhook retries.
    if (m.crossSellEventId) {
      try {
        const { redeemCrossSellCoupon } = await import("@/app/actions/crossSellCoupon");
        const r = await redeemCrossSellCoupon(m.crossSellEventId, bookingId);
        if (!r.ok && !r.alreadyRedeemed) {
          console.error("[webhooks/stripe] cross-sell redemption failed:", { eventId: m.crossSellEventId, bookingId });
        }
      } catch (csErr) {
        console.error("[webhooks/stripe] cross-sell redemption threw:", csErr);
      }
    }

    // Auto-deactivate the coupon if this booking hit its max_uses limit.
    // Mirrors the logic in bookDetailing.ts for the pay-at-arrival path.
    if (m.couponId) {
      const { data: couponRow } = await supabase
        .from("coupons")
        .select("max_uses, is_active")
        .eq("id", m.couponId)
        .maybeSingle();
      if (couponRow?.is_active && couponRow.max_uses != null && couponRow.max_uses > 0) {
        const { count } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", m.couponId);
        if ((count ?? 0) >= couponRow.max_uses) {
          await supabase.from("coupons").update({ is_active: false }).eq("id", m.couponId);
        }
      }
    }

    // Consume membership credit atomically — Pay Now path.
    // Pay-at-Arrival consumes credit inside bookDetailing.ts; here we mirror
    // that behavior post-payment so credit is never decremented for failed
    // checkouts. RPC is balance-checked at the DB layer.
    if (m.membershipId && m.membershipCreditAppliedCents) {
      const creditCents = Math.max(0, parseInt(m.membershipCreditAppliedCents, 10) || 0);
      if (creditCents > 0) {
        const { error: consumeErr } = await supabase.rpc("consume_membership_credit", {
          p_membership_id: m.membershipId,
          p_amount_cents:  creditCents,
        });
        if (consumeErr) {
          console.error("[webhooks/stripe] membership credit consume failed:", consumeErr.message, { bookingId, membershipId: m.membershipId, creditCents });
          logError({ type: "webhook", source: "stripe_webhook/membershipCredit", message: consumeErr.message, details: { bookingId, membershipId: m.membershipId, creditCents } });
        }
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
      serviceAddress: m.serviceAddress || undefined,
      distanceMiles: m.distanceMiles ? Number(m.distanceMiles) : undefined,
      paymentMethod: "pay_now",
      notes: m.notes || undefined,
      additionalVehicles: compactAddlVehicles.length > 0
        ? compactAddlVehicles.map(av => ({
            vehicleYear: av.yr,
            vehicleMake: av.mk,
            vehicleModel: av.md,
            serviceName: av.sn,
            servicePrice: av.sp,
          }))
        : undefined,
      addonsJson: addonsJson ?? undefined,
    }).catch((err) => {
      console.error("[webhooks/stripe] Email error:", err);
      logError({ type: "webhook", source: "stripe_webhook/email", message: err?.message ?? "sendBookingEmails failed", details: { email: m.customerEmail, service: m.serviceName, date: m.bookingDate, sessionId: session.id } });
    });

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
    const msg = err instanceof Error ? err.message : "Webhook handler failed";
    logError({
      type: "webhook",
      source: "stripe_webhook/unhandled",
      message: msg,
      details: { stack: err instanceof Error ? err.stack?.slice(0, 1500) : null },
    });
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
