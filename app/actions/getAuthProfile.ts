"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Saved vehicle for quick rebooking */
export type SavedVehicle = {
  year: string;
  make: string;
  model: string;
  type: string;
} | null;

export type AuthProfile = {
  completedDetailCount: number;
  loyaltyDiscountPct: number;
  saved_vehicle: SavedVehicle;
  saved_address: string | null;
  userId: string;
  email: string | null;
} | null;

/**
 * Returns the current auth user's profile data for loyalty / referral display.
 * Returns null if not logged in or no profile row.
 */
export async function getAuthProfile(): Promise<AuthProfile> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const adminSupabase = createAdminClient();

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("saved_vehicle, saved_address, completed_detail_count, loyalty_discount_pct")
    .eq("id", user.id)
    .maybeSingle();

  const row = profile as {
    saved_vehicle?: unknown;
    saved_address?: string;
    completed_detail_count?: number;
    loyalty_discount_pct?: number;
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
    completedDetailCount: row?.completed_detail_count ?? 0,
    loyaltyDiscountPct: row?.loyalty_discount_pct ?? 0,
    saved_vehicle: savedVehicle,
    saved_address: typeof row?.saved_address === "string" ? row.saved_address : null,
    userId: user.id,
    email: user.email ?? null,
  };
}
