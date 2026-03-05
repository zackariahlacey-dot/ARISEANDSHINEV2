"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/referralCode";

/**
 * Called immediately after supabase.auth.signUp on the client.
 *
 * - Uses the pre-generated referral_code from the client (or generates one if not passed)
 * - If referredByCode (?ref=) is supplied, looks up the referrer's profile ID and sets referred_by
 * - Inserts/upserts the profile row with referral_code saved at account creation
 *
 * Uses the service-role client to bypass RLS since the user's session
 * is not yet active (email confirmation is pending).
 */
export async function createProfileWithReferral(
  userId: string,
  email: string,
  referredByCode: string | null,
  firstName?: string,
  lastName?: string,
  newReferralCode?: string
): Promise<{ ok: boolean; referralCode: string }> {
  const supabase = createAdminClient();
  const referralCodeToSave =
    newReferralCode && newReferralCode.trim().length === 6
      ? newReferralCode.trim().toUpperCase()
      : generateReferralCode();

  // Resolve the referrer's profile ID from their referral code (?ref=XYZ123)
  let matchedReferrerId: string | null = null;
  if (referredByCode) {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referredByCode.trim().toUpperCase())
      .maybeSingle();
    matchedReferrerId = referrer?.id ?? null;
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      referral_code: referralCodeToSave,
      reward_points: 0,
      lifetime_points: 0,
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      referred_by: matchedReferrerId ?? null,
      ...(matchedReferrerId ? { has_used_referral: false } : {}),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[createProfileWithReferral]", error);
    return { ok: false, referralCode: referralCodeToSave };
  }

  return { ok: true, referralCode: referralCodeToSave };
}

/**
 * Ensures an existing auth user has a referral_code — for legacy accounts
 * with null or empty referral_code. Reads from DB first; only generates
 * and saves when missing, then returns the persisted value.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  const current = existing?.referral_code;
  if (current != null && String(current).trim() !== "") {
    return String(current).trim();
  }

  const newCode = generateReferralCode();

  const { error } = await supabase
    .from("profiles")
    .update({ referral_code: newCode })
    .eq("id", userId);

  if (error) {
    console.error("[ensureReferralCode] update failed:", error);
    return newCode;
  }

  const { data: updated } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  return updated?.referral_code ?? newCode;
}
