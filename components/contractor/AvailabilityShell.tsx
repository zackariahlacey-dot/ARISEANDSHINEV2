"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, X, Plus, Loader2, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import {
  listMyUnavailableDays, markMyDayUnavailable, clearMyUnavailableDay,
  type UnavailableDay,
} from "@/app/actions/contractorAvailability";
import { cn } from "@/lib/utils";

function todayLocal(): string { return new Date().toLocaleDateString("en-CA"); }

function fmtDate(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return d; }
}

export function AvailabilityShell() {
  const qc = useQueryClient();
  const { data: days = [], isLoading } = useQuery({
    queryKey: ["my-unavailable"],
    queryFn:  listMyUnavailableDays,
  });

  const [date, setDate]     = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleAdd = async () => {
    if (!date) return;
    setBusy(true); setError(null);
    const r = await markMyDayUnavailable(date, reason);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Failed."); return; }
    setDate("");
    setReason("");
    qc.invalidateQueries({ queryKey: ["my-unavailable"] });
  };

  const handleClear = async (d: string) => {
    if (!confirm("Mark this day as available again?")) return;
    const r = await clearMyUnavailableDay(d);
    if (!r.ok) { alert(r.error ?? "Failed."); return; }
    qc.invalidateQueries({ queryKey: ["my-unavailable"] });
  };

  const list = days as UnavailableDay[];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-24">

        <Link href="/protected" className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-amber-500 mb-3">
          <ArrowLeft size={11} /> Back to dashboard
        </Link>

        <div className="mb-6">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase text-amber-500/70 mb-1">My availability</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Days I'm not available</h1>
          <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed">
            Mark off any day you can't take jobs. Arise &amp; Shine&apos;s auto-assign will skip you on those dates. You can clear days from this list anytime as long as no booking has already been assigned to you for that day.
          </p>
        </div>

        {/* Add new */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-2 inline-flex items-center gap-1.5">
            <Plus size={11} /> Add a day off
          </p>
          <div className="grid grid-cols-1 gap-2">
            <input
              type="date"
              min={todayLocal()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional — for your records)"
              maxLength={120}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!date || busy}
              className={cn(
                "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                !date || busy
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 active:scale-95"
              )}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={3} />}
              Mark unavailable
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-rose-300 mt-2 inline-flex items-center gap-1.5">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </div>

        {/* List */}
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          Upcoming days off · {list.length}
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-500" size={18} /></div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-10 text-center">
            <Calendar size={22} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-[12px] text-zinc-500 font-bold">No days marked off</p>
            <p className="text-[10px] text-zinc-600 mt-1">Auto-assign treats you as available every day.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {list.map(d => (
              <div
                key={d.id}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/40 px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-100">{fmtDate(d.date)}</p>
                  {d.reason && (
                    <p className="text-[11px] text-zinc-500 truncate">{d.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleClear(d.date)}
                  className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors"
                  title="Clear this day"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">How this works</p>
          <ul className="text-[11px] text-zinc-400 leading-relaxed list-disc list-inside space-y-1">
            <li>Auto-assign skips you on any day in your list.</li>
            <li>You can mark off as many future days as you want, including the same day.</li>
            <li>If you're already assigned a job for a day, marking that day off doesn't unassign you — talk to Arise &amp; Shine to reassign.</li>
            <li>You don't have to set anything if you're always available; the list is opt-in.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
