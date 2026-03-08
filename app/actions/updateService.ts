"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateServicePayload = {
  id: string;
  name?: string;
  price_small?: number;
  price_medium?: number;
  price_large?: number;
  price_extra_large?: number;
};

export async function updateService(
  payload: UpdateServicePayload
): Promise<{ success: boolean; error?: string }> {
  const { id, name, price_small, price_medium, price_large, price_extra_large } = payload;
  if (!id) return { success: false, error: "Service ID is required." };

  const updates: Record<string, string | number> = {};
  if (name !== undefined) updates.name = name;
  if (typeof price_small === "number") updates.price_small = price_small;
  if (typeof price_medium === "number") updates.price_medium = price_medium;
  if (typeof price_large === "number") updates.price_large = price_large;
  if (typeof price_extra_large === "number") updates.price_extra_large = price_extra_large;
  if (Object.keys(updates).length === 0) return { success: true };

  const supabase = createAdminClient();
  const { error } = await supabase.from("services").update(updates).eq("id", id);

  if (error) {
    console.error("[updateService]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
