"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmails } from "@/lib/email";
import { sendBookingEmail } from "@/app/actions/sendBookingEmail";
import Stripe from "stripe";

// Maps our UI vehicle size slugs to the DB enum values
const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;

export type VehicleSizeSlug = keyof typeof VEHICLE_SIZE_MAP;

export type BookingPayload = {
  serviceId: string;
  serviceName: string;
  totalPrice: number;
  // Step 1 — Vehicle
  vehicleSize: VehicleSizeSlug;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  // Step 2 — Schedule
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // e.g. "9:00 AM"
  // Step 3 — Contact & Location
  serviceAddress: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  /** Optional travel fee (included in totalPrice); stored in notes for record */
  travelFee?: number;
  /** One-time setup fee for Monthly Maintenance Plan (included in totalPrice) */
  setupFee?: number;
  /** When "pay_now", booking is created as pending and a Stripe Checkout URL is returned; emails sent after payment via webhook */
  paymentMethod?: "pay_at_arrival" | "pay_now";
  /** Required when paymentMethod is "pay_now" for Stripe redirect URLs */
  successUrl?: string;
  cancelUrl?: string;
  /** Points to redeem (10 pts = $1 off). totalPrice is already discounted. Deducted from booking profile. */
  pointsToRedeem?: number;
  /**
   * When true, the 10% referral welcome discount has been applied to totalPrice.
   * The backend will mark the auth user's has_used_referral = true and credit the
   * referrer with 200 reward points.
   * Requires authUserId to be set.
   */
  isApplyingReferralDiscount?: boolean;
  /** The auth user's UUID — needed to look up referred_by and mark discount as used. */
  authUserId?: string;
  /** The UUID of the applied coupon row in the coupons table. */
  couponId?: string;
  /** Dollar amount discounted via the promo code (already reflected in totalPrice). */
  couponDiscount?: number;
};

export type BookingResult =
  | { success: true; bookingId: string; checkoutUrl?: string }
  | { success: false; error: string };

