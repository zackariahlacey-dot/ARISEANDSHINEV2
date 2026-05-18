"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmails } from "@/lib/email";
import { sendBookingEmail, sendBookerAccountInviteEmail } from "@/app/actions/sendBookingEmail";
import { profileHasAuthUser } from "@/lib/auth/profileHasAuthUser";
import Stripe from "stripe";
import { SERVICE_DURATIONS, VEHICLE_SIZE_MAP } from "@/lib/constants";
import { getDurationMins, getAdditionalVehiclesDuration, isWholeDayBooking } from "@/lib/availability";
import { logError } from "@/app/actions/logError";
import { cashPriceFor } from "@/lib/cashPricing";

export type VehicleSizeSlug = keyof typeof VEHICLE_SIZE_MAP;

/** One additional vehicle added to a multi-vehicle booking ($25 off per vehicle) */
export type AdditionalVehicle = {
  vehicleSize: VehicleSizeSlug;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceId: string;
  serviceName: string;
  /** Price already discounted by $25 */
  servicePrice: number;
  selectedAddons?: { id: string; label: string; price: number }[];
};

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
  /** Additional vehicles (2nd, 3rd, etc.) — each gets $25 off, -1 hr service time */
  additionalVehicles?: AdditionalVehicle[];
  /** When "pay_now", booking is created as pending and a Stripe Checkout URL is returned */
  paymentMethod?: "pay_at_arrival" | "pay_now";
  /** Required when paymentMethod is "pay_now" for Stripe redirect URLs */
  successUrl?: string;
  cancelUrl?: string;
  /** Points to redeem (10 pts = $1 off). totalPrice is already discounted. */
  pointsToRedeem?: number;
  couponId?: string;
  /** Promo code text (e.g. "SUMMER25") — snapshotted onto the booking notes
   *  so admins can see which code was redeemed without joining the coupons table. */
  couponCode?: string;
  couponDiscount?: number;
  /** Gift card code applied at checkout */
  giftCardCode?: string;
  /** Dollar amount discounted by gift card (deducted from total before charging) */
  giftCardDiscount?: number;
  /** Gift card UUID — needed to deduct the balance */
  giftCardId?: string;
  /** Premium Annual Membership — credit applied to this booking (in dollars).
   *  When set, the system validates the membership has sufficient balance
   *  and atomically deducts it after the booking is confirmed. */
  membershipId?: string;
  membershipCreditApplied?: number;
  /** Loyalty discount snapshot — pct + dollar amount applied to service price.
   *  Stored on the booking notes so admin can audit exactly what discount was
   *  applied without recomputing from the profile (which may have changed). */
  loyaltyDiscountPct?: number;
  loyaltyDiscountAmount?: number;
  /** Build Your Package bundle discount — total dollars off across all add-ons
   *  when the customer stacked 2+. Snapshotted to notes for audit. */
  bundleDiscount?: number;
  bundleAddonCount?: number;
  /** Flat multi-vehicle discount applied once when 2+ vehicles are on the
   *  booking: $25 when combined vehicle subtotal ≤ $500, else $40. */
  multiVehicleDiscount?: number;
};

export type BookingResult =
  | {
      success: true;
      bookingId: string;
      checkoutUrl?: string;
      /** New loyalty count after this booking (only set for logged-in qualifying services) */
      loyaltyNewCount?: number;
      /** New discount % after this booking */
      loyaltyNewDiscountPct?: number;
      /** Tier name if just unlocked ("Member" | "Silver" | "Gold" | "VIP") */
      loyaltyTierJustUnlocked?: string;
    }
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

