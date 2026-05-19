import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getContractorOnboardingStatus } from "@/app/actions/contractorOnboarding";
import { OnboardingShell } from "@/components/contractor/OnboardingShell";

async function ContractorOnboarding() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/protected/onboarding");

  const status = await getContractorOnboardingStatus();
  if (!status) {
    // Not a contractor — send them to the regular dashboard.
    redirect("/protected");
  }

  return <OnboardingShell initialStatus={status} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
        </div>
      }
    >
      <ContractorOnboarding />
    </Suspense>
  );
}
