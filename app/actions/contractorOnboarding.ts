"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONTRACT_VERSION,
  DOC_DEFINITIONS,
  renderContractorDoc,
  type DocKind,
} from "@/lib/contractorAgreement";

export type SignedDoc = {
  kind: DocKind;
  id: string;
  signedAt: string;
  signedName: string;
  version: string;
};

export type OnboardingStatus = {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employmentStatus: string;       // pending | active | paused | terminated
  };
  signedDocs: SignedDoc[];          // 0..3 — one per kind once signed
  fullyOnboarded: boolean;
};

const VALID_KINDS: DocKind[] = ["payment", "restrictions", "liability"];

function isDocKind(v: string): v is DocKind {
  return (VALID_KINDS as string[]).includes(v);
}

/**
 * Returns the signed-in contractor's onboarding state — profile + which of
 * the three documents they've signed. Returns null if the caller isn't a
 * contractor (the page redirects them home).
 */
export async function getContractorOnboardingStatus(): Promise<OnboardingStatus | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [profileRes, signedRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, first_name, last_name, email, phone, employment_status")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("contractor_agreements")
      .select("id, doc_kind, signed_at, signed_name, agreement_version, status")
      .eq("contractor_id", user.id)
      .eq("status", "signed"),
  ]);

  const profile = profileRes.data;
  if (!profile || (profile as any).role !== "contractor") return null;

  // Keep only one signed copy per kind — newest wins if duplicates exist.
  const latestByKind = new Map<DocKind, SignedDoc>();
  for (const row of (signedRes.data ?? []) as any[]) {
    const kind = row.doc_kind as string;
    if (!isDocKind(kind)) continue;
    const existing = latestByKind.get(kind);
    if (!existing || new Date(row.signed_at) > new Date(existing.signedAt)) {
      latestByKind.set(kind, {
        kind,
        id: row.id,
        signedAt: row.signed_at,
        signedName: row.signed_name,
        version: row.agreement_version,
      });
    }
  }

  const signedDocs = VALID_KINDS
    .map(k => latestByKind.get(k))
    .filter((d): d is SignedDoc => !!d);

  return {
    profile: {
      id: profile.id as string,
      firstName: ((profile as any).first_name as string) ?? "",
      lastName:  ((profile as any).last_name as string) ?? "",
      email:     ((profile as any).email as string) ?? "",
      phone:     ((profile as any).phone as string) ?? "",
      employmentStatus: ((profile as any).employment_status as string) ?? "pending",
    },
    signedDocs,
    fullyOnboarded: signedDocs.length === VALID_KINDS.length,
  };
}

/**
 * Records the contractor's electronic signature on one of the three
 * contractor documents (payment / restrictions / liability).
 *
 * - Idempotent — if the doc kind is already signed, returns success
 *   without inserting a duplicate.
 * - Snapshots the rendered HTML at sign time so future template edits
 *   never alter past contracts.
 * - Captures IP + UA from request headers, writes an admin_audit_log row.
 */
export async function signContractorDoc(
  kind: DocKind,
  typedName: string,
): Promise<
  | { ok: true; signedAt: string; version: string; kind: DocKind }
  | { ok: false; error: string }
> {
  if (!isDocKind(kind)) return { ok: false, error: "Invalid document type." };

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
    return { ok: false, error: "Only contractors can sign these documents." };
  }

  // Idempotent check
  const { data: existing } = await admin
    .from("contractor_agreements")
    .select("id, signed_at, agreement_version")
    .eq("contractor_id", user.id)
    .eq("doc_kind", kind)
    .eq("status", "signed")
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: true,
      kind,
      signedAt: existing.signed_at as string,
      version: existing.agreement_version as string,
    };
  }

  // Snapshot the HTML at this moment
  const today = new Date().toISOString().slice(0, 10);
  const agreementHtml = renderContractorDoc(kind, {
    contractorLegalName: cleanName,
    contractorEmail:     ((profile as any).email as string) ?? "",
    effectiveDate:       today,
  });

  // IP + UA from headers
  const h = await headers();
  const ipHeader = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  const ip = ipHeader.split(",")[0]?.trim() || null;
  const ua = h.get("user-agent") ?? null;

  const { data, error } = await admin
    .from("contractor_agreements")
    .insert({
      contractor_id:     user.id,
      doc_kind:          kind,
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
    console.error("[signContractorDoc]", error);
    return { ok: false, error: "Could not record signature. Please try again." };
  }

  try {
    await admin.from("admin_audit_log").insert({
      admin_id:     user.id,
      action:       `contractor_signed_${kind}`,
      target_table: "contractor_agreements",
      target_id:    data.id,
      payload:      { kind, version: CONTRACT_VERSION, signed_name: cleanName },
      ip_address:   ip,
    });
  } catch {}

  return {
    ok: true,
    kind,
    signedAt: data.signed_at as string,
    version: data.agreement_version as string,
  };
}

/** Surface the doc catalog for the onboarding UI without re-importing the
 *  contractor-agreement module client-side (which would bloat the bundle
 *  with raw HTML strings that only render at sign time). */
export async function getContractorDocCatalog() {
  return DOC_DEFINITIONS;
}
