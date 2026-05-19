import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles, CalendarDays, Clock, Crown, Trophy, Zap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getClientBookings } from "@/app/actions/getClientBookings";
import { getMaintenanceOffers, getSavedVehicles } from "@/app/actions/getMaintenanceOffers";
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

// ── Dashboard ──────────────────────────────────────────────────────────────────

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/protected");

  // Role-aware routing: contractors land on the onboarding screen (or, in a
  // future commit, the contractor dashboard once onboarding is complete).
  // Customers and admins continue to the dashboard below. Wrapped in
  // try/catch so a missing `role` column (pre-migration deploys) never
  // blocks the customer experience.
  try {
    const adminSb = createAdminClient();
    const { data: roleRow } = await adminSb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (roleRow as { role?: string } | null)?.role;
    if (role === "contractor") {
      redirect("/protected/onboarding");
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

  const [profile, { upcoming, past }, planRequest, maintenanceOffers, savedVehicles] = await Promise.all([
    getAuthProfile(),
    getClientBookings(user.id),
    getUserPlanRequest(),
    getMaintenanceOffers(),
    getSavedVehicles(),
  ]);

  const completedCount = profile?.completedDetailCount ?? 0;
  const discountPct    = profile?.loyaltyDiscountPct ?? 0;

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

          {/* ── Hero strip ─────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-5 mb-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)" }}
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">My Dashboard</p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                  Hey, {firstName}
                </h1>
                <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{user.email}</p>
              </div>
              {currentTier && (
                <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl bg-zinc-900/80 border border-[#D4AF37]/30">
                  {currentTier.label === "VIP" ? <Trophy size={16} className="text-[#D4AF37]" />
                    : currentTier.label === "Gold" ? <Zap size={16} className="text-[#D4AF37]" />
                    : currentTier.label === "Silver" ? <ShieldCheck size={16} className="text-zinc-300" />
                    : <Sparkles size={16} className="text-zinc-400" />}
                  <span className="text-[9px] font-black tracking-wider uppercase text-[#D4AF37]">{currentTier.label}</span>
                  <span className="text-[10px] font-black text-white tabular-nums">{discountPct}% off</span>
                </div>
              )}
            </div>

            <div className="relative grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-xl bg-zinc-900/60 border border-white/[0.04] px-3 py-2">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Bookings</p>
                <p className="text-lg font-black text-zinc-100 tabular-nums">{totalBookings}</p>
              </div>
              <div className="rounded-xl bg-zinc-900/60 border border-white/[0.04] px-3 py-2">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Details</p>
                <p className="text-lg font-black text-[#D4AF37] tabular-nums">{completedCount}</p>
              </div>
              <div className="rounded-xl bg-zinc-900/60 border border-white/[0.04] px-3 py-2">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Offers</p>
                <p className="text-lg font-black text-emerald-400 tabular-nums">{maintenanceOffers.length}</p>
              </div>
            </div>
          </div>

          {/* ── Active Maintenance Offers ──────────────────────────────── */}
          <MaintenanceSection offers={maintenanceOffers} />

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

          {/* ── Loyalty Tier (compact card) ────────────────────────────── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/15 p-5 mb-5"
            style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(24,24,27,0.95) 60%)" }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-10 w-44 h-44 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)" }}
            />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1.5">
                  Loyalty Tier
                </p>
                {currentTier ? (
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
                      style={{ filter: "drop-shadow(0 2px 12px rgba(212,175,55,0.25))" }}
                    >
                      {discountPct}%
                    </span>
                    <span className="text-sm font-semibold text-zinc-500">off, forever</span>
                  </div>
                ) : (
                  <p className="text-base font-black text-zinc-400">Book your first detail to start earning</p>
                )}
              </div>
            </div>

            {toNext ? (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    {toNext} more detail{toNext === 1 ? "" : "s"} to next tier
                  </span>
                  <span className="text-[10px] font-semibold text-[#D4AF37]">
                    {completedCount} done
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #92700a, #D4AF37, #F3E5AB)" }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#D4AF37] font-bold mb-3">🎉 VIP — 20% off forever</p>
            )}

            <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-white/[0.05]">
              {LOYALTY_TIERS.slice().reverse().map((tier) => {
                const unlocked = completedCount >= tier.minDetails;
                return (
                  <div
                    key={tier.label}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border transition-all ${
                      unlocked ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.06]" : "border-white/[0.04] bg-white/[0.02] opacity-40"
                    }`}
                  >
                    <span className={`text-xs font-black ${unlocked ? "text-[#D4AF37]" : "text-zinc-600"}`}>
                      {tier.pct}%
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${unlocked ? "text-zinc-400" : "text-zinc-700"}`}>
                      {tier.label}
                    </span>
                    <span className={`text-[8px] ${unlocked ? "text-zinc-600" : "text-zinc-800"}`}>
                      {tier.minDetails}{tier.minDetails === 1 ? " detail" : "+ details"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Membership Panel ──────────────────────────────────────── */}
          <MembershipPanel />

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
                  {toNext
                    ? `${toNext} more to unlock ${toNext <= (completedCount < 1 ? 5 : completedCount < 3 ? 10 : completedCount < 5 ? 15 : 20)}% off`
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
