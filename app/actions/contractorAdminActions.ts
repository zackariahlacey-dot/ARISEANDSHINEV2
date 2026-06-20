"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { DEFAULT_TIER_LADDER, DOC_DEFINITIONS, type DocKind } from "@/lib/contractorAgreement";

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{ ok: true; userId: string; ip: string | null } | { ok: false; error: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

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
  if (!isAdminRole && !emailMatch) return { ok: false, error: "Admin only." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;
  return { ok: true, userId: user.id, ip };
}

async function audit(adminId: string, action: string, targetTable: string, targetId: string, payload: object, ip: string | null) {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      target_table: targetTable,
      target_id: targetId,
      payload,
      ip_address: ip,
    });
  } catch (err) {
    console.error("[contractorAdmin] audit log failed:", err);
  }
}

// ── List contractors with onboarding progress ────────────────────────────────

export type ContractorSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentStatus: string;          // pending | active | paused | terminated
  commissionTier: number;
  commissionPct: number;
  dailyJobCap: number;
  hireDate: string | null;
  signedDocsCount: number;           // 0..3
  fullyOnboarded: boolean;
  ratingOverallAvg: number | null;
  ratingCount: number;
  completedJobsCount: number;
};

export async function listContractors(): Promise<ContractorSummary[]> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];

  const admin = createAdminClient();
  const [profilesRes, agreementsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, email, phone, employment_status, commission_tier, commission_pct, daily_job_cap, hire_date, rating_overall_avg, rating_count, completed_jobs_count")
      .eq("role", "contractor")
      .order("created_at", { ascending: false }),
    admin
      .from("contractor_agreements")
      .select("contractor_id, doc_kind")
      .eq("status", "signed")
      .in("doc_kind", ["payment", "restrictions", "liability"]),
  ]);

  // Count unique signed kinds per contractor
  const kindsByContractor = new Map<string, Set<string>>();
  for (const r of (agreementsRes.data ?? []) as any[]) {
    const key = r.contractor_id as string;
    if (!kindsByContractor.has(key)) kindsByContractor.set(key, new Set());
    kindsByContractor.get(key)!.add(r.doc_kind);
  }

  return ((profilesRes.data ?? []) as any[]).map(p => {
    const kinds = kindsByContractor.get(p.id) ?? new Set();
    return {
      id: p.id,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      employmentStatus: p.employment_status ?? "pending",
      commissionTier: Number(p.commission_tier ?? 1),
      commissionPct: Number(p.commission_pct ?? 35),
      dailyJobCap: Number(p.daily_job_cap ?? 3),
      hireDate: p.hire_date ?? null,
      signedDocsCount: kinds.size,
      fullyOnboarded: kinds.size === 3,
      ratingOverallAvg: p.rating_overall_avg != null ? Number(p.rating_overall_avg) : null,
      ratingCount: Number(p.rating_count ?? 0),
      completedJobsCount: Number(p.completed_jobs_count ?? 0),
    };
  });
}

// ── Invite contractor ────────────────────────────────────────────────────────

export type InviteContractorArgs = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export async function inviteContractor(args: InviteContractorArgs): Promise<{ ok: boolean; contractorId?: string; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const cleanEmail = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: "Please enter a valid email." };
  }
  const firstName = args.firstName.trim();
  const lastName  = args.lastName.trim();
  if (!firstName) return { ok: false, error: "First name required." };

  const admin = createAdminClient();

  // 1. Check if a profile already exists for this email
  let userId: string | undefined;
  const { data: existingByEmail } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existingByEmail) {
    if ((existingByEmail as any).role === "contractor") {
      return { ok: false, error: "This person is already a contractor." };
    }
    userId = (existingByEmail as any).id;
  } else {
    // 2. See if there's an auth user (no profile linked yet)
    try {
      const { data: usersList } = await admin.auth.admin.listUsers();
      const existing = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
      if (existing) {
        userId = existing.id;
      }
    } catch (err) {
      console.error("[inviteContractor] listUsers failed:", err);
    }
  }

  // 3. If no user yet, send Supabase invite which creates user + emails them
  if (!userId) {
    const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinedetailing.com").replace(/\/$/, "");
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: `${siteOrigin}/auth/confirm?next=/protected/onboarding`,
      data: {
        first_name: firstName,
        last_name: lastName,
        role_intent: "contractor",
      },
    });
    if (inviteErr || !invited.user) {
      console.error("[inviteContractor] inviteUserByEmail failed:", inviteErr);
      return { ok: false, error: inviteErr?.message ?? "Could not invite contractor." };
    }
    userId = invited.user.id;
  }

  if (!userId) return { ok: false, error: "Could not resolve contractor identity." };

  // 4. Upsert profile with role=contractor + pending status
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({
      id: userId,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName,
      phone: args.phone?.trim() || null,
      role: "contractor",
      employment_status: "pending",
      commission_tier: 1,
      commission_pct: DEFAULT_TIER_LADDER[0].pct,
      daily_job_cap: 3,
    }, { onConflict: "id" });

  if (profileErr) {
    console.error("[inviteContractor] profile upsert failed:", profileErr);
    return { ok: false, error: profileErr.message };
  }

  // 5. Send a custom welcome email with onboarding link (in addition to
  //    Supabase's magic-link invite). Best-effort; never block the action.
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinedetailing.com").replace(/\/$/, "");
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>",
        to: cleanEmail,
        replyTo: "contact@ariseandshinedetailing.com",
        subject: "Welcome to Arise & Shine — finish your contractor setup",
        html: contractorWelcomeHtml({ firstName, siteOrigin }),
      });
    }
  } catch (err) {
    console.error("[inviteContractor] welcome email failed:", err);
  }

  await audit(auth.userId, "invite_contractor", "profiles", userId, { email: cleanEmail, firstName, lastName }, auth.ip);

  return { ok: true, contractorId: userId };
}

