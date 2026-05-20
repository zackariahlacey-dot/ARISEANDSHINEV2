"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PayrollJob = {
  bookingId: string;
  date: string;                    // YYYY-MM-DD
  customerName: string;
  serviceName: string;
  baseCommissionCents: number;
  tipCents: number;
  adjustmentCents: number;          // sum of +/- adjustments
  finalCommissionCents: number;     // base + adjustments + tip (only locked once photos approved; otherwise estimated)
  photoReviewStatus: string;
  approved: boolean;
};

export type PayrollSummary = {
  contractorId: string;
  contractorName: string;
  periodStart: string;
  periodEnd: string;
  jobsCount: number;
  approvedJobsCount: number;
  pendingJobsCount: number;
  totalBaseCents: number;
  totalTipsCents: number;
  totalAdjustmentsCents: number;
  totalOwedCents: number;           // sum of approved + estimated for pending
  jobs: PayrollJob[];
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
 * Builds a pay-period summary for one contractor between two dates inclusive.
 * Bookings counted are those with job_completed_at within the window,
 * regardless of photo-review status — admin sees pending vs. approved
 * separately so they can choose to pay only on approved or include
 * pending at their own risk.
 */
export async function getContractorPayroll(
  contractorId: string,
  startDate: string,
  endDate: string,
): Promise<PayrollSummary | null> {
  if (!(await requireAdmin())) return null;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", contractorId)
    .eq("role", "contractor")
    .maybeSingle();
  if (!profile) return null;

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, booking_date, customer_name, service_name, base_commission_cents, final_commission_cents, tip_cents, photo_review_status, job_completed_at, status")
    .eq("assigned_to", contractorId)
    .not("job_completed_at", "is", null)
    .neq("status", "cancelled")
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)
    .order("booking_date", { ascending: true });

  const bookingIds = (bookings ?? []).map((b: any) => b.id);
  let adjustmentsByBooking = new Map<string, number>();
  if (bookingIds.length > 0) {
    const { data: adjustments } = await admin
      .from("commission_adjustments")
      .select("booking_id, adjustment_cents")
      .in("booking_id", bookingIds);
    for (const a of (adjustments ?? []) as any[]) {
      const cur = adjustmentsByBooking.get(a.booking_id as string) ?? 0;
      adjustmentsByBooking.set(a.booking_id as string, cur + Number(a.adjustment_cents ?? 0));
    }
  }

  const jobs: PayrollJob[] = ((bookings ?? []) as any[]).map(b => {
    const base   = Number(b.base_commission_cents ?? 0);
    const tip    = Number(b.tip_cents ?? 0);
    const adj    = adjustmentsByBooking.get(b.id) ?? 0;
    const approved = b.photo_review_status === "approved";
    const final  = approved && b.final_commission_cents != null
      ? Number(b.final_commission_cents) + tip
      : base + adj + tip;
    return {
      bookingId: b.id,
      date: b.booking_date,
      customerName: b.customer_name ?? "—",
      serviceName: b.service_name ?? "—",
      baseCommissionCents: base,
      tipCents: tip,
      adjustmentCents: adj,
      finalCommissionCents: final,
      photoReviewStatus: b.photo_review_status ?? "pending",
      approved,
    };
  });

  const totals = jobs.reduce(
    (acc, j) => ({
      base:    acc.base + j.baseCommissionCents,
      tips:    acc.tips + j.tipCents,
      adj:     acc.adj + j.adjustmentCents,
      owed:    acc.owed + j.finalCommissionCents,
    }),
    { base: 0, tips: 0, adj: 0, owed: 0 },
  );

  return {
    contractorId,
    contractorName: `${(profile as any).first_name ?? ""} ${(profile as any).last_name ?? ""}`.trim() || "Contractor",
    periodStart: startDate,
    periodEnd: endDate,
    jobsCount: jobs.length,
    approvedJobsCount: jobs.filter(j => j.approved).length,
    pendingJobsCount: jobs.filter(j => !j.approved).length,
    totalBaseCents: totals.base,
    totalTipsCents: totals.tips,
    totalAdjustmentsCents: totals.adj,
    totalOwedCents: totals.owed,
    jobs,
  };
}

/**
 * Self-service version — the signed-in contractor's own pay-period summary.
 * Same shape as the admin view, but with per-adjustment reasons attached
 * (the signed Payment & Tax Terms agreement promises transparency on every
 * reduction or bonus, so the contractor sees the exact reason).
 */
export type ContractorPayrollJob = PayrollJob & {
  adjustments: Array<{ adjustmentCents: number; reason: string; createdAt: string }>;
};

export type ContractorPayrollSummary = Omit<PayrollSummary, "jobs"> & {
  jobs: ContractorPayrollJob[];
};

