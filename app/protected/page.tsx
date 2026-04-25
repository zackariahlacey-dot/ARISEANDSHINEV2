import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Gift, Crown, ChevronRight, Sparkles, CalendarDays, Clock, TrendingUp, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getRecentPointTransactions } from "@/app/actions/getRecentPointTransactions";
import { ensureReferralCode } from "@/app/actions/createProfileWithReferral";
import { ReferAndEarnCard } from "@/components/landing/ReferAndEarnCard";
import { XpHistoryCard } from "@/components/dashboard/XpHistoryCard";
import { getClientBookings } from "@/app/actions/getClientBookings";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { getMyActiveSubscription } from "@/app/actions/monthlySubscriptions";
import { MonthlyPlanCard } from "@/components/dashboard/MonthlyPlanCard";
import { SiteHeader } from "@/components/landing/SiteHeader";

// ── Tier system ────────────────────────────────────────────────────────────────

const TIERS = [
  { name: "Member",   min: 0,    max: 499,      color: "#71717a", ring: "ring-zinc-600/40",    bg: "from-zinc-800/60 to-zinc-800/30",      icon: "⭐" },
  { name: "Silver",   min: 500,  max: 1499,     color: "#94a3b8", ring: "ring-slate-500/40",   bg: "from-slate-700/40 to-slate-800/20",    icon: "🥈" },
  { name: "Gold",     min: 1500, max: 2999,     color: "#D4AF37", ring: "ring-[#D4AF37]/40",   bg: "from-amber-900/30 to-amber-900/10",    icon: "🥇" },
  { name: "Platinum", min: 3000, max: Infinity, color: "#e2e8f0", ring: "ring-slate-300/40",   bg: "from-slate-600/30 to-slate-700/10",    icon: "💎" },
] as const;

function getTier(lifetimePts: number) {
  return TIERS.find((t) => lifetimePts >= t.min && lifetimePts <= t.max) ?? TIERS[0];
}

