"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UnavailableDay = {
  id: string;
  contractorId: string;
  date: string;       // YYYY-MM-DD
  reason: string | null;
};

/** Returns the signed-in contractor's own unavailable days from today forward. */
export async function listMyUnavailableDays(): Promise<UnavailableDay[]> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const today = new Date().toLocaleDateString("en-CA");
  const { data } = await admin
    .from("contractor_unavailable_days")
    .select("id, contractor_id, unavailable_date, reason")
    .eq("contractor_id", user.id)
    .gte("unavailable_date", today)
    .order("unavailable_date", { ascending: true });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    contractorId: r.contractor_id,
    date: r.unavailable_date,
    reason: r.reason ?? null,
  }));
}

/** Contractor marks themselves unavailable for a given date. Idempotent. */
export async function markMyDayUnavailable(date: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Invalid date." };
  }
  const today = new Date().toLocaleDateString("en-CA");
  if (date < today) return { ok: false, error: "Can't mark a past date." };

  const admin = createAdminClient();
  // Verify caller is a contractor
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (((row as { role?: string } | null)?.role ?? "") !== "contractor") {
    return { ok: false, error: "Only contractors can set their own availability." };
  }

  const { error } = await admin
    .from("contractor_unavailable_days")
    .upsert(
      {
        contractor_id: user.id,
        unavailable_date: date,
        reason: reason?.trim() || null,
      },
      { onConflict: "contractor_id,unavailable_date" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Remove an unavailable day (contractor or admin). */
export async function clearMyUnavailableDay(date: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("contractor_unavailable_days")
    .delete()
    .eq("contractor_id", user.id)
    .eq("unavailable_date", date);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin view: any contractor's unavailable days. */
export async function listContractorUnavailableDays(contractorId: string): Promise<UnavailableDay[]> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: meRow } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = ((meRow as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  if (!isAdmin) return [];

  const today = new Date().toLocaleDateString("en-CA");
  const { data } = await admin
    .from("contractor_unavailable_days")
    .select("id, contractor_id, unavailable_date, reason")
    .eq("contractor_id", contractorId)
    .gte("unavailable_date", today)
    .order("unavailable_date", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    contractorId: r.contractor_id,
    date: r.unavailable_date,
    reason: r.reason ?? null,
  }));
}
