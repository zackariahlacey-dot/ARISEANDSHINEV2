"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AttentionItem = {
  kind:
    | "photo_review"
    | "low_rating"
    | "payment_email_failed"
    | "unassigned_booking"
    | "contractor_issue"
    | "contractor_activation"
    | "contractor_eligible_promotion";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  occurredAt: string;             // ISO — for sorting / display
  severity: "info" | "warn" | "urgent";
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
 * Returns a flat list of items that need admin attention right now. Used by
 * the Today screen's "Needs attention" widget. Sorted urgent → warn → info,
 * then newest first within each tier.
 */
export async function getAdminNeedsAttention(): Promise<AttentionItem[]> {
  if (!(await requireAdmin())) return [];
  const admin = createAdminClient();
  const items: AttentionItem[] = [];
  const now = new Date();

  // ── 1. Pending photo reviews ────────────────────────────────────────────
  const { data: photoQueue } = await admin
    .from("bookings")
    .select("id, customer_name, service_name, booking_date, job_completed_at, assigned_to")
    .not("job_completed_at", "is", null)
    .eq("photo_review_status", "pending")
    .order("job_completed_at", { ascending: true })
    .limit(10);
  for (const b of (photoQueue ?? []) as any[]) {
    const completedAt = new Date(b.job_completed_at);
    const hoursOld = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
    items.push({
      kind: "photo_review",
      id: b.id,
      title: `Photo review · ${b.customer_name ?? "—"}`,
      subtitle: `${b.service_name ?? "Detail"} · completed ${hoursOld < 1 ? "just now" : hoursOld < 24 ? `${Math.round(hoursOld)}h ago` : `${Math.round(hoursOld / 24)}d ago`}`,
      href: `/admin/schedule?date=${b.booking_date}&booking=${b.id}`,
      occurredAt: b.job_completed_at,
      severity: hoursOld > 48 ? "urgent" : hoursOld > 12 ? "warn" : "info",
    });
  }

  // ── 2. Low ratings in the last 14 days ──────────────────────────────────
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: lowRatings } = await admin
    .from("customer_ratings")
    .select("id, booking_id, overall_stars, comments, token_used_at")
    .lte("overall_stars", 3)
    .not("token_used_at", "is", null)
    .gte("token_used_at", fourteenDaysAgo)
    .order("token_used_at", { ascending: false })
    .limit(10);
  for (const r of (lowRatings ?? []) as any[]) {
    items.push({
      kind: "low_rating",
      id: r.id,
      title: `${r.overall_stars}★ rating submitted`,
      subtitle: (r.comments as string | null)?.slice(0, 80) ?? "No comment left",
      href: `/admin/schedule?booking=${r.booking_id}`,
      occurredAt: r.token_used_at,
      severity: r.overall_stars <= 2 ? "urgent" : "warn",
    });
  }

  // ── 3. Payment confirmation emails that failed ──────────────────────────
  const { data: failedEmails } = await admin
    .from("bookings")
    .select("id, customer_name, total_price, booking_date, payment_received_email_failed_at, payment_received_email_last_error")
    .not("stripe_checkout_session_id", "is", null)
    .is("payment_received_email_sent_at", null)
    .not("payment_received_email_failed_at", "is", null)
    .order("payment_received_email_failed_at", { ascending: false })
    .limit(10);
  for (const b of (failedEmails ?? []) as any[]) {
    items.push({
      kind: "payment_email_failed",
      id: b.id,
      title: `Payment email never delivered · ${b.customer_name ?? "—"}`,
      subtitle: `$${Number(b.total_price ?? 0).toFixed(0)} · ${b.payment_received_email_last_error ?? "unknown error"}`,
      href: `/admin/schedule?date=${b.booking_date}&booking=${b.id}`,
      occurredAt: b.payment_received_email_failed_at,
      severity: "urgent",
    });
  }

  // ── 4. Unassigned bookings in the next 48 hours ─────────────────────────
  const today = now.toLocaleDateString("en-CA");
  const in48 = new Date(now.getTime() + 48 * 60 * 60 * 1000).toLocaleDateString("en-CA");
  const { data: unassigned } = await admin
    .from("bookings")
    .select("id, customer_name, service_name, booking_date, booking_time")
    .is("assigned_to", null)
    .neq("status", "cancelled")
    .gte("booking_date", today)
    .lte("booking_date", in48)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true })
    .limit(10);
  for (const b of (unassigned ?? []) as any[]) {
    // Compute a "hours until" rather than "hours ago" for upcoming bookings
    let dateLabel = b.booking_date;
    try {
      dateLabel = new Date(b.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch {}
    items.push({
      kind: "unassigned_booking",
      id: b.id,
      title: `Unassigned · ${b.customer_name ?? "—"}`,
      subtitle: `${b.service_name ?? "Detail"} · ${dateLabel} ${b.booking_time ?? ""}`,
      href: `/admin/schedule?date=${b.booking_date}&booking=${b.id}`,
      occurredAt: b.booking_date,
      severity: b.booking_date === today ? "urgent" : "warn",
    });
  }

  // ── 5. Contractor-reported issues from the last 7 days ──────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: issues } = await admin
    .from("error_logs")
    .select("id, message, details, created_at")
    .eq("type", "contractor_issue_report")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(10);
  for (const e of (issues ?? []) as any[]) {
    const detail = (e.details as { bookingId?: string; category?: string } | null) ?? {};
    items.push({
      kind: "contractor_issue",
      id: e.id,
      title: `Contractor issue · ${detail.category ?? "report"}`,
      subtitle: ((e.message as string) ?? "").slice(0, 100),
      href: detail.bookingId ? `/admin/schedule?booking=${detail.bookingId}` : "/admin/schedule",
      occurredAt: e.created_at,
      severity: "urgent",
    });
  }

  // ── 6. Contractors fully-signed but still pending activation ────────────
  const { data: pendingContractors } = await admin
    .from("profiles")
    .select("id, first_name, last_name, employment_status, created_at")
    .eq("role", "contractor")
    .eq("employment_status", "pending");
  if (pendingContractors && pendingContractors.length > 0) {
    const ids = pendingContractors.map((c: any) => c.id);
    const { data: signed } = await admin
      .from("contractor_agreements")
      .select("contractor_id, doc_kind")
      .eq("status", "signed")
      .in("contractor_id", ids)
      .in("doc_kind", ["payment", "restrictions", "liability"]);
    const kindsByContractor = new Map<string, Set<string>>();
    for (const r of (signed ?? []) as any[]) {
      const k = r.contractor_id as string;
      if (!kindsByContractor.has(k)) kindsByContractor.set(k, new Set());
      kindsByContractor.get(k)!.add(r.doc_kind);
    }
    for (const c of pendingContractors as any[]) {
      if (kindsByContractor.get(c.id)?.size === 3) {
        items.push({
          kind: "contractor_activation",
          id: c.id,
          title: `Activate contractor · ${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
          subtitle: "All 3 documents signed — ready to be flipped to active.",
          href: `/admin/contractors`,
          occurredAt: c.created_at ?? new Date().toISOString(),
          severity: "warn",
        });
      }
    }
  }

  // ── 7. Contractors eligible for promotion (jobs + rating thresholds) ────
  const { DEFAULT_TIER_LADDER } = await import("@/lib/contractorAgreement");
  const { data: activeContractors } = await admin
    .from("profiles")
    .select("id, first_name, last_name, commission_tier, completed_jobs_count, rating_overall_avg")
    .eq("role", "contractor")
    .eq("employment_status", "active");
  for (const c of (activeContractors ?? []) as any[]) {
    const currentTier = Number(c.commission_tier ?? 1);
    const next = DEFAULT_TIER_LADDER.find(t => t.tier > currentTier);
    if (!next) continue;
    if (next.manualOnly) continue;
    const jobsOk   = next.minJobs === 0 || Number(c.completed_jobs_count ?? 0) >= next.minJobs;
    const ratingOk = next.minRating == null || (Number(c.rating_overall_avg ?? 0)) >= next.minRating;
    if (jobsOk && ratingOk) {
      items.push({
        kind: "contractor_eligible_promotion",
        id: c.id,
        title: `Promote? · ${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
        subtitle: `Eligible for Tier ${next.tier} (${next.pct}%) — ${c.completed_jobs_count ?? 0} jobs · ${(Number(c.rating_overall_avg ?? 0)).toFixed(1)}★`,
        href: `/admin/contractors`,
        occurredAt: new Date().toISOString(),
        severity: "info",
      });
    }
  }

  // ── Sort: urgent > warn > info, then newest first ───────────────────────
  const sevPri = (s: AttentionItem["severity"]) => s === "urgent" ? 0 : s === "warn" ? 1 : 2;
  items.sort((a, b) => {
    const ds = sevPri(a.severity) - sevPri(b.severity);
    if (ds !== 0) return ds;
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });

  return items;
}
