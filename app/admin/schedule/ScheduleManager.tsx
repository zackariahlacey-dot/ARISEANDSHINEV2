"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, CalendarX, Trash2 } from "lucide-react";
import { updateOperatingHours } from "@/app/actions/updateOperatingHours";
import { insertBlockedDate, deleteBlockedDate } from "@/app/actions/blockedDates";

const DAYS = [
  { day_of_week: 0, label: "Sunday" },
  { day_of_week: 1, label: "Monday" },
  { day_of_week: 2, label: "Tuesday" },
  { day_of_week: 3, label: "Wednesday" },
  { day_of_week: 4, label: "Thursday" },
  { day_of_week: 5, label: "Friday" },
  { day_of_week: 6, label: "Saturday" },
];

export type OperatingHoursRow = {
  id?: string;
  day_of_week: number;
  month?: number | null;
  start_time: string;
  end_time: string;
  is_open: boolean;
};

const MONTH_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Default (Year-Round)" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export type BlockedDateRow = {
  id: string;
  blocked_date: string;
  reason: string | null;
};

function toTimeInputValue(t: string | null | undefined): string {
  if (!t) return "09:00";
  const part = String(t).slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(part)) return part;
  return "09:00";
}

function buildWeekGrid(rows: OperatingHoursRow[]): Omit<OperatingHoursRow, "id" | "month">[] {
  const byDay = new Map(rows.map((h) => [h.day_of_week, h]));
  return DAYS.map((d) => {
    const existing = byDay.get(d.day_of_week);
    return {
      day_of_week: d.day_of_week,
      start_time: toTimeInputValue(existing?.start_time),
      end_time: toTimeInputValue(existing?.end_time),
      is_open: existing?.is_open ?? true,
    };
  });
}

