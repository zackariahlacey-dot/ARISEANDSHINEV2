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
  /** Optional travel distance in miles */
  distanceMiles?: number;
  /** Optional add-ons (included in totalPrice) */
  selectedAddons?: { id: string; label: string; price: number }[];
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
export async function to24h(time12: string): Promise<string> {
  const [timePart, period] = time12.split(" ");
  const [rawH, rawM = "00"] = timePart.split(":");
  let h = parseInt(rawH, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${rawM}:00`;
}

/** "09:00:00" or "9:00 AM" → minutes from midnight */
export async function timeToMinutes(t: string): Promise<number> {
  const trimmed = t.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    if (match12[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (match12[3].toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  return 0;
}

export const SERVICE_DURATIONS: Record<string, Record<string, number>> = {
  "Interior Detail": { small: 180, medium: 180, large: 240, extra_large: 240 },
  "Exterior Detail": { small: 120, medium: 120, large: 180, extra_large: 180 },
  "Full Detail": { small: 240, medium: 240, large: 330, extra_large: 330 },
  "Interior Monthly Maintenance": { small: 90, medium: 90, large: 120, extra_large: 120 },
  "Full Detail Monthly Maintenance": { small: 150, medium: 150, large: 210, extra_large: 210 },
};

export async function checkAvailability(date: string, time: string, serviceName: string, size: string) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("booking_time, services(name), vehicles(size)")
    .eq("booking_date", date)
    .neq("status", "cancelled");

  if (!existing || existing.length === 0) return true;

  const newStart = await timeToMinutes(time);
  const newDur = SERVICE_DURATIONS[serviceName]?.[size] ?? 180;
  const newEnd = newStart + newDur;

  for (const b of existing) {
    const bStart = await timeToMinutes(b.booking_time);
    const bName = (b.services as any)?.name ?? "Interior Detail";
    const bSize = (b.vehicles as any)?.size ?? "medium";
    const bDur = SERVICE_DURATIONS[bName]?.[bSize] ?? 180;
    const bEnd = bStart + bDur;

    // Overlap if (start1 < end2) && (end1 > start2)
    if (newStart < bEnd && newEnd > bStart) return false;
  }
  return true;
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

  // ── 0. Check Availability ──────────────────────────────────────────────
  const isAvailable = await checkAvailability(
    payload.bookingDate,
    payload.bookingTime,
    payload.serviceName,
    VEHICLE_SIZE_MAP[payload.vehicleSize]
  );

  if (!isAvailable) {
    return {
      success: false,
      error: "This time slot was just taken. Please go back and select a different time.",
    };
  }

  // Use server-side session only; if no session, fall back to guest flow (do not error)
  const user = freshUser?.id ?? null;

  const phoneDigits = toPhoneDigits(payload.phone);

  // ── Split full name into first / last ──────────────────────────────────
  const parts = payload.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || null;

  // ── 1. Resolve profile: check by logged-in user, then email, then phone ──────────────────────────
  let profileId: string;
  const adminSupabase = createAdminClient();
  const emailLower = payload.email.trim().toLowerCase();

  // A. Check if user is logged in
  if (user) {
    profileId = user;
    // Always update/upsert the logged-in user's profile with their latest info
    await adminSupabase.from("profiles").upsert({
      id: profileId,
      email: emailLower,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phoneDigits.length >= 10 ? phoneDigits : null,
    }, { onConflict: "id" });
  } else {
    // B. Guest Flow: Try to find existing profile by Email first
    const { data: existingByEmail } = await adminSupabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .eq("email", emailLower)
      .maybeSingle();

    if (existingByEmail) {
      profileId = existingByEmail.id;
      // Update info if they provided new details
      await adminSupabase.from("profiles").update({
        first_name: firstName || existingByEmail.first_name,
        last_name: lastName || existingByEmail.last_name,
        phone: phoneDigits.length >= 10 ? phoneDigits : existingByEmail.phone,
      }).eq("id", profileId);
    } else {
      // C. Try to find by Phone if no email match
      const { data: existingByPhone } = await adminSupabase
        .from("profiles")
        .select("id, email")
        .eq("phone", phoneDigits)
        .maybeSingle();

      if (existingByPhone) {
        profileId = existingByPhone.id;
        // Update email if it was missing
        if (!existingByPhone.email) {
          await adminSupabase.from("profiles").update({ email: emailLower }).eq("id", profileId);
        }
      } else {
        // D. Truly new guest: create a random UUID profile
        const guestId = crypto.randomUUID();
        const { data: created, error: profileErr } = await adminSupabase
          .from("profiles")
          .insert({
            id: guestId,
            email: emailLower,
            first_name: firstName || null,
            last_name: lastName || null,
            phone: phoneDigits.length >= 10 ? phoneDigits : null,
            reward_points: 0,
            lifetime_points: 0,
          })
          .select("id")
          .single();

        if (profileErr || !created) {
          console.error("Profile Creation Error (Guest):", profileErr);
          return {
            success: false,
            error: `Could not create profile: ${profileErr?.message || "Unknown error"}.`,
          };
        }
        profileId = created.id;
      }
    }
  }

  const isPayNow = payload.paymentMethod === "pay_now";

  // ── 1b. Redeem points (Pay at Arrival only; Pay Now redeems in webhook after payment) ───────────
  if (!isPayNow && payload.pointsToRedeem != null && payload.pointsToRedeem > 0) {
    const { data: profileRow } = await adminSupabase
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
    await adminSupabase
      .from("profiles")
      .update({ reward_points: profileRow.reward_points - payload.pointsToRedeem })
      .eq("id", profileId);
  }

  // ── 2. Insert vehicle ──────────────────────────────────────────────────
  const vehicleYearInt = parseInt(payload.vehicleYear, 10);
  const { data: vehicle, error: vehicleErr } = await adminSupabase
    .from("vehicles")
    .insert({
      user_id: profileId,
      make: (payload.vehicleMake || "Unknown").trim(),
      model: (payload.vehicleModel || "Unknown").trim(),
      year: isNaN(vehicleYearInt) ? null : vehicleYearInt,
      size: VEHICLE_SIZE_MAP[payload.vehicleSize] || "small",
    })
    .select("id")
    .single();

  if (vehicleErr || !vehicle) {
    console.error("[bookDetailing] vehicle insert error:", vehicleErr);
    return {
      success: false,
      error: `Could not save vehicle info: ${vehicleErr?.message || "Unknown error"}. Please try again.`,
    };
  }

  const addonsNote = payload.selectedAddons && payload.selectedAddons.length > 0
    ? `✨ Add-ons:\n${payload.selectedAddons.map(a => `• ${a.label} ($${a.price})`).join("\n")}`
    : null;

  const paymentNote = isPayNow
    ? "💳 Payment: Pay Now (Stripe)"
    : "💳 Payment: Pay at Arrival";
  const notesBody = [
    `👤 Customer: ${payload.name} (${payload.phone})`,
    paymentNote,
    payload.serviceAddress
      ? `📍 Service Location: ${payload.serviceAddress}`
      : null,
    addonsNote,
    payload.travelFee != null && payload.travelFee > 0
      ? `🚗 Travel Fee: $${payload.travelFee.toFixed(2)}`
      : null,
    payload.setupFee != null && payload.setupFee > 0
      ? `🧹 One-time Setup & Reset: $${payload.setupFee.toFixed(2)}`
      : null,
    payload.pointsToRedeem != null && payload.pointsToRedeem > 0
      ? `🎁 Redeemed ${payload.pointsToRedeem} pts for ${payload.pointsToRedeem / 10}% off`
      : null,
    payload.couponDiscount != null && payload.couponDiscount > 0
      ? `🏷️ Promo code applied: $${payload.couponDiscount.toFixed(2)} off`
      : null,
    payload.notes || null,
  ]
    .filter(Boolean)
    .join("\n\n") || null;

  // ── Pay Now: create Stripe session with full booking payload in metadata; no DB booking yet ───
  if (isPayNow) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[bookDetailing] STRIPE_SECRET_KEY missing");
      return { success: false, error: "Payment is not configured. Please try Pay at Arrival." };
    }
    const origin = payload.successUrl ?? payload.cancelUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com";
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    const isSubscription = payload.serviceName.toLowerCase().includes("monthly");
    const mode = isSubscription ? "subscription" : "payment";
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (isSubscription) {
      // 1. Recurring Monthly Price (The base service price)
      // Interior Monthly is $100, Full Detail Monthly is $150
      const monthlyPrice = payload.serviceName.toLowerCase().includes("full detail") ? 150 : 100;
      
      line_items.push({
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          unit_amount: Math.round(monthlyPrice * 100),
          product_data: {
            name: payload.serviceName,
            description: "Monthly Maintenance Plan recurring fee",
          },
        },
        quantity: 1,
      });

      // 2. One-time Setup + Travel + Add-ons - Points
      // payload.totalPrice already includes (monthlyPrice + setupFee + travel + addons - points)
      const initialOneTimeCharge = payload.totalPrice - monthlyPrice;
      if (initialOneTimeCharge > 0) {
        line_items.push({
          price_data: {
            currency: "usd",
            unit_amount: Math.round(initialOneTimeCharge * 100),
            product_data: {
              name: "Initial Setup & Options",
              description: [
                `${payload.vehicleYear} ${payload.vehicleMake} ${payload.vehicleModel}`,
                `Appointment: ${payload.bookingDate} at ${payload.bookingTime}`,
                "Includes setup fee, add-ons, travel and discounts",
              ].join(" · "),
            },
          },
          quantity: 1,
        });
      }
    } else {
      // Standard one-off payment
      line_items.push({
        price_data: {
          currency: "usd",
          unit_amount: Math.round(payload.totalPrice * 100),
          product_data: {
            name: payload.serviceName,
            description: `${payload.vehicleYear} ${payload.vehicleMake} ${payload.vehicleModel} · ${payload.bookingDate} at ${payload.bookingTime}`,
          },
        },
        quantity: 1,
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode,
        line_items,
        customer_email: payload.email || undefined,
        metadata: {
          profileId,
          vehicleId: vehicle.id,
          serviceId: payload.serviceId,
          bookingDate: payload.bookingDate,
          bookingTime: await to24h(payload.bookingTime),
          totalPrice: String(payload.totalPrice),
          notes: (notesBody ?? "").slice(0, 500),
          serviceName: payload.serviceName.slice(0, 499),
          vehicleSize: payload.vehicleSize,
          vehicleYear: payload.vehicleYear,
          vehicleMake: payload.vehicleMake.slice(0, 100),
          vehicleModel: payload.vehicleModel.slice(0, 100),
          serviceAddress: (payload.serviceAddress ?? "").slice(0, 499),
          customerName: payload.name.slice(0, 200),
          customerPhone: phoneDigits,
          customerEmail: payload.email.slice(0, 200),
          ...(payload.couponId ? { couponId: payload.couponId } : {}),
          ...(payload.pointsToRedeem != null && payload.pointsToRedeem > 0 && { pointsToRedeem: String(payload.pointsToRedeem) }),
          ...(payload.travelFee != null && payload.travelFee > 0 && { travelFee: String(payload.travelFee) }),
          ...(payload.setupFee != null && payload.setupFee > 0 && { setupFee: String(payload.setupFee) }),
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
        bookingId: "", // No booking until webhook confirms payment
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

  // ── 3. Insert booking (Pay at Arrival only) ─────────────────────────────
  const { data: booking, error: bookingErr } = await adminSupabase
    .from("bookings")
    .insert({
      user_id: profileId,
      vehicle_id: vehicle.id,
      service_id: payload.serviceId,
      booking_date: payload.bookingDate,
      booking_time: await to24h(payload.bookingTime),
      status: "confirmed",
      total_price: payload.totalPrice,
      notes: notesBody,
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

  // ── 3b. Earn: add 1 point per $1 spent on service (Pay at Arrival only) ─────
  const serviceSubtotal =
    payload.totalPrice +
    (payload.pointsToRedeem ?? 0) / 10 -
    (payload.travelFee ?? 0);
  const earnedPoints = Math.floor(Math.max(0, serviceSubtotal));
  if (earnedPoints > 0) {
    const { data: prof } = await adminSupabase
      .from("profiles")
      .select("reward_points, lifetime_points")
      .eq("id", profileId)
      .single();
    if (prof && typeof prof.reward_points === "number") {
      const currentLifetime = typeof prof.lifetime_points === "number" ? prof.lifetime_points : 0;
      await adminSupabase
        .from("profiles")
        .update({
          reward_points: prof.reward_points + earnedPoints,
          lifetime_points: currentLifetime + earnedPoints,
        })
        .eq("id", profileId);

      // Add transaction entry so it shows in dashboard
      await adminSupabase.from("point_transactions").insert({
        user_id: profileId,
        amount: earnedPoints,
        description: `Earned from ${payload.serviceName}`,
      });
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
        await adminSupabase
          .from("profiles")
          .update({ has_used_referral: true })
          .eq("id", user);

        // 2. Credit 200 points to the referrer
        const { data: referrerProfile } = await adminSupabase
          .from("profiles")
          .select("reward_points")
          .eq("id", authProfile.referred_by)
          .maybeSingle();

        if (referrerProfile != null) {
          await adminSupabase
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
        customerPhone: payload.phone,
        customerEmail: payload.email,
        serviceAddress: payload.serviceAddress,
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
      distanceMiles: payload.distanceMiles || undefined,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes || undefined,
    },
    { skipCustomerEmail: true }
  ).catch((err) => console.error("[bookDetailing] admin email error:", err));

  return { success: true, bookingId: booking.id };
}
