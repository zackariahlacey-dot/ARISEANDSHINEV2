"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function insertBlockedDate(
  blockedDate: string,
  reason?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!blockedDate?.trim()) return { success: false, error: "Date is required." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("blocked_dates").insert({
    blocked_date: blockedDate,
    reason: reason?.trim() || null,
  });
  if (error) {
    console.error("[insertBlockedDate]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteBlockedDate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id?.trim()) return { success: false, error: "ID is required." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
  if (error) {
    console.error("[deleteBlockedDate]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
