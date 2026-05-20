import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgreementPrintShell } from "@/components/admin/AgreementPrintShell";

async function requireAdmin(userId: string | undefined, email: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdminRole = ((row as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const emailMatch = !!email && allowlist.includes(email.toLowerCase());
  return isAdminRole || emailMatch;
}

async function PrintPage({ id }: { id: string }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/admin/contractor-agreement/${id}`);
  if (!(await requireAdmin(user.id, user.email))) redirect("/protected");

  const admin = createAdminClient();
  const { data: agreement } = await admin
    .from("contractor_agreements")
    .select("id, contractor_id, agreement_version, doc_kind, agreement_html, signed_name, signed_at, signed_ip, signed_user_agent")
    .eq("id", id)
    .maybeSingle();

  if (!agreement) notFound();

  let contractorEmail: string | null = null;
  if ((agreement as any).contractor_id) {
    const { data: c } = await admin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", (agreement as any).contractor_id)
      .maybeSingle();
    contractorEmail = ((c as any)?.email as string) ?? null;
  }

  return (
    <AgreementPrintShell
      agreementHtml={(agreement as any).agreement_html as string}
      meta={{
        docKind:     (agreement as any).doc_kind   as string,
        version:     (agreement as any).agreement_version as string,
        signedName:  (agreement as any).signed_name as string,
        signedAt:    (agreement as any).signed_at  as string,
        signedIp:    (agreement as any).signed_ip  as string | null,
        signedUa:    (agreement as any).signed_user_agent as string | null,
        contractorEmail,
      }}
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Resolver params={params} />
    </Suspense>
  );
}

async function Resolver({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrintPage id={id} />;
}
