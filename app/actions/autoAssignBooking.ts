"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AutoAssignResult = {
  ok: boolean;
  contractorId?: string;
  contractorName?: string;
  reason?: string;
};

/**
 * Pick the best contractor for a booking and assign them.
 *
 * Eligibility filters (all must pass):
 *   1. role = 'contractor' AND employment_status = 'active'
 *   2. All three onboarding documents signed (payment / restrictions / liability)
 *   3. Current count of assigned-non-completed bookings on the same date
 *      is below their daily_job_cap
 *
 * Priority order for choosing among eligibles:
 *   1. Returning-customer match — if this customer's email has been
 *      serviced by a still-eligible contractor before, prefer that one
 *   2. Least-loaded — fewest jobs already on the same date
 *   3. Most senior — highest commission_tier (proxies for trust)
 *   4. Stable tiebreaker — earliest created profile (consistent ordering)
 *
 * Idempotent: bails immediately if the booking is already assigned, has
 * no booking_date, or is cancelled. Safe to call from bookDetailing on
 * insert and from admin "Re-assign" actions.
 */
export async function autoAssignBooking(bookingId: string): Promise<AutoAssignResult> {
  const admin = createAdminClient();

  // 1. Load the booking
  const { data: booking, error: bErr } = await admin
    .from("bookings")
    .select("id, booking_date, assigned_to, status, customer_email, service_name")
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr || !booking) return { ok: false, reason: "booking not found" };
  if ((booking as any).status === "cancelled") return { ok: false, reason: "booking cancelled" };
  if ((booking as any).assigned_to) {
    return { ok: true, reason: "already assigned", contractorId: (booking as any).assigned_to as string };
  }
  const bookingDate = (booking as any).booking_date as string | null;
  if (!bookingDate) return { ok: false, reason: "no booking_date" };

  // 2. Pull all active contractors
  const { data: contractors } = await admin
    .from("profiles")
    .select("id, first_name, last_name, commission_tier, daily_job_cap, created_at")
    .eq("role", "contractor")
    .eq("employment_status", "active");

  if (!contractors || contractors.length === 0) {
    return { ok: false, reason: "no active contractors" };
  }
  const contractorIds = contractors.map((c: any) => c.id as string);

  // 3. Filter to those who have all 3 signed documents
  const { data: signedDocs } = await admin
    .from("contractor_agreements")
    .select("contractor_id, doc_kind")
    .eq("status", "signed")
    .in("contractor_id", contractorIds)
    .in("doc_kind", ["payment", "restrictions", "liability"]);

  const kindsByContractor = new Map<string, Set<string>>();
  for (const r of (signedDocs ?? []) as any[]) {
    const key = r.contractor_id as string;
    if (!kindsByContractor.has(key)) kindsByContractor.set(key, new Set());
    kindsByContractor.get(key)!.add(r.doc_kind);
  }

  const onboardedContractors = contractors.filter((c: any) => {
    const kinds = kindsByContractor.get(c.id as string);
    return !!kinds && kinds.size === 3;
  });
  if (onboardedContractors.length === 0) {
    return { ok: false, reason: "no onboarded contractors" };
  }

  // 4. Get same-day workload per contractor (uncompleted assignments count)
  const { data: sameDay } = await admin
    .from("bookings")
    .select("assigned_to")
    .eq("booking_date", bookingDate)
    .neq("status", "cancelled")
    .in("assigned_to", onboardedContractors.map((c: any) => c.id as string));

  const loadById = new Map<string, number>();
  for (const r of (sameDay ?? []) as any[]) {
    const a = r.assigned_to as string | null;
    if (!a) continue;
    loadById.set(a, (loadById.get(a) ?? 0) + 1);
  }

  // 5a. Drop those at or over their daily cap
  const undercapped = onboardedContractors.filter((c: any) => {
    const load = loadById.get(c.id as string) ?? 0;
    return load < Number(c.daily_job_cap ?? 3);
  });
  if (undercapped.length === 0) {
    return { ok: false, reason: "all eligible contractors at daily cap" };
  }

  // 5b. Drop contractors who marked themselves unavailable this date
  const { data: unavailable } = await admin
    .from("contractor_unavailable_days")
    .select("contractor_id")
    .eq("unavailable_date", bookingDate)
    .in("contractor_id", undercapped.map((c: any) => c.id as string));
  const unavailableIds = new Set((unavailable ?? []).map((r: any) => r.contractor_id as string));
  const undercappedContractors = undercapped.filter((c: any) => !unavailableIds.has(c.id as string));
  if (undercappedContractors.length === 0) {
    return { ok: false, reason: "all eligible contractors are marked off this day" };
  }

  // 6. Returning-customer preference — does any candidate have prior
  //    completed jobs for this customer email?
  let returningPreferred: string | null = null;
  const custEmail = ((booking as any).customer_email as string | null)?.toLowerCase()?.trim();
  if (custEmail) {
    const { data: pastJobs } = await admin
      .from("bookings")
      .select("assigned_to, customer_email, job_completed_at")
      .ilike("customer_email", custEmail)
      .not("assigned_to", "is", null)
      .not("job_completed_at", "is", null)
      .in("assigned_to", undercappedContractors.map((c: any) => c.id as string))
      .order("job_completed_at", { ascending: false })
      .limit(5);
    const lastContractor = (pastJobs ?? [])[0]?.assigned_to as string | undefined;
    if (lastContractor) returningPreferred = lastContractor;
  }

  // 7. Pick the winner
  const pick = (() => {
    if (returningPreferred) {
      const match = undercappedContractors.find((c: any) => c.id === returningPreferred);
      if (match) return match;
    }
    // Least-loaded → highest tier → earliest created
    const sorted = [...undercappedContractors].sort((a: any, b: any) => {
      const la = loadById.get(a.id) ?? 0;
      const lb = loadById.get(b.id) ?? 0;
      if (la !== lb) return la - lb;
      const ta = Number(a.commission_tier ?? 1);
      const tb = Number(b.commission_tier ?? 1);
      if (ta !== tb) return tb - ta;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
    return sorted[0];
  })();
  if (!pick) return { ok: false, reason: "no eligible contractor after tiebreak" };

  // 8. Assign (atomic-ish — only set if still unassigned)
  const { data: updated, error: updErr } = await admin
    .from("bookings")
    .update({
      assigned_to: (pick as any).id,
      assigned_at: new Date().toISOString(),
      assigned_by: null,                          // null = auto-assigned
    })
    .eq("id", bookingId)
    .is("assigned_to", null)
    .select("id")
    .maybeSingle();

  if (updErr) return { ok: false, reason: updErr.message };
  if (!updated) {
    // Race — someone else assigned between our read and write; treat as success
    return { ok: true, reason: "concurrent assign", contractorId: (pick as any).id };
  }

  const contractorName = `${(pick as any).first_name ?? ""} ${(pick as any).last_name ?? ""}`.trim() || "Contractor";
  return { ok: true, contractorId: (pick as any).id, contractorName };
}

/**
 * Manually assign a booking to a specific contractor. Admin only.
 * Writes assigned_by so the audit trail distinguishes from auto-assign.
 */
export async function manuallyAssignBooking(
  bookingId: string,
  contractorId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { createClient } = await import("@/lib/supabase/server");
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  // Admin check
  const { data: meRow } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminRole = ((meRow as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const emailMatch = !!user.email && allowlist.includes(user.email.toLowerCase());
  if (!isAdminRole && !emailMatch) return { ok: false, error: "Admin only." };

  // If clearing, just null assigned_to
  if (contractorId === null) {
    const { error } = await admin
      .from("bookings")
      .update({ assigned_to: null, assigned_at: null, assigned_by: null })
      .eq("id", bookingId);
    if (error) return { ok: false, error: error.message };
    await admin.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "unassign_booking",
      target_table: "bookings",
      target_id: bookingId,
      payload: {},
    });
    return { ok: true };
  }

  // Validate target is an active contractor
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, employment_status, first_name, last_name")
    .eq("id", contractorId)
    .maybeSingle();
  if (!target || (target as any).role !== "contractor") {
    return { ok: false, error: "Selected user is not a contractor." };
  }
  if ((target as any).employment_status !== "active") {
    return { ok: false, error: "Contractor is not active." };
  }

  const { error } = await admin
    .from("bookings")
    .update({
      assigned_to: contractorId,
      assigned_at: new Date().toISOString(),
      assigned_by: user.id,
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await admin.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "manually_assign_booking",
    target_table: "bookings",
    target_id: bookingId,
    payload: { contractor_id: contractorId },
  });

  return { ok: true };
}

