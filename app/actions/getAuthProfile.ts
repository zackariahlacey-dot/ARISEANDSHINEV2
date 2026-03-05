"use server";

import { createClient } from "@/lib/supabase/server";

/** Saved vehicle for quick rebooking */
export type SavedVehicle = {
  year: string;
  make: string;
  model: string;
  type: string;
} | null;

export type AuthProfile = {
  current_points: number;
  lifetime_points: number;
  saved_vehicle: SavedVehicle;
  saved_address: string | null;
  /** @deprecated Use current_points. Kept for backward compatibility. */
  rewardPoints: number;
  userId: string;
  referralCode: string | null;
  email: string | null;
} | null;

/**
 * Returns the current auth user's profile data for loyalty / referral display.
 * Returns null if not logged in or no profile row.
 * Optional: add lifetime_points, saved_vehicle (jsonb), saved_address (text) to profiles table to persist them.
 */
export async function getAuthProfile(): Promise<AuthProfile> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("reward_points, referral_code, lifetime_points, saved_vehicle, saved_address")
    .eq("id", user.id)
    .maybeSingle();

  const currentPoints = profile?.reward_points ?? 0;
  const row = profile as {
    lifetime_points?: number;
    saved_vehicle?: unknown;
    saved_address?: string;
  } | null;
  const rawVehicle = row?.saved_vehicle as Record<string, unknown> | null | undefined;
  const savedVehicle: SavedVehicle =
    rawVehicle &&
    typeof rawVehicle === "object" &&
    "year" in rawVehicle &&
    "make" in rawVehicle &&
    "model" in rawVehicle &&
    "type" in rawVehicle
      ? {
          year: String(rawVehicle.year),
          make: String(rawVehicle.make),
          model: String(rawVehicle.model),
          type: String(rawVehicle.type),
        }
      : null;

  return {
    current_points: currentPoints,
    lifetime_points: typeof row?.lifetime_points === "number" ? row.lifetime_points : currentPoints,
    saved_vehicle: savedVehicle,
    saved_address: typeof row?.saved_address === "string" ? row.saved_address : null,
    rewardPoints: currentPoints,
    userId: user.id,
    referralCode:
      profile?.referral_code && String(profile.referral_code).trim() !== ""
        ? String(profile.referral_code).trim()
        : null,
    email: user.email ?? null,
  };
}
