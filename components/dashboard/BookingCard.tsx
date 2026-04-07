"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, RotateCcw, X, AlertTriangle, Loader2, CalendarClock, RefreshCw } from "lucide-react";
import { cancelBooking } from "@/app/actions/cancelBooking";
import { RescheduleModal } from "./RescheduleModal";
import type { ClientBooking } from "@/app/actions/getClientBookings";

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

/** Returns true if the booking is more than 24 hours away (still cancellable). */
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

interface BookingCardProps {
  b: ClientBooking;
  /** Show rebook button (past appointments) */
  showRebook?: boolean;
  /** Show cancel / reschedule (upcoming appointments) */
  showActions?: boolean;
  /** Called after a successful cancel so the parent can refresh */
  onCancelled?: (id: string) => void;
}

export function BookingCard({ b, showRebook, showActions, onCancelled }: BookingCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const isUpcoming = b.booking_date >= today;
  const vehicleLabel = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");
  const cancellable = isCancellable(b);

  const router = useRouter();
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [wasRefunded, setWasRefunded] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const handleCancelClick = () => {
    if (!cancellable) return;
    setCancelState("confirm");
  };

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
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 space-y-1 text-center">
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
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-4 space-y-2.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-100 truncate text-sm">{b.service_name ?? "Detailing Service"}</p>
            {vehicleLabel && <p className="text-xs text-zinc-500 truncate mt-0.5">{vehicleLabel}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-black text-[#D4AF37]">${b.total_price.toFixed(0)}</p>
            {isUpcoming && (
              <span className="text-[8px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">
                Upcoming
              </span>
            )}
          </div>
        </div>

        {/* Date / location */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {formatDate(b.booking_date)}
            {b.booking_time ? ` · ${formatTime(b.booking_time.slice(0, 5))}` : ""}
          </span>
          {b.service_address && (
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin size={10} className="shrink-0" />{b.service_address}
            </span>
          )}
        </div>

        {/* Reschedule success notice */}
        {rescheduleSuccess && (
          <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">
            Booking rescheduled! Check your email for confirmation.
          </p>
        )}

        {/* Cancel error notice */}
        {cancelState === "error" && cancelError && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{cancelError}</p>
        )}

        {/* Cancel confirm */}
        {cancelState === "confirm" && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs text-amber-400 flex items-start gap-1.5">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              Are you sure you want to cancel? This can&apos;t be undone.
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

        {/* Loading spinner for cancel */}
        {cancelState === "loading" && (
          <div className="flex items-center justify-center py-2">
            <Loader2 size={16} className="text-zinc-600 animate-spin" />
          </div>
        )}

        {/* Action buttons */}
        {cancelState === "idle" && (
          <div className="flex items-center gap-3 pt-0.5">
            {showActions && !rescheduleSuccess && (
              <>
                <button
                  type="button"
                  onClick={() => setShowReschedule(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D4AF37] transition-colors"
                >
                  <CalendarClock size={11} /> Reschedule
                </button>
                {cancellable && (
                  <button
                    type="button"
                    onClick={handleCancelClick}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <X size={11} /> Cancel
                  </button>
                )}
                {!cancellable && (
                  <span className="flex items-center gap-1 text-xs text-zinc-700">
                    <AlertTriangle size={10} /> Within 24hr — contact us to cancel
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
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D4AF37] transition-colors"
              >
                <RotateCcw size={11} /> Rebook this service
              </button>
            )}
          </div>
        )}
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
