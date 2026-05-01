"use client";

import { useState } from "react";
import { Loader2, Heart } from "lucide-react";
import { createPayCheckout } from "@/app/actions/createPayCheckout";

interface PayClientProps {
  booking: {
    id: string;
    service_name: string | null;
    total_price: number;
    customer_name: string | null;
    vehicle_year: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    booking_date: string | null;
    booking_time: string | null;
  };
}

const TIP_PRESETS = [10, 15, 20];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch { return d; }
}

function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function PayClient({ booking }: PayClientProps) {
  const [selectedPct, setSelectedPct] = useState<number | null>(null);
  const [customStr, setCustomStr]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const base = Number(booking.total_price) || 0;

  const tipAmount = (() => {
    if (selectedPct !== null) return Math.round(base * selectedPct) / 100;
    const c = parseFloat(customStr);
    return isNaN(c) || c < 0 ? 0 : c;
  })();

  const total = base + tipAmount;

  const vehicleStr = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model]
    .filter(Boolean).join(" ");

  const service = booking.service_name ?? "Detailing Service";
  const firstName = booking.customer_name?.split(" ")[0] ?? "there";

  function handleTipPct(pct: number) {
    setCustomStr("");
    setSelectedPct(prev => prev === pct ? null : pct);
  }

  function handleCustomChange(val: string) {
    setSelectedPct(null);
    setCustomStr(val.replace(/[^0-9.]/g, ""));
  }

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const result = await createPayCheckout({ bookingId: booking.id, tipAmount });
      if ("url" in result) {
        window.location.href = result.url;
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo / brand */}
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Arise &amp; Shine VT</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 mt-1">Premium Mobile Detailing</p>
        </div>

        {/* Hero card */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-6 py-6 text-center space-y-1">
          <Heart size={20} className="text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-black text-white leading-snug">
            Hi {firstName}, we hope you love your
          </h1>
          <p className="text-amber-400 font-black text-base">{service}</p>
          <p className="text-xs text-zinc-500 mt-2">
            It was a pleasure working on your vehicle — thank you for choosing us.
          </p>
        </div>

        {/* Booking summary */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 space-y-3">
            {vehicleStr && (
              <Row label="Vehicle" value={vehicleStr} />
            )}
            {booking.booking_date && (
              <Row label="Service Date" value={fmtDate(booking.booking_date)} />
            )}
            {booking.booking_time && (
              <Row label="Time" value={fmtTime(booking.booking_time)} />
            )}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500">Amount Due</span>
              <span className="text-2xl font-black text-amber-500">${fmt(base)}</span>
            </div>
          </div>
        </div>

        {/* Tip section */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-5 space-y-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Leave a Tip</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Tips are 100% optional — never expected, always appreciated. 🙏
            </p>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            {TIP_PRESETS.map(pct => {
              const amt = Math.round(base * pct) / 100;
              const active = selectedPct === pct;
              return (
                <button
                  key={pct}
                  onClick={() => handleTipPct(pct)}
                  className={`rounded-xl py-3 text-center transition-all active:scale-95 border ${
                    active
                      ? "bg-amber-500 border-amber-500 text-black"
                      : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:border-white/[0.15]"
                  }`}
                >
                  <p className={`text-base font-black ${active ? "text-black" : "text-white"}`}>{pct}%</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${active ? "text-black/70" : "text-zinc-500"}`}>${fmt(amt)}</p>
                </button>
              );
            })}
          </div>

          {/* Custom tip */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={customStr}
              onChange={e => handleCustomChange(e.target.value)}
              placeholder="Custom amount"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          {/* Live total */}
          {tipAmount > 0 && (
            <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
              <div className="text-xs text-zinc-500 space-y-0.5">
                <div className="flex justify-between gap-8">
                  <span>Service</span><span className="text-zinc-400">${fmt(base)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>Tip</span><span className="text-zinc-400">+${fmt(tipAmount)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Total</p>
                <p className="text-xl font-black text-amber-500">${fmt(total)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
            {error}
          </p>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Redirecting to Stripe…</>
          ) : (
            `Pay $${fmt(total)}`
          )}
        </button>

        <p className="text-center text-[10px] text-zinc-700 leading-relaxed">
          Payments are processed securely by Stripe. Your card info never touches our servers.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value}</span>
    </div>
  );
}
