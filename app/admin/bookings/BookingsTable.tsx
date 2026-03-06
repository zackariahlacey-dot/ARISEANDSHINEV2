"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  X,
  Check,
  MapPin,
  CalendarDays,
  Clock,
  Ban,
  Trash2,
  CalendarClock,
} from "lucide-react";
import {
  updateBookingStatus,
  type BookingStatus,
} from "@/app/actions/updateBookingStatus";
import { cancelBooking } from "@/app/actions/cancelBooking";
import { deleteBooking } from "@/app/actions/deleteBooking";
import { updateBookingSchedule } from "@/app/actions/updateBookingSchedule";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}
interface ServiceData {
  name: string | null;
}
interface VehicleData {
  make: string | null;
  model: string | null;
  year: number | null;
  size: string | null;
}

export interface BookingRow {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: string;
  total_price: number | null;
  notes: string | null;
  user_id: string | null;
  profiles: ProfileData | ProfileData[] | null;
  services: ServiceData | ServiceData[] | null;
  vehicles: VehicleData | VehicleData[] | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmt12(t: string | null): string {
  if (!t) return "—";
  try {
    return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return t;
  }
}

const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      const isPM = h >= 12;
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      out.push(`${displayH}:${m === 0 ? "00" : "30"} ${isPM ? "PM" : "AM"}`);
    }
  }
  return out;
})();

const STATUS_OPTIONS: {
  value: BookingStatus;
  label: string;
  badge: string;
  dot: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  {
    value: "completed",
    label: "Completed",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    badge: "bg-zinc-600/30 text-zinc-500 border-zinc-600/40",
    dot: "bg-zinc-500",
  },
];

function StatusBadge({ status }: { status: string }) {
  const normalized = (status ?? "").toLowerCase();
  const opt = STATUS_OPTIONS.find((o) => o.value === normalized);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
        opt?.badge ?? "bg-zinc-700/40 text-zinc-400 border-zinc-700/40"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${opt?.dot ?? "bg-zinc-500"}`} />
      {opt?.label ?? status}
    </span>
  );
}

// Service badge gradients (premium jewel-style)
const SERVICE_GRADIENTS: { match: RegExp | string; gradient: string; textClass: string }[] = [
  {
    match: /interior\s*detail/i,
    gradient: "linear-gradient(135deg, #804A00, #A77044, #804A00)",
    textClass: "text-white",
  },
  {
    match: /exterior\s*detail/i,
    gradient: "linear-gradient(135deg, #71717a, #d4d4d8, #71717a)",
    textClass: "text-zinc-950",
  },
  {
    match: /full\s*detail/i,
    gradient: "linear-gradient(135deg, #bf953f, #fcf6ba, #aa771c)",
    textClass: "text-zinc-950",
  },
  {
    match: /monthly\s*plan/i,
    gradient: "linear-gradient(135deg, #0ea5e9, #e0f2fe, #0ea5e9)",
    textClass: "text-zinc-950",
  },
];

function ServiceBadge({ name }: { name: string | null }) {
  const raw = (name ?? "").trim() || "—";
  const config = SERVICE_GRADIENTS.find((c) =>
    typeof c.match === "string" ? raw.toLowerCase() === c.match.toLowerCase() : c.match.test(raw)
  );
  const style = config ? { background: config.gradient } : undefined;
  const textClass = config?.textClass ?? "text-zinc-300";
  const isFallback = !config;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-white/20 backdrop-blur-sm ${textClass} ${isFallback ? "bg-zinc-800/60 shadow-sm" : "shadow-[0_0_12px_rgba(255,255,255,0.08)]"}`}
      style={style}
    >
      {raw}
    </span>
  );
}

