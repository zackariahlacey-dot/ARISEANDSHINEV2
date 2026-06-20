import { getSchedulePageData, getSchedulePageDataBySubId } from "@/app/actions/monthlySubscriptions";
import { createClient } from "@/lib/supabase/server";
import { MonthlySchedulePicker } from "./_picker";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MonthlySchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;
  const subId = params.sub;
  const month = params.month;

  // ── Authenticated dashboard path (?sub=...&month=...) ─────────────────────
  if (subId && month) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return <InvalidLink reason="Please log in to schedule your monthly detail." loginCta />;
    }

    const data = await getSchedulePageDataBySubId(subId, user.id, month);

    if (!data) {
      return <InvalidLink reason="Subscription not found or you don't have permission to access it." />;
    }

    // Pass a null token — picker will use subscriptionId directly
    return <MonthlySchedulePicker data={data} token={null} />;
  }

  // ── Email link path (?token=...) ──────────────────────────────────────────
  if (!token) {
    return <InvalidLink reason="No scheduling link provided." />;
  }

  const data = await getSchedulePageData(token);

  if (!data) {
    return <InvalidLink reason="This link is invalid or has expired." />;
  }

  return <MonthlySchedulePicker data={data} token={token} />;
}

function InvalidLink({ reason, loginCta }: { reason: string; loginCta?: boolean }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center mx-auto text-2xl">
          🔒
        </div>
        <h1 className="text-2xl font-black text-white">
          {loginCta ? "Login required" : "Link expired"}
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">{reason}</p>
        {loginCta ? (
          <a
            href="/auth/login?redirect=/protected"
            className="inline-block mt-2 bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider px-6 py-3 rounded-xl"
          >
            Log In
          </a>
        ) : (
          <>
            <p className="text-zinc-500 text-sm">
              Please check your email for a valid scheduling link, or contact us to get a new one.
            </p>
            <a
              href="mailto:contact@ariseandshinedetailing.com"
              className="inline-block mt-2 bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider px-6 py-3 rounded-xl"
            >
              Email Us
            </a>
          </>
        )}
      </div>
    </div>
  );
}
