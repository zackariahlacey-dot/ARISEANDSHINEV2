"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Check, ChevronRight, Loader2, AlertCircle, Clock } from "lucide-react";
import type { SchedulePageData, ScheduleDay } from "@/app/actions/monthlySubscriptions";
import { submitSchedulePick } from "@/app/actions/monthlySubscriptions";
import { cn } from "@/lib/utils";

type Props = { data: SchedulePageData; token: string | null };

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function MonthlySchedulePicker({ data, token }: Props) {
  const { subscription, month, existingPick, availableDays } = data;

  const [selectedDay,  setSelectedDay]  = useState<ScheduleDay | null>(
    existingPick?.chosenDate
      ? availableDays.find(d => d.date === existingPick.chosenDate) ?? null
      : null
  );
  const [selectedTime, setSelectedTime] = useState<string>(existingPick?.chosenTime ?? "");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [done,         setDone]         = useState(false);

  async function handleConfirm() {
    if (!selectedDay || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    const slot = selectedDay.slots.find(s => s.time12 === selectedTime);
    if (!slot) { setError("Please select a valid time."); setSubmitting(false); return; }

    const result = await submitSchedulePick({
      subscriptionId: subscription.id,
      month,
      date: selectedDay.date,
      time24: slot.time24,
      time12: slot.time12,
    });

    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/60 border border-white/10 rounded-3xl p-10 text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#AA771C] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <Check size={36} className="text-black" strokeWidth={3} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-3">Scheduled!</p>
          <h1 className="text-3xl font-black text-white mb-3">
            See you <span className="text-[#D4AF37]">{selectedDay?.label}!</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            <strong className="text-white">{selectedTime}</strong> on{" "}
            <strong className="text-white">
              {selectedDay?.date
                ? new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : ""}
            </strong>
            <br />
            {subscription.serviceAddress && (
              <span className="text-zinc-500 text-xs mt-1 block">{subscription.serviceAddress}</span>
            )}
          </p>
          {subscription.paymentMethod === "cash" && (
            <p className="text-xs text-zinc-600 mt-4">
              💵 Reminder: this is a cash plan — please have payment ready at arrival.
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/8 via-zinc-950 to-zinc-950">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-5">
            <Calendar size={13} className="text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">{subscription.planName}</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Pick your <span className="text-[#D4AF37]">{monthLabel(month)}</span> date
          </h1>
          <p className="text-zinc-400 text-sm">
            {subscription.vehicleYear} {subscription.vehicleMake} {subscription.vehicleModel}
            {subscription.serviceAddress && (
              <span className="block text-zinc-600 text-xs mt-0.5">{subscription.serviceAddress}</span>
            )}
          </p>
        </div>

        {/* Existing pick banner */}
        {existingPick?.chosenDate && existingPick.status === "pending" && (
          <div className="mb-6 bg-[#D4AF37]/8 border border-[#D4AF37]/30 rounded-2xl p-4 text-sm text-zinc-300">
            <span className="text-[#D4AF37] font-bold">Currently scheduled:</span>{" "}
            {new Date(existingPick.chosenDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {existingPick.chosenTime}
            <span className="block text-xs text-zinc-600 mt-0.5">Select a different slot below to reschedule.</span>
          </div>
        )}

        {availableDays.length === 0 ? (
          <div className="text-center bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-8">
            <p className="text-zinc-400 text-sm mb-2">No available slots found for {monthLabel(month)}.</p>
            <p className="text-zinc-600 text-xs">Please contact us at <strong className="text-zinc-400">contact@ariseandshinedetailing.com</strong> or call 802-585-5563 to schedule.</p>
          </div>
        ) : (
          <>
            {/* Date selection */}
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Choose a date</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableDays.map(day => {
                  const selected = selectedDay?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      onClick={() => { setSelectedDay(day); setSelectedTime(""); }}
                      className={cn(
                        "rounded-2xl border p-3 text-center transition-all active:scale-[0.97]",
                        selected
                          ? "border-[#D4AF37]/60 bg-[#D4AF37]/8"
                          : "border-white/[0.07] bg-zinc-900/40 hover:border-white/[0.12]"
                      )}
                    >
                      <p className={cn("text-sm font-black", selected ? "text-[#D4AF37]" : "text-white")}>
                        {day.label.split(" ").slice(0, 1).join("")}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{day.label.split(" ").slice(1).join(" ")}</p>
                      <p className="text-[10px] text-zinc-700 mt-1">{day.slots.length} slot{day.slots.length !== 1 ? "s" : ""}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time selection */}
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  key={selectedDay.date}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
                    Available times — {selectedDay.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedDay.slots.map(slot => {
                      const picked = selectedTime === slot.time12;
                      return (
                        <button
                          key={slot.time24}
                          onClick={() => setSelectedTime(slot.time12)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-bold transition-all active:scale-[0.97]",
                            picked
                              ? "border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#D4AF37]"
                              : "border-white/[0.07] bg-zinc-900/40 text-zinc-300 hover:border-white/[0.12]"
                          )}
                        >
                          <Clock size={12} className={picked ? "text-[#D4AF37]" : "text-zinc-600"} />
                          {slot.time12}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-sm text-red-400"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={!selectedDay || !selectedTime || submitting}
              className="w-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 shadow-[0_8px_32px_rgba(212,175,55,0.2)]"
            >
              {submitting
                ? <Loader2 className="animate-spin" size={18} />
                : <>
                    <Check size={16} strokeWidth={3} />
                    Confirm {selectedTime || "Time"}
                    {selectedDay && <span className="font-medium opacity-70">· {selectedDay.label}</span>}
                  </>
              }
            </button>

            <p className="text-center text-[10px] text-zinc-700 mt-4">
              Can&apos;t make any of these? Email contact@ariseandshinedetailing.com and we&apos;ll work something out.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
