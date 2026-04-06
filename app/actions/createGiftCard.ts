"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O, 0, I, 1 (confusing)
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // e.g. "ABCD-EFGH-JKLM-NPQR"
}

type CreateGiftCardInput = {
  amount: number;
  recipientEmail?: string;
  recipientName?: string;
  purchaserEmail?: string;
};

export async function createGiftCardAction(input: CreateGiftCardInput): Promise<
  { success: true; code: string; id: string } | { success: false; error: string }
> {
  if (!input.amount || input.amount < 1) {
    return { success: false, error: "Amount must be at least $1." };
  }

  const supabase = createAdminClient();
  const code = generateGiftCardCode();

  const { data, error } = await supabase
    .from("gift_cards")
    .insert({
      code,
      initial_amount: input.amount,
      remaining_balance: input.amount,
      purchaser_email: input.purchaserEmail ?? null,
      recipient_email: input.recipientEmail ?? null,
      recipient_name: input.recipientName ?? null,
      is_active: true,
    })
    .select("id, code")
    .single();

  if (error || !data) {
    console.error("[createGiftCard]", error);
    return { success: false, error: error?.message ?? "Failed to create gift card." };
  }

  return { success: true, code: data.code as string, id: data.id as string };
}

export async function getGiftCardsAction(): Promise<any[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gift_cards")
    .select("id, code, initial_amount, remaining_balance, purchaser_email, recipient_email, recipient_name, is_active, created_at, expires_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function toggleGiftCardAction(id: string, is_active: boolean): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("gift_cards").update({ is_active }).eq("id", id);
}