function contractorWelcomeHtml({ firstName, siteOrigin }: { firstName: string; siteOrigin: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="background:#0a0a0a;padding:28px 32px;border-radius:14px 14px 0 0;text-align:center;">
        <p style="color:#d4af37;font-size:13px;font-weight:900;margin:0;letter-spacing:0.18em;text-transform:uppercase;">Arise And Shine Detailing</p>
        <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0 0;">Welcome aboard, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#fff;padding:28px 32px;border-radius:0 0 14px 14px;">
        <p style="font-size:14px;color:#333;line-height:1.65;margin:0 0 16px;">
          You've been invited to join Arise And Shine Detailing as an <strong>independent contractor</strong>. Before you can pick up jobs, we need you to read and electronically sign three short documents — how you get paid, what you can't do, and what you're responsible for. Takes about 10 minutes total.
        </p>
        <p style="font-size:13px;color:#555;line-height:1.65;margin:0 0 20px;">
          You should also receive a separate email from Supabase with a one-time link to set your password. Use that link first, then come back to the dashboard.
        </p>
        <p style="text-align:center;margin:24px 0 8px;">
          <a href="${siteOrigin}/protected/onboarding" style="display:inline-block;background:#d4af37;color:#000;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;padding:14px 32px;border-radius:8px;text-decoration:none;">Open my onboarding</a>
        </p>
        <p style="font-size:11px;color:#888;text-align:center;margin:16px 0 0;">
          Questions? Email <a href="mailto:contact@ariseandshinedetailing.com" style="color:#d4af37;">contact@ariseandshinedetailing.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ── Promote / demote tier ────────────────────────────────────────────────────

export async function setContractorTier(contractorId: string, tier: number, commissionPct: number): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (tier < 1 || tier > 10) return { ok: false, error: "Invalid tier." };
  if (commissionPct < 0 || commissionPct > 100) return { ok: false, error: "Invalid commission percentage." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ commission_tier: tier, commission_pct: commissionPct })
    .eq("id", contractorId)
    .eq("role", "contractor");
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, "set_contractor_tier", "profiles", contractorId, { tier, commissionPct }, auth.ip);
  return { ok: true };
}

// ── Employment status (active / pause / terminate) ───────────────────────────

export async function setContractorStatus(
  contractorId: string,
  status: "active" | "paused" | "terminated",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const update: Record<string, unknown> = { employment_status: status };
  if (status === "active") {
    update.terminated_at = null;
    update.terminated_reason = null;
    update.hire_date = (await admin.from("profiles").select("hire_date").eq("id", contractorId).maybeSingle()).data?.hire_date
      ?? new Date().toISOString().slice(0, 10);
  } else if (status === "terminated") {
    update.terminated_at = new Date().toISOString();
    if (reason) update.terminated_reason = reason;
  }
  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", contractorId)
    .eq("role", "contractor");
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, `contractor_${status}`, "profiles", contractorId, { status, reason }, auth.ip);
  return { ok: true };
}

// ── Daily cap ────────────────────────────────────────────────────────────────

