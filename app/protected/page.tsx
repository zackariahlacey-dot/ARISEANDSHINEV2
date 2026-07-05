import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles, CalendarDays, Clock, Crown, Trophy, Zap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getContractorDashboard } from "@/app/actions/contractorDashboard";
import { ContractorDashboard } from "@/components/contractor/ContractorDashboard";
import { getClientBookings } from "@/app/actions/getClientBookings";
import { getMaintenanceOffers, getSavedVehicles } from "@/app/actions/getMaintenanceOffers";
import { getMyActiveMembership } from "@/app/actions/membership";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { getUserPlanRequest } from "@/app/actions/planRequestActions";
import { PlanRequestSection } from "@/components/dashboard/PlanRequestSection";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { LOYALTY_TIERS, getTier, detailsToNextTier } from "@/lib/loyalty";
import { LevelUpConfetti } from "@/components/dashboard/LevelUpConfetti";
import { MembershipPanel } from "@/components/dashboard/MembershipPanel";
import { claimGuestBookings } from "@/app/actions/claimGuestBookings";
import { MaintenanceSection } from "@/components/dashboard/MaintenanceSection";
import { SavedVehiclesSection } from "@/components/dashboard/SavedVehiclesSection";
import { WeatherForecast } from "@/components/dashboard/WeatherForecast";
import { getWeatherForecast } from "@/app/actions/getWeatherForecast";

