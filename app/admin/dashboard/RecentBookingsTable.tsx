"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CalendarClock, Loader2, X } from "lucide-react";
import { deleteBooking } from "@/app/actions/deleteBooking";
import { updateBookingSchedule } from "@/app/actions/updateBookingSchedule";

export type DashboardBookingRow = {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: string;
  total_price: number | null;
  profiles: { first_name: string | null; last_name: string | null; phone?: string | null } | { first_name: string | null; last_name: string | null; phone?: string | null }[] | null;
  services: { name: string | null } | { name: string | null }[] | null;
  vehicles: { make: string | null; model: string | null; year: number | null } | { make: string | null; model: string | null; year: number | null }[] | null;
};

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

function StatusBadge({ status }: { status: string }) {
  const normalized = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    confirmed: "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/25",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    cancelled: "bg-zinc-600/30 text-zinc-500 border-zinc-600/40",
    completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };
  const label = normalized === "confirmed" ? "Confirmed" : normalized === "completed" ? "Completed" : normalized === "cancelled" ? "Cancelled" : "Pending";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
        map[normalized] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"
      }`}
    >
      {label}
    </span>
  );
}

function fmtTime(t: string | null): string {
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

export function RecentBookingsTable({ initialBookings }: { initialBookings: DashboardBookingRow[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState<DashboardBookingRow[]>(initialBookings);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [rescheduleRow, setRescheduleRow] = useState<DashboardBookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleDelete = async (b: DashboardBookingRow) => {
    setDeleteConfirmId(null);
    setLoadingId(b.id);
    const result = await deleteBooking(b.id);
    setLoadingId(null);
    if (result.success) {
      setBookings((prev) => prev.filter((r) => r.id !== b.id));
      showToast(`Booking for ${result.customerName ?? "customer"} permanently deleted.`);
      router.refresh();
    } else {
      showToast(result.error ?? "Delete failed.");
    }
  };

  const handleRescheduleSave = async () => {
    if (!rescheduleRow || !rescheduleDate.trim() || !rescheduleTime.trim()) return;
    setLoadingId(rescheduleRow.id);
    const result = await updateBookingSchedule(rescheduleRow.id, rescheduleDate, rescheduleTime);
    setLoadingId(null);
    if (result.success) {
      setRescheduleRow(null);
      setRescheduleDate("");
      setRescheduleTime("");
      showToast("Booking rescheduled. Customer notified.");
      router.refresh();
    } else {
      showToast(result.error ?? "Reschedule failed.");
    }
  };

  const openReschedule = (b: DashboardBookingRow) => {
    setRescheduleRow(b);
    setRescheduleDate(b.booking_date);
    setRescheduleTime(fmtTime(b.booking_time) || TIME_SLOTS[0]);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["Customer", "Service", "Date", "Total", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-600 text-sm">
                  No bookings yet
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                const service = Array.isArray(b.services) ? b.services[0] : b.services;
                const vehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
                const isLoading = loadingId === b.id;
                return (
                  <tr
                    key={b.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-zinc-200 text-xs">
                        {profile?.first_name ?? "—"} {profile?.last_name ?? ""}
                      </p>
                      {vehicle && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">
                      {service?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {b.booking_date}
                      {b.booking_time && (
                        <span className="text-zinc-600 ml-1">{fmtTime(b.booking_time)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-200 text-xs font-semibold tabular-nums">
                      ${(b.total_price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={b.status ?? "pending"} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => openReschedule(b)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-[#D4AF37] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                          title="Reschedule"
                        >
                          <CalendarClock size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete permanently"
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

      {/* Delete confirmation */}
      {deleteConfirmId && (() => {
        const b = bookings.find((r) => r.id === deleteConfirmId);
        if (!b) return null;
        const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
            <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-red-500/20 rounded-2xl shadow-2xl p-5">
              <p className="text-sm font-semibold text-white mb-2">Permanent delete</p>
              <p className="text-xs text-zinc-400 mb-4">
                Are you sure you want to permanently delete this booking?
              </p>
              <p className="text-[11px] text-zinc-500 mb-5">{name} · {b.booking_date}</p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-500"
                >
                  Delete
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
              const p = Array.isArray(rescheduleRow.profiles) ? rescheduleRow.profiles[0] : rescheduleRow.profiles;
              const s = Array.isArray(rescheduleRow.services) ? rescheduleRow.services[0] : rescheduleRow.services;
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-zinc-200 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </>
  );
}
