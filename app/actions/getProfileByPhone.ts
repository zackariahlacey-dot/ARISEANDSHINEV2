"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ProfilePrefillResult = {
  name: string | null;
  email: string | null;
  loyaltyDiscountPct: number;
};

/**
 * Returns name, email, and loyalty discount for the profile with the given phone.
 * Used to pre-fill the booking form for returning customers.
 */
export async function getProfileByPhone(phone: string): Promise<ProfilePrefillResult> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { name: null, email: null, loyaltyDiscountPct: 0 };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, loyalty_discount_pct")
    .eq("phone", digits)
    .maybeSingle();

  if (!data) return { name: null, email: null, loyaltyDiscountPct: 0 };

  const firstName = data.first_name ?? "";
  const lastName = data.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  return {
    name: fullName,
    email: data.email ?? null,
    loyaltyDiscountPct: typeof data.loyalty_discount_pct === "number" ? data.loyalty_discount_pct : 0,
  };
}
