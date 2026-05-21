"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Phone, Navigation, ChevronRight, Calendar, Clock, Star, TrendingUp,
  Sparkles, DollarSign, Car, AlertTriangle,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { DEFAULT_TIER_LADDER } from "@/lib/contractorAgreement";
import type { ContractorDashboardData, ContractorJob } from "@/app/actions/contractorDashboard";
import { cn } from "@/lib/utils";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function dayLabel(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function jobStageLabel(j: ContractorJob): { label: string; tone: "neutral" | "amber" | "blue" | "emerald" | "rose" } {
  if (j.jobCompletedAt) {
    if (j.photoReviewStatus === "approved")  return { label: "Approved",       tone: "emerald" };
    if (j.photoReviewStatus === "rejected")  return { label: "Photos rejected", tone: "rose" };
    return { label: "Awaiting review", tone: "amber" };
  }
  if (j.startedAt)  return { label: "In progress", tone: "blue" };
  if (j.arrivedAt)  return { label: "On site",     tone: "blue" };
  if (j.onMyWayAt)  return { label: "On the way",  tone: "blue" };
  if (j.acceptedAt) return { label: "Confirmed",   tone: "emerald" };
  return { label: "New",          tone: "amber" };
}

const TONE_CLASS = {
  neutral: "bg-zinc-800 text-zinc-400 border-white/[0.06]",
  amber:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  blue:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rose:    "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function ContractorDashboard({ data }: { data: ContractorDashboardData }) {
  const firstName = data.profile.firstName || "there";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-24">

        {/* Hero strip — name + tier badge + 3 stats */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-5 mb-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)" }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.22em] uppercase text-amber-500/70 mb-1">Contractor Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">Hey, {firstName}</h1>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Week of {dayLabel(data.weekStats.weekStart)} – {dayLabel(data.weekStats.weekEnd)}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl bg-zinc-900/80 border border-amber-500/30">
              <TrendingUp size={16} className="text-amber-500" />
              <span className="text-[9px] font-black tracking-wider uppercase text-amber-500">Tier {data.profile.commissionTier}</span>
              <span className="text-[10px] font-black text-white tabular-nums">{data.profile.commissionPct}%</span>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2 mt-4">
            <Stat label="Jobs this wk" value={data.weekStats.jobsCompleted.toString()} accent="text-zinc-200" />
            <Stat label="Earned (est)" value={`$${fmtMoney(data.weekStats.estimatedEarnings)}`} accent="text-amber-500" />
            <Stat label="Tips" value={`$${fmtMoney(data.weekStats.tipsReceived)}`} accent="text-emerald-400" />
          </div>
        </div>

        {/* Today */}
        <Section
          icon={<Calendar size={12} className="text-amber-500" />}
          label="Today"
          count={data.todayJobs.length}
        >
          {data.todayJobs.length === 0 ? (
            <EmptyDay text="No jobs today. Enjoy the day off." />
          ) : (
            <JobList jobs={data.todayJobs} />
          )}
        </Section>

        {/* Tomorrow */}
        {data.tomorrowJobs.length > 0 && (
          <Section
            icon={<Calendar size={12} className="text-blue-400" />}
            label="Tomorrow"
            count={data.tomorrowJobs.length}
          >
            <JobList jobs={data.tomorrowJobs} />
          </Section>
        )}

        {/* Rest of week */}
        {data.upcomingThisWeek.length > 0 && (
          <Section
            icon={<Calendar size={12} className="text-zinc-500" />}
            label="Coming up"
            count={data.upcomingThisWeek.length}
          >
            <JobList jobs={data.upcomingThisWeek} compact />
          </Section>
        )}

        {/* Tier ladder */}
        <TierLadder data={data} />

        {/* Rating snapshot */}
        {data.profile.ratingCount > 0 && (
          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-zinc-900/40 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <p className="text-sm font-black text-white tabular-nums">
                {(data.profile.ratingOverallAvg ?? 0).toFixed(1)}
                <span className="text-[10px] text-zinc-500 font-bold ml-1.5">({data.profile.ratingCount} {data.profile.ratingCount === 1 ? "rating" : "ratings"})</span>
              </p>
            </div>
            <p className="text-[10px] text-zinc-600">Your customer rating average</p>
          </div>
        )}

        {/* How commission works — informational */}
        <details className="mt-4 rounded-2xl border border-white/[0.06] bg-zinc-900/30">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <span className="inline-flex items-center gap-2"><DollarSign size={12} className="text-amber-500" /> How commission works</span>
            <ChevronRight size={12} />
          </summary>
          <div className="px-4 pb-4 text-[12px] text-zinc-400 leading-relaxed space-y-2">
            <p>Your commission is <strong className="text-amber-400">{data.profile.commissionPct}%</strong> of each job's total price. Earnings shown here are estimates — Arise &amp; Shine processes actual payments off-platform.</p>
            <p><strong className="text-emerald-400">Tips are 100% yours</strong> — when a customer adds a tip on the payment link, it lands in your weekly total above with no commission split.</p>
            <p>Commission can be <strong>reduced</strong> if photos are rejected or quality issues are documented, and <strong>increased</strong> to credit a tip received outside the app. Any adjustment includes a written reason you can see in your job history.</p>
          </div>
        </details>

        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/protected/earnings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] text-amber-400 text-[11px] font-black uppercase tracking-wider hover:bg-amber-500/[0.10] transition-colors"
            >
              <DollarSign size={12} /> Earnings history
            </Link>
            <Link
              href="/protected/availability"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-300 text-[11px] font-black uppercase tracking-wider hover:bg-white/[0.04] transition-colors"
            >
              <Calendar size={12} /> Days off
            </Link>
          </div>
          <Link href="/protected/onboarding" className="text-[11px] text-zinc-500 hover:text-amber-500 transition-colors inline-flex items-center gap-1">
            <Sparkles size={11} /> View my signed documents
          </Link>
          <SignOutButton />
        </div>

      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-white/[0.04] px-3 py-2">
      <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={cn("text-lg font-black tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function Section({ icon, label, count, children }: { icon: React.ReactNode; label: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/[0.04] flex items-center justify-center">
          {icon}
        </div>
        <p className="text-xs font-bold tracking-[0.18em] uppercase text-zinc-400">
          {label} {count > 0 && <span className="text-zinc-600">· {count}</span>}
        </p>
      </div>
      {children}
    </section>
  );
}

function EmptyDay({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-6 text-center">
      <p className="text-[11px] text-zinc-600">{text}</p>
    </div>
  );
}

function JobList({ jobs, compact }: { jobs: ContractorJob[]; compact?: boolean }) {
  return (
    <div className="space-y-2">
      {jobs.map(j => <JobCard key={j.bookingId} j={j} compact={compact} />)}
    </div>
  );
}

function JobCard({ j, compact }: { j: ContractorJob; compact?: boolean }) {
  const stage = jobStageLabel(j);
  const mapsHref = j.serviceAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.serviceAddress)}` : null;
  const phoneHref = j.customerPhone ? `tel:${j.customerPhone.replace(/\D/g, "")}` : null;

  return (
    <Link
      href={`/protected/jobs/${j.bookingId}`}
      className="block rounded-2xl border border-white/[0.06] bg-zinc-900/60 hover:border-amber-500/30 transition-colors active:scale-[0.99]"
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={12} className="text-amber-500 shrink-0" />
            <p className="text-sm font-black text-white tabular-nums">{j.time}</p>
            <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border", TONE_CLASS[stage.tone])}>
              {stage.label}
            </span>
          </div>
          <p className="text-[11px] font-bold text-amber-500 tabular-nums shrink-0">
            ~${fmtMoney(j.estimatedCommissionCents / 100)}
          </p>
        </div>

        <div className="space-y-0.5 mb-2">
          <p className="text-[13px] font-bold text-zinc-200 truncate">{j.customerName}</p>
          <p className="text-[11px] text-zinc-500 truncate">
            {j.vehicleYear} {j.vehicleMake} {j.vehicleModel}
            <span className="text-zinc-700"> · </span>
            {j.serviceName}
            {j.hasAdditionalVehicles && <span className="text-amber-500"> (multi-vehicle)</span>}
          </p>
          {!compact && j.serviceAddress && (
            <p className="text-[11px] text-zinc-600 truncate">📍 {j.serviceAddress}</p>
          )}
        </div>

        {!compact && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04]">
            {phoneHref && (
              <a
                href={phoneHref}
                onClick={e => e.stopPropagation()}
                className="flex-1 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-1 hover:border-amber-500/30"
              ><Phone size={11} /> Call</a>
            )}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-1 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-1 hover:border-amber-500/30"
              ><Navigation size={11} /> Maps</a>
            )}
            <span className="flex-1 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
              Open <ChevronRight size={11} />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function TierLadder({ data }: { data: ContractorDashboardData }) {
  return (
    <div className="mt-2 rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Commission ladder</p>
        {data.tierProgress.eligibleForNext && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider text-emerald-400">
            <Sparkles size={9} /> Eligible for promotion
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {DEFAULT_TIER_LADDER.map(t => {
          const isCurrent  = data.tierProgress.currentTier === t.tier;
          const isUnlocked = data.tierProgress.currentTier >= t.tier;
          return (
            <div
              key={t.tier}
              className={cn(
                "rounded-xl border px-1.5 py-2 text-center",
                isCurrent
                  ? "border-amber-500 bg-amber-500/15"
                  : isUnlocked
                    ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                    : "border-white/[0.06] bg-zinc-900/40 opacity-70"
              )}
            >
              <p className={cn("text-[9px] font-black uppercase tracking-wider", isCurrent ? "text-amber-400" : isUnlocked ? "text-emerald-400" : "text-zinc-600")}>
                T{t.tier}
              </p>
              <p className={cn("text-sm font-black tabular-nums", isCurrent ? "text-white" : "text-zinc-300")}>{t.pct}%</p>
              <p className="text-[8px] text-zinc-600 leading-tight mt-0.5">{t.label}</p>
            </div>
          );
        })}
      </div>

      {data.tierProgress.nextTier && (
        <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
          <span className="text-zinc-400">Next tier:</span>{" "}
          <strong className="text-zinc-300">{data.tierProgress.nextTierPct}%</strong>
          {data.tierProgress.jobsToNextTier !== null && data.tierProgress.jobsToNextTier > 0 && (
            <> — <strong className="text-amber-400">{data.tierProgress.jobsToNextTier}</strong> more job{data.tierProgress.jobsToNextTier === 1 ? "" : "s"}</>
          )}
          {data.tierProgress.ratingNeededForNext != null && (
            <> + <strong className="text-amber-400">{data.tierProgress.ratingNeededForNext}★</strong> avg</>
          )}
          .{" "}
          <span className="text-zinc-600">Promotion is always Arise &amp; Shine&apos;s call.</span>
        </div>
      )}
      {data.tierProgress.nextTier == null && (
        <p className="text-[10px] text-amber-400 text-center font-bold">🏆 Maxed out — Elite tier at 50%.</p>
      )}
    </div>
  );
}
