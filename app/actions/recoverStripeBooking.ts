"use server";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmails } from "@/lib/email";
import { checkAvailability } from "@/app/actions/bookDetailing";
import { VEHICLE_SIZE_MAP } from "@/lib/constants";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export type RecoveryResult =
  | { status: "already_fulfilled"; bookingId: string; customerName: string; serviceName: string; bookingDate: string; bookingTime: string }
  | { status: "recovered"; bookingId: string; customerName: string; serviceName: string; bookingDate: string; bookingTime: string }
  | { status: "not_paid" }
  | { status: "overbooked"; customerName: string; bookingDate: string; bookingTime: string }
  | { status: "gift_card" }
  | { status: "error"; error: string };

/**
 * Idempotent booking fulfillment from a Stripe Checkout session ID.
 *
 * Called:
 *   1. By the customer's browser when they return to /?stripe=success&session_id=...
 *      — guarantees the booking exists even if the webhook was delayed or failed.
 *   2. By the admin recovery tool when pasting a session ID manually.
 *
 * Safe to call multiple times — returns "already_fulfilled" on repeat calls.
 */
export async function recoverStripeBooking(sessionId: string): Promise<RecoveryResult> {
  if (!sessionId?.startsWith("cs_")) {
    return { status: "error", error: "Invalid session ID." };
  }

  const supabase = createAdminClient();

  // ── 1. Already in DB? ─────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, customer_name, service_name, booking_date, booking_time")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return {
      status: "already_fulfilled",
      bookingId: existing.id as string,
      customerName: (existing.customer_name as string | null) ?? "Customer",
      serviceName: (existing.service_name as string | null) ?? "Detailing Service",
      bookingDate: existing.booking_date as string,
      bookingTime: existing.booking_time as string,
    };
  }

  // ── 2. Retrieve session from Stripe ──────────────────────────────────────
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[recoverStripeBooking] Stripe retrieve failed:", err);
    return { status: "error", error: "Could not retrieve session from Stripe." };
  }

  if (session.payment_status !== "paid") {
    return { status: "not_paid" };
  }

  const m = session.metadata;
  if (!m) return { status: "error", error: "Session has no metadata." };

  // Gift card sessions have no booking to recover
  if (m.sessionType === "gift_card") {
    return { status: "gift_card" };
  }

  if (!m.profileId || !m.bookingDate || !m.bookingTime) {
    return { status: "error", error: "Session metadata is incomplete." };
  }

  // ── 3. Final availability check ───────────────────────────────────────────
  const isAvailable = await checkAvailability(
    m.bookingDate,
    m.bookingTime,
    m.serviceName ?? "",
    VEHICLE_SIZE_MAP[m.vehicleSize as keyof typeof VEHICLE_SIZE_MAP] || "medium"
  );

  if (!isAvailable) {
    console.warn(
      `[recoverStripeBooking] Slot unavailable: ${m.bookingDate} ${m.bookingTime} — customer ${m.customerName}`
    );
    return {
      status: "overbooked",
      customerName: m.customerName ?? "Customer",
      bookingDate: m.bookingDate,
      bookingTime: m.bookingTime,
    };
  }

  // ── 4. Parse add-ons + additional vehicles ────────────────────────────────
  type CompactAddlVehicle = { sz: string; yr: string; mk: string; md: string; si: string; sn: string; sp: number };

  let addonsJson: { id: string; label: string; price: number }[] | null = null;
  if (m.addonsJson) { try { addonsJson = JSON.parse(m.addonsJson); } catch { /* ignore */ } }

  let compactAddlVehicles: CompactAddlVehicle[] = [];
  if (m.additionalVehiclesJson) { try { compactAddlVehicles = JSON.parse(m.additionalVehiclesJson); } catch { /* ignore */ } }

  const additionalVehicleDbIds = m.additionalVehicleIds
    ? m.additionalVehicleIds.split(",").filter(Boolean)
    : [];

  const additionalVehiclesForDb = compactAddlVehicles.length > 0
    ? compactAddlVehicles.map((av, i) => ({
        vehicleSize: av.sz, vehicleYear: av.yr, vehicleMake: av.mk,
        vehicleModel: av.md, serviceId: av.si, serviceName: av.sn,
        servicePrice: av.sp, vehicleDbId: additionalVehicleDbIds[i] ?? null,
      }))
    : null;

  // ── 5. Insert the booking ─────────────────────────────────────────────────
  const { data: booking, error: insertErr } = await supabase
    .from("bookings")
    .insert({
      user_id:       m.profileId,
      vehicle_id:    m.vehicleId ?? null,
      service_id:    m.serviceId ?? null,
      booking_date:  m.bookingDate,
      booking_time:  m.bookingTime,
      status:        "confirmed",
      total_price:   Number(m.totalPrice) || 0,
      notes:         m.notes ?? null,
      customer_name:  m.customerName ?? null,
      customer_email: m.customerEmail ?? null,
      customer_phone: m.customerPhone ?? null,
      service_address: m.serviceAddress ?? null,
      vehicle_make:  m.vehicleMake ?? null,
      vehicle_model: m.vehicleModel ?? null,
      vehicle_year:  m.vehicleYear ?? null,
      vehicle_size:  m.vehicleSize ?? null,
      service_name:  m.serviceName ?? null,
      addons_json:   addonsJson,
      additional_vehicles_json: additionalVehiclesForDb,
      ...(m.couponId ? { coupon_id: m.couponId } : {}),
      stripe_checkout_session_id: session.id,
    })
    .select("id")
    .single();

  if (insertErr || !booking) {
    console.error("[recoverStripeBooking] Insert failed:", insertErr);
    return { status: "error", error: insertErr?.message ?? "DB insert failed." };
  }

  const bookingId = booking.id as string;
  const totalPrice = Number(m.totalPrice) || 0;
  const earnedPoints = Math.floor(Math.max(0, totalPrice));

  // ── 6. Award points ───────────────────────────────────────────────────────
  if (earnedPoints > 0 && m.profileId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("reward_points, lifetime_points")
      .eq("id", m.profileId)
      .single();
    if (prof && typeof prof.reward_points === "number") {
      const currentLifetime = typeof prof.lifetime_points === "number" ? prof.lifetime_points : 0;
      await supabase.from("profiles").update({
        reward_points:   prof.reward_points + earnedPoints,
        lifetime_points: currentLifetime + earnedPoints,
      }).eq("id", m.profileId);
      await supabase.from("point_transactions").insert({
        user_id: m.profileId, amount: earnedPoints,
        description: `Earned from ${m.serviceName ?? "detailing"}`,
      });
    }
  }

  // ── 7. Deduct gift card balance ───────────────────────────────────────────
  if (m.giftCardId && m.giftCardDiscount) {
    const gcDiscount = Number(m.giftCardDiscount) || 0;
    if (gcDiscount > 0) {
      const { data: gc } = await supabase
        .from("gift_cards").select("remaining_balance, is_active")
        .eq("id", m.giftCardId).maybeSingle();
      if (gc?.is_active && Number(gc.remaining_balance) >= gcDiscount) {
        await supabase.from("gift_cards")
          .update({ remaining_balance: Number(gc.remaining_balance) - gcDiscount })
          .eq("id", m.giftCardId);
      }
    }
  }

  // ── 8. Send confirmation emails ───────────────────────────────────────────
  sendBookingEmails({
    bookingId,
    customerName:  m.customerName ?? "",
    customerEmail: m.customerEmail ?? "",
    customerPhone: m.customerPhone ?? "",
    serviceName:   m.serviceName ?? "",
    servicePrice:  totalPrice,
    bookingDate:   m.bookingDate ?? "",
    bookingTime:   m.bookingTime ?? "",
    vehicleYear:   m.vehicleYear ?? "",
    vehicleMake:   m.vehicleMake ?? "",
    vehicleModel:  m.vehicleModel ?? "",
    vehicleSize:   m.vehicleSize ?? "sedan",
    rewardPointsEarned: earnedPoints,
    serviceAddress: m.serviceAddress || undefined,
    distanceMiles:  m.distanceMiles ? Number(m.distanceMiles) : undefined,
    paymentMethod:  "pay_now",
    notes: m.notes || undefined,
  }).catch((err) => console.error("[recoverStripeBooking] Email error:", err));

  console.log(`[recoverStripeBooking] Recovered booking ${bookingId} for ${m.customerName} (${m.bookingDate})`);

  return {
    status: "recovered",
    bookingId,
    customerName: m.customerName ?? "Customer",
    serviceName:  m.serviceName ?? "Detailing Service",
    bookingDate:  m.bookingDate,
    bookingTime:  m.bookingTime,
  };
}
