"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type PointTransactionRow = {
  amount: number;
  description: string | null;
  created_at: string;
};

/**
 * Returns the 5 most recent point_transactions for the given user.
 * Used for the XP History ledger on the dashboard.
 */
export async function getRecentPointTransactions(
  userId: string
): Promise<PointTransactionRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("point_transactions")
    .select("amount, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[getRecentPointTransactions]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    amount: row.amount ?? 0,
    description: row.description ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  }));
}
