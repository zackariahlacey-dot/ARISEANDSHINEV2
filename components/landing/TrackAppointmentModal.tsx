"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X, Search, MapPin, Loader2, ChevronLeft, CalendarDays, Clock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBookingsByEmailAndVehicle } from "@/app/actions/getBookingsByEmailAndVehicle";
import { BookingCard } from "@/components/dashboard/BookingCard";
import type { ClientBooking } from "@/app/actions/getClientBookings";

type Screen = "form" | "results";

interface TrackAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrackAppointmentModal({ isOpen, onClose }: TrackAppointmentModalProps) {
  const [screen, setScreen] = useState<Screen>("form");
  const [email, setEmail] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<ClientBooking[]>([]);
  const [past, setPast] = useState<ClientBooking[]>([]);
  const [isPending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);
  const scrollPos = useRef(0);

  // Robust scroll lock — saves scroll position and freezes body in place
  useEffect(() => {
    if (!isOpen) return;
    scrollPos.current = window.scrollY;
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPos.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.paddingRight = `${sb}px`;
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      window.scrollTo(0, scrollPos.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => emailRef.current?.focus(), 80);
    } else {
      setScreen("form");
      setEmail("");
      setMake("");
      setModel("");
      setError(null);
      setUpcoming([]);
      setPast([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  function handleCancelledFromCard(id: string) {
    setUpcoming((prev) => prev.filter((b) => b.id !== id));
    setPast((prev) => prev.filter((b) => b.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await getBookingsByEmailAndVehicle(email, make, model);
      if (!result.found) {
        setError("No appointments found. Double-check your email and vehicle details.");
        return;
      }
      setUpcoming(result.upcoming);
      setPast(result.past);
      setScreen("results");
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          aria-modal
          role="dialog"
          aria-label="Track your appointment"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 16,  scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative w-full sm:max-w-md mx-4 sm:mx-0 mb-0 sm:mb-0 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
            style={{ background: "linear-gradient(160deg, #111113 0%, #0a0a0b 100%)" }}
          >
            {/* Gold top line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />

            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                {screen === "results" && (
                  <button
                    type="button"
                    onClick={() => setScreen("form")}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-all -ml-1"
                    aria-label="Back to search"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <MapPin size={13} className="text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-none">
                    {screen === "form" ? "Track My Appointment" : "Your Appointments"}
                  </h2>
                  {screen === "results" && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {upcoming.length + past.length} appointment{upcoming.length + past.length !== 1 ? "s" : ""} found
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.07] transition-all"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ── Form screen ── */}
              {screen === "form" && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{    opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleSubmit}
                  className="p-5 space-y-4"
                >
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Enter the email and vehicle you booked with — no account needed.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                        Email Address
                      </label>
                      <input
                        ref={emailRef}
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 focus:bg-zinc-900 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                          Make
                        </label>
                        <input
                          type="text"
                          required
                          value={make}
                          onChange={(e) => setMake(e.target.value)}
                          placeholder="Toyota"
                          className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 focus:bg-zinc-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                          Model
                        </label>
                        <input
                          type="text"
                          required
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="Camry"
                          className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 focus:bg-zinc-900 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2.5 text-xs text-red-400 bg-red-400/[0.07] border border-red-400/20 rounded-xl px-3.5 py-2.5"
                      >
                        <AlertCircle size={13} className="shrink-0 mt-0.5" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-sm font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-[0_4px_16px_rgba(212,175,55,0.25)] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        <Search size={14} />
                        Look Up Appointment
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-zinc-700">
                    Have an account?{" "}
                    <a href="/protected" className="text-[#D4AF37] hover:text-amber-300 transition-colors">
                      Sign in for full dashboard access
                    </a>
                  </p>
                </motion.form>
              )}

              {/* ── Results screen ── */}
              {screen === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{    opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 space-y-4 max-h-[65vh] overflow-y-auto overscroll-contain"
                >
                  {upcoming.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                          <CalendarDays size={10} className="text-sky-400" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                          Upcoming · {upcoming.length}
                        </p>
                      </div>
                      {upcoming.map((b) => (
                        <BookingCard
                          key={b.id}
                          b={b}
                          showActions
                          onCancelled={handleCancelledFromCard}
                        />
                      ))}
                    </section>
                  )}

                  {past.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
                          <Clock size={10} className="text-zinc-500" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Past
                        </p>
                      </div>
                      {past.map((b) => (
                        <BookingCard key={b.id} b={b} showRebook />
                      ))}
                    </section>
                  )}

                  {upcoming.length === 0 && past.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-6">
                      No active appointments found.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setScreen("form")}
                    className="w-full text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors pt-1 pb-1"
                  >
                    ← Search again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
