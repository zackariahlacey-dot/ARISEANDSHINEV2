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

  // ── Points SSOT: Sum the ledger for accuracy ───────────────────────────
  const { data: ledger } = await supabase
    .from("point_transactions")
    .select("amount")
    .eq("user_id", user.id);

  const ledgerTotal = (ledger ?? []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const ledgerLifetime = (ledger ?? [])
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  // Fallback to profile column if ledger is empty (for legacy or welcome bonus)
  const currentPoints = Math.max(ledgerTotal, profile?.reward_points ?? 0);
  const lifetimePoints = Math.max(ledgerLifetime, profile?.lifetime_points ?? 0);

  const row = profile as {
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
