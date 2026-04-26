"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X, Search, MapPin, Loader2, ChevronLeft } from "lucide-react";
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

  // Lock scroll while open (body + documentElement for iOS Safari)
  useEffect(() => {
    if (!isOpen) return;
    const w = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${w}px`;
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  // Focus email on open, reset state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => emailRef.current?.focus(), 50);
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

  // Close on Escape
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      aria-modal
      role="dialog"
      aria-label="Track your appointment"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-black/60 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            {screen === "results" && (
              <button
                type="button"
                onClick={() => setScreen("form")}
                className="mr-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                aria-label="Back to search"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <MapPin size={16} className="text-[#D4AF37]" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              {screen === "form" ? "Track My Appointment" : "Your Appointments"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form screen */}
        {screen === "form" && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Enter the email and vehicle you booked with to look up your appointment — no account needed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
                    Car Make
                  </label>
                  <input
                    type="text"
                    required
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="e.g. Toyota"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
                    Car Model
                  </label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Camry"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary-gold-shimmer w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] font-semibold text-sm hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all duration-500 overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? (
                <Loader2 size={15} className="animate-spin relative z-[1]" />
              ) : (
                <>
                  <Search size={14} className="relative z-[1]" />
                  <span className="relative z-[1]">Look Up Appointment</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Results screen */}
        {screen === "results" && (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
            {upcoming.length > 0 && (
              <section className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Upcoming</p>
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
              <section className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Past</p>
                {past.map((b) => (
                  <BookingCard
                    key={b.id}
                    b={b}
                    showRebook
                  />
                ))}
              </section>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">
                No active appointments found.
              </p>
            )}

            <button
              type="button"
              onClick={() => setScreen("form")}
              className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1"
            >
              Search again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
