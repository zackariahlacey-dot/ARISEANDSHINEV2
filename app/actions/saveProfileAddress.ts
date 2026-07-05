"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Saves a service address onto the authenticated user's profile row.
 * Used by the maintenance booking flow so returning customers don't
 * have to re-enter their address every visit.
 */
export async function saveProfileAddress(address: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return { success: false, error: "Not signed in." };
  const trimmed = address.trim();
  if (!trimmed) return { success: false, error: "Address is empty." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ saved_address: trimmed, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Saves name + phone onto the profile row. Splits full name into first/last
 * on the first space so returning customers get correct greetings in emails.
 */
export async function saveProfileContact(
  fullName: string,
  phone: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return { success: false, error: "Not signed in." };

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first_name = parts[0] ?? "";
  const last_name  = parts.slice(1).join(" ") || "";
  const trimmedPhone = phone.trim();

  const admin = createAdminClient();
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (first_name) patch.first_name = first_name;
  if (last_name)  patch.last_name  = last_name;
  if (trimmedPhone) patch.phone    = trimmedPhone;

  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", auth.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
