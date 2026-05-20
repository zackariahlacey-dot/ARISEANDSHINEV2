"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Calendar, DollarSign } from "lucide-react";
import { getContractorPayroll, buildPayrollCsv, type PayrollSummary } from "@/app/actions/contractorPayroll";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "all";

function fmtMoney(cents: number): string {
  return (cents / 100).toFixed(0);
}

function localDate(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function periodRange(period: Period): { start: string; end: string } {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    const start = new Date(now); start.setDate(start.getDate() + offset);
    const end   = new Date(start); end.setDate(end.getDate() + 6);
    return { start: localDate(start), end: localDate(end) };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: localDate(start), end: localDate(end) };
  }
  // all-time
  return { start: "2024-01-01", end: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

/**
 * Per-contractor payroll panel. Shows a 3-tab period switcher (this week /
 * this month / all-time), a totals card, and a per-job list with status,
 * tip, and adjustments inline. CSV export button at the bottom.
 *
 * Designed to be embedded inside the existing ContractorDrawer modal.
 */
export function PayrollPanel({ contractorId }: { contractorId: string }) {
  const [period, setPeriod] = useState<Period>("week");
  const range = useMemo(() => periodRange(period), [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["contractor-payroll", contractorId, range.start, range.end],
    queryFn:  () => getContractorPayroll(contractorId, range.start, range.end),
  });

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await buildPayrollCsv({
        contractorIds: [contractorId],
        startDate: range.start,
        endDate: range.end,
      });
      if (!r.ok || !r.csv) return;
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename ?? "payroll.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 mb-2">Pay period</p>

      {/* Period switcher */}
      <div className="flex gap-1 mb-3 p-1 bg-white/[0.03] rounded-xl">
        {([
          { id: "week" as const,  label: "This week" },
          { id: "month" as const, label: "This month" },
          { id: "all" as const,   label: "All time" },
        ]).map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              period === p.id ? "bg-amber-500 text-black" : "text-zinc-500"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-amber-500" size={18} />
        </div>
      ) : (
        <PayrollDetail data={data} onExport={handleExport} exporting={exporting} />
      )}
    </section>
  );
}

function PayrollDetail({ data, onExport, exporting }: { data: PayrollSummary; onExport: () => void; exporting: boolean }) {
  return (
    <>
      {/* Totals card */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] p-3 mb-2">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Total owed</p>
          <p className="text-2xl font-black text-amber-400 tabular-nums">${fmtMoney(data.totalOwedCents)}</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="rounded-lg bg-zinc-900/40 border border-white/[0.04] px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600">Base</p>
            <p className="text-[12px] font-black text-zinc-200 tabular-nums">${fmtMoney(data.totalBaseCents)}</p>
          </div>
          <div className="rounded-lg bg-zinc-900/40 border border-white/[0.04] px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600">Tips</p>
            <p className="text-[12px] font-black text-emerald-400 tabular-nums">${fmtMoney(data.totalTipsCents)}</p>
          </div>
          <div className="rounded-lg bg-zinc-900/40 border border-white/[0.04] px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600">Adjust.</p>
            <p className={cn(
              "text-[12px] font-black tabular-nums",
              data.totalAdjustmentsCents > 0 ? "text-emerald-400"
                : data.totalAdjustmentsCents < 0 ? "text-rose-400"
                : "text-zinc-300"
            )}>
              {data.totalAdjustmentsCents > 0 ? "+" : ""}${fmtMoney(data.totalAdjustmentsCents)}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          {data.jobsCount} job{data.jobsCount === 1 ? "" : "s"}
          {data.pendingJobsCount > 0 && (
            <span className="text-amber-400"> · {data.pendingJobsCount} awaiting photo review</span>
          )}
        </p>
      </div>

      {/* Per-job rows */}
      {data.jobs.length === 0 ? (
        <p className="text-[11px] text-zinc-600 text-center py-3">No completed jobs in this period.</p>
      ) : (
        <div className="space-y-1">
          {data.jobs.map(j => (
            <div
              key={j.bookingId}
              className={cn(
                "rounded-xl border px-3 py-2",
                j.approved
                  ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                  : "border-amber-500/20 bg-amber-500/[0.03]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-zinc-200 truncate">{j.customerName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{j.serviceName} · {new Date(j.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black text-zinc-100 tabular-nums">${fmtMoney(j.finalCommissionCents)}</p>
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-wider",
                    j.approved ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {j.approved ? "Approved" : j.photoReviewStatus}
                  </p>
                </div>
              </div>
              {(j.tipCents > 0 || j.adjustmentCents !== 0) && (
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/[0.04] text-[10px]">
                  <span className="text-zinc-600">Base ${fmtMoney(j.baseCommissionCents)}</span>
                  {j.tipCents > 0 && (
                    <span className="text-emerald-400">+${fmtMoney(j.tipCents)} tip</span>
                  )}
                  {j.adjustmentCents !== 0 && (
                    <span className={j.adjustmentCents > 0 ? "text-emerald-400" : "text-rose-400"}>
                      {j.adjustmentCents > 0 ? "+" : ""}${fmtMoney(j.adjustmentCents)} adj
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      <button
        type="button"
        onClick={onExport}
        disabled={exporting || data.jobs.length === 0}
        className={cn(
          "w-full mt-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
          exporting || data.jobs.length === 0
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : "bg-white/[0.04] border border-white/[0.08] text-zinc-200 hover:border-amber-500/30 active:scale-95"
        )}
      >
        {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        Export CSV
      </button>
    </>
  );
}