function getNextTierProgress(lifetimePts: number) {
  const idx = TIERS.findIndex((t) => lifetimePts >= t.min && lifetimePts <= t.max);
  if (idx === -1 || idx === TIERS.length - 1) return null;
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const range = next.min - current.min;
  const earned = lifetimePts - current.min;
  const progress = Math.min(100, Math.round((earned / range) * 100));
  const remaining = next.min - lifetimePts;
  return { nextTier: next.name, nextColor: next.color, progress, remaining };
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/protected");

  const profile = await getAuthProfile();
  const currentPoints = profile?.current_points ?? 0;
  const lifetimePoints = profile?.lifetime_points ?? 0;

  const firstName =
    (user.user_metadata?.first_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "there";

  const referralCode = profile?.referralCode ?? (await ensureReferralCode(user.id));
  const transactions = await getRecentPointTransactions(user.id);
  const dollarValue = (currentPoints / 10).toFixed(2);
  const { upcoming, past } = await getClientBookings(user.id);
  const activeSub = await getMyActiveSubscription(user.id);

  const tier = getTier(lifetimePoints);
  const nextTierInfo = getNextTierProgress(lifetimePoints);
  const totalBookings = upcoming.length + past.length;

  return (
    <div className="relative min-h-screen bg-zinc-950">
      {/* Background gold radial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10">
        <SiteHeader />

        <div className="max-w-2xl mx-auto px-4 pt-10 sm:pt-6 pb-20">

          {/* ── Page heading ───────────────────────────────────────────── */}
          <div className="mb-6">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/60 mb-1">My Account</p>
            <h1 className="text-3xl font-black tracking-tight text-zinc-100">
              Hey, {firstName}
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">{user.email}</p>
          </div>

          {/* ── Stats row ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Bookings</p>
              <p className="text-xl font-black text-zinc-100">{totalBookings}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Points</p>
              <p className="text-xl font-black text-[#D4AF37]">{currentPoints.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Value</p>
              <p className="text-xl font-black text-emerald-400">${dollarValue}</p>
            </div>
          </div>

          {/* ── Loyalty Points Card ──────────────────────────────────── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/15 p-6 mb-4"
            style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(24,24,27,0.9) 60%)" }}
          >
            {/* Gold glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-12 -right-12 w-56 h-56 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)" }}
            />

            {/* Tier badge + points row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-2">
                  Loyalty Rewards
                </p>
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <span
                    className="text-5xl font-black bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
                    style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.3))" }}
                  >
                    {currentPoints.toLocaleString()}
                  </span>
                  <span className="text-base font-semibold text-zinc-500">pts</span>
                </div>
                <p className="text-sm text-zinc-500">
                  Worth <span className="text-[#D4AF37] font-semibold">${dollarValue}</span> off your next booking
                </p>
              </div>

              {/* Tier badge */}
              <div className={`shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gradient-to-b ${tier.bg} ring-1 ${tier.ring}`}>
                <span className="text-2xl">{tier.icon}</span>
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: tier.color }}>{tier.name}</span>
              </div>
            </div>

            {/* Progress to next tier */}
            {nextTierInfo && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Progress to {nextTierInfo.nextTier}</span>
                  <span className="text-[10px] font-semibold" style={{ color: nextTierInfo.nextColor }}>
                    {nextTierInfo.remaining.toLocaleString()} pts to go
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${nextTierInfo.progress}%`,
                      background: `linear-gradient(90deg, ${tier.color}, ${nextTierInfo.nextColor})`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="pt-3 border-t border-white/[0.05]">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] text-zinc-600">
                {[
                  "Earn 1 pt per $1 spent",
                  "10 pts = $1 off at checkout",
                  "Redeem up to 1,000 pts per booking",
                  "Points never expire",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-1.5">
                    <Star size={9} className="text-[#D4AF37]/60 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Book Now CTA ──────────────────────────────────────────── */}
          <Link
            href="/#services"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] hover:bg-[#D4AF37]/[0.08] px-5 py-3.5 mb-6 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <Sparkles size={15} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">Book a detail</p>
                <p className="text-[11px] text-zinc-500">Earn points on every service</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-zinc-600 group-hover:text-[#D4AF37] transition-colors" />
          </Link>

          {/* ── Upcoming Appointments ─────────────────────────────────── */}
          {upcoming.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <CalendarDays size={12} className="text-sky-400" />
                </div>
                <p className="text-xs font-bold tracking-[0.18em] uppercase text-sky-400">
                  Upcoming · {upcoming.length}
                </p>
              </div>
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} b={b} showActions />
                ))}
              </div>
            </section>
          )}

          {/* ── Past Appointments ─────────────────────────────────────── */}
          {past.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
                  <Clock size={12} className="text-zinc-500" />
                </div>
                <p className="text-xs font-bold tracking-[0.18em] uppercase text-zinc-500">
                  Past Appointments
                </p>
              </div>
              <div className="space-y-2.5">
                {past.slice(0, 5).map((b) => (
                  <BookingCard key={b.id} b={b} showRebook />
                ))}
              </div>
            </section>
          )}

          {/* ── Empty state ────────────────────────────────────────────── */}
          {upcoming.length === 0 && past.length === 0 && (
            <div className="mb-6 rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={24} className="text-zinc-700" />
              </div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">No appointments yet</p>
              <p className="text-xs text-zinc-700 mb-4">Book your first detail and start earning points.</p>
              <Link
                href="/#services"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#D4AF37] hover:text-amber-300 transition-colors"
              >
                Book your first detail
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* ── Point History ──────────────────────────────────────────── */}
          <XpHistoryCard transactions={transactions} />

          {/* ── Refer & Earn ──────────────────────────────────────────── */}
          <div className="mb-4">
            <ReferAndEarnCard referralCode={referralCode} />
          </div>

          {/* ── Monthly Plan ──────────────────────────────────────────── */}
          {activeSub ? (
            <MonthlyPlanCard sub={activeSub} userId={user.id} />
          ) : (
            <Link
              href="/maintenance-club"
              className="group relative flex items-center gap-4 rounded-2xl border border-[#D4AF37]/15 bg-zinc-900/60 p-5 transition-all duration-200 hover:border-[#D4AF37]/30 hover:bg-zinc-900/80"
            >
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <Crown size={20} className="text-[#D4AF37]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] mb-0.5">
                  Member Exclusive
                </p>
                <p className="text-sm font-bold text-zinc-100">Maintenance Club</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  Monthly plans from $75/mo — keep your vehicle in showroom condition year-round.
                </p>
              </div>
              <ChevronRight size={16} className="text-zinc-600 shrink-0 group-hover:text-[#D4AF37] transition-colors" />
            </Link>
          )}

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