// ── Dashboard ──────────────────────────────────────────────────────────────────

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/protected");

  // Role-aware routing:
  //   - Contractor + onboarding incomplete → /protected/onboarding
  //   - Contractor + fully onboarded + active → contractor dashboard inline
  //   - Customer / admin → existing customer dashboard below
  // Wrapped in try/catch so a missing role column (pre-migration deploys)
  // never blocks the customer experience.
  try {
    const adminSb = createAdminClient();
    const { data: roleRow } = await adminSb
      .from("profiles")
      .select("role, employment_status")
      .eq("id", user.id)
      .maybeSingle();
    const role = (roleRow as { role?: string; employment_status?: string } | null)?.role;
    const empStatus = (roleRow as { role?: string; employment_status?: string } | null)?.employment_status;
    if (role === "contractor") {
      const dashData = await getContractorDashboard();
      const fullyOnboarded = !!dashData && empStatus !== "pending";
      if (!fullyOnboarded) {
        redirect("/protected/onboarding");
      }
      if (dashData) {
        return <ContractorDashboard data={dashData} />;
      }
    }
  } catch (err) {
    // role column doesn't exist yet (pre-migration) — fall through to
    // existing customer dashboard. Real auth errors are caught above by
    // the supabase.auth.getUser() check.
    if ((err as { digest?: string } | null)?.digest?.startsWith("NEXT_REDIRECT")) throw err;
  }

  // Email-merge any guest bookings made before this user signed up — this
  // retroactively credits past detail visits to their loyalty count.
  // Safe to run on every dashboard load (no-op when there's nothing to merge).
  await claimGuestBookings().catch(err => console.error("[dashboard] claimGuestBookings:", err));

  const [profile, { upcoming, past }, planRequest, maintenanceOffers, savedVehicles, activeMembership, weatherDays] = await Promise.all([
    getAuthProfile(),
    getClientBookings(user.id),
    getUserPlanRequest(),
    getMaintenanceOffers(),
    getSavedVehicles(),
    getMyActiveMembership(),
    getWeatherForecast(),
  ]);

  const completedCount = profile?.completedDetailCount ?? 0;
  const discountPct    = profile?.loyaltyDiscountPct ?? 0;
  const membershipCreditDollars = activeMembership
    ? Math.round(activeMembership.credit_balance_cents / 100)
    : null;

  const firstName =
    (user.user_metadata?.first_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "there";

  const currentTier = getTier(completedCount);
  const toNext = detailsToNextTier(completedCount);
  const totalBookings = upcoming.length + past.length;

  // For the progress bar: find current tier threshold and next threshold
  const thresholds = [0, 1, 3, 5, 10];
  const currentThreshIdx = thresholds.findLastIndex(t => completedCount >= t);
  const prevThresh = thresholds[currentThreshIdx] ?? 0;
  const nextThresh = thresholds[currentThreshIdx + 1] ?? null;
  const progressPct = nextThresh
    ? Math.min(100, Math.round(((completedCount - prevThresh) / (nextThresh - prevThresh)) * 100))
    : 100;

  // Pull the next tier's actual pct from LOYALTY_TIERS so the "unlock X% off"
  // copy is honest. Previously we did a nested ternary that ended up
  // comparing counts against percentages and interpolating a boolean.
  const nextTier = nextThresh != null
    ? LOYALTY_TIERS.slice().reverse().find(t => t.minDetails === nextThresh) ?? null
    : null;
  const nextTierPct = nextTier?.pct ?? null;

  return (
    <div className="relative min-h-screen bg-zinc-950">
      {/* One-time tier-up celebration — only fires when tier increases */}
      <LevelUpConfetti completedDetailCount={completedCount} />

      {/* Background gold radial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10">
        <SiteHeader />

        <div className="max-w-2xl mx-auto px-4 pt-32 sm:pt-28 pb-20">

          {/* ── Hero strip — enhanced with layered gradients + tier orbit ── */}
          <div
            className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/40 shadow-[0_0_60px_rgba(212,175,55,0.12)] p-6 sm:p-7 mb-6"
            style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
          >
            {/* Top accent stripe */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/80 to-transparent" />
            {/* Inner gold glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 110% 45% at 50% 0%, rgba(212,175,55,0.14) 0%, transparent 65%)" }}
            />
            {/* Secondary shimmer accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 70%)" }}
            />

            <div className="relative flex items-start justify-between gap-4 mb-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                  <p className="text-[11px] font-black tracking-[0.22em] uppercase text-[#D4AF37]">My Dashboard</p>
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-black tracking-tight leading-tight bg-gradient-to-br from-white via-zinc-100 to-[#D4AF37] bg-clip-text text-transparent truncate"
                  style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.18))" }}
                >
                  Welcome, {firstName}
                </h1>
                <p className="text-xs text-zinc-500 mt-1.5 truncate">{user.email}</p>
              </div>
              {currentTier && (
                <div className="relative shrink-0">
                  {/* Orbital ring */}
                  <div aria-hidden className="absolute inset-0 rounded-2xl border border-[#D4AF37]/25 animate-pulse pointer-events-none" style={{ animationDuration: "3s" }} />
                  <div className="relative flex flex-col items-center justify-center gap-1 px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/[0.06] border border-[#D4AF37]/40 shadow-[0_0_18px_rgba(212,175,55,0.18)]">
                    {currentTier.label === "VIP" ? <Trophy size={18} className="text-[#D4AF37]" fill="currentColor" />
                      : currentTier.label === "Gold" ? <Crown size={18} className="text-[#D4AF37]" fill="currentColor" />
                      : currentTier.label === "Silver" ? <ShieldCheck size={18} className="text-zinc-200" />
                      : <Sparkles size={18} className="text-zinc-300" />}
                    <span className="text-[10px] font-black tracking-[0.18em] uppercase text-[#D4AF37]">{currentTier.label}</span>
                    <span className="text-sm font-black text-white tabular-nums">{discountPct}% off</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stat tiles — 3 confident stats. Priority order:
                  1. Membership Credit (when active member)
                  2. Maintenance Offers (when there are any)
                  3. Loyalty % Off (fallback so we never show "0 Offers")
                Details + Bookings anchor the row on the left. */}
            <div className="relative grid grid-cols-3 gap-3">
              {(() => {
                const third = membershipCreditDollars != null
                  ? { label: "Credit Left", value: `$${membershipCreditDollars}`,       color: "text-emerald-300", icon: Crown as typeof CalendarDays }
                  : maintenanceOffers.length > 0
                    ? { label: "Offers",       value: String(maintenanceOffers.length), color: "text-emerald-300", icon: Zap as typeof CalendarDays }
                    : { label: "Loyalty",      value: `${discountPct}%`,                color: "text-[#D4AF37]",   icon: Crown as typeof CalendarDays };
                return [
                  { label: "Bookings", value: String(totalBookings),  color: "text-white",     icon: CalendarDays as typeof CalendarDays },
                  { label: "Details",  value: String(completedCount), color: "text-[#D4AF37]", icon: Sparkles as typeof CalendarDays     },
                  third,
                ];
              })().map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="rounded-2xl bg-zinc-950/60 border border-white/[0.06] px-3 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon size={11} className={color} />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.16em] font-bold">{label}</p>
                  </div>
                  <p className={`text-3xl font-black tabular-nums leading-none ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 7-Day Weather Forecast — Burlington VT ──────────────────
              Helps the customer pick a dry day for exterior work. Rendered
              between the hero and membership panel so it's the first
              actionable info they see when planning a new booking. */}
          <WeatherForecast days={weatherDays} />

          {/* ── Membership Panel — members see credit balance up top. ── */}
          <MembershipPanel />

          {/* ── Active Maintenance Offers ──────────────────────────────── */}
          <MaintenanceSection
            offers={maintenanceOffers}
            savedAddress={profile?.saved_address ?? null}
            savedName={profile?.full_name ?? null}
            savedPhone={profile?.phone ?? null}
          />

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

          {/* ── Saved vehicles ─────────────────────────────────────────── */}
          <SavedVehiclesSection vehicles={savedVehicles} />

          {/* ── Loyalty Tier — aspirational, not flat ────────────────────── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 shadow-[0_0_40px_rgba(212,175,55,0.08)] p-6 mb-6"
            style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
          >
            {/* Top accent stripe + inner glow — matches the Ultimate cards */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 110% 35% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
            />

            <div className="relative flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 mb-2">
                  <Crown size={9} className="text-[#D4AF37]" fill="currentColor" />
                  <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Loyalty Tier</span>
                </div>
                {currentTier ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className="text-5xl font-black bg-gradient-to-br from-white via-zinc-100 to-[#D4AF37] bg-clip-text text-transparent leading-none"
                      style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.25))" }}
                    >
                      {discountPct}%
                    </span>
                    <span className="text-sm font-semibold text-zinc-400">off every detail</span>
                  </div>
                ) : (
                  <p className="text-base font-black text-zinc-300">Book your first detail to start earning rewards</p>
                )}
              </div>
            </div>

            {toNext ? (
              <div className="relative mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400 font-semibold">
                    <span className="text-white font-black">{toNext}</span> more detail{toNext === 1 ? "" : "s"} to next tier
                  </span>
                  <span className="text-xs font-black text-[#D4AF37] tabular-nums">
                    {completedCount} / {nextThresh}
                  </span>
                </div>
                <div className="h-2 bg-zinc-900/80 border border-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(212,175,55,0.45)]"
                    style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #92700a, #D4AF37, #F3E5AB)" }}
                  />
                </div>
              </div>
            ) : (
              <div className="relative mb-5 px-3 py-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] flex items-center gap-2 justify-center">
                <Trophy size={13} className="text-[#D4AF37]" fill="currentColor" />
                <p className="text-xs font-black text-[#D4AF37] tracking-wide">VIP — 20% off, forever</p>
              </div>
            )}

            {/* Tier ladder — bigger cells, locked tiers stay readable */}
            <div className="relative grid grid-cols-4 gap-2 pt-4 border-t border-white/[0.06]">
              {LOYALTY_TIERS.slice().reverse().map((tier) => {
                const unlocked = completedCount >= tier.minDetails;
                const isCurrent = currentTier?.label === tier.label;
                return (
                  <div
                    key={tier.label}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.12] shadow-[0_0_14px_rgba(212,175,55,0.18)] -translate-y-0.5"
                        : unlocked
                          ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.04]"
                          : "border-white/[0.06] bg-zinc-950/40"
                    }`}
                  >
                    <span className={`text-base font-black tabular-nums ${unlocked ? "text-[#D4AF37]" : "text-zinc-600"}`}>
                      {tier.pct}%
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${unlocked ? "text-zinc-200" : "text-zinc-500"}`}>
                      {tier.label}
                    </span>
                    <span className={`text-[9px] ${unlocked ? "text-zinc-500" : "text-zinc-600"}`}>
                      {tier.minDetails === 1 ? "1 detail" : `${tier.minDetails}+ details`}
                    </span>
                  </div>
                );
              })}
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
                <p className="text-sm font-bold text-zinc-200">Book a new detail</p>
                <p className="text-[11px] text-zinc-500">
                  {toNext && nextTierPct != null
                    ? `${toNext} more to unlock ${nextTierPct}% off`
                    : "Enjoy your 20% VIP discount forever"}
                </p>
              </div>
            </div>
            <ChevronRight size={15} className="text-zinc-600 group-hover:text-[#D4AF37] transition-colors" />
          </Link>

          {/* ── Past Appointments ─────────────────────────────────────── */}
          {past.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
                    <Clock size={12} className="text-zinc-500" />
                  </div>
                  <p className="text-xs font-bold tracking-[0.18em] uppercase text-zinc-500">
                    Service History
                  </p>
                </div>
                <p className="text-[10px] text-zinc-700">{past.length} appointment{past.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="space-y-2.5">
                {past.slice(0, 10).map((b) => (
                  <BookingCard key={b.id} b={b} showRebook variant="history" />
                ))}
              </div>
              {past.length > 10 && (
                <p className="text-[10px] text-zinc-700 text-center mt-3">Showing most recent 10</p>
              )}
            </section>
          )}

          {/* ── Empty state ────────────────────────────────────────────── */}
          {upcoming.length === 0 && past.length === 0 && (
            <div className="mb-6 rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={24} className="text-zinc-700" />
              </div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">No appointments yet</p>
              <p className="text-xs text-zinc-700 mb-4">Book your first vehicle detail to start climbing the loyalty ladder.</p>
              <Link
                href="/#services"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#D4AF37] hover:text-amber-300 transition-colors"
              >
                Book your first detail
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* ── Monthly Plan ──────────────────────────────────────────── */}
          <PlanRequestSection existingRequest={planRequest} />

          {/* ── Sign Out ──────────────────────────────────────────────── */}
          <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col items-center gap-2">
            <p className="text-[10px] text-zinc-700">{user.email}</p>
            <SignOutButton />
          </div>

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