function SortTh({
  label,
  col,
  current,
  dir,
  onSort,
}: {
  label: string;
  col: string;
  current: string;
  dir: "asc" | "desc";
  onSort: (c: string) => void;
}) {
  const active = col === current;
  return (
    <th
      className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600 cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp size={11} className="text-[#D4AF37]" />
          ) : (
            <ChevronDown size={11} className="text-[#D4AF37]" />
          )
        ) : (
          <ChevronsUpDown size={11} className="text-zinc-700" />
        )}
      </span>
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BookingsTable({
  initialBookings,
}: {
  initialBookings: BookingRow[];
}) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("booking_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [rescheduleRow, setRescheduleRow] = useState<BookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const p = norm(b.profiles);
    const s = norm(b.services);
    return (
      `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.toLowerCase().includes(q) ||
      (p?.phone ?? "").includes(q) ||
      (p?.email ?? "").toLowerCase().includes(q) ||
      (s?.name ?? "").toLowerCase().includes(q) ||
      b.booking_date.includes(q) ||
      (b.status ?? "").includes(q)
    );
  });

  // ── Sort ────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortKey === "booking_date") {
      av = `${a.booking_date}${a.booking_time ?? ""}`;
      bv = `${b.booking_date}${b.booking_time ?? ""}`;
    } else if (sortKey === "status") {
      av = a.status ?? "";
      bv = b.status ?? "";
    } else if (sortKey === "total_price") {
      av = a.total_price ?? 0;
      bv = b.total_price ?? 0;
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ── Status change ────────────────────────────────────────────────────────
  const addToast = (msg: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const handleCancelBooking = async (b: BookingRow) => {
    setCancelConfirmId(null);
    setLoadingId(b.id);
    setRowErrors((e) => {
      const next = { ...e };
      delete next[b.id];
      return next;
    });
    const result = await cancelBooking(b.id);
    setLoadingId(null);
    if (result.success) {
      setBookings((prev) =>
        prev.map((r) => (r.id === b.id ? { ...r, status: "cancelled" } : r))
      );
      addToast("Arise And Shine VT — Booking cancelled. Customer and admin notified.");
    } else {
      setRowErrors((e) => ({ ...e, [b.id]: result.error ?? "Arise And Shine VT: Cancel failed." }));
    }
  };

  const handleDeleteBooking = async (b: BookingRow) => {
    setDeleteConfirmId(null);
    setLoadingId(b.id);
    setRowErrors((e) => {
      const next = { ...e };
      delete next[b.id];
      return next;
    });
    const result = await deleteBooking(b.id);
    setLoadingId(null);
    if (result.success) {
      setBookings((prev) => prev.filter((r) => r.id !== b.id));
      addToast(`Arise And Shine VT — Booking for ${result.customerName ?? "customer"} has been permanently removed.`);
    } else {
      setRowErrors((e) => ({ ...e, [b.id]: result.error ?? "Arise And Shine VT: Delete failed." }));
    }
  };

  const to24h = (time12: string): string => {
    const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12;
    let h = parseInt(match[1], 10);
    const m = match[2];
    if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
    if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${m}:00`;
  };

  const handleRescheduleSave = async () => {
    if (!rescheduleRow || !rescheduleDate.trim() || !rescheduleTime.trim()) return;
    setLoadingId(rescheduleRow.id);
    setRowErrors((e) => {
      const next = { ...e };
      delete next[rescheduleRow.id];
      return next;
    });
    const result = await updateBookingSchedule(rescheduleRow.id, rescheduleDate, rescheduleTime);
    setLoadingId(null);
    if (result.success) {
      const time24 = to24h(rescheduleTime);
      setBookings((prev) =>
        prev.map((r) =>
          r.id === rescheduleRow.id
            ? { ...r, booking_date: rescheduleDate, booking_time: time24 }
            : r
        )
      );
      setRescheduleRow(null);
      setRescheduleDate("");
      setRescheduleTime("");
      addToast("Arise And Shine VT — Booking rescheduled. Customer notified.");
    } else {
      setRowErrors((e) => ({ ...e, [rescheduleRow.id]: result.error ?? "Reschedule failed." }));
    }
  };

  const openReschedule = (b: BookingRow) => {
    setRescheduleRow(b);
    setRescheduleDate(b.booking_date);
    setRescheduleTime(fmt12(b.booking_time) || TIME_SLOTS[0]);
  };

  const handleStatusChange = async (b: BookingRow, newStatus: BookingStatus) => {
    if ((b.status ?? "").toLowerCase() === newStatus) {
      setOpenDropdown(null);
      return;
    }
    setOpenDropdown(null);
    setLoadingId(b.id);
    setRowErrors((e) => {
      const n = { ...e };
      delete n[b.id];
      return n;
    });

    const result = await updateBookingStatus(
      b.id,
      newStatus,
      b.user_id,
      b.total_price ?? 0
    );

    setLoadingId(null);

    if (result.success) {
      setBookings((prev) =>
        prev.map((r) => (r.id === b.id ? { ...r, status: newStatus } : r))
      );
      if (newStatus === "completed" && (result.pointsAwarded ?? 0) > 0) {
        addToast(`Arise And Shine VT — Marked completed · +${result.pointsAwarded} pts awarded`);
      } else {
        addToast(`Arise And Shine VT — Status updated to "${newStatus}"`);
      }
    } else {
      setRowErrors((e) => ({
        ...e,
        [b.id]: result.error ?? "Arise And Shine VT: Update failed.",
      }));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, phone, service, date…"
          className="w-full max-w-md bg-zinc-900/60 border border-white/[0.07] rounded-xl pl-9 pr-9 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-zinc-600 mb-3 tabular-nums">
        {sorted.length} booking{sorted.length !== 1 ? "s" : ""}
        {search ? " matching" : " total"}
      </p>

      {/* Dropdown overlay */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* Cancel confirmation dialog */}
      {cancelConfirmId && (() => {
        const b = bookings.find((r) => r.id === cancelConfirmId);
        if (!b) return null;
        const profile = norm(b.profiles);
        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setCancelConfirmId(null)}
            />
            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl p-6">
              <p className="text-sm font-semibold text-white mb-1">Cancel booking</p>
              <p className="text-xs text-zinc-400 mb-5">
                Are you sure you want to cancel this booking and notify the customer?
              </p>
              <p className="text-xs text-zinc-500 mb-6">
                <strong className="text-zinc-300">{name}</strong> · {b.booking_date}
                {b.booking_time ? ` at ${fmt12(b.booking_time)}` : ""}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCancelConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelBooking(b)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Yes, cancel booking
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Permanent delete confirmation dialog */}
      {deleteConfirmId && (() => {
        const b = bookings.find((r) => r.id === deleteConfirmId);
        if (!b) return null;
        const profile = norm(b.profiles);
        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-red-500/20 rounded-2xl shadow-2xl p-6">
              <p className="text-sm font-semibold text-white mb-2">Permanent delete</p>
              <p className="text-xs text-zinc-400 mb-4">
                This action is permanent. It will delete all booking data from the database. Are you sure?
              </p>
              <p className="text-xs text-zinc-500 mb-6">
                <strong className="text-zinc-300">{name}</strong> · {b.booking_date}
                {b.booking_time ? ` at ${fmt12(b.booking_time)}` : ""}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBooking(b)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white border border-red-500/50 hover:bg-red-500 transition-colors"
                >
                  Yes, delete permanently
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reschedule modal */}
      {rescheduleRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setRescheduleRow(null)} />
          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Reschedule</p>
              <button
                type="button"
                onClick={() => setRescheduleRow(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]"
              >
                <X size={14} />
              </button>
            </div>
            {(() => {
              const p = norm(rescheduleRow.profiles);
              const s = norm(rescheduleRow.services);
              return (
                <p className="text-[11px] text-zinc-500 mb-3">
                  {p?.first_name} {p?.last_name} · {s?.name ?? "—"}
                </p>
              );
            })()}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Time</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setRescheduleRow(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleSave}
                disabled={loadingId === rescheduleRow.id || !rescheduleDate || !rescheduleTime}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#D4AF37] text-zinc-950 hover:bg-[#c9a227] disabled:opacity-50 flex items-center gap-1.5"
              >
                {loadingId === rescheduleRow.id ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Customer
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Service / Vehicle
                </th>
                <SortTh
                  label="Date"
                  col="booking_date"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Location
                </th>
                <SortTh
                  label="Total"
                  col="total_price"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortTh
                  label="Status"
                  col="status"
                  current={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-zinc-600 text-sm"
                  >
                    {search ? "No bookings match your search" : "No bookings yet"}
                  </td>
                </tr>
              ) : (
                sorted.map((b) => {
                  const profile = norm(b.profiles);
                  const service = norm(b.services);
                  const vehicle = norm(b.vehicles);
                  const isLoading = loadingId === b.id;
                  const err = rowErrors[b.id];
                  const earnedPts = Math.floor(b.total_price ?? 0);

                  const addressLine = (b.notes ?? "")
                    .split("\n\n")
                    .find((l: string) => l.startsWith("📍"))
                    ?.replace("📍 Service Location: ", "");

                  return (
                    <tr
                      key={b.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors align-top"
                    >
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-zinc-200 leading-snug">
                          {profile?.first_name ?? "—"}{" "}
                          {profile?.last_name ?? ""}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {profile?.phone ?? profile?.email ?? "—"}
                        </p>
                      </td>

                      {/* Service / Vehicle */}
                      <td className="px-5 py-4">
                        <ServiceBadge name={service?.name ?? null} />
                        {vehicle && (
                          <p className="text-[10px] text-zinc-600 mt-1.5 capitalize">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                            {vehicle.size ? ` · ${vehicle.size}` : ""}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                          <CalendarDays size={11} className="text-zinc-600 shrink-0" />
                          {b.booking_date}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 mt-0.5">
                          <Clock size={10} className="text-zinc-700 shrink-0" />
                          {fmt12(b.booking_time)}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 max-w-[160px]">
                        {addressLine ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin
                              size={10}
                              className="text-zinc-700 shrink-0 mt-0.5"
                            />
                            <span className="text-[10px] text-zinc-500 line-clamp-2">
                              {addressLine}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 tabular-nums">
                        <span className="text-xs font-bold text-zinc-200">
                          ${(b.total_price ?? 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isLoading ? (
                          <Loader2
                            size={14}
                            className="animate-spin text-zinc-500"
                          />
                        ) : (
                          <StatusBadge status={b.status ?? "pending"} />
                        )}
                        {err && (
                          <p className="text-[10px] text-red-400 mt-1">{err}</p>
                        )}
                      </td>

                      {/* Actions dropdown + Cancel */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative z-20">
                            <button
                              disabled={isLoading}
                              onClick={() =>
                                setOpenDropdown((id) =>
                                  id === b.id ? null : b.id
                                )
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.07] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Change status
                              <ChevronDown size={11} />
                            </button>

                          {openDropdown === b.id && (
                            <div className="absolute left-0 top-full mt-1.5 w-52 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl z-30 overflow-hidden">
                              <div className="px-3 py-2 border-b border-white/[0.05]">
                                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">
                                  Set status
                                </p>
                              </div>
                              {STATUS_OPTIONS.map((opt) => {
                                const isCurrent = (b.status ?? "").toLowerCase() === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() =>
                                      handleStatusChange(b, opt.value)
                                    }
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                                  >
                                    <span className="flex items-center gap-2.5">
                                      <span
                                        className={`w-2 h-2 rounded-full ${opt.dot}`}
                                      />
                                      <span className="text-xs text-zinc-300">
                                        {opt.label}
                                      </span>
                                      {opt.value === "completed" && (
                                        <span className="text-[9px] text-blue-400/70 font-mono">
                                          +{earnedPts} pts
                                        </span>
                                      )}
                                    </span>
                                    {isCurrent && (
                                      <Check
                                        size={11}
                                        className="text-[#D4AF37] shrink-0"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          </div>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => openReschedule(b)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-[#D4AF37] hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                            title="Reschedule"
                          >
                            <CalendarClock size={14} strokeWidth={2} />
                          </button>
                          {(b.status ?? "").toLowerCase() !== "cancelled" && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => setCancelConfirmId(b.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-red-400/90 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Ban size={11} />
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => setDeleteConfirmId(b.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            title="Permanent delete"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-zinc-900 border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-zinc-200 shadow-2xl animate-in fade-in slide-in-from-bottom-2"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
