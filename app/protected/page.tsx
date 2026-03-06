import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getRecentPointTransactions } from "@/app/actions/getRecentPointTransactions";
import { ensureReferralCode } from "@/app/actions/createProfileWithReferral";
import { ReferAndEarnCard } from "@/components/landing/ReferAndEarnCard";
import { LevelUpConfetti } from "@/components/dashboard/LevelUpConfetti";
import { XpHistoryCard } from "@/components/dashboard/XpHistoryCard";
import {
  calculateLifetimeTier,
  getNextTierProgress,
  getTierBadgeDisplay,
} from "@/lib/calculateLifetimeTier";

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/protected");

  const profile = await getAuthProfile();
  const currentPoints = profile?.current_points ?? 0;
  const lifetimePoints = profile?.lifetime_points ?? 0;
  const emailHandle = user.email?.split("@")[0] ?? "there";

  const { tier, discount } = calculateLifetimeTier(lifetimePoints);
  const { nextThreshold, nextTierName, pointsRemaining, isMaxTier } =
    getNextTierProgress(lifetimePoints);
  const progressPercentage = isMaxTier
    ? 100
    : Math.min(100, (lifetimePoints / nextThreshold) * 100);

  const tierBadge = getTierBadgeDisplay(lifetimePoints);
  const tierBadgeLabel =
    discount > 0 ? `${tierBadge.label} — ${discount}% Off For Life` : tierBadge.label;

  // Display profile.referral_code from DB; for legacy accounts with null/empty, generate once and persist via ensureReferralCode
  const referralCode =
    profile?.referralCode ?? (await ensureReferralCode(user.id));

  const transactions = await getRecentPointTransactions(user.id);
  const dollarValue = (currentPoints / 10).toFixed(2);

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      {/* Background gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)",
        }}
      />

      {/* SVG noise overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.03,
          mixBlendMode: "overlay",
        }}
      />

      <LevelUpConfetti lifetimePoints={lifetimePoints} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 pb-20">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10 group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Home
        </Link>

        {/* Page heading */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-1.5">
            My Account
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">
            Hello, {emailHandle}!
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
        </div>

        {/* ── Loyalty Points Card ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/80 backdrop-blur-sm p-6 md:p-8 mb-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -right-12 w-40 h-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)",
            }}
          />
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37] mb-1">
                Loyalty Rewards
              </p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className="text-5xl font-black bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
                  style={{
                    filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.3))",
                  }}
                >
                  {currentPoints.toLocaleString()}
                </span>
                <span className="text-lg font-semibold text-zinc-400">pts</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold tier-badge-3d ${tierBadge.gradientClass}`}
                >
                  {tierBadgeLabel}
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                <span className="text-zinc-400">Available Points</span> ={" "}
                <span className="text-zinc-300 font-medium">${dollarValue}</span>{" "}
                off your next booking
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Lifetime: {lifetimePoints.toLocaleString()} pts (for tier status)
              </p>
            </div>
            <div className="shrink-0 w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <Gift size={22} className="text-[#D4AF37]" />
            </div>
          </div>

          {/* Progress bar: how close to next milestone (500, 1000, 1500, 2000) */}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>{lifetimePoints.toLocaleString()} pts (lifetime)</span>
              {isMaxTier ? (
                <span className="text-[#D4AF37] font-medium">Max Tier Reached</span>
              ) : (
                <span>Next: {nextThreshold.toLocaleString()} pts</span>
              )}
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Rules — 2-column grid */}
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs text-zinc-500">
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Earn 1 pt per $1 spent on services.</span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>
                  Unlock Lifetime Discounts at 500, 1000, 1500, and 2000 points.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>
                  Standard Members: Redeem up to 1,000 pts ($100 off) per booking.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={11} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>
                  Tier Members (Silver/Gold/Platinum): Redeem up to 500 pts ($50 off) in addition to your lifetime % discount.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── XP History Ledger ─────────────────────────────────────────────── */}
        <XpHistoryCard transactions={transactions} />

        {/* ── Refer & Earn Card ────────────────────────────────────────────── */}
        <ReferAndEarnCard referralCode={referralCode} />

        {/* Back to book CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/#services"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#D4AF37] transition-colors"
          >
            Browse services &amp; book →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
