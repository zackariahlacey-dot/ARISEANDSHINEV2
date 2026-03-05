"use server";

import { createClient } from "@/lib/supabase/server";

export type ReferralStatus = {
  /** True when the auth user was referred AND has not yet used their welcome discount */
  eligible: boolean;
  /** The auth user's UUID (needed by bookDetailing to credit the referrer) */
  authUserId: string | null;
};

/**
 * Returns whether the currently logged-in user is eligible for a
 * one-time referral welcome discount (10% off their first booking).
 *
 * Eligibility conditions:
 *   - User is authenticated
 *   - Their profile has referred_by IS NOT NULL
 *   - Their profile has has_used_referral = false
 */
export async function getAuthReferralStatus(): Promise<ReferralStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { eligible: false, authUserId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("referred_by, has_used_referral")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { eligible: false, authUserId: user.id };

  const eligible =
    profile.referred_by != null && profile.has_used_referral === false;

  return { eligible, authUserId: user.id };
}