export async function setContractorDailyCap(contractorId: string, cap: number): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (cap < 0 || cap > 20) return { ok: false, error: "Daily cap must be between 0 and 20." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ daily_job_cap: cap })
    .eq("id", contractorId)
    .eq("role", "contractor");
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, "set_contractor_daily_cap", "profiles", contractorId, { cap }, auth.ip);
  return { ok: true };
}

// ── Contractor detail (full payload for admin drawer) ────────────────────────

export type ContractorDetail = ContractorSummary & {
  adminNotes: string | null;
  terminatedAt: string | null;
  terminatedReason: string | null;
  signedDocs: Array<{
    docKind: DocKind;
    docTitle: string;
    agreementId: string;
    signedAt: string;
    signedName: string;
    version: string;
    signedIp: string | null;
  }>;
  recentAuditLog: Array<{
    id: string;
    action: string;
    payload: unknown;
    createdAt: string;
  }>;
};

export async function getContractorDetail(contractorId: string): Promise<ContractorDetail | null> {
  const auth = await requireAdmin();
  if (!auth.ok) return null;

  const admin = createAdminClient();
  const [profileRes, agreementsRes, auditRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, email, phone, employment_status, commission_tier, commission_pct, daily_job_cap, hire_date, terminated_at, terminated_reason, admin_notes, rating_overall_avg, rating_count, completed_jobs_count")
      .eq("id", contractorId)
      .eq("role", "contractor")
      .maybeSingle(),
    admin
      .from("contractor_agreements")
      .select("id, doc_kind, signed_at, signed_name, agreement_version, signed_ip")
      .eq("contractor_id", contractorId)
      .eq("status", "signed")
      .order("signed_at", { ascending: false }),
    admin
      .from("admin_audit_log")
      .select("id, action, payload, created_at")
      .eq("target_id", contractorId)
      .eq("target_table", "profiles")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const p = profileRes.data as any | null;
  if (!p) return null;

  const docTitles = new Map(DOC_DEFINITIONS.map(d => [d.kind, d.title]));
  // Keep only one row per doc_kind (newest first because of order desc)
  const seenKinds = new Set<string>();
  const signedDocs = ((agreementsRes.data ?? []) as any[])
    .filter(r => {
      const k = r.doc_kind;
      if (!docTitles.has(k as DocKind)) return false;
      if (seenKinds.has(k)) return false;
      seenKinds.add(k);
      return true;
    })
    .map(r => ({
      docKind: r.doc_kind as DocKind,
      docTitle: docTitles.get(r.doc_kind as DocKind) ?? r.doc_kind,
      agreementId: r.id,
      signedAt: r.signed_at,
      signedName: r.signed_name,
      version: r.agreement_version,
      signedIp: r.signed_ip ?? null,
    }));

  return {
    id: p.id,
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    employmentStatus: p.employment_status ?? "pending",
    commissionTier: Number(p.commission_tier ?? 1),
    commissionPct: Number(p.commission_pct ?? 35),
    dailyJobCap: Number(p.daily_job_cap ?? 3),
    hireDate: p.hire_date ?? null,
    signedDocsCount: signedDocs.length,
    fullyOnboarded: signedDocs.length === 3,
    ratingOverallAvg: p.rating_overall_avg != null ? Number(p.rating_overall_avg) : null,
    ratingCount: Number(p.rating_count ?? 0),
    completedJobsCount: Number(p.completed_jobs_count ?? 0),
    adminNotes: p.admin_notes ?? null,
    terminatedAt: p.terminated_at ?? null,
    terminatedReason: p.terminated_reason ?? null,
    signedDocs,
    recentAuditLog: ((auditRes.data ?? []) as any[]).map(a => ({
      id: a.id,
      action: a.action,
      payload: a.payload,
      createdAt: a.created_at,
    })),
  };
}

// ── View a signed agreement's snapshot HTML ──────────────────────────────────

export async function getSignedAgreementHtml(agreementId: string): Promise<{ ok: boolean; html?: string; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contractor_agreements")
    .select("agreement_html")
    .eq("id", agreementId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Not found." };
  return { ok: true, html: (data as any).agreement_html as string };
}

// ── Update admin notes ───────────────────────────────────────────────────────

export async function setContractorNotes(contractorId: string, notes: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ admin_notes: notes.trim() || null })
    .eq("id", contractorId)
    .eq("role", "contractor");
  if (error) return { ok: false, error: error.message };

  await audit(auth.userId, "update_contractor_notes", "profiles", contractorId, { length: notes.length }, auth.ip);
  return { ok: true };
}