export async function checkAvailability(
  date: string,
  time: string,
  serviceName: string,
  size: string,
  customDurationMins?: number
) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("booking_time, service_name, vehicle_size, additional_vehicles_json, duration_override, services(name), vehicles(size)")
    .eq("booking_date", date)
    .neq("status", "cancelled")
    .neq("status", "no-show");

  const newStart = await timeToMinutes(time);
  const newDur = customDurationMins ?? getDurationMins(serviceName, size);
  const newEnd = newStart + newDur;
  const customerIsWholeDay = isWholeDayBooking(newDur);

  // Whole-day reservations require the day to be entirely empty — any
  // existing booking blocks them.
  if (customerIsWholeDay && existing && existing.length > 0) return false;
  if (!existing || existing.length === 0) return true;

  for (const b of existing) {
    const bStart = await timeToMinutes(b.booking_time);
    const bName = (b as any).service_name ?? (b.services as any)?.name ?? "";
    const bSize = (b as any).vehicle_size ?? (b.vehicles as any)?.size ?? "sedan";
    const bOverride = (b as any).duration_override;
    const bDur = bOverride != null
      ? bOverride
      : getDurationMins(bName, bSize) + getAdditionalVehiclesDuration((b as any).additional_vehicles_json);
    // A pre-existing whole-day booking on this day blocks all new slots
    // even if they don't directly overlap by the minute.
    if (isWholeDayBooking(bDur)) return false;
    const bEnd = bStart + bDur;
    if (newStart < bEnd && newEnd > bStart) return false;
  }
  return true;
}

/** Normalize phone to raw 10 digits for database storage and lookups.
 *  Strips country code +1 / 1 prefix so "18025550100" → "8025550100". */
function toPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip leading US country code (1) if total length is 11 and starts with 1
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(0, 10);
}

