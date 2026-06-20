"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, DollarSign, AlertCircle, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getMyPayroll, type ContractorPayrollSummary, type ContractorPayrollJob } from "@/app/actions/contractorPayroll";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "all";

function fmtMoney(cents: number): string { return (cents / 100).toFixed(0); }
function localDate(d: Date): string { return d.toLocaleDateString("en-CA"); }

function periodRange(period: Period): { start: string; end: string; label: string } {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    const start = new Date(now); start.setDate(start.getDate() + offset);
    const end   = new Date(start); end.setDate(end.getDate() + 6);
    const label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return { start: localDate(start), end: localDate(end), label };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: localDate(start), end: localDate(end), label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }
  return { start: "2024-01-01", end: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)), label: "All time" };
}

export function EarningsShell() {
  const [period, setPeriod] = useState<Period>("week");
  const range = useMemo(() => periodRange(period), [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-payroll", range.start, range.end],
    queryFn:  () => getMyPayroll(range.start, range.end),
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-24">

        <Link href="/protected" className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-500 mb-3">
          <ArrowLeft size={11} /> Back to dashboard
        </Link>

        <div className="mb-5">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase text-amber-500/70 mb-1">My Earnings</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{range.label}</h1>
          <p className="text-[11px] text-zinc-600 mt-1">
            Arise And Shine Detailing processes actual payments off-platform. This is what's owed based on your completed jobs.
          </p>
        </div>

        {/* Period switcher */}
        <div className="flex gap-1 mb-4 p-1 bg-white/[0.03] rounded-xl">
          {([
            { id: "week" as const,  label: "This week" },
            { id: "month" as const, label: "This month" },
            { id: "all" as const,   label: "All time" },
          ]).map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                period === p.id ? "bg-amber-500 text-black" : "text-zinc-500"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading || !data ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-500" size={22} /></div>
        ) : (
          <EarningsDetail data={data} />
        )}

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-2 inline-flex items-center gap-1.5">
            <DollarSign size={11} className="text-amber-500" /> How earnings appear here
          </p>
          <ul className="text-[11px] text-zinc-400 leading-relaxed space-y-1.5 list-disc list-inside">
            <li>Each completed job shows your <strong className="text-zinc-200">base commission</strong> (your tier % of the job total), plus any tip the customer left, plus any positive or negative adjustment Arise And Shine Detailing made — every adjustment includes a written reason you can read.</li>
            <li><strong className="text-emerald-400">Tips are 100% yours</strong>, no commission split.</li>
            <li>Jobs awaiting photo review are shown in amber and their commission isn't locked yet. Once approved, they turn emerald and the amount is final.</li>
            <li>This screen reports what's owed; Arise And Shine Detailing pays you off-platform.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

function EarningsDetail({ data }: { data: ContractorPayrollSummary }) {
  return (
    <>
      {/* Totals card */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.10] via-zinc-900 to-zinc-950 p-5 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Total owed</p>
          <p className="text-4xl font-black text-amber-400 tabular-nums">${fmtMoney(data.totalOwedCents)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label="Base" value={`$${fmtMoney(data.totalBaseCents)}`} tone="white" />
          <Stat label="Tips" value={`$${fmtMoney(data.totalTipsCents)}`} tone="emerald" />
          <Stat
            label="Adjust."
            value={`${data.totalAdjustmentsCents > 0 ? "+" : ""}$${fmtMoney(data.totalAdjustmentsCents)}`}
            tone={data.totalAdjustmentsCents > 0 ? "emerald" : data.totalAdjustmentsCents < 0 ? "rose" : "zinc"}
          />
        </div>
        <p className="text-[10px] text-zinc-600 mt-3">
          {data.jobsCount} job{data.jobsCount === 1 ? "" : "s"}
          {data.pendingJobsCount > 0 && (
            <span className="text-amber-400"> · {data.pendingJobsCount} awaiting review</span>
          )}
        </p>
      </div>

      {/* Per-job list */}
      {data.jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-10 text-center">
          <p className="text-[11px] text-zinc-600">No completed jobs in this period.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.jobs.map(j => <JobEarningsCard key={j.bookingId} j={j} />)}
        </div>
      )}
    </>
  );
}

function JobEarningsCard({ j }: { j: ContractorPayrollJob }) {
  const [open, setOpen] = useState(false);
  const hasAdjustments = j.adjustments.length > 0;
  const tone = j.approved
    ? "border-emerald-500/25 bg-emerald-500/[0.04]"
    : "border-amber-500/25 bg-amber-500/[0.04]";
  return (
    <div className={cn("rounded-2xl border overflow-hidden", tone)}>
      <button
        type="button"
        onClick={() => (hasAdjustments || j.tipCents > 0) && setOpen(o => !o)}
        className="w-full text-left px-3.5 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-100 truncate">{j.customerName}</p>
            <p className="text-[11px] text-zinc-500 truncate">
              {j.serviceName} · {new Date(j.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black text-zinc-100 tabular-nums">${fmtMoney(j.finalCommissionCents)}</p>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-wider",
              j.approved ? "text-emerald-400" : "text-amber-400"
            )}>
              {j.approved ? "Approved" : "Pending review"}
            </p>
          </div>
        </div>
        {(j.tipCents > 0 || j.adjustmentCents !== 0 || hasAdjustments) && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
            <span>Base ${fmtMoney(j.baseCommissionCents)}</span>
            {j.tipCents > 0 && <span className="text-emerald-400">+${fmtMoney(j.tipCents)} tip</span>}
            {j.adjustmentCents !== 0 && (
              <span className={j.adjustmentCents > 0 ? "text-emerald-400" : "text-rose-400"}>
                {j.adjustmentCents > 0 ? "+" : ""}${fmtMoney(j.adjustmentCents)} adj
              </span>
            )}
            {hasAdjustments && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-amber-400">
                See why <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
              </span>
            )}
          </div>
        )}
      </button>
      {open && hasAdjustments && (
        <div className="px-3.5 pb-3 pt-1 border-t border-white/[0.04] space-y-1.5">
          {j.adjustments.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <AlertCircle size={11} className={cn("mt-0.5 shrink-0", a.adjustmentCents > 0 ? "text-emerald-400" : "text-rose-400")} />
              <div className="flex-1 min-w-0">
                <p className={cn("font-bold tabular-nums", a.adjustmentCents > 0 ? "text-emerald-400" : "text-rose-400")}>
                  {a.adjustmentCents > 0 ? "+" : ""}${fmtMoney(a.adjustmentCents)}
                </p>
                <p className="text-zinc-400 leading-snug">{a.reason}</p>
                <p className="text-zinc-700 text-[9px] mt-0.5">{new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "white" | "emerald" | "rose" | "zinc" }) {
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-white/[0.04] px-3 py-2">
      <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={cn(
        "text-lg font-black tabular-nums",
        tone === "white"  && "text-zinc-100",
        tone === "emerald" && "text-emerald-400",
        tone === "rose"   && "text-rose-400",
        tone === "zinc"   && "text-zinc-300",
      )}>{value}</p>
    </div>
  );
}
