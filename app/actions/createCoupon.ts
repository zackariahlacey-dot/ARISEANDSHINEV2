"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateCouponPayload {
  code: string;
  discountType: "amount" | "percentage";
  discountValue: number;
  isActive: boolean;
}

export interface CouponRow {
  id: string;
  code: string;
  discount_amount: number | null;
  discount_percentage: number | null;
  is_active: boolean;
  created_at: string | null;
}

export async function createCoupon(
  payload: CreateCouponPayload
): Promise<{ success: boolean; coupon?: CouponRow; error?: string }> {
  const code = payload.code.trim().toUpperCase();
  if (!code) return { success: false, error: "Code is required." };
  if (payload.discountValue <= 0)
    return { success: false, error: "Discount value must be greater than 0." };
  if (payload.discountType === "percentage" && payload.discountValue > 100)
    return { success: false, error: "Percentage cannot exceed 100%." };

  const supabase = createAdminClient();

  const insert = {
    code,
    discount_amount:
      payload.discountType === "amount" ? payload.discountValue : null,
    discount_percentage:
      payload.discountType === "percentage" ? payload.discountValue : null,
    is_active: payload.isActive,
  };

  const { data, error } = await supabase
    .from("coupons")
    .insert(insert)
    .select("id, code, discount_amount, discount_percentage, is_active, created_at")
    .single();

  if (error) {
    console.error("[createCoupon]", error);
    // Unique constraint violation
    if (error.code === "23505") {
      return { success: false, error: `Code "${code}" already exists.` };
    }
    return { success: false, error: error.message };
  }

  return { success: true, coupon: data as CouponRow };
}
