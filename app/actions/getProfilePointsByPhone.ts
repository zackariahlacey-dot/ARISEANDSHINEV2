"use server";

import { createClient } from "@/lib/supabase/server";

export type ProfilePointsResult = {
  reward_points: number;
  lifetime_points: number;
};

/**
 * Returns reward_points and lifetime_points for the profile with the given phone (for booking modal balance and tier).
 * Used so the customer sees their balance and max redeem cap when entering phone on Step 3.
 */
export async function getProfilePointsByPhone(phone: string): Promise<ProfilePointsResult> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { reward_points: 0, lifetime_points: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("reward_points, lifetime_points")
    .eq("phone", digits)
    .maybeSingle();

  if (!data) return { reward_points: 0, lifetime_points: 0 };
  return {
    reward_points: typeof data.reward_points === "number" ? data.reward_points : 0,
    lifetime_points: typeof data.lifetime_points === "number" ? data.lifetime_points : 0,
  };
}
