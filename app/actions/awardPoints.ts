"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Awards (or deducts) points for a user, updates their profile totals,
 * and appends a row to the point_transactions ledger.
 *
 * - amount > 0: earning — adds to both reward_points and lifetime_points.
 * - amount < 0: spending — adds to reward_points only (lifetime_points unchanged).
 *
 * Expected DB:
 * - profiles: reward_points, lifetime_points
 * - point_transactions: user_id (uuid), amount (int), description (text); optional: created_at (timestamptz default now())
 */
export async function awardPoints(
  userId: string,
  amount: number,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("reward_points, lifetime_points")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[awardPoints] fetch profile:", fetchError);
    return { ok: false, error: fetchError.message };
  }

  if (!profile) {
    return { ok: false, error: "Profile not found" };
  }

  const currentPoints = typeof profile.reward_points === "number" ? profile.reward_points : 0;
  const lifetimePoints = typeof profile.lifetime_points === "number" ? profile.lifetime_points : currentPoints;

  const newCurrent = currentPoints + amount;

  // Only add to lifetime when it's an earning event (amount > 0)
  const newLifetime =
    amount > 0 ? lifetimePoints + amount : lifetimePoints;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      reward_points: newCurrent,
      lifetime_points: newLifetime,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("[awardPoints] update profiles:", updateError);
    return { ok: false, error: updateError.message };
  }

  const { error: insertError } = await supabase.from("point_transactions").insert({
    user_id: userId,
    amount,
    description: description.slice(0, 500),
  });

  if (insertError) {
    console.error("[awardPoints] insert ledger:", insertError);
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

/**
 * If the new user was referred and has not yet used their referral discount,
 * awards 200 points to the referrer and marks the new user's has_used_referral = true.
 */
export async function triggerReferralBonus(newUserId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("referred_by, has_used_referral")
    .eq("id", newUserId)
    .maybeSingle();

  if (fetchError) {
    console.error("[triggerReferralBonus] fetch profile:", fetchError);
    return { ok: false, error: fetchError.message };
  }

  if (!profile?.referred_by || profile.has_used_referral) {
    return { ok: true };
  }

  const referrerId = profile.referred_by;

  const result = await awardPoints(
    referrerId,
    200,
    "Referral Bonus for inviting a friend"
  );

  if (!result.ok) {
    return result;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ has_used_referral: true })
    .eq("id", newUserId);

  if (updateError) {
    console.error("[triggerReferralBonus] set has_used_referral:", updateError);
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}
