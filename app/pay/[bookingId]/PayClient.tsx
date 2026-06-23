"use client";

import { useState } from "react";
import { Loader2, Sparkles, ShieldCheck, Mail } from "lucide-react";
import { createPayCheckout } from "@/app/actions/createPayCheckout";

interface PayClientProps {
  booking: {
    id: string;
    service_name: string | null;
    total_price: number;
    customer_name: string | null;
    customer_email: string | null;
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
  // If no email is on file we collect one here so Stripe can email the receipt.
  // Validated client-side; the server action persists it onto the booking row.
  const needsEmail = !booking.customer_email?.trim();
  const [email, setEmail]             = useState("");
  const emailValid = !needsEmail || (email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

  const base = Number(booking.total_price) || 0;

  const tipAmount = (() => {
    if (selectedPct !== null) return Math.round(base * selectedPct) / 100;
    const c = parseFloat(customStr);
    return isNaN(c) || c < 0 ? 0 : c;
  })();

  const total = base + tipAmount;

  const vehicleStr = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model]
    .filter(Boolean).join(" ");

  // Builder bookings show as "Custom Package (Foundation)" on the pay page.
  const rawSvc = booking.service_name ?? "Detailing Service";
  const svcLower = rawSvc.toLowerCase();
  const service = svcLower === "interior detail" ? "Custom Package (Interior)"
    : svcLower === "exterior detail" ? "Custom Package (Exterior)"
    : svcLower === "full detail" ? "Custom Package (Full)"
    : rawSvc;
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
    if (needsEmail && !emailValid) {
      setError("Please enter your email so we can send your receipt.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createPayCheckout({
        bookingId: booking.id,
        tipAmount,
        ...(needsEmail ? { email: email.trim() } : {}),
      });
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5">

        {/* Brand */}
        <div className="text-center space-y-1 pb-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3">
            <Sparkles size={18} className="text-amber-500" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Arise And Shine Detailing</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Premium Mobile Detailing</p>
        </div>

        {/* Hero — greeting + amount */}
        <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.07] to-amber-500/[0.02] px-6 py-7 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-zinc-400 text-sm">Hi {firstName} 👋</p>
            <h1 className="text-xl font-black text-white leading-tight">
              Thanks for choosing us<br />for your {service}
            </h1>
          </div>
          <div className="pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Amount Due</p>
            <p className="text-5xl font-black text-amber-500 tracking-tight">${fmt(base)}</p>
          </div>
        </div>

        {/* Booking details */}
        {(vehicleStr || booking.booking_date) && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.05]">
            {vehicleStr && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Vehicle</span>
                <span className="text-sm text-zinc-200 font-medium">{vehicleStr}</span>
              </div>
            )}
            {booking.booking_date && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Date</span>
                <span className="text-sm text-zinc-200 font-medium">{fmtDate(booking.booking_date)}</span>
              </div>
            )}
            {booking.booking_time && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Time</span>
                <span className="text-sm text-zinc-200 font-medium">{fmtTime(booking.booking_time)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tip section */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-5 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-white">Leave a Tip</p>
            <p className="text-[11px] text-zinc-600">
              Completely optional — never expected, always deeply appreciated 🙏
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
                  className={`rounded-xl py-3.5 text-center transition-all active:scale-95 border ${
                    active
                      ? "bg-amber-500 border-amber-500"
                      : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.05]"
                  }`}
                >
                  <p className={`text-base font-black ${active ? "text-black" : "text-white"}`}>{pct}%</p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${active ? "text-black/60" : "text-zinc-600"}`}>${fmt(amt)}</p>
                </button>
              );
            })}
          </div>

          {/* Custom tip */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold select-none">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={customStr}
              onChange={e => handleCustomChange(e.target.value)}
              placeholder="Custom tip amount"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>

          {/* Live total breakdown */}
          {tipAmount > 0 && (
            <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 px-4 py-3.5 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Service</span>
                <span>${fmt(base)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Tip</span>
                <span>+${fmt(tipAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1.5 border-t border-amber-500/15">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Total</span>
                <span className="text-2xl font-black text-amber-400">${fmt(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Email capture — only shown when no email is on file. Required so
            Stripe can send a receipt and we can match the booking later. */}
        {needsEmail && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Mail size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-black text-white leading-tight">Where should we send your receipt?</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  We don&apos;t have an email on file for this booking. Add one so Stripe can email your receipt — required to complete payment.
                </p>
              </div>
            </div>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-950/70 border border-white/[0.1] focus:border-amber-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
            {error}
          </p>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading || (needsEmail && !emailValid)}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Redirecting…</>
          ) : (
            `Pay $${fmt(total)}`
          )}
        </button>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          <ShieldCheck size={12} className="text-zinc-700" />
          <p className="text-[10px] text-zinc-700">
            Secured by Stripe — your card info never touches our servers
          </p>
        </div>

      </div>
    </div>
  );
}