export async function bookDetailing(
  payload: BookingPayload
): Promise<BookingResult> {
  const supabase = await createClient();

  // ── Fresh session check ─────────────────────────────────────────────────
  const {
    data: { user: freshUser },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("Current User during booking:", freshUser?.id ?? null, freshUser?.email ?? null);
  if (userError) {
    console.error("Auth error during booking:", userError);
  }

  // ── 0. Check Availability ───────────────────────────────────────────────
  // For multi-vehicle bookings, use the total combined duration so the slot
  // accounts for all vehicles being serviced in sequence.
  const primaryDur =
    SERVICE_DURATIONS[payload.serviceName]?.[VEHICLE_SIZE_MAP[payload.vehicleSize]] ?? 180;
  const additionalDur = (payload.additionalVehicles ?? []).reduce((sum, av) => {
    const base = getDurationMins(av.serviceName, av.vehicleSize);
    return sum + Math.max(30, base - 30); // -30 min efficiency discount per extra vehicle
  }, 0);
  const totalBookingDur = primaryDur + additionalDur;

  const isAvailable = await checkAvailability(
    payload.bookingDate,
    payload.bookingTime,
    payload.serviceName,
    VEHICLE_SIZE_MAP[payload.vehicleSize],
    totalBookingDur > primaryDur ? totalBookingDur : undefined
  );
  if (!isAvailable) {
    logError({ type: "booking_attempt", source: "bookDetailing", message: "Slot unavailable at checkout", details: { name: payload.name, email: payload.email, phone: toPhoneDigits(payload.phone), service: payload.serviceName, date: payload.bookingDate, time: payload.bookingTime } });
    return {
      success: false,
      error: "This time slot was just taken. Please go back and select a different time.",
    };
  }

  const user = freshUser?.id ?? null;
  const phoneDigits = toPhoneDigits(payload.phone);
  const emailLower = payload.email.trim().toLowerCase();

  // ── Split full name ──────────────────────────────────────────────────────
  const parts = payload.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || null;

  // ── 1. Resolve profile ──────────────────────────────────────────────────
  // Priority: logged-in session → auth.users by email → profiles by email
  //           → profiles by phone → new guest profile
  // If email matches an auth account the booking links to that account
  // and the customer earns points even if they didn't log in.
  let profileId: string;
  const adminSupabase = createAdminClient();

  if (user) {
    // A. Already authenticated — use session UUID
    profileId = user;
    await adminSupabase.from("profiles").upsert({
      id: profileId,
      email: emailLower,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phoneDigits.length >= 10 ? phoneDigits : null,
    }, { onConflict: "id" });
  } else {
    // B. Guest flow ─────────────────────────────────────────────────────────
    // Step 1: Check profiles table by email (fast path — covers returning guests
    //         AND auth users who have booked before)
    const { data: existingByEmail } = await adminSupabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .eq("email", emailLower)
      .maybeSingle();

    if (existingByEmail) {
      profileId = existingByEmail.id;
      await adminSupabase.from("profiles").update({
        first_name: firstName || existingByEmail.first_name,
        last_name: lastName || existingByEmail.last_name,
        phone: phoneDigits.length >= 10 ? phoneDigits : existingByEmail.phone,
      }).eq("id", profileId);
    } else {
      // Step 2: Check auth.users by email — catches account holders who exist
      //         in auth but whose profile email hasn't been written yet
      let foundAuthUserId: string | null = null;
      try {
        const { data: authData } = await adminSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const match = authData?.users?.find(
          (u) => u.email?.toLowerCase() === emailLower
        );
        if (match) foundAuthUserId = match.id;
      } catch (e) {
        console.warn("[bookDetailing] auth.admin.listUsers error (non-fatal):", e);
      }

      if (foundAuthUserId) {
        profileId = foundAuthUserId;
        // Ensure the profile row exists and has current info
        await adminSupabase.from("profiles").upsert({
          id: profileId,
          email: emailLower,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phoneDigits.length >= 10 ? phoneDigits : null,
        }, { onConflict: "id" });
      } else {
        // Step 3: Check profiles by phone
        const { data: existingByPhone } = await adminSupabase
          .from("profiles")
          .select("id, email")
          .eq("phone", phoneDigits)
          .maybeSingle();

        if (existingByPhone) {
          profileId = existingByPhone.id;
          if (!existingByPhone.email) {
            await adminSupabase
              .from("profiles")
              .update({ email: emailLower })
              .eq("id", profileId);
          }
        } else {
          // Step 4: Brand-new guest — create profile
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
            logError({ type: "booking_attempt", source: "bookDetailing/profile", message: profileErr?.message ?? "Profile creation failed", details: { name: payload.name, email: emailLower, phone: phoneDigits, service: payload.serviceName, date: payload.bookingDate, time: payload.bookingTime } });
            return {
              success: false,
              error: `Could not create profile: ${profileErr?.message || "Unknown error"}.`,
            };
          }
          profileId = created.id;
        }
      }
    }
  }

  const isPayNow = payload.paymentMethod === "pay_now";
  const isSubscriptionService = payload.serviceName.toLowerCase().includes("monthly");

  // Booking is always stored at the CARD/full price — that's the "owed" amount.
  // Cash discount is shown in the UI and emails as a "save $X if paying cash"
  // hint, but is only applied at the register when the customer hands over cash.
  // Loyalty/points and accounting always reference the card price.
  const bookingTotal = payload.totalPrice;
  // Cash-on-arrival discount applies only to non-subscription Pay-at-Arrival
  // bookings. Pay Now goes through Stripe at the card price; subscriptions
  // are Stripe-billed and shouldn't be discounted.
  const cashTotal = !isPayNow && !isSubscriptionService && bookingTotal > 0
    ? cashPriceFor(bookingTotal)
    : null;
  // Pass the cash-discounted amount to emails so they can render the
  // "Card $X · Cash $Y if paying cash" comparison.
  const emailCashPrice = cashTotal != null && cashTotal < bookingTotal ? cashTotal : undefined;

  // ── 1b. Validate point redemption (Pay at Arrival only) — deduction deferred until booking confirmed
  if (!isPayNow && payload.pointsToRedeem != null && payload.pointsToRedeem > 0) {
    const { data: profileRow } = await adminSupabase
      .from("profiles")
      .select("reward_points")
      .eq("id", profileId)
      .single();
    if (
      !profileRow ||
      typeof profileRow.reward_points !== "number" ||
      profileRow.reward_points < payload.pointsToRedeem
    ) {
      return {
        success: false,
        error: "You don't have enough reward points to redeem. Please adjust or continue without redeeming.",
      };
    }
  }

  // ── 1b2. Validate membership credit (deducted after booking confirms) ───
  // Verify the membership belongs to this profile, is active, and has enough credit.
  // Actual deduction happens atomically via consume_membership_credit RPC below.
  if (payload.membershipId && payload.membershipCreditApplied && payload.membershipCreditApplied > 0) {
    const { data: m } = await adminSupabase
      .from("memberships")
      .select("id, profile_id, status, expires_at, credit_balance_cents")
      .eq("id", payload.membershipId)
      .maybeSingle();
    const creditCents = Math.round(payload.membershipCreditApplied * 100);
    if (!m
      || m.profile_id !== profileId
      || m.status !== "active"
      || new Date(m.expires_at as string) <= new Date()
      || Number(m.credit_balance_cents) < creditCents
    ) {
      return {
        success: false,
        error: "Membership credit could not be applied. Please refresh and try again.",
      };
    }
  }

  // ── 1c. Deduct gift card balance (Pay at Arrival only) ──────────────────
  if (!isPayNow && payload.giftCardId && payload.giftCardDiscount && payload.giftCardDiscount > 0) {
    const { data: gc } = await adminSupabase
      .from("gift_cards")
      .select("remaining_balance, is_active")
      .eq("id", payload.giftCardId)
      .maybeSingle();
    if (gc && gc.is_active && Number(gc.remaining_balance) >= payload.giftCardDiscount) {
      await adminSupabase
        .from("gift_cards")
        .update({ remaining_balance: Number(gc.remaining_balance) - payload.giftCardDiscount })
        .eq("id", payload.giftCardId);
    }
  }

  // ── 2. Insert vehicle ───────────────────────────────────────────────────
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
    logError({ type: "booking_attempt", source: "bookDetailing/vehicle", message: vehicleErr?.message ?? "Vehicle insert failed", details: { name: payload.name, email: emailLower, phone: phoneDigits, service: payload.serviceName, date: payload.bookingDate, time: payload.bookingTime } });
    return {
      success: false,
      error: `Could not save vehicle info: ${vehicleErr?.message || "Unknown error"}. Please try again.`,
    };
  }

  // ── 2b. Insert additional vehicles (multi-vehicle booking) ──────────────
  const additionalVehicleDbIds: string[] = [];
  for (const av of (payload.additionalVehicles ?? [])) {
    const avYear = parseInt(av.vehicleYear, 10);
    const { data: avData, error: avErr } = await adminSupabase
      .from("vehicles")
      .insert({
        user_id: profileId,
        make: (av.vehicleMake || "Unknown").trim(),
        model: (av.vehicleModel || "Unknown").trim(),
        year: isNaN(avYear) ? null : avYear,
        size: VEHICLE_SIZE_MAP[av.vehicleSize] || "small",
      })
      .select("id")
      .single();
    if (avErr) console.error("[bookDetailing] additional vehicle insert error:", avErr);
    if (avData) additionalVehicleDbIds.push(avData.id);
  }

  const additionalVehiclesForDb =
    (payload.additionalVehicles ?? []).length > 0
      ? (payload.additionalVehicles ?? []).map((av, i) => ({
          vehicleSize: av.vehicleSize,
          vehicleYear: av.vehicleYear,
          vehicleMake: av.vehicleMake,
          vehicleModel: av.vehicleModel,
          serviceId: av.serviceId,
          serviceName: av.serviceName,
          servicePrice: av.servicePrice,
          selectedAddons: av.selectedAddons ?? [],
          vehicleDbId: additionalVehicleDbIds[i] ?? null,
        }))
      : null;

  // ── Build notes body (human-readable for internal reference) ────────────
  const addonsNote =
    payload.selectedAddons && payload.selectedAddons.length > 0
      ? `✨ Add-ons:\n${payload.selectedAddons.map((a) => `• ${a.label} ($${a.price})`).join("\n")}`
      : null;
  const paymentNote = isPayNow
    ? "💳 Payment: Pay Now (Stripe)"
    : "💳 Payment: Pay at Arrival";
  const notesBody =
    [
      `👤 Customer: ${payload.name} (${payload.phone})`,
      paymentNote,
      payload.serviceAddress ? `📍 Service Location: ${payload.serviceAddress}` : null,
      addonsNote,
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
        ? `🏷️ Promo code${payload.couponCode ? ` ${payload.couponCode}` : ""} applied: $${payload.couponDiscount.toFixed(2)} off`
        : null,
      payload.loyaltyDiscountAmount != null && payload.loyaltyDiscountAmount > 0
        ? `⭐ Loyalty discount (${payload.loyaltyDiscountPct ?? 0}% off): $${payload.loyaltyDiscountAmount.toFixed(2)} off`
        : null,
      payload.bundleDiscount != null && payload.bundleDiscount > 0
        ? `🎁 Bundle discount (${payload.bundleAddonCount ?? 0} add-ons): $${payload.bundleDiscount.toFixed(2)} off`
        : null,
      payload.multiVehicleDiscount != null && payload.multiVehicleDiscount > 0
        ? `🚗 Multi-vehicle discount (${1 + (payload.additionalVehicles?.length ?? 0)} vehicles): $${payload.multiVehicleDiscount.toFixed(2)} off`
        : null,
      payload.membershipId && payload.membershipCreditApplied && payload.membershipCreditApplied > 0
        ? `👑 Membership credit applied: $${payload.membershipCreditApplied.toFixed(2)}`
        : null,
      payload.giftCardCode && payload.giftCardDiscount != null && payload.giftCardDiscount > 0
        ? `🎁 Gift card (${payload.giftCardCode}): $${payload.giftCardDiscount.toFixed(2)} off`
        : null,
      (payload.additionalVehicles ?? []).length > 0
        ? `🚗 Additional vehicles (${payload.additionalVehicles!.length}):\n${payload.additionalVehicles!.map((av, i) => {
            const addons = av.selectedAddons?.length
              ? "\n     Add-ons: " + av.selectedAddons.map(a => `${a.label} ($${a.price})`).join(", ")
              : "";
            return `  ${i + 2}. ${av.vehicleYear} ${av.vehicleMake} ${av.vehicleModel} — ${av.serviceName} ($${av.servicePrice})${addons}`;
          }).join("\n")}`
        : null,
      payload.notes || null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

  // ── Pay Now: create Stripe session; no DB booking until webhook ─────────
  if (isPayNow) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[bookDetailing] STRIPE_SECRET_KEY missing");
      return { success: false, error: "Payment is not configured. Please try Pay at Arrival." };
    }
    // Strip trailing slash so appending ?stripe=... never produces double-slash
    const origin = (
      payload.successUrl ??
      payload.cancelUrl ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://ariseandshinevt.com"
    ).replace(/\/$/, "");
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    const isSubscription = payload.serviceName.toLowerCase().includes("monthly");
    const mode = isSubscription ? "subscription" : "payment";
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (isSubscription) {
      const addonsTotal = (payload.selectedAddons ?? []).reduce((sum, a) => sum + a.price, 0);
      const monthlyPrice = payload.totalPrice - (payload.setupFee ?? 0) - (payload.travelFee ?? 0) - addonsTotal;
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
      // Builder bookings (Interior/Exterior/Full Detail) display as
      // "Custom Package (Foundation)" on the Stripe checkout page so the
      // customer recognizes their builder order.
      const svcLower = (payload.serviceName ?? "").toLowerCase();
      const isBuilder = svcLower === "interior detail" || svcLower === "exterior detail" || svcLower === "full detail";
      const foundationLabel = svcLower === "interior detail" ? "Interior"
        : svcLower === "exterior detail" ? "Exterior"
        : "Full";
      const stripeProductName = isBuilder ? `Custom Package (${foundationLabel})` : payload.serviceName;
      line_items.push({
        price_data: {
          currency: "usd",
          unit_amount: Math.round(payload.totalPrice * 100),
          product_data: {
            name: stripeProductName,
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
          // Direct lead fields (written to booking by webhook)
          serviceName: payload.serviceName.slice(0, 499),
          customerName: payload.name.slice(0, 200),
          customerPhone: phoneDigits,
          customerEmail: emailLower.slice(0, 200),
          serviceAddress: (payload.serviceAddress ?? "").slice(0, 499),
          vehicleSize: VEHICLE_SIZE_MAP[payload.vehicleSize] || "small",
          vehicleYear: payload.vehicleYear,
          vehicleMake: payload.vehicleMake.slice(0, 100),
          vehicleModel: payload.vehicleModel.slice(0, 100),
          addonsJson: payload.selectedAddons && payload.selectedAddons.length > 0
            ? JSON.stringify(payload.selectedAddons).slice(0, 400)
            : "",
          // Additional vehicles for multi-vehicle bookings (compact keys, ≤500 chars)
          // NOTE: condition checks payload length, not DB insert success — ensures
          // webhook always receives vehicle data even if vehicle row inserts failed.
          ...((payload.additionalVehicles ?? []).length > 0 && {
            additionalVehicleIds: additionalVehicleDbIds.join(",").slice(0, 499),
            additionalVehiclesJson: JSON.stringify(
              (payload.additionalVehicles ?? []).map(av => ({
                sz: av.vehicleSize,
                yr: av.vehicleYear.slice(0, 4),
                mk: av.vehicleMake.slice(0, 30),
                md: av.vehicleModel.slice(0, 30),
                sn: av.serviceName.slice(0, 40),
                sp: av.servicePrice,
              }))
            ).slice(0, 499),
          }),
          ...(payload.couponId ? { couponId: payload.couponId, couponCode: (payload.couponCode ?? "").slice(0, 50), couponDiscount: String(payload.couponDiscount ?? 0) } : {}),
          ...(payload.pointsToRedeem != null &&
            payload.pointsToRedeem > 0 && {
              pointsToRedeem: String(payload.pointsToRedeem),
            }),
          ...(payload.travelFee != null &&
            payload.travelFee > 0 && { travelFee: String(payload.travelFee) }),
          ...(payload.setupFee != null &&
            payload.setupFee > 0 && { setupFee: String(payload.setupFee) }),
          ...(payload.giftCardId && payload.giftCardDiscount != null && payload.giftCardDiscount > 0 && {
            giftCardId: payload.giftCardId,
            giftCardCode: payload.giftCardCode ?? "",
            giftCardDiscount: String(payload.giftCardDiscount),
          }),
          ...(payload.membershipId && payload.membershipCreditApplied && payload.membershipCreditApplied > 0 && {
            membershipId: payload.membershipId,
            membershipCreditAppliedCents: String(Math.round(payload.membershipCreditApplied * 100)),
          }),
},
        success_url: `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?stripe=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
      });
      return {
        success: true,
        bookingId: "",
        checkoutUrl: session.url ?? undefined,
      };
    } catch (stripeErr) {
      console.error("[bookDetailing] Stripe session error:", stripeErr);
      return {
        success: false,
        error:
          stripeErr instanceof Error
            ? stripeErr.message
            : "Could not start checkout. Please try Pay at Arrival.",
      };
    }
  }

  // ── 3. Insert booking (Pay at Arrival) ──────────────────────────────────
  const { data: booking, error: bookingErr } = await adminSupabase
    .from("bookings")
    .insert({
      user_id: profileId,
      vehicle_id: vehicle.id,
      service_id: payload.serviceId,
      booking_date: payload.bookingDate,
      booking_time: await to24h(payload.bookingTime),
      status: "confirmed",
      total_price: bookingTotal,
      notes: notesBody,
      // ── Direct lead capture snapshot ──────────────────────────────────────
      customer_name:   payload.name,
      customer_email:  emailLower,
      customer_phone:  phoneDigits,
      service_address: payload.serviceAddress || null,
      vehicle_make:    (payload.vehicleMake || "Unknown").trim(),
      vehicle_model:   (payload.vehicleModel || "Unknown").trim(),
      vehicle_year:    payload.vehicleYear || null,
      vehicle_size:    VEHICLE_SIZE_MAP[payload.vehicleSize] || null,
      service_name:    payload.serviceName,
      addons_json:
        payload.selectedAddons && payload.selectedAddons.length > 0
          ? payload.selectedAddons
          : null,
      additional_vehicles_json: additionalVehiclesForDb,
...(payload.couponId ? { coupon_id: payload.couponId } : {}),
      ...(payload.membershipId && payload.membershipCreditApplied && payload.membershipCreditApplied > 0
        ? {
            membership_id: payload.membershipId,
            membership_credit_applied_cents: Math.round(payload.membershipCreditApplied * 100),
          }
        : {}),
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("[bookDetailing] booking insert:", bookingErr);
    logError({ type: "booking_attempt", source: "bookDetailing/insert", message: bookingErr?.message ?? "Booking insert failed", details: { name: payload.name, email: emailLower, phone: phoneDigits, service: payload.serviceName, date: payload.bookingDate, time: payload.bookingTime } });
    return {
      success: false,
      error: "Could not finalize your booking. Please try again.",
    };
  }

  // ── 3a-pre0. Consume membership credit atomically ──────────────────────
  // RPC is atomic + balance-checked at the DB layer, so concurrent bookings
  // can't drive the balance negative. If it fails after the booking row is
  // already inserted, we log but don't fail the booking — admin can reconcile.
  if (payload.membershipId && payload.membershipCreditApplied && payload.membershipCreditApplied > 0) {
    const creditCents = Math.round(payload.membershipCreditApplied * 100);
    const { error: consumeErr } = await adminSupabase.rpc("consume_membership_credit", {
      p_membership_id: payload.membershipId,
      p_amount_cents:  creditCents,
    });
    if (consumeErr) {
      console.error("[bookDetailing] membership credit consume failed (booking remains confirmed):", consumeErr);
      logError({ type: "general", source: "bookDetailing/membershipCredit", message: consumeErr.message, details: { bookingId: booking.id, membershipId: payload.membershipId, creditCents } });
    }
  }

  // ── 3a-pre. Auto-deactivate the coupon if it just hit its usage limit ────
  // Counted from the bookings table (not a separate counter) so cancellations
  // and re-issuances don't drift. If the just-created booking pushed usage
  // up to max_uses, flip is_active=false so future customers see "no longer active".
  if (payload.couponId) {
    const { data: couponRow } = await adminSupabase
      .from("coupons")
      .select("max_uses, is_active")
      .eq("id", payload.couponId)
      .maybeSingle();
    if (couponRow?.is_active && couponRow.max_uses != null && couponRow.max_uses > 0) {
      const { count } = await adminSupabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", payload.couponId);
      if ((count ?? 0) >= couponRow.max_uses) {
        await adminSupabase
          .from("coupons")
          .update({ is_active: false })
          .eq("id", payload.couponId);
      }
    }
  }

  // ── 3a. Deduct redeemed points — now that booking is confirmed ───────────
  if (!isPayNow && payload.pointsToRedeem != null && payload.pointsToRedeem > 0) {
    const { data: redeemRow } = await adminSupabase
      .from("profiles")
      .select("reward_points")
      .eq("id", profileId)
      .single();
    if (redeemRow && typeof redeemRow.reward_points === "number") {
      await adminSupabase
        .from("profiles")
        .update({ reward_points: Math.max(0, redeemRow.reward_points - payload.pointsToRedeem) })
        .eq("id", profileId);
      await adminSupabase.from("point_transactions").insert({
        user_id:     profileId,
        amount:      -payload.pointsToRedeem,
        description: `Redeemed for ${payload.serviceName}`,
      });
    }
  }

  // ── 3b. Earn points (1 pt per $1 of service cost, excluding travel) ─────
  const serviceSubtotal =
    bookingTotal +
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
      const currentLifetime =
        typeof prof.lifetime_points === "number" ? prof.lifetime_points : 0;
      await adminSupabase
        .from("profiles")
        .update({
          reward_points: prof.reward_points + earnedPoints,
          lifetime_points: currentLifetime + earnedPoints,
        })
        .eq("id", profileId);

      await adminSupabase.from("point_transactions").insert({
        user_id: profileId,
        amount: earnedPoints,
        description: `Earned from ${payload.serviceName}`,
      });
    }
  }

  // ── 4. Send emails ──────────────────────────────────────────────────────
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
        totalPrice: bookingTotal,
        cashPrice: emailCashPrice,
        addonsJson: payload.selectedAddons?.length ? payload.selectedAddons : undefined,
        additionalVehicles: (payload.additionalVehicles ?? []).length > 0
          ? payload.additionalVehicles!.map(av => ({
              vehicleYear: av.vehicleYear,
              vehicleMake: av.vehicleMake,
              vehicleModel: av.vehicleModel,
              serviceName: av.serviceName,
              servicePrice: av.servicePrice,
              selectedAddons: av.selectedAddons,
            }))
          : undefined,
        durationMins: totalBookingDur,
        multiVehicleDiscount: payload.multiVehicleDiscount,
      },
      totalPrice: bookingTotal,
    }).catch((err) =>
      console.error("[bookDetailing] confirmation email error:", err)
    );

    // Guest bookers: separate email to create an Auth account (bookings merge by email on signup)
    profileHasAuthUser(profileId).then((hasAuth) => {
      if (!hasAuth) {
        return sendBookerAccountInviteEmail({
          customerEmail,
          customerName: payload.name,
        });
      }
      return { ok: true as const };
    }).catch((err) => console.error("[bookDetailing] account invite email error:", err));
  }

  sendBookingEmails(
    {
      bookingId: booking.id,
      customerName: payload.name,
      customerEmail: payload.email,
      customerPhone: phoneDigits,
      serviceName: payload.serviceName,
      servicePrice: bookingTotal,
      cashPrice: emailCashPrice,
      bookingDate: payload.bookingDate,
      bookingTime: payload.bookingTime,
      vehicleYear: payload.vehicleYear,
      vehicleMake: payload.vehicleMake,
      vehicleModel: payload.vehicleModel,
      vehicleSize: payload.vehicleSize,
      serviceAddress: payload.serviceAddress || undefined,
      distanceMiles: payload.distanceMiles || undefined,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes || undefined,
      addonsJson: payload.selectedAddons?.length ? payload.selectedAddons : undefined,
      additionalVehicles: (payload.additionalVehicles ?? []).length > 0
        ? payload.additionalVehicles!.map(av => ({
            vehicleYear: av.vehicleYear,
            vehicleMake: av.vehicleMake,
            vehicleModel: av.vehicleModel,
            serviceName: av.serviceName,
            servicePrice: av.servicePrice,
            selectedAddons: av.selectedAddons,
          }))
        : undefined,
      multiVehicleDiscount: payload.multiVehicleDiscount,
    },
    { skipCustomerEmail: true }
  ).catch((err) => console.error("[bookDetailing] admin email error:", err));

  // ── Loyalty: increment count for logged-in users booking a qualifying service ──
  let loyaltyNewCount: number | undefined;
  let loyaltyNewDiscountPct: number | undefined;
  let loyaltyTierJustUnlocked: string | undefined;

  if (user && profileId) {
    const { CAR_DETAIL_SERVICES, getDiscountPct, getTier } = await import("@/lib/loyalty");
    if (CAR_DETAIL_SERVICES.has(payload.serviceName)) {
      const { data: profileRow } = await adminSupabase
        .from("profiles")
        .select("completed_detail_count, loyalty_discount_pct")
        .eq("id", profileId)
        .single();
      const prevCount = (profileRow as any)?.completed_detail_count ?? 0;
      const prevPct   = (profileRow as any)?.loyalty_discount_pct   ?? 0;
      const newCount  = prevCount + 1;
      const newPct    = getDiscountPct(newCount);
      await adminSupabase.from("profiles").update({
        completed_detail_count: newCount,
        loyalty_discount_pct:   newPct,
      }).eq("id", profileId);
      loyaltyNewCount      = newCount;
      loyaltyNewDiscountPct = newPct;
      if (newPct > prevPct) {
        loyaltyTierJustUnlocked = getTier(newCount)?.label;
      }
    }
  }

  return {
    success: true,
    bookingId: booking.id,
    loyaltyNewCount,
    loyaltyNewDiscountPct,
    loyaltyTierJustUnlocked,
  };
}
