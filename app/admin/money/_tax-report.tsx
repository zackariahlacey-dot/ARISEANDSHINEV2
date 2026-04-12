"use client";

import { useState, useEffect } from "react";
import { Printer, Download, Loader2, FileText } from "lucide-react";
import { getTaxReport, getMileageLog, getExpenses, type TaxReportData } from "@/app/actions/taxActions";
import { getCategoryMeta, formatMiles } from "@/lib/mileage";

function exportCombinedCsv(report: TaxReportData, year: number) {
  // Just the summary as CSV
  const rows: string[][] = [
    ["Arise & Shine VT — Tax Summary", String(year)],
    [],
    ["MILEAGE", ""],
    ["Total Miles (one-way per trip)", formatMiles(report.mileage.totalMiles)],
    ["Trips Logged", String(report.mileage.tripCount)],
    ["Trips Missing Distance", String(report.mileage.missingCount)],
    [],
    ["EXPENSES", ""],
    ["Category", "Amount"],
    ...report.expenses.byCategory.map(c => [getCategoryMeta(c.category).label, `$${c.amount.toFixed(2)}`]),
    ["TOTAL EXPENSES", `$${report.expenses.total.toFixed(2)}`],
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `tax-summary-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TaxReportTab() {
  const currentYear = new Date().getFullYear();
  const [year,    setYear]    = useState(currentYear);
  const [report,  setReport]  = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getTaxReport(year);
    setReport(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-amber-500" />
          <span className="text-sm font-black">Tax Summary</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {report && (
            <>
              <button
                onClick={() => exportCombinedCsv(report, year)}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
              >
                <Download size={12} /> CSV
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
              >
                <Printer size={12} /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-amber-500" />
        </div>
      ) : !report ? (
        <p className="py-10 text-center text-sm text-zinc-600">No data.</p>
      ) : (
        <div className="space-y-4 print:space-y-6">
          {/* Print header (hidden on screen) */}
          <div className="hidden print:block mb-6">
            <p className="text-lg font-bold">Arise & Shine VT — Tax Summary {year}</p>
            <p className="text-sm text-zinc-500">209 Porterwood Dr, Williston, VT · ariseandshinevt.com</p>
          </div>

          {/* Mileage section */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Mileage Log — {year}</p>

            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-3xl font-black text-amber-500">{formatMiles(report.mileage.totalMiles)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">total business miles</p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>{report.mileage.tripCount} trips recorded</p>
                {report.mileage.missingCount > 0 && (
                  <p className="text-amber-500">{report.mileage.missingCount} trips missing distance</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-zinc-600">
              Distance is one-way from 209 Porterwood Dr, Williston, VT to each job site via Google Maps routing.
              {report.mileage.missingCount > 0 && " Run backfill in the Mileage tab to fill missing distances."}
            </div>
          </div>

          {/* Expenses section */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Business Expenses — {year}</p>

            {!report.expenses.byCategory.length ? (
              <p className="py-2 text-sm text-zinc-600">No expenses recorded for {year}.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {report.expenses.byCategory.map(c => {
                    const meta = getCategoryMeta(c.category);
                    const pct  = report.expenses.total > 0 ? (c.amount / report.expenses.total) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                            <span className="font-bold text-zinc-300">{meta.label}</span>
                            <span className="text-zinc-600">{c.count} receipt{c.count !== 1 ? "s" : ""}</span>
                          </div>
                          <span className="font-black text-white">${c.amount.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: meta.color, opacity: 0.7 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Total Expenses</p>
                  <p className="text-2xl font-black text-amber-500">${report.expenses.total.toFixed(2)}</p>
                </div>
              </>
            )}
          </div>

          {/* Combined summary */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/60">Summary — {year}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total miles driven</span>
                <span className="font-black text-white">{formatMiles(report.mileage.totalMiles)} mi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total expenses</span>
                <span className="font-black text-white">${report.expenses.total.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-[9px] text-zinc-600 leading-relaxed">
              Consult a tax professional for deduction calculations. Mileage rates change annually.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
