"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditLogEntry = {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  payload: unknown;
  ipAddress: string | null;
  createdAt: string;
};

export type AuditLogFilters = {
  action?: string | null;          // exact action string OR substring
  adminId?: string | null;
  targetTable?: string | null;
  startDate?: string | null;       // ISO
  endDate?: string | null;         // ISO
  limit?: number;                  // default 100
};

async function requireAdmin(): Promise<boolean> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminRole = ((row as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const emailMatch = !!user.email && allowlist.includes(user.email.toLowerCase());
  return isAdminRole || emailMatch;
}

/**
 * Returns audit log entries matching the filters, newest first. Joins
 * profiles to surface the admin's name/email instead of just a UUID.
 *
 * Capped at 200 rows per call to keep the response small; for deeper
 * history use date range filtering.
 */
export async function listAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  if (!(await requireAdmin())) return [];
  const admin = createAdminClient();

  const limit = Math.min(filters.limit ?? 100, 200);
  let q = admin
    .from("admin_audit_log")
    .select("id, admin_id, action, target_table, target_id, payload, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.action) {
    if (filters.action.includes("%")) {
      q = q.ilike("action", filters.action);
    } else {
      q = q.ilike("action", `%${filters.action}%`);
    }
  }
  if (filters.adminId) q = q.eq("admin_id", filters.adminId);
  if (filters.targetTable) q = q.eq("target_table", filters.targetTable);
  if (filters.startDate) q = q.gte("created_at", filters.startDate);
  if (filters.endDate)   q = q.lte("created_at", filters.endDate);

  const { data, error } = await q;
  if (error) {
    console.error("[listAuditLog]", error);
    return [];
  }

  // Resolve admin IDs → names / emails in one batch
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.admin_id as string).filter(Boolean)));
  const nameById = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", ids);
    for (const p of (profs ?? []) as any[]) {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null;
      nameById.set(p.id as string, { name: fullName, email: (p.email as string) ?? null });
    }
  }

  return (data ?? []).map((r: any) => {
    const info = nameById.get(r.admin_id as string) ?? { name: null, email: null };
    return {
      id: r.id,
      adminId: r.admin_id,
      adminName: info.name,
      adminEmail: info.email,
      action: r.action,
      targetTable: r.target_table ?? null,
      targetId: r.target_id ?? null,
      payload: r.payload,
      ipAddress: r.ip_address ?? null,
      createdAt: r.created_at,
    };
  });
}

/** Returns the distinct action strings seen in the log — for the filter dropdown. */
export async function listAuditActions(): Promise<string[]> {
  if (!(await requireAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_log")
    .select("action")
    .order("action", { ascending: true })
    .limit(500);
  const set = new Set<string>();
  for (const r of (data ?? []) as any[]) {
    if (r.action) set.add(r.action as string);
  }
  return Array.from(set).sort();
}
