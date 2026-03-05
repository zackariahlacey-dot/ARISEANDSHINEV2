"use server";

import { createClient } from "@/lib/supabase/server";

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
    .select("id, code, discount_amount, discount_percentage, is_active")
    .eq("code", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[validateCoupon]", error);
    return { valid: false, error: "Could not verify code. Please try again." };
  }

  if (!data) return { valid: false, error: "Promo code not found." };
  if (!data.is_active) return { valid: false, error: "This code is no longer active." };

  return {
    valid: true,
    couponId: data.id as string,
    code: data.code as string,
    discountAmount: (data.discount_amount as number | null) ?? null,
    discountPercentage: (data.discount_percentage as number | null) ?? null,
  };
}
