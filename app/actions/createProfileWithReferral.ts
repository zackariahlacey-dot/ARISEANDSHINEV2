"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/referralCode";

/**
 * Called immediately after supabase.auth.signUp on the client.
 *
 * - Uses the pre-generated referral_code from the client (or generates one if not passed)
 * - If referredByCode (?ref=) is supplied, looks up the referrer's profile ID and sets referred_by
 * - Inserts/upserts the profile row with referral_code saved at account creation
 * - RECONCILIATION: Finds guest bookings/vehicles with matching email/phone and attaches them to this account.
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

  // 1. Resolve the referrer's profile ID from their referral code (?ref=XYZ123)
  let matchedReferrerId: string | null = null;
  if (referredByCode) {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referredByCode.trim().toUpperCase())
      .maybeSingle();
    matchedReferrerId = referrer?.id ?? null;
  }

  const WELCOME_BONUS_POINTS = 100;

  // 2. Reconciliation: Find guest data before creating the final profile
  // We look for profiles with matching email but NO corresponding auth user (guest profiles)
  const { data: guestProfiles } = await supabase
    .from("profiles")
    .select("id, reward_points, lifetime_points, phone")
    .eq("email", email.trim().toLowerCase());

  let guestPoints = 0;
  let guestLifetimePoints = 0;
  let guestPhone: string | null = null;
  const guestIds: string[] = [];

  if (guestProfiles && guestProfiles.length > 0) {
    for (const gp of guestProfiles) {
      // Skip the new user's ID if it somehow exists
      if (gp.id === userId) continue;
      
      // Guest profiles in our system are often random UUIDs that don't exist in auth.users
      // We'll treat any profile with matching email that isn't the current userId as a guest to merge
      guestPoints += (gp.reward_points || 0);
      guestLifetimePoints += (gp.lifetime_points || 0);
      if (!guestPhone && gp.phone) guestPhone = gp.phone;
      guestIds.push(gp.id);
    }
  }

  // 3. Create/Upsert the real profile
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email.trim().toLowerCase(),
      referral_code: referralCodeToSave,
      reward_points: WELCOME_BONUS_POINTS + guestPoints,
      lifetime_points: WELCOME_BONUS_POINTS + guestLifetimePoints,
      phone: guestPhone || null,
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      referred_by: matchedReferrerId ?? null,
      ...(matchedReferrerId ? { has_used_referral: false } : {}),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[createProfileWithReferral] Upsert Error:", error);
    return { ok: false, referralCode: referralCodeToSave };
  }

  // 4. Move Bookings, Vehicles, and Transactions if guests were found
  if (guestIds.length > 0) {
    try {
      // Update bookings
      await supabase.from("bookings").update({ user_id: userId }).in("user_id", guestIds);
      // Update vehicles
      await supabase.from("vehicles").update({ user_id: userId }).in("user_id", guestIds);
      // Update transactions
      await supabase.from("point_transactions").update({ user_id: userId }).in("user_id", guestIds);
      
      // Delete obsolete guest profiles
      await supabase.from("profiles").delete().in("id", guestIds);
      
      console.log(`[Reconciliation] Merged ${guestIds.length} guest profiles into User ${userId}`);
    } catch (mergeErr) {
      console.error("[createProfileWithReferral] Merge Error:", mergeErr);
    }
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
