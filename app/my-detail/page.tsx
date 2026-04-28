"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Search, Loader2, ChevronRight } from "lucide-react";
import { getBookingsByPhone } from "@/app/actions/getBookingsByPhone";
import type { ClientBooking } from "@/app/actions/getClientBookings";
import { BookingCard } from "@/components/dashboard/BookingCard";

export default function MyDetailPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<{ found: boolean; upcoming: ClientBooking[]; past: ClientBooking[] } | null>(null);

  const handleCancelled = (id: string) => {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            upcoming: prev.upcoming.filter((b) => b.id !== id),
            past: prev.past.filter((b) => b.id !== id),
          }
        : prev
    );
  };

  const formatPhoneInput = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const handleSearch = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setLoading(true);
    setSearched(false);
    const res = await getBookingsByPhone(phone);
    setResult(res);
    setSearched(true);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const hasBookings = result?.found && (result.upcoming.length > 0 || result.past.length > 0);

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      {/* Background gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 pb-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-1.5">
            Guest Lookup
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">My Detail</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Enter the phone number you used when booking to see your appointments.
          </p>
        </div>

        {/* Phone input */}
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm p-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500 mb-2">
              Phone Number
            </p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3">
                <Phone size={14} className="text-zinc-600 shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  onKeyDown={handleKeyDown}
                  placeholder="(802) 555-0100"
                  className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || phone.replace(/\D/g, "").length < 10}
                className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-black text-zinc-950 transition-all hover:bg-[#e6c84a] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Look up
              </button>
            </div>
          </div>

          {searched && !result?.found && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-zinc-400">
              No bookings found for that number. Make sure you use the same number you provided when booking.
            </div>
          )}
        </div>

        {/* Results */}
        {hasBookings && (
          <div className="mt-6 space-y-6">
            {result!.upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37]">
                  Upcoming ({result!.upcoming.length})
                </h2>
                {result!.upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    b={b}
                    showActions
                    onCancelled={handleCancelled}
                  />
                ))}
              </section>
            )}

            {result!.past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold tracking-[0.18em] uppercase text-zinc-600">
                  Past ({result!.past.length})
                </h2>
                {result!.past.map((b) => (
                  <BookingCard
                    key={b.id}
                    b={b}
                    showRebook
                    onCancelled={handleCancelled}
                  />
                ))}
              </section>
            )}

            <div className="pt-2 text-center">
              <Link
                href="/#services"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-[#D4AF37] transition-colors"
              >
                Book another detail <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Sign in nudge */}
        <div className="mt-8 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 text-center space-y-2">
          <p className="text-xs text-zinc-600">Have an account?</p>
          <Link
            href="/auth/login?redirect=/protected"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D4AF37] hover:underline"
          >
            Sign in for loyalty discounts &amp; full history <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
