"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Calendar, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getAvailableSlotsForReschedule,
  rescheduleBooking,
} from "@/app/actions/rescheduleBooking";

interface RescheduleModalProps {
  bookingId: string;
  serviceName: string;
  currentDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: () => void;
}

function formatDateLabel(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function to12h(time24: string): string {
  try {
    const [h, m] = time24.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch {
    return time24;
  }
}

// Generate date strings for the next N days starting from tomorrow
function getNextDates(count = 14): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // start from tomorrow
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function RescheduleModal({
  bookingId,
  serviceName,
  currentDate,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const DATES = getNextDates(21);

  const [selectedDate, setSelectedDate] = useState<string>(DATES[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotLoadError, setSlotLoadError] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch slots whenever selected date changes
  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot(null);
    setSlots([]);
    setSlotLoadError(false);
    setLoadingSlots(true);
    getAvailableSlotsForReschedule(bookingId, selectedDate)
      .then((s) => { setSlots(s); })
      .catch(() => { setSlotLoadError(true); })
      .finally(() => { setLoadingSlots(false); });
  }, [bookingId, selectedDate]);

  const handleConfirm = () => {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleBooking(bookingId, selectedDate, selectedSlot);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  // Date nav
  const [dateOffset, setDateOffset] = useState(0);
  const visibleDates = DATES.slice(dateOffset, dateOffset + 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37]">
              Reschedule
            </p>
            <p className="text-sm font-bold text-zinc-100 mt-0.5">{serviceName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Date selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Calendar size={12} /> Pick a Date
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDateOffset((o) => Math.max(0, o - 7))}
                  disabled={dateOffset === 0}
                  className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDateOffset((o) => Math.min(DATES.length - 7, o + 7))
                  }
                  disabled={dateOffset + 7 >= DATES.length}
                  className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {visibleDates.map((date) => {
                const d = new Date(date + "T12:00:00");
                const isSelected = date === selectedDate;
                const isOriginal = date === currentDate;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-colors ${
                      isSelected
                        ? "bg-[#D4AF37] text-zinc-950"
                        : isOriginal
                        ? "border border-zinc-700 text-zinc-400"
                        : "hover:bg-white/[0.06] text-zinc-400"
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={`text-sm font-black mt-0.5 ${isSelected ? "text-zinc-950" : ""}`}>
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <p className="text-[10px] text-zinc-600 mt-2 text-center">
                {formatDateLabel(selectedDate)}
              </p>
            )}
          </div>

          {/* Time slots */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mb-3">
              <Clock size={12} /> Available Times
            </p>

            {loadingSlots ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="text-zinc-600 animate-spin" />
              </div>
            ) : slotLoadError ? (
              <p className="text-xs text-red-400 text-center py-4">
                Could not load availability. Check your connection and try again.
              </p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">
                No available slots on this date. Try another day.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                      selectedSlot === slot
                        ? "bg-[#D4AF37] text-zinc-950"
                        : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.10]"
                    }`}
                  >
                    {to12h(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || isPending}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-zinc-950 text-sm font-black transition-all hover:bg-[#e6c84a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Rescheduling…
              </>
            ) : (
              <>
                Confirm Reschedule
                {selectedSlot && selectedDate
                  ? ` — ${to12h(selectedSlot)}`
                  : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
