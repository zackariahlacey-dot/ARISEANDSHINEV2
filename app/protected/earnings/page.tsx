import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EarningsShell } from "@/components/contractor/EarningsShell";

async function ContractorEarningsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/protected/earnings");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((row as { role?: string } | null)?.role !== "contractor") {
    redirect("/protected");
  }
  return <EarningsShell />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <ContractorEarningsPage />
    </Suspense>
  );
}
