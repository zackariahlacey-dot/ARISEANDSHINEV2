"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, X, Car, Calendar, Clock, ShieldCheck, Sparkles } from "lucide-react";
import {
  CONDITION_TIERS,
  maintenancePrice,
  maintenanceDurationMins,
  maintenanceFoundationFor,
  type ConditionTier,
} from "@/lib/maintenance";
import type { MaintenanceOffer } from "@/app/actions/getMaintenanceOffers";
import { getNextAvailableDays, type AvailableDay } from "@/app/actions/getNextAvailableDays";
import { bookMaintenance } from "@/app/actions/bookMaintenance";

type Step = 1 | 2 | 3;

export function MaintenanceBookingModal({
  offer,
  open,
  onClose,
  onBooked,
}: {
  offer: MaintenanceOffer | null;
  open: boolean;
  onClose: () => void;
  onBooked: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [condition, setCondition] = useState<ConditionTier | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [days, setDays] = useState<AvailableDay[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setCondition(null);
      setSelectedDate("");
      setSelectedTime("");
      setError(null);
    }
  }, [open]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const foundation = useMemo(
    () => (offer ? maintenanceFoundationFor(offer.sourceServiceName) : "interior"),
    [offer]
  );
  const sizeForLookup = useMemo(() => {
    const sz = offer?.vehicleSize ?? "medium";
    const map: Record<string, string> = { small: "compact", medium: "sedan", large: "suv", extra_large: "xl" };
    return map[sz] ?? "sedan";
  }, [offer]);

  const price = useMemo(
    () => (offer && condition ? maintenancePrice(offer.basePrice, condition) : 0),
    [offer, condition]
  );
  const durationMins = useMemo(
    () => (condition ? maintenanceDurationMins(condition, foundation) : 0),
    [condition, foundation]
  );

  const serviceName =
    foundation === "interior" ? "Interior Detail"
    : foundation === "exterior" ? "Exterior Detail"
    : "Full Detail";

  // Fetch available days once condition is chosen (duration changes per tier)
  useEffect(() => {
    if (!open || !condition || step !== 2) return;
    let cancelled = false;
    setLoadingDays(true);
    setDays([]);
    getNextAvailableDays(serviceName, sizeForLookup, 6, 28, durationMins)
      .then(d => { if (!cancelled) setDays(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingDays(false); });
    return () => { cancelled = true; };
  }, [open, condition, step, serviceName, sizeForLookup, durationMins]);

  if (!open || !offer) return null;

  const vehicleLabel = `${offer.vehicleYear ?? ""} ${offer.vehicleMake ?? ""} ${offer.vehicleModel ?? ""}`.trim();

  const handleConfirm = async () => {
    if (!condition || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    const result = await bookMaintenance({
      offerId: offer.id,
      condition,
      foundation,
      bookingDate: selectedDate,
      bookingTime: selectedTime,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Could not book — please try again.");
      return;
    }
    onBooked();
    router.refresh();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "tween", duration: 0.25 }}
          className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl bg-zinc-950 border border-[#D4AF37]/30 shadow-[0_-12px_40px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Maintenance Detail</p>
              <p className="text-sm font-bold text-white truncate">{vehicleLabel || "Your vehicle"}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-900 border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Step indicator ────────────────────────────────────────── */}
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(n => (
                <div
                  key={n}
                  className={`h-1 rounded-full flex-1 transition-all ${
                    n <= step ? "bg-[#D4AF37]" : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 font-bold uppercase tracking-wider">
              Step {step} of 3 · {step === 1 ? "Condition" : step === 2 ? "Pick a day" : "Confirm"}
            </p>
          </div>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* STEP 1 — Condition picker */}
            {step === 1 && (
              <div className="space-y-2.5">
                <p className="text-zinc-300 text-sm mb-3 leading-relaxed">
                  How's your <span className="text-[#D4AF37] font-bold">{vehicleLabel || "vehicle"}</span> looking right now? Pick the option that fits — we'll size the detail to match.
                </p>
                {CONDITION_TIERS.map(tier => {
                  const tierPrice = maintenancePrice(offer.basePrice, tier.id);
                  const tierMins = maintenanceDurationMins(tier.id, foundation);
                  const isSelected = condition === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setCondition(tier.id)}
                      className={`w-full text-left rounded-2xl border p-3.5 transition-all active:scale-[0.99] ${
                        isSelected
                          ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.12] to-[#D4AF37]/[0.02] shadow-[0_0_20px_rgba(212,175,55,0.18)]"
                          : "border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 text-2xl leading-none mt-0.5">{tier.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={`text-sm font-black ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>
                              {tier.label}
                            </span>
                            <span className={`text-base font-black tabular-nums ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>
                              ${tierPrice}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-zinc-400 leading-tight">{tier.headline}</p>
                          <p className="text-[11px] text-zinc-500 leading-snug mt-1">{tier.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                              <Sparkles size={8} /> {tier.discountCopy}
                            </span>
                            <span className="text-[10px] text-zinc-600">·</span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                              <Clock size={9} /> ~{Math.round(tierMins / 60 * 10) / 10}{tierMins % 60 === 0 ? "" : ".5"} hr
                            </span>
                          </div>
                        </div>
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all mt-1 ${
                          isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                        }`}>
                          {isSelected && <Check size={11} className="text-black" strokeWidth={3} />}
                        </span>
                      </div>
                    </button>
                  );
                })}
                <p className="text-[10px] text-zinc-600 text-center pt-2">
                  Base price: ${offer.basePrice} · {serviceName.replace(" Detail", "")}
                </p>
              </div>
            )}

            {/* STEP 2 — Date / time picker */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Pick the day that works best. We'll arrive in the morning — earliest open slot shown for each option.
                </p>
                {loadingDays ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="skeleton-shimmer h-16 rounded-xl border border-white/[0.04]" />
                    ))}
                  </div>
                ) : days.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-center">
                    <p className="text-sm text-amber-300 font-bold">No open days right now</p>
                    <p className="text-xs text-amber-200/80 mt-1">Give us a call at 802-585-5563 and we'll find a time.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {days.map(day => {
                      const isSelected = selectedDate === day.date;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.date);
                            setSelectedTime(day.earliestSlot);
                          }}
                          className={`w-full rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] ${
                            isSelected
                              ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.02] shadow-[0_0_16px_rgba(212,175,55,0.15)]"
                              : "border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`text-sm font-black ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>{day.label}</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Earliest: <span className="text-zinc-300 font-bold">{day.earliestSlot}</span>
                                {day.totalSlots > 1 && <span className="text-zinc-600"> · {day.totalSlots} slots</span>}
                              </p>
                            </div>
                            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                            }`}>
                              {isSelected && <Check size={11} className="text-black" strokeWidth={3} />}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Confirm */}
            {step === 3 && condition && (
              <div className="space-y-3">
                <p className="text-zinc-300 text-sm leading-relaxed">
                  All set! Confirm and we'll see you on your scheduled day. No payment until the job's done.
                </p>
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-zinc-900/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <Car size={14} className="text-[#D4AF37]" />
                    <span className="text-sm font-bold text-white">{vehicleLabel}</span>
                  </div>
                  <div className="px-4 py-2.5 border-b border-white/[0.04]">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Service</p>
                    <p className="text-sm font-bold text-zinc-200 mt-0.5">Maintenance · {serviceName.replace(" Detail", "")}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Condition: {CONDITION_TIERS.find(t => t.id === condition)?.label}</p>
                  </div>
                  <div className="px-4 py-2.5 border-b border-white/[0.04]">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">When</p>
                    <p className="text-sm font-bold text-zinc-200 mt-0.5">
                      {days.find(d => d.date === selectedDate)?.label ?? selectedDate} · {selectedTime}
                    </p>
                  </div>
                  <div className="px-4 py-3 flex items-baseline justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total</span>
                    <span className="text-2xl font-black text-[#D4AF37] tabular-nums">${price}</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 text-center inline-flex items-center justify-center gap-1.5 w-full">
                  <ShieldCheck size={11} className="text-emerald-400" /> Pay at arrival — cash or card
                </p>
                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3">
                    <p className="text-xs text-rose-300">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer / nav ──────────────────────────────────────────── */}
          <div className="px-5 py-4 border-t border-white/[0.06] flex items-center gap-2 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => (s > 1 ? ((s - 1) as Step) : s))}
                className="inline-flex items-center gap-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20 transition-all"
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => (s < 3 ? ((s + 1) as Step) : s))}
                disabled={(step === 1 && !condition) || (step === 2 && (!selectedDate || !selectedTime))}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.97] ${
                  ((step === 1 && condition) || (step === 2 && selectedDate))
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.35)]"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.35)] active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {submitting ? "Booking…" : <>Confirm · ${price} <Check size={14} strokeWidth={3} /></>}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
