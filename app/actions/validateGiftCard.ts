"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type GiftCardResult =
  | {
      valid: true;
      giftCardId: string;
      code: string;
      remainingBalance: number;
    }
  | { valid: false; error: string };

export type GiftCardBalanceResult =
  | {
      found: true;
      code: string;
      remainingBalance: number;
      initialAmount: number;
      isActive: boolean;
      expiresAt: string | null;
      isExpired: boolean;
    }
  | { found: false; error: string };

/** Looks up a gift card by code and returns its full balance info (no redemption). */
export async function checkGiftCardBalance(code: string): Promise<GiftCardBalanceResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { found: false, error: "Please enter a gift card code." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gift_cards")
    .select("code, remaining_balance, initial_amount, is_active, expires_at")
    .eq("code", trimmed)
    .maybeSingle();

  if (error) return { found: false, error: "Could not look up code. Please try again." };
  if (!data) return { found: false, error: "Gift card not found. Double-check the code and try again." };

  const isExpired = !!data.expires_at && new Date(data.expires_at) < new Date();

  return {
    found: true,
    code: data.code as string,
    remainingBalance: Number(data.remaining_balance),
    initialAmount: Number(data.initial_amount),
    isActive: !!data.is_active,
    expiresAt: data.expires_at ?? null,
    isExpired,
  };
}

export async function validateGiftCard(code: string): Promise<GiftCardResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: "Please enter a gift card code." };

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gift_cards")
    .select("id, code, remaining_balance, is_active, expires_at")
    .eq("code", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[validateGiftCard]", error);
    return { valid: false, error: "Could not verify code. Please try again." };
  }

  if (!data) return { valid: false, error: "Gift card not found." };
  if (!data.is_active) return { valid: false, error: "This gift card is no longer active." };
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "This gift card has expired." };
  }
  if (Number(data.remaining_balance) <= 0) {
    return { valid: false, error: "This gift card has no remaining balance." };
  }

  return {
    valid: true,
    giftCardId: data.id as string,
    code: data.code as string,
    remainingBalance: Number(data.remaining_balance),
  };
}