export async function getMyPayroll(
  startDate: string,
  endDate: string,
): Promise<ContractorPayrollSummary | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile as any).role !== "contractor") return null;

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, booking_date, customer_name, service_name, base_commission_cents, final_commission_cents, tip_cents, photo_review_status, job_completed_at, status")
    .eq("assigned_to", user.id)
    .not("job_completed_at", "is", null)
    .neq("status", "cancelled")
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)
    .order("booking_date", { ascending: false });

  const bookingIds = (bookings ?? []).map((b: any) => b.id);
  const adjsByBooking = new Map<string, Array<{ adjustmentCents: number; reason: string; createdAt: string }>>();
  if (bookingIds.length > 0) {
    const { data: adjs } = await admin
      .from("commission_adjustments")
      .select("booking_id, adjustment_cents, reason, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });
    for (const a of (adjs ?? []) as any[]) {
      const k = a.booking_id as string;
      if (!adjsByBooking.has(k)) adjsByBooking.set(k, []);
      adjsByBooking.get(k)!.push({
        adjustmentCents: Number(a.adjustment_cents ?? 0),
        reason: a.reason as string,
        createdAt: a.created_at as string,
      });
    }
  }

  const jobs: ContractorPayrollJob[] = ((bookings ?? []) as any[]).map(b => {
    const base = Number(b.base_commission_cents ?? 0);
    const tip  = Number(b.tip_cents ?? 0);
    const adjList = adjsByBooking.get(b.id) ?? [];
    const adj  = adjList.reduce((s, a) => s + a.adjustmentCents, 0);
    const approved = b.photo_review_status === "approved";
    const final = approved && b.final_commission_cents != null
      ? Number(b.final_commission_cents) + tip
      : base + adj + tip;
    return {
      bookingId: b.id,
      date: b.booking_date,
      customerName: b.customer_name ?? "—",
      serviceName: b.service_name ?? "—",
      baseCommissionCents: base,
      tipCents: tip,
      adjustmentCents: adj,
      finalCommissionCents: final,
      photoReviewStatus: b.photo_review_status ?? "pending",
      approved,
      adjustments: adjList,
    };
  });

  const totals = jobs.reduce(
    (acc, j) => ({
      base: acc.base + j.baseCommissionCents,
      tips: acc.tips + j.tipCents,
      adj:  acc.adj + j.adjustmentCents,
      owed: acc.owed + j.finalCommissionCents,
    }),
    { base: 0, tips: 0, adj: 0, owed: 0 },
  );

  return {
    contractorId: user.id,
    contractorName: `${(profile as any).first_name ?? ""} ${(profile as any).last_name ?? ""}`.trim() || "Contractor",
    periodStart: startDate,
    periodEnd: endDate,
    jobsCount: jobs.length,
    approvedJobsCount: jobs.filter(j => j.approved).length,
    pendingJobsCount: jobs.filter(j => !j.approved).length,
    totalBaseCents: totals.base,
    totalTipsCents: totals.tips,
    totalAdjustmentsCents: totals.adj,
    totalOwedCents: totals.owed,
    jobs,
  };
}

/** Returns rows ready to be a CSV file the owner can hand to an accountant. */
export async function buildPayrollCsv(args: {
  contractorIds?: string[];          // omit → all active contractors
  startDate: string;
  endDate: string;
}): Promise<{ ok: boolean; csv?: string; filename?: string; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: "Admin only." };
  const admin = createAdminClient();

  let ids = args.contractorIds ?? [];
  if (ids.length === 0) {
    const { data: actives } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "contractor");
    ids = (actives ?? []).map((p: any) => p.id);
  }

  const summaries: PayrollSummary[] = [];
  for (const id of ids) {
    const s = await getContractorPayroll(id, args.startDate, args.endDate);
    if (s) summaries.push(s);
  }

  // CSV: one row per job, plus a totals row per contractor + grand total
  const escape = (v: string | number | undefined | null): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = [
    "Contractor",
    "Date",
    "Customer",
    "Service",
    "Status",
    "Base ($)",
    "Adjustments ($)",
    "Tip ($)",
    "Total Owed ($)",
  ];
  const lines: string[] = [header.join(",")];

  let grand = { base: 0, tips: 0, adj: 0, owed: 0, jobs: 0 };
  for (const s of summaries) {
    for (const j of s.jobs) {
      lines.push([
        escape(s.contractorName),
        escape(j.date),
        escape(j.customerName),
        escape(j.serviceName),
        escape(j.approved ? "APPROVED" : j.photoReviewStatus.toUpperCase()),
        (j.baseCommissionCents / 100).toFixed(2),
        (j.adjustmentCents / 100).toFixed(2),
        (j.tipCents / 100).toFixed(2),
        (j.finalCommissionCents / 100).toFixed(2),
      ].join(","));
    }
    lines.push([
      escape(`${s.contractorName} — SUBTOTAL`),
      "",
      "",
      "",
      `${s.approvedJobsCount} approved, ${s.pendingJobsCount} pending`,
      (s.totalBaseCents / 100).toFixed(2),
      (s.totalAdjustmentsCents / 100).toFixed(2),
      (s.totalTipsCents / 100).toFixed(2),
      (s.totalOwedCents / 100).toFixed(2),
    ].join(","));
    lines.push("");
    grand.base += s.totalBaseCents;
    grand.tips += s.totalTipsCents;
    grand.adj  += s.totalAdjustmentsCents;
    grand.owed += s.totalOwedCents;
    grand.jobs += s.jobsCount;
  }
  lines.push([
    "GRAND TOTAL",
    "",
    "",
    "",
    `${grand.jobs} jobs`,
    (grand.base / 100).toFixed(2),
    (grand.adj / 100).toFixed(2),
    (grand.tips / 100).toFixed(2),
    (grand.owed / 100).toFixed(2),
  ].join(","));

  const filename = `payroll-${args.startDate}-to-${args.endDate}.csv`;
  return { ok: true, csv: lines.join("\n"), filename };
}
