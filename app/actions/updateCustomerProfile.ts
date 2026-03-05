"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface CustomerProfileUpdates {
  reward_points?: number;
  phone?: string;
}

export async function updateCustomerProfile(
  profileId: string,
  updates: CustomerProfileUpdates
): Promise<{ success: boolean; error?: string }> {
  if (!profileId) return { success: false, error: "No profile ID provided." };

  // Only send fields that were actually provided
  const patch: Record<string, unknown> = {};
  if (updates.reward_points !== undefined) patch.reward_points = updates.reward_points;
  if (updates.phone !== undefined) patch.phone = updates.phone;

  if (Object.keys(patch).length === 0) {
    return { success: false, error: "No fields to update." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profileId);

  if (error) {
    console.error("[updateCustomerProfile]", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
