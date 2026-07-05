import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyActiveMembership } from "@/app/actions/membership";
import { MEMBERSHIP_PRICE_USD, MEMBERSHIP_CREDIT_USD, formatCentsCompact } from "@/lib/membership";
import { MembershipPurchaseClient } from "@/components/membership/MembershipPurchaseClient";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Crown, Check, Lock, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Premium Annual Membership | Arise And Shine Detailing",
  description: `Pay $${MEMBERSHIP_PRICE_USD}, get $${MEMBERSHIP_CREDIT_USD} in service credit to spend on any combination of details and add-ons over 12 months.`,
};

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isLoggedIn = !!auth.user?.id;
  const active = isLoggedIn ? await getMyActiveMembership() : null;

  const bonus = MEMBERSHIP_CREDIT_USD - MEMBERSHIP_PRICE_USD;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      {/* SiteHeader is fixed at top-8 + h-16 → ~96px. Pad-top 32/40 gives the
          hero room to breathe instead of slamming into the announcement bar. */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40 pb-12 sm:pb-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <Crown size={14} className="text-[#D4AF37]" />
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/80">Premium Membership</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Pay ${MEMBERSHIP_PRICE_USD}. Get ${MEMBERSHIP_CREDIT_USD}.
          </h1>
          <p className="text-zinc-400 mt-3 text-sm max-w-lg mx-auto leading-relaxed">
            One annual price gets you a credit balance to spend on whatever you need — Interior + Exterior details, Salt Recovery,
            Ultimate packages, ceramic coatings, you name it.
          </p>
        </div>

        {/* Active member state */}
        {active ? (
          <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.04] p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] mb-3">
              <Crown size={12} className="text-[#D4AF37]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Active Member</span>
            </div>
            <h2 className="text-xl font-black text-white">You&apos;re all set.</h2>
            <p className="text-sm text-zinc-400 mt-2">
              <span className="text-[#D4AF37] font-bold">{formatCentsCompact(active.credit_balance_cents)}</span> credit remaining,
              valid through {new Date(active.expires_at).toLocaleDateString()}.
            </p>
            <Link href="/protected" className="inline-block mt-5 px-5 py-2.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] text-[#D4AF37] text-sm font-bold hover:bg-[#D4AF37]/[0.12] transition-all">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Pricing card */}
            <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.06] to-zinc-900/60 shadow-[0_0_40px_rgba(212,175,55,0.08)] mb-6">
              <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
              <div className="p-7 md:p-9">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-1">You Pay</div>
                    <div className="text-3xl font-black text-white tabular-nums">${MEMBERSHIP_PRICE_USD}</div>
                  </div>
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]/80 mb-1">You Get</div>
                    <div className="text-3xl font-black text-[#D4AF37] tabular-nums">${MEMBERSHIP_CREDIT_USD}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] px-4 py-3 mb-6 text-center">
                  <div className="text-xs text-emerald-300/90">
                    <span className="font-black">${bonus} bonus credit</span> — about 25% more than you paid.
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {[
                    { strong: `Spend on anything`, rest: "Interior + Exterior, Ultimate, Salt Recovery, ceramic coatings, any add-on" },
                    { strong: `Use over 12 months`, rest: "no monthly commitments, no rush — spend the credit at your pace" },
                    { strong: `Cover multiple vehicles`, rest: "the credit is yours — use it on the family car, the work van, the kids' rides" },
                    { strong: `No auto-renew`, rest: "you decide each year whether to renew" },
                  ].map(b => (
                    <li key={b.strong} className="flex items-start gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center mt-0.5">
                        <Check size={11} className="text-[#D4AF37]" strokeWidth={3} />
                      </span>
                      <div className="text-sm leading-snug">
                        <span className="font-bold text-white">{b.strong}</span>
                        <span className="text-zinc-500"> — {b.rest}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                {!isLoggedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
                      <Lock size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        Membership is tied to your account. <Link href="/auth/login?next=/membership" className="font-bold underline hover:text-amber-100">Sign in</Link> or <Link href="/auth/sign-up?next=/membership" className="font-bold underline hover:text-amber-100">create an account</Link> to purchase.
                      </p>
                    </div>
                  </div>
                ) : (
                  <MembershipPurchaseClient />
                )}

                <p className="text-[10px] text-zinc-600 mt-4 text-center">
                  Credit applied automatically at booking. Unused credit expires after 12 months.
                </p>
              </div>
            </div>

            {/* Example math */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/30 p-5 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 text-center">Example: how it works</p>
              <div className="space-y-2 text-zinc-400">
                <div className="flex justify-between"><span>Buy membership</span><span className="tabular-nums">−${MEMBERSHIP_PRICE_USD}</span></div>
                <div className="flex justify-between text-[#D4AF37]"><span className="font-bold">Credit added</span><span className="tabular-nums font-bold">+${MEMBERSHIP_CREDIT_USD}</span></div>
                <div className="border-t border-white/[0.08] pt-2 mt-2"></div>
                <div className="flex justify-between"><span>Book Interior + Exterior (mid)</span><span className="tabular-nums">−$255</span></div>
                <div className="flex justify-between"><span>+ Engine bay add-on</span><span className="tabular-nums">−$60</span></div>
                <div className="flex justify-between"><span>Book Exterior Detail</span><span className="tabular-nums">−$135</span></div>
                <div className="flex justify-between"><span>Book Ultimate Int+Ext (sedan)</span><span className="tabular-nums">−$365</span></div>
                <div className="border-t border-white/[0.08] pt-2 mt-2 flex justify-between font-bold text-[#D4AF37]">
                  <span>Credit remaining</span><span className="tabular-nums">$435</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2 text-center pt-2">All of that for $999 — and you still have $435 left for the year.</p>
              </div>
            </div>
          </>
        )}

        <div className="text-center mt-8">
          <Link href="/" className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}
