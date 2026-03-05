"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function toggleCoupon(
  couponId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", couponId);

  if (error) {
    console.error("[toggleCoupon]", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
