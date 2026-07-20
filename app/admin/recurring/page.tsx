"use client";

/**
 * Admin page listing all monthly-recurring Light Detailing enrollments.
 * Actions: pause (until date), resume, cancel, edit schedule.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRecurringBookings, pauseRecurring, resumeRecurring, cancelRecurring,
  updateRecurringSchedule, type RecurringListRow,
} from "@/app/actions/recurringActions";
import { LIGHT_DETAIL_ITEMS } from "@/lib/lightDetailItems";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import { SubNav, SCHEDULE_SUBNAV } from "@/components/admin/SubNav";
import {
  Repeat, Loader2, Pause, Play, X as XIcon, Pencil, Phone, Car, Calendar, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return p;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

function itemLabels(ids: string[]): string {
  const byId = new Map(LIGHT_DETAIL_ITEMS.map(i => [i.id, i.label] as const));
  return ids.map(id => byId.get(id) ?? id).join(", ");
}

function statusOf(r: RecurringListRow): { label: string; className: string } {
  if (!r.active) return { label: "Cancelled", className: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" };
  if (r.paused_until && r.paused_until >= new Date().toISOString().slice(0, 10)) {
    return { label: `Paused until ${r.paused_until}`, className: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
  }
  return { label: "Active", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
}

const inputCls =
  "w-full bg-[#111] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-amber-500/50 transition-colors";

export default function RecurringPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editRow, setEditRow] = useState<RecurringListRow | null>(null);
  const [pauseRow, setPauseRow] = useState<RecurringListRow | null>(null);

  const listQ = useQuery({
    queryKey: ["recurring-bookings", includeInactive],
    queryFn: async () => {
      const r = await listRecurringBookings(includeInactive);
      if (!r.success) throw new Error(r.error ?? "Failed to load");
      return r.rows ?? [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["recurring-bookings"] });

  const resumeM = useMutation({
    mutationFn: (id: string) => resumeRecurring(id),
    onSuccess: (r) => {
      if (r.success) { toast("Resumed"); invalidate(); }
      else toast(r.error ?? "Failed", "error");
    },
  });
  const cancelM = useMutation({
    mutationFn: (id: string) => cancelRecurring(id, "Cancelled from admin"),
    onSuccess: (r) => {
      if (r.success) { toast("Cancelled"); invalidate(); }
      else toast(r.error ?? "Failed", "error");
    },
  });

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
          <Repeat size={16} className="text-amber-400" />
          Recurring Plans
        </h1>
      </div>

      <SubNav items={SCHEDULE_SUBNAV} />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIncludeInactive(v => !v)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
            includeInactive
              ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
              : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
          )}
        >
          Include cancelled
        </button>
      </div>

      {listQ.isLoading && (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}

      {listQ.isError && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-[12px] text-rose-400">
          {(listQ.error as Error)?.message ?? "Failed to load"}
        </div>
      )}

      {listQ.data && listQ.data.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-[12px] text-zinc-500">
          No recurring plans yet. Enroll a completed Light Detailing booking to get started.
        </div>
      )}

      <div className="grid gap-3">
        {listQ.data?.map(r => {
          const s = statusOf(r);
          const isPaused = r.active && r.paused_until && r.paused_until >= new Date().toISOString().slice(0, 10);
          return (
            <div key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-sm text-white truncate">
                    {r.customer_name ?? "—"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                    <Phone size={9} /> {fmtPhone(r.customer_phone)}
                  </p>
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0",
                  s.className,
                )}>
                  {s.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Car size={10} className="text-zinc-600 shrink-0" />
                  <span className="truncate">
                    {[r.vehicle_year, r.vehicle_make, r.vehicle_model].filter(Boolean).join(" ") || "—"}
                    {r.vehicle_size ? ` · ${r.vehicle_size}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Calendar size={10} className="text-zinc-600 shrink-0" />
                  Next: {r.next_run_date}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Repeat size={10} className="text-zinc-600 shrink-0" />
                  Every {r.interval_days} days
                  {r.preferred_day_of_week != null && ` · ${DOW_LABELS[r.preferred_day_of_week]}`}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Clock size={10} className="text-zinc-600 shrink-0" />
                  {r.preferred_time ?? "any time"} · {Number(r.discount_pct ?? 0).toFixed(0)}% off
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Service: {r.service_name ?? "Light Detailing"}
                </p>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {itemLabels(r.selected_items)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {r.active && !isPaused && (
                  <button
                    onClick={() => setPauseRow(r)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-zinc-300 hover:text-white transition-all"
                  >
                    <Pause size={11} /> Pause
                  </button>
                )}
                {r.active && isPaused && (
                  <button
                    onClick={() => resumeM.mutate(r.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-zinc-300 hover:text-white transition-all"
                  >
                    <Play size={11} /> Resume
                  </button>
                )}
                {r.active && (
                  <button
                    onClick={() => {
                      if (confirm("Cancel this recurring plan? This cannot be undone.")) cancelM.mutate(r.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-400 hover:bg-rose-500/15 transition-all"
                  >
                    <XIcon size={11} /> Cancel
                  </button>
                )}
                <button
                  onClick={() => setEditRow(r)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-zinc-300 hover:text-white transition-all"
                >
                  <Pencil size={11} /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editRow && <EditModal row={editRow} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); invalidate(); }} />}
      {pauseRow && <PauseModal row={pauseRow} onClose={() => setPauseRow(null)} onSaved={() => { setPauseRow(null); invalidate(); }} />}
    </div>
  );
}

function EditModal({ row, onClose, onSaved }: { row: RecurringListRow; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [intervalDays, setIntervalDays] = useState(row.interval_days);
  const [dow, setDow] = useState<number | "">(row.preferred_day_of_week ?? "");
  const [time, setTime] = useState<string>((row.preferred_time ?? "").slice(0, 5));
  const [discountPct, setDiscountPct] = useState(Number(row.discount_pct ?? 10));

  async function submit() {
    setBusy(true);
    try {
      const r = await updateRecurringSchedule(row.id, {
        bookingId: "",
        intervalDays,
        preferredDayOfWeek: dow === "" ? undefined : dow,
        preferredTime: time ? `${time}:00` : undefined,
        discountPct,
      });
      if (r.success) { toast("Saved"); onSaved(); }
      else toast(r.error ?? "Failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit Schedule">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Interval (days)</label>
          <input type="number" min={1} value={intervalDays} onChange={e => setIntervalDays(parseInt(e.target.value, 10) || 30)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Preferred day</label>
          <select value={dow === "" ? "" : String(dow)} onChange={e => setDow(e.target.value === "" ? "" : parseInt(e.target.value, 10))} className={inputCls}>
            <option value="">Any</option>
            {DOW_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Preferred time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Discount %</label>
          <input type="number" min={0} max={100} value={discountPct} onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-black uppercase tracking-wider text-zinc-400">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-black text-[11px] font-black uppercase tracking-wider disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
            {busy && <Loader2 size={12} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PauseModal({ row, onClose, onSaved }: { row: RecurringListRow; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const [until, setUntil] = useState<string>(nextMonth.toISOString().slice(0, 10));

  async function submit() {
    setBusy(true);
    try {
      const r = await pauseRecurring(row.id, until);
      if (r.success) { toast("Paused"); onSaved(); }
      else toast(r.error ?? "Failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Pause Plan">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Paused until</label>
          <input type="date" value={until} onChange={e => setUntil(e.target.value)} className={inputCls} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-black uppercase tracking-wider text-zinc-400">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-black text-[11px] font-black uppercase tracking-wider disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
            {busy && <Loader2 size={12} className="animate-spin" />} Pause
          </button>
        </div>
      </div>
    </Modal>
  );
}
