"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTRACT_VERSION, renderContractorAgreement } from "@/lib/contractorAgreement";

export type OnboardingStatus = {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employmentStatus: string;       // pending | active | paused | terminated
    headshotUrl: string | null;
  };
  agreement: {
    id: string;
    signedAt: string;
    signedName: string;
    version: string;
  } | null;
  documents: Array<{
    docType: string;
    status: string;                 // not_uploaded | uploaded | approved | rejected
    uploadedAt: string | null;
    reviewedAt: string | null;
    expiresAt: string | null;
    reviewNotes: string | null;
  }>;
};

/**
 * Returns the signed-in contractor's onboarding state — profile snapshot,
 * latest signed agreement (if any), and per-document status. Returns null
 * if the caller isn't a contractor (the page will redirect them home).
 */
export async function getContractorOnboardingStatus(): Promise<OnboardingStatus | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [profileRes, agreementRes, docsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, first_name, last_name, email, phone, employment_status, headshot_url")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("contractor_agreements")
      .select("id, signed_at, signed_name, agreement_version, status")
      .eq("contractor_id", user.id)
      .eq("status", "signed")
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("contractor_documents")
      .select("doc_type, status, uploaded_at, reviewed_at, expires_at, review_notes")
      .eq("contractor_id", user.id),
  ]);

  const profile = profileRes.data;
  if (!profile || (profile as any).role !== "contractor") return null;

  return {
    profile: {
      id: profile.id as string,
      firstName: ((profile as any).first_name as string) ?? "",
      lastName:  ((profile as any).last_name as string) ?? "",
      email:     ((profile as any).email as string) ?? "",
      phone:     ((profile as any).phone as string) ?? "",
      employmentStatus: ((profile as any).employment_status as string) ?? "pending",
      headshotUrl:      ((profile as any).headshot_url as string) ?? null,
    },
    agreement: agreementRes.data
      ? {
          id:        agreementRes.data.id as string,
          signedAt:  agreementRes.data.signed_at as string,
          signedName: agreementRes.data.signed_name as string,
          version:   agreementRes.data.agreement_version as string,
        }
      : null,
    documents: (docsRes.data ?? []).map((d: any) => ({
      docType:    d.doc_type,
      status:     d.status,
      uploadedAt: d.uploaded_at,
      reviewedAt: d.reviewed_at,
      expiresAt:  d.expires_at,
      reviewNotes: d.review_notes ?? null,
    })),
  };
}

/**
 * Records the contractor's electronic signature on the agreement.
 *
 * - Snapshots the rendered HTML at the moment of signing so the exact text
 *   the contractor consented to is preserved even if the template is later
 *   edited.
 * - Captures IP + user-agent from request headers for the audit record.
 * - Writes an admin_audit_log entry so the signing event shows up in any
 *   later admin review of contractor history.
 */
export async function signContractorAgreement(typedName: string): Promise<{ ok: true; signedAt: string; version: string } | { ok: false; error: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const cleanName = typedName.trim();
  if (cleanName.length < 2) {
    return { ok: false, error: "Please type your full legal name." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile as any).role !== "contractor") {
    return { ok: false, error: "Only contractors can sign this agreement." };
  }

  // Idempotent: if there's already an active signed agreement, just succeed.
  const { data: existing } = await admin
    .from("contractor_agreements")
    .select("id, signed_at, agreement_version")
    .eq("contractor_id", user.id)
    .eq("status", "signed")
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: true,
      signedAt: existing.signed_at as string,
      version: existing.agreement_version as string,
    };
  }

  // Snapshot the exact HTML at sign time — never recompute later.
  const today = new Date().toISOString().slice(0, 10);
  const agreementHtml = renderContractorAgreement({
    contractorLegalName: cleanName,
    contractorEmail:     ((profile as any).email as string) ?? "",
    effectiveDate:       today,
  });

  // IP + UA from request headers (forwarded through Vercel/Cloudflare).
  const h = await headers();
  const ipHeader = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  const ip = ipHeader.split(",")[0]?.trim() || null;
  const ua = h.get("user-agent") ?? null;

  const { data, error } = await admin
    .from("contractor_agreements")
    .insert({
      contractor_id:     user.id,
      agreement_version: CONTRACT_VERSION,
      agreement_html:    agreementHtml,
      signed_name:       cleanName,
      signed_ip:         ip,
      signed_user_agent: ua,
      status:            "signed",
    })
    .select("id, signed_at, agreement_version")
    .single();

  if (error || !data) {
    console.error("[signContractorAgreement]", error);
    return { ok: false, error: "Could not record signature. Please try again." };
  }

  // Audit log — best-effort, never block the signature on this failing.
  try {
    await admin.from("admin_audit_log").insert({
      admin_id:     user.id,
      action:       "contractor_signed_agreement",
      target_table: "contractor_agreements",
      target_id:    data.id,
      payload:      { version: CONTRACT_VERSION, signed_name: cleanName },
      ip_address:   ip,
    });
  } catch {}

  return {
    ok: true,
    signedAt: data.signed_at as string,
    version: data.agreement_version as string,
  };
}
