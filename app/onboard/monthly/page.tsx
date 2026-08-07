import { verifyInviteToken } from "@/lib/monthlyToken";
import { getOnboardPrefill } from "@/app/actions/monthlySubscriptions";
import { MonthlyOnboardForm } from "./_form";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function OnboardMonthlyPage({ searchParams }: Props) {
  const params = await searchParams;
  const token  = params.token;

  // Only trust properly-signed invite tokens — no bare ?email= bypass
  const email = token ? await verifyInviteToken(token) : null;

  if (!email) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>
          <h1 className="text-2xl font-black text-white">Invite expired or invalid</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            This link has expired or isn&apos;t valid. Please contact us and we&apos;ll send a fresh invite.
          </p>
          <a
            href="#"
            className="inline-block mt-2 bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider px-6 py-3 rounded-xl"
          >
            Call 
          </a>
        </div>
      </div>
    );
  }

  const prefill = await getOnboardPrefill(email);

  return <MonthlyOnboardForm email={email} prefill={prefill} />;
}