/** Converts "9:00 AM" → "09:00:00" for PostgreSQL time columns */
function to24h(time12: string): string {
  const [timePart, period] = time12.split(" ");
  const [rawH, rawM = "00"] = timePart.split(":");
  let h = parseInt(rawH, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${rawM}:00`;
}

/** Normalize phone to raw 10 digits for database storage and lookups */
function toPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 10);
}

export async function bookDetailing(
  payload: BookingPayload
): Promise<BookingResult> {
  const supabase = await createClient();

  // ── Fresh session check: do not rely on client-passed authUserId ───────
  const {
    data: { user: freshUser },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("Current User during booking:", freshUser?.id ?? null, freshUser?.email ?? null);
  if (userError) {
    console.error("Auth error during booking:", userError);
  }

  // Use server-side session only; if no session, fall back to guest flow (do not error)
  const user = freshUser?.id ?? null;

  const phoneDigits = toPhoneDigits(payload.phone);

  // ── Split full name into first / last ──────────────────────────────────
  const parts = payload.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || null;

  // ── 1. Resolve profile: logged-in skip profile creation and use user.id; guest find/create by phone ─
  let profileId: string;

  if (user) {
    // Logged-in: skip profile creation/upsert; use auth user id as booking user_id
    profileId = user;
  } else {
    // Guest: find or create profile by phone (use admin client to bypass RLS)
    const adminSupabase = createAdminClient();
    const { data: existing } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("phone", phoneDigits)
      .limit(1);

    if (existing && existing.length > 0) {
      profileId = existing[0].id;
    } else {
      const guestId = crypto.randomUUID();
      const { data: created, error: profileErr } = await adminSupabase
        .from("profiles")
        .upsert(
          {
            id: guestId,
            first_name: firstName || null,
            last_name: lastName || null,
            phone: phoneDigits.length >= 10 ? phoneDigits : null,
            reward_points: 0,
            lifetime_points: 0,
          },
          { onConflict: "id" }
        )
        .select("id")
        .single();

      if (profileErr || !created) {
        console.error("Profile Error:", profileErr);
        return {
          success: false,
          error: "Could not create your profile. Please try again.",
        };
      }

      profileId = created.id;
    }
  }

  // ── 1b. Redeem: verify and deduct points from booking profile ───────────
  if (payload.pointsToRedeem != null && payload.pointsToRedeem > 0) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("reward_points")
      .eq("id", profileId)
      .single();
    if (!profileRow || typeof profileRow.reward_points !== "number" || profileRow.reward_points < payload.pointsToRedeem) {
      return {
        success: false,
        error: "You don't have enough reward points to redeem. Please adjust or continue without redeeming.",
      };
    }
    await supabase
      .from("profiles")
      .update({ reward_points: profileRow.reward_points - payload.pointsToRedeem })
      .eq("id", profileId);
  }

  // ── 2. Insert vehicle ──────────────────────────────────────────────────
  const { data: vehicle, error: vehicleErr } = await supabase
    .from("vehicles")
    .insert({
      user_id: profileId,
      make: payload.vehicleMake.trim(),
      model: payload.vehicleModel.trim(),
      year: parseInt(payload.vehicleYear, 10),
      size: VEHICLE_SIZE_MAP[payload.vehicleSize],
    })
    .select("id")
    .single();

  if (vehicleErr || !vehicle) {
    console.error("[bookDetailing] vehicle insert:", vehicleErr);
    return {
      success: false,
      error: "Could not save vehicle info. Please try again.",
    };
  }

  const isPayNow = payload.paymentMethod === "pay_now";
  const bookingStatus = isPayNow ? "pending" : "confirmed";
  const paymentNote = isPayNow
    ? "💳 Payment: Pay Now (Stripe)"
    : "💳 Payment: Pay at Arrival";

  // ── 3. Insert booking ──────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      user_id: profileId,
      vehicle_id: vehicle.id,
      service_id: payload.serviceId,
      booking_date: payload.bookingDate,
      booking_time: to24h(payload.bookingTime),
      status: bookingStatus,
      total_price: payload.totalPrice,
      notes: [
        paymentNote,
        payload.serviceAddress
          ? `📍 Service Location: ${payload.serviceAddress}`
          : null,
        payload.travelFee != null && payload.travelFee > 0
          ? `🚗 Travel Fee: $${payload.travelFee.toFixed(2)}`
          : null,
        payload.setupFee != null && payload.setupFee > 0
          ? `🧹 One-time Setup & Reset: $${payload.setupFee.toFixed(2)}`
          : null,
        payload.pointsToRedeem != null && payload.pointsToRedeem > 0
          ? `🎁 Redeemed ${payload.pointsToRedeem} pts for $${(payload.pointsToRedeem / 10).toFixed(2)} off`
          : null,
        payload.couponDiscount != null && payload.couponDiscount > 0
          ? `🏷️ Promo code applied: $${payload.couponDiscount.toFixed(2)} off`
          : null,
        payload.notes || null,
      ]
        .filter(Boolean)
        .join("\n\n") || null,
      ...(payload.couponId ? { coupon_id: payload.couponId } : {}),
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("[bookDetailing] booking insert:", bookingErr);
    return {
      success: false,
      error: "Could not finalize your booking. Please try again.",
    };
  }

  // ── 3b. Earn: add 1 point per $1 spent on service (excluding travel) ─────
  const serviceSubtotal =
    payload.totalPrice +
    (payload.pointsToRedeem ?? 0) / 10 -
    (payload.travelFee ?? 0);
  const earnedPoints = Math.floor(Math.max(0, serviceSubtotal));
  if (earnedPoints > 0 && !isPayNow) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("reward_points")
      .eq("id", profileId)
      .single();
    if (prof && typeof prof.reward_points === "number") {
      await supabase
        .from("profiles")
        .update({ reward_points: prof.reward_points + earnedPoints })
        .eq("id", profileId);
    }
  }

  // ── 4a. Pay Now: create Stripe Checkout Session and return URL ─────────
  if (isPayNow) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[bookDetailing] STRIPE_SECRET_KEY missing");
      return { success: false, error: "Payment is not configured. Please try Pay at Arrival." };
    }
    const origin = payload.successUrl ?? payload.cancelUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com";
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(payload.totalPrice * 100),
              product_data: {
                name: payload.serviceName,
                description: `${payload.vehicleYear} ${payload.vehicleMake} ${payload.vehicleModel} · ${payload.bookingDate} at ${payload.bookingTime}`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: payload.email || undefined,
        metadata: {
          bookingId: booking.id,
          serviceId: payload.serviceId,
          serviceName: payload.serviceName.slice(0, 499),
          totalPrice: String(payload.totalPrice),
          vehicleSize: payload.vehicleSize,
          vehicleYear: payload.vehicleYear,
          vehicleMake: payload.vehicleMake.slice(0, 100),
          vehicleModel: payload.vehicleModel.slice(0, 100),
          bookingDate: payload.bookingDate,
          bookingTime: payload.bookingTime,
          serviceAddress: (payload.serviceAddress ?? "").slice(0, 499),
          customerName: payload.name.slice(0, 200),
          customerPhone: phoneDigits,
          customerEmail: payload.email.slice(0, 200),
          notes: (payload.notes ?? "").slice(0, 499),
          ...(payload.pointsToRedeem != null && payload.pointsToRedeem > 0 && { pointsToRedeem: String(payload.pointsToRedeem) }),
          ...(payload.travelFee != null && payload.travelFee > 0 && { travelFee: String(payload.travelFee) }),
          ...(payload.isApplyingReferralDiscount && user && {
            isApplyingReferralDiscount: "true",
            authUserId: user,
          }),
        },
        success_url: `${origin}/?stripe=success`,
        cancel_url: `${origin}/?stripe=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
      });
      return {
        success: true,
        bookingId: booking.id,
        checkoutUrl: session.url ?? undefined,
      };
    } catch (stripeErr) {
      console.error("[bookDetailing] Stripe session error:", stripeErr);
      return {
        success: false,
        error: stripeErr instanceof Error ? stripeErr.message : "Could not start checkout. Please try Pay at Arrival.",
      };
    }
  }

  // ── 3c. Referral: mark discount used + award referrer 200 pts ────────────
  // Only runs when the modal signals referral discount AND we have a fresh session (user).
  if (payload.isApplyingReferralDiscount && user) {
    try {
      const { data: authProfile } = await supabase
        .from("profiles")
        .select("referred_by, has_used_referral")
        .eq("id", user)
        .maybeSingle();

      if (authProfile?.referred_by && !authProfile.has_used_referral) {
        await supabase
          .from("profiles")
          .update({ has_used_referral: true })
          .eq("id", user);

        // 2. Credit 200 points to the referrer
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("reward_points")
          .eq("id", authProfile.referred_by)
          .maybeSingle();

        if (referrerProfile != null) {
          await supabase
            .from("profiles")
            .update({
              reward_points: (referrerProfile.reward_points ?? 0) + 200,
            })
            .eq("id", authProfile.referred_by);
        }
      }
    } catch (refErr) {
      // Non-fatal — log but don't fail the booking
      console.error("[bookDetailing] referral reward error:", refErr);
    }
  }

  // ── 4b. Send emails only after booking was successfully created ─────────
  const customerEmail = payload.email?.trim();
  if (customerEmail) {
    sendBookingEmail({
      customerEmail,
      bookingDetails: {
        customerName: payload.name,
        serviceName: payload.serviceName,
        vehicleYear: payload.vehicleYear,
        vehicleMake: payload.vehicleMake,
        vehicleModel: payload.vehicleModel,
        bookingDate: payload.bookingDate,
        bookingTime: payload.bookingTime,
        travelFee: Math.round(payload.travelFee ?? 0),
        totalPrice: payload.totalPrice,
      },
      totalPrice: payload.totalPrice,
    }).catch((err) => console.error("[bookDetailing] premium confirmation email error:", err));
  }

  sendBookingEmails(
    {
      bookingId: booking.id,
      customerName: payload.name,
      customerEmail: payload.email,
      customerPhone: phoneDigits,
      serviceName: payload.serviceName,
      servicePrice: payload.totalPrice,
      bookingDate: payload.bookingDate,
      bookingTime: payload.bookingTime,
      vehicleYear: payload.vehicleYear,
      vehicleMake: payload.vehicleMake,
      vehicleModel: payload.vehicleModel,
      vehicleSize: payload.vehicleSize,
      rewardPointsEarned: earnedPoints,
      serviceAddress: payload.serviceAddress || undefined,
      notes: payload.notes || undefined,
    },
    { skipCustomerEmail: true }
  ).catch((err) => console.error("[bookDetailing] admin email error:", err));

  return { success: true, bookingId: booking.id };
}