export function ScheduleManager({
  initialHours,
  initialBlocked,
}: {
  initialHours: OperatingHoursRow[];
  initialBlocked: BlockedDateRow[];
}) {
  const router = useRouter();
  const [allHours, setAllHours] = useState<OperatingHoursRow[]>(initialHours);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const defaultRows = useMemo(
    () => allHours.filter((h) => h.month == null),
    [allHours]
  );
  const defaultGrid = useMemo(() => buildWeekGrid(defaultRows), [defaultRows]);
  const monthRowsMap = useMemo(() => {
    const m = new Map<number, OperatingHoursRow[]>();
    allHours.forEach((h) => {
      if (h.month != null) {
        const list = m.get(h.month) ?? [];
        list.push(h);
        m.set(h.month, list);
      }
    });
    return m;
  }, [allHours]);
  const [hours, setHours] = useState<Omit<OperatingHoursRow, "id" | "month">[]>(() =>
    buildWeekGrid(initialHours.filter((h) => h.month == null))
  );

  useEffect(() => {
    setAllHours(initialHours);
  }, [initialHours]);

  useEffect(() => {
    const forMonth =
      selectedMonth == null ? defaultRows : (monthRowsMap.get(selectedMonth) ?? []);
    const source = forMonth.length > 0 ? forMonth : defaultRows;
    setHours(buildWeekGrid(source));
  }, [selectedMonth, defaultRows, monthRowsMap]);

  const [blockedDates, setBlockedDates] = useState<BlockedDateRow[]>(initialBlocked);
  const [blockDateValue, setBlockDateValue] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  const [hoursToast, setHoursToast] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    setBlockedDates(initialBlocked);
  }, [initialBlocked]);

  const handleHoursChange = (
    dayOfWeek: number,
    field: "start_time" | "end_time" | "is_open",
    value: string | boolean
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSaveWeeklyHours = async () => {
    setSavingHours(true);
    setHoursToast(null);
    const result = await updateOperatingHours(hours, selectedMonth);
    setSavingHours(false);
    if (result.success) {
      setHoursToast("Weekly hours saved.");
      setTimeout(() => setHoursToast(null), 3000);
      router.refresh();
    } else {
      setHoursToast(result.error ?? "Failed to save.");
    }
  };

  const handleBlockDate = async () => {
    if (!blockDateValue.trim()) return;
    setBlocking(true);
    const result = await insertBlockedDate(blockDateValue, blockReason || null);
    setBlocking(false);
    if (result.success) {
      setBlockDateValue("");
      setBlockReason("");
      router.refresh();
    } else {
      setHoursToast(result.error ?? "Failed to block date.");
    }
  };

  const handleUnblock = async (id: string) => {
    setUnblockingId(id);
    const result = await deleteBlockedDate(id);
    setUnblockingId(null);
    if (result.success) {
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      {/* Operating Hours */}
      <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white">Operating Hours</h3>
          </div>
          <div className="flex items-center gap-2">
            {hoursToast && (
              <span
                className={`text-xs ${
                  hoursToast.startsWith("Weekly") ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {hoursToast}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveWeeklyHours}
              disabled={savingHours}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] disabled:opacity-60 transition-colors"
            >
              {savingHours ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Weekly Hours"
              )}
            </button>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
              Editing Schedule For:
            </label>
            <select
              value={selectedMonth ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedMonth(v === "" ? null : parseInt(v, 10));
              }}
              className="w-full max-w-xs bg-zinc-950/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 outline-none"
            >
              {MONTH_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-3">
            {hours.map((h) => (
              <li
                key={h.day_of_week}
                className="flex flex-wrap items-center gap-4 py-2 border-b border-white/[0.04] last:border-0"
              >
                <span className="w-24 text-sm font-medium text-zinc-300 shrink-0">
                  {DAYS.find((d) => d.day_of_week === h.day_of_week)?.label}
                </span>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={h.is_open}
                    onChange={(e) =>
                      handleHoursChange(h.day_of_week, "is_open", e.target.checked)
                    }
                    className="rounded border-zinc-600 bg-zinc-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
                  />
                  <span className="text-xs text-zinc-400">Open</span>
                </label>
                {h.is_open && (
                  <>
                    <input
                      type="time"
                      value={h.start_time}
                      onChange={(e) =>
                        handleHoursChange(h.day_of_week, "start_time", e.target.value)
                      }
                      className="bg-zinc-950/80 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
                    />
                    <span className="text-zinc-500 text-xs">to</span>
                    <input
                      type="time"
                      value={h.end_time}
                      onChange={(e) =>
                        handleHoursChange(h.day_of_week, "end_time", e.target.value)
                      }
                      className="bg-zinc-950/80 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Blocked Dates */}
      <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <CalendarX size={18} className="text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-white">Blocked Dates</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 mb-1">
                Date to block
              </label>
              <input
                type="date"
                value={blockDateValue}
                min={today}
                onChange={(e) => setBlockDateValue(e.target.value)}
                className="bg-zinc-950/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-medium text-zinc-500 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Vacation"
                className="w-full bg-zinc-950/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
              />
            </div>
            <button
              type="button"
              onClick={handleBlockDate}
              disabled={blocking || !blockDateValue}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] disabled:opacity-50 transition-colors"
            >
              {blocking ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Block Date
            </button>
          </div>

          <div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Upcoming blocked dates
            </p>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4">No upcoming blocked dates.</p>
            ) : (
              <ul className="space-y-2">
                {blockedDates.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-zinc-950/60 border border-white/[0.04]"
                  >
                    <div>
                      <span className="text-sm font-medium text-white">
                        {(() => {
                          const [y, m, d] = b.blocked_date.split("-").map(Number);
                          return new Date(y, m - 1, d).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        })()}
                      </span>
                      {b.reason && (
                        <span className="text-xs text-zinc-500 ml-2">— {b.reason}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblock(b.id)}
                      disabled={unblockingId === b.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 disabled:opacity-50 transition-colors"
                    >
                      {unblockingId === b.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
