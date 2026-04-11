"use client";

import { useState, useEffect } from "react";
import { MapPin, RefreshCw, Download, Loader2, AlertCircle } from "lucide-react";
import { getMileageLog, backfillDistances, recoverAddressesFromNotes, type MileageEntry } from "@/app/actions/taxActions";
import { formatMiles } from "@/lib/mileage";
import { cn } from "@/lib/utils";

function exportCsv(entries: MileageEntry[], year: number) {
  const rows = [
    ["Date", "Customer", "Service", "Address", "Miles (one-way)"],
    ...entries.map(e => [
      e.booking_date,
      e.customer_name ?? "",
      e.service_name ?? "",
      e.service_address ?? "",
      e.distance_miles != null ? String(e.distance_miles) : "",
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `mileage-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MileageTab() {
  const currentYear = new Date().getFullYear();
  const [year,         setYear]         = useState(currentYear);
  const [entries,      setEntries]      = useState<MileageEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [backfilling,  setBackfilling]  = useState(false);
  const [backfillMsg,  setBackfillMsg]  = useState<string | null>(null);
  const [recovering,   setRecovering]   = useState(false);
  const [recoverMsg,   setRecoverMsg]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await getMileageLog(year);
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  // Treat 0 the same as null — means distance was never successfully calculated.
  // Missing = no address stored OR address present but distance not yet computed.
  const totalMiles   = entries.reduce((s, e) => s + (e.distance_miles ?? 0), 0);
  const missingCount = entries.filter(e => !e.distance_miles).length;

  async function handleRecover() {
    setRecovering(true);
    setRecoverMsg(null);
    try {
      const result = await recoverAddressesFromNotes();
      if (result.error) {
        setRecoverMsg(`Error: ${result.error}`);
      } else {
        setRecoverMsg(result.recovered > 0
          ? `Recovered ${result.recovered} address${result.recovered !== 1 ? "es" : ""} from notes`
          : "No recoverable addresses found");
      }
      await load();
    } catch (err) {
      setRecoverMsg(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRecovering(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const result = await backfillDistances();
      if (result.error) {
        setBackfillMsg(`Error: ${result.error}`);
      } else if (result.processed > 0 || result.failed > 0) {
        setBackfillMsg(
          `Filled ${result.processed}${result.failed > 0 ? ` · ${result.failed} unroutable` : ""}${result.remaining > 0 ? ` · ${result.remaining} left — run again` : " · done!"}`
        );
      } else {
        setBackfillMsg("All distances already filled");
      }
      await load();
    } catch (err) {
      setBackfillMsg(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
          <button
            onClick={load}
            className="rounded-lg border border-white/[0.08] p-1.5 text-zinc-500 hover:text-white transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <button
          onClick={() => exportCsv(entries, year)}
          disabled={!entries.length}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors disabled:opacity-30"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total Miles</p>
          <p className="text-xl font-black text-amber-500">{formatMiles(totalMiles)}</p>
          <p className="text-[10px] text-zinc-600">one-way per job</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Trips</p>
          <p className="text-xl font-black text-white">{entries.length}</p>
          <p className="text-[10px] text-zinc-600">jobs logged</p>
        </div>
        <div className={cn(
          "rounded-xl border p-3",
          missingCount > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-white/[0.06] bg-white/[0.02]"
        )}>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Missing</p>
          <p className={cn("text-xl font-black", missingCount > 0 ? "text-amber-500" : "text-zinc-600")}>{missingCount}</p>
          <p className="text-[10px] text-zinc-600">no distance</p>
        </div>
      </div>

      {/* Recover addresses from notes (one-time) */}
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <MapPin size={14} className="text-zinc-500 shrink-0" />
        <p className="flex-1 text-xs text-zinc-500">
          Recover missing addresses from booking notes (admin-created bookings).
        </p>
        <button
          onClick={handleRecover}
          disabled={recovering}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50 shrink-0"
        >
          {recovering ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {recovering ? "Scanning…" : "Recover"}
        </button>
      </div>
      {recoverMsg && <p className="text-center text-xs text-zinc-500">{recoverMsg}</p>}

      {/* Backfill */}
      {missingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          <p className="flex-1 text-xs text-zinc-400">
            {missingCount} trip{missingCount !== 1 ? "s" : ""} missing distance. Calculates all at once using Google Maps routing.
          </p>
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-black disabled:opacity-60 shrink-0"
          >
            {backfilling ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {backfilling ? "Running…" : "Calculate All"}
          </button>
        </div>
      )}

      {backfillMsg && (
        <p className="text-center text-xs text-zinc-500">{backfillMsg}</p>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-amber-500" />
        </div>
      ) : !entries.length ? (
        <p className="py-10 text-center text-sm text-zinc-600">No trips found for {year}.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
            >
              <MapPin size={12} className="shrink-0 text-zinc-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-zinc-200">
                  {e.customer_name ?? "Customer"} · {e.booking_date}
                </p>
                <p className="truncate text-[10px] text-zinc-600">
                  {e.service_name ?? "Service"} · {e.service_address ?? "No address"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {e.distance_miles ? (
                  <>
                    <p className="text-sm font-black text-white">{formatMiles(e.distance_miles)}</p>
                    <p className="text-[9px] text-zinc-600">mi</p>
                  </>
                ) : (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black text-amber-500">
                    —
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer total */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Total {year}</p>
          <p className="text-xl font-black text-amber-500">{formatMiles(totalMiles)} <span className="text-sm text-zinc-500 font-normal">miles</span></p>
        </div>
      )}
    </div>
  );
}
