"use server";

/**
 * Cross-sell coupon system — honoring coupons issued by our sister
 * exterior site (ariseandshineexteriors.com).
 *
 * The exterior site INSERTS rows into public.cross_sell_events with
 * from_business='exterior', to_business='detailing', auto-updates
 * discount_pct as the customer crosses the 7-day mark. We:
 *   1. READ to validate any coupon arriving via ?coupon=CODE
 *   2. UPDATE redeemed_at + redeemed_booking_id when a booking
 *      actually completes (not at validation — abandoned carts
 *      shouldn't burn coupons).
 *
 * We never touch the schema or any other column. All access goes
 * through the service-role client because anon visitors need to
 * validate during checkout but can't see other customers' rows
 * under our existing RLS.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const TABLE = "cross_sell_events";
const TO_BUSINESS = "detailing";

export type CrossSellValidation =
  | {
      ok: true;
      eventId: string;
      code: string;
      discountPct: number;
      expiresAt: string;
    }
  | {
      ok: false;
      reason: "not_found" | "wrong_direction" | "expired" | "already_used" | "lookup_error";
      message: string;
    };

/** Normalize a code from URL / paste to the canonical stored shape.
 *  Cross-sell codes are uppercase strings — trim + uppercase keeps
 *  validation tolerant of casing without altering equality semantics. */
function normalize(code: string): string {
  return (code || "").trim().toUpperCase();
}

/**
 * Validate a cross-sell coupon code. Read-only — does NOT mark redeemed.
 *
 * Returns the current effective discount_pct directly from the row
 * (the exterior dashboard maintains the time-tier; we just trust it).
 */
export async function validateCrossSellCoupon(rawCode: string): Promise<CrossSellValidation> {
  const code = normalize(rawCode);
  if (!code) return { ok: false, reason: "not_found", message: "Enter a coupon code to apply." };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, coupon_code, discount_pct, expires_at, redeemed_at, to_business")
      .eq("coupon_code", code)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[validateCrossSellCoupon] supabase error:", error.message);
      return { ok: false, reason: "lookup_error", message: "Could not verify coupon. Try again." };
    }
    if (!data) {
      return { ok: false, reason: "not_found", message: "Coupon code not found." };
    }
    // Defensive: only honor coupons explicitly issued FOR detailing.
    if ((data as { to_business?: string }).to_business !== TO_BUSINESS) {
      return { ok: false, reason: "wrong_direction", message: "This coupon is not valid here." };
    }
    if ((data as { redeemed_at?: string | null }).redeemed_at) {
      return { ok: false, reason: "already_used", message: "This coupon has already been used." };
    }
    const expiresAt = (data as { expires_at?: string | null }).expires_at;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return { ok: false, reason: "expired", message: "This coupon has expired." };
    }

    const discountPct = Number((data as { discount_pct?: number | null }).discount_pct ?? 0);
    if (discountPct <= 0) {
      return { ok: false, reason: "expired", message: "This coupon is no longer offering a discount." };
    }

    return {
      ok: true,
      eventId:     (data as { id: string }).id,
      code:        (data as { coupon_code: string }).coupon_code,
      discountPct,
      expiresAt:   expiresAt ?? "",
    };
  } catch (e) {
    console.error("[validateCrossSellCoupon] threw:", e);
    return { ok: false, reason: "lookup_error", message: "Could not verify coupon. Try again." };
  }
}

/**
 * Mark a cross-sell coupon redeemed against a successful booking.
 * Atomic guard: `redeemed_at IS NULL` so concurrent attempts can't
 * burn the same coupon twice. Returns true only when the row was
 * updated — false means the coupon was already redeemed elsewhere.
 *
 * Call this AFTER the booking insert succeeds (and after payment
 * confirms for Stripe flows). Failures are logged but never thrown —
 * a failed redemption shouldn't block a confirmed booking.
 */
export async function redeemCrossSellCoupon(
  eventId: string,
  bookingId: string,
): Promise<{ ok: boolean; alreadyRedeemed?: boolean }> {
  if (!eventId || !bookingId) return { ok: false };
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        redeemed_at:         new Date().toISOString(),
        redeemed_booking_id: bookingId,
      })
      .eq("id", eventId)
      .is("redeemed_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[redeemCrossSellCoupon] supabase error:", error.message);
      return { ok: false };
    }
    if (!data) {
      // Row exists but redeemed_at was already set — concurrent redemption.
      return { ok: false, alreadyRedeemed: true };
    }
    return { ok: true };
  } catch (e) {
    console.error("[redeemCrossSellCoupon] threw:", e);
    return { ok: false };
  }
}
