"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ProfilePrefillResult = {
  name: string | null;
  email: string | null;
  reward_points: number;
  lifetime_points: number;
};

/**
 * Returns name, email, and loyalty points for the profile with the given phone.
 * Used to pre-fill the booking form for returning customers.
 */
export async function getProfileByPhone(phone: string): Promise<ProfilePrefillResult> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { name: null, email: null, reward_points: 0, lifetime_points: 0 };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, reward_points, lifetime_points")
    .eq("phone", digits)
    .maybeSingle();

  if (!data) return { name: null, email: null, reward_points: 0, lifetime_points: 0 };

  const firstName = data.first_name ?? "";
  const lastName = data.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  return {
    name: fullName,
    email: data.email ?? null,
    reward_points: typeof data.reward_points === "number" ? data.reward_points : 0,
    lifetime_points: typeof data.lifetime_points === "number" ? data.lifetime_points : 0,
  };
}
