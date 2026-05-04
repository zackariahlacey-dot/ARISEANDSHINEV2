"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CouponResult =
  | {
      valid: true;
      couponId: string;
      code: string;
      discountAmount: number | null;
      discountPercentage: number | null;
    }
  | { valid: false; error: string };

export async function validateCoupon(code: string): Promise<CouponResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: "Please enter a promo code." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("id, code, discount_amount, discount_percentage, is_active, max_uses")
    .eq("code", trimmed)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[validateCoupon]", error);
    return { valid: false, error: "Could not verify code. Please try again." };
  }

  if (!data) return { valid: false, error: "Promo code not found." };
  if (!data.is_active) return { valid: false, error: "This code is no longer active." };

  // Enforce usage limit. Counted via the bookings table so it stays accurate
  // even if a booking is later cancelled (we still count it as a "use" — the
  // promo was redeemed at checkout). Uses the admin client to bypass RLS so
  // guests can validate codes without authenticating.
  if (data.max_uses != null && data.max_uses > 0) {
    const adminSupabase = createAdminClient();
    const { count, error: cntErr } = await adminSupabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", data.id);
    if (cntErr) {
      console.error("[validateCoupon] usage count error:", cntErr);
      // Fail open — better to let a borderline code through than break checkout.
    } else if ((count ?? 0) >= data.max_uses) {
      return { valid: false, error: "This promo code has reached its usage limit." };
    }
  }

  return {
    valid: true,
    couponId: data.id as string,
    code: data.code as string,
    discountAmount: (data.discount_amount as number | null) ?? null,
    discountPercentage: (data.discount_percentage as number | null) ?? null,
  };
}
