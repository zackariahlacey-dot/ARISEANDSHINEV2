"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, RotateCcw, X, AlertTriangle, Loader2, CalendarClock, RefreshCw, CalendarPlus, Car, Clock } from "lucide-react";
import { cancelBooking } from "@/app/actions/cancelBooking";
import { RescheduleModal } from "./RescheduleModal";
import type { ClientBooking } from "@/app/actions/getClientBookings";

function buildGoogleCalendarUrl(b: ClientBooking): string {
  try {
    const [h, m] = (b.booking_time?.slice(0, 5) ?? "09:00").split(":").map(Number);
    const start = new Date(b.booking_date + "T12:00:00");
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const title = encodeURIComponent(`${b.service_name ?? "Auto Detail"} — Arise & Shine VT`);
    const loc = encodeURIComponent(b.service_address ?? "");
    const details = encodeURIComponent("Mobile detailing by Arise & Shine VT · ariseandshinevt.com");
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&location=${loc}&details=${details}`;
  } catch {
    return "#";
  }
}

function formatDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatTime(t: string | null) {
  if (!t) return null;
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch {
    return t;
  }
}

function buildRebookDraft(b: ClientBooking) {
  return {
    serviceId: b.service_id ?? "",
    vehicleSize: "sedan" as const,
    vehicleYear: b.vehicle_year ?? "",
    vehicleMake: b.vehicle_make ?? "",
    vehicleModel: b.vehicle_model ?? "",
    selectedDate: "",
    selectedTime: "",
    serviceAddress: b.service_address ?? "",
    name: "", phone: "", email: "", notes: "",
    travelFee: 0, distanceMiles: null,
    couponCode: "", appliedCoupon: null,
    pointsToRedeemInput: 0,
  };
}

function isCancellable(b: ClientBooking): boolean {
  try {
    const [h, m] = (b.booking_time?.slice(0, 5) ?? "12:00").split(":");
    const apptDate = new Date(b.booking_date + "T12:00:00");
    apptDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    const hoursUntil = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil > 24;
  } catch {
    return false;
  }
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  confirmed:       { label: "Confirmed",     className: "bg-sky-500/10 text-sky-400 border border-sky-500/20" },
  completed:       { label: "Completed",     className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  pending_payment: { label: "Pending",       className: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  "no-show":       { label: "No Show",       className: "bg-red-500/10 text-red-400 border border-red-500/20" },
  cancelled:       { label: "Cancelled",     className: "bg-zinc-700/50 text-zinc-500 border border-zinc-700" },
};

interface BookingCardProps {
  b: ClientBooking;
  showRebook?: boolean;
  showActions?: boolean;
  onCancelled?: (id: string) => void;
}

export function BookingCard({ b, showRebook, showActions, onCancelled }: BookingCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const isUpcoming = b.booking_date >= today;
  const vehicleLabel = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");
  const cancellable = isCancellable(b);
  const statusStyle = STATUS_STYLES[b.status] ?? { label: b.status, className: "bg-zinc-700/50 text-zinc-500 border border-zinc-700" };
  const formattedTime = formatTime(b.booking_time?.slice(0, 5) ?? null);

  const router = useRouter();
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [wasRefunded, setWasRefunded] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const handleCancelConfirm = () => {
    setCancelState("loading");
    startTransition(async () => {
      const result = await cancelBooking(b.id);
      if (result.success) {
        setWasRefunded(result.refunded ?? false);
        setCancelState("done");
        onCancelled?.(b.id);
        router.refresh();
      } else {
        setCancelState("error");
        setCancelError(result.error ?? "Could not cancel booking.");
      }
    });
  };

  if (cancelState === "done") {
    return (
      <div className="rounded-2xl border border-white/[0.04] bg-zinc-900/40 p-4 text-center space-y-1">
        <p className="text-xs text-zinc-500">Booking cancelled.</p>
        {wasRefunded && (
          <p className="text-xs text-emerald-400 flex items-center justify-center gap-1">
            <RefreshCw size={10} /> Refund issued — allow 5–10 business days.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isUpcoming
          ? "border-white/[0.08] bg-zinc-900/70"
          : "border-white/[0.04] bg-zinc-900/40"
      }`}>
        {/* Upcoming accent bar */}
        {isUpcoming && (
          <div className="h-0.5 bg-gradient-to-r from-[#d4af37]/60 via-[#d4af37]/30 to-transparent" />
        )}

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-100 text-sm leading-tight truncate mb-0.5">
                {b.service_name ?? "Detailing Service"}
              </p>
              {vehicleLabel && (
                <div className="flex items-center gap-1 text-zinc-500">
                  <Car size={10} className="shrink-0" />
                  <p className="text-xs truncate">{vehicleLabel}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <p className="text-base font-black text-[#D4AF37]">${b.total_price.toFixed(0)}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusStyle.className}`}>
                {statusStyle.label}
              </span>
            </div>
          </div>

          {/* Date / time / location chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
              <Calendar size={10} className="text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 font-medium">{formatDate(b.booking_date)}</span>
            </div>
            {formattedTime && (
              <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                <Clock size={10} className="text-zinc-500 shrink-0" />
                <span className="text-[11px] text-zinc-400 font-medium">{formattedTime}</span>
              </div>
            )}
            {b.service_address && (
              <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 py-1.5 max-w-[200px]">
                <MapPin size={10} className="text-zinc-500 shrink-0" />
                <span className="text-[11px] text-zinc-400 font-medium truncate">{b.service_address}</span>
              </div>
            )}
          </div>

          {/* Reschedule success */}
          {rescheduleSuccess && (
            <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2 mb-2">
              Booking rescheduled! Check your email for confirmation.
            </p>
          )}

          {/* Cancel error */}
          {cancelState === "error" && cancelError && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-2">{cancelError}</p>
          )}

          {/* Cancel confirm */}
          {cancelState === "confirm" && (
            <div className="rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3 space-y-2 mb-2">
              <p className="text-xs text-zinc-400 flex items-start gap-1.5">
                <AlertTriangle size={11} className="shrink-0 mt-0.5 text-amber-500" />
                Cancel this appointment? This can&apos;t be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  className="flex-1 py-1.5 rounded-lg bg-red-500/80 text-white text-xs font-bold hover:bg-red-500 transition-colors"
                >
                  Yes, cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCancelState("idle")}
                  className="flex-1 py-1.5 rounded-lg bg-white/[0.06] text-zinc-300 text-xs font-bold hover:bg-white/[0.10] transition-colors"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {cancelState === "loading" && (
            <div className="flex items-center justify-center py-2">
              <Loader2 size={16} className="text-zinc-600 animate-spin" />
            </div>
          )}

          {/* Action buttons */}
          {cancelState === "idle" && (
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-0.5">
              {showActions && !rescheduleSuccess && (
                <>
                  <a
                    href={buildGoogleCalendarUrl(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D4AF37] transition-colors py-1"
                  >
                    <CalendarPlus size={11} /> Add to Calendar
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowReschedule(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D4AF37] transition-colors py-1"
                  >
                    <CalendarClock size={11} /> Reschedule
                  </button>
                  {cancellable ? (
                    <button
                      type="button"
                      onClick={() => setCancelState("confirm")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-red-400 transition-colors py-1"
                    >
                      <X size={11} /> Cancel
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-zinc-700 py-1">
                      <AlertTriangle size={10} /> &lt;24hr — call us to cancel
                    </span>
                  )}
                </>
              )}
              {showRebook && (
                <button
                  type="button"
                  onClick={() => {
                    const draft = buildRebookDraft(b);
                    try { sessionStorage.setItem("draftBooking", JSON.stringify(draft)); } catch {}
                    window.location.href = "/?restore_booking=1";
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D4AF37] transition-colors py-1"
                >
                  <RotateCcw size={11} /> Rebook this service
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showReschedule && (
        <RescheduleModal
          bookingId={b.id}
          serviceName={b.service_name ?? "Detailing Service"}
          currentDate={b.booking_date}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => {
            setShowReschedule(false);
            setRescheduleSuccess(true);
          }}
        />
      )}
    </>
  );
}
