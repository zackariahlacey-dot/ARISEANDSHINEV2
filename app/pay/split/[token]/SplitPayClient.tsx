"use client";

import { useState } from "react";
import { Loader2, Sparkles, ShieldCheck, Mail, Users } from "lucide-react";
import { createSplitCheckout } from "@/app/actions/createSplitCheckout";

interface Props {
  split: {
    pay_token:       string;
    recipient_email: string | null;
    recipient_name:  string | null;
    amount:          number;
  };
  booking: {
    id: string;
    service_name: string | null;
    customer_name: string | null;
    vehicle_year: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    booking_date: string | null;
    booking_time: string | null;
  };
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
  catch { return d; }
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function SplitPayClient({ split, booking }: Props) {
  const needsEmail = !split.recipient_email?.trim();
  const [email, setEmail] = useState(split.recipient_email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canPay = emailValid;

  const customerFirst = booking.customer_name?.split(" ")[0] ?? "your friend";
  const recipientFirst = split.recipient_name?.split(" ")[0] ?? "there";
  const vehicleStr = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ");
  const service = booking.service_name ?? "Detailing Service";

  async function handlePay() {
    if (!canPay) { setError("Please enter a valid email so we can send your receipt."); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await createSplitCheckout({
        payToken: split.pay_token,
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      if ("url" in r) window.location.href = r.url;
      else {
        setError(r.error ?? "Something went wrong. Please try again.");
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Split Invoice</p>
        </div>

        {/* Hero — greeting + share */}
        <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.07] to-amber-500/[0.02] px-6 py-7 text-center space-y-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1 mb-2">
              <Users size={11} /> Split Payment
            </div>
            <p className="text-zinc-400 text-sm">Hi {recipientFirst} 👋</p>
            <h1 className="text-xl font-black text-white leading-tight">
              You&apos;re covering part of {customerFirst}&apos;s detail
            </h1>
          </div>
          <div className="pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Your Share</p>
            <p className="text-5xl font-black text-amber-500 tracking-tight">${fmt(split.amount)}</p>
          </div>
        </div>

        {/* Booking details */}
        {(vehicleStr || booking.booking_date) && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Service</span>
              <span className="text-sm text-zinc-200 font-medium">{service}</span>
            </div>
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

        {/* Email — confirm / correct */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Mail size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-black text-white leading-tight">
                {needsEmail ? "Where should we send your receipt?" : "Send receipt to"}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Stripe emails the receipt to this address. Correct it if it&apos;s wrong before you pay.
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

        {error && (
          <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
            {error}
          </p>
        )}

        <button
          onClick={handlePay}
          disabled={loading || !canPay}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Redirecting…</> : `Pay $${fmt(split.amount)}`}
        </button>

        <div className="flex items-center justify-center gap-1.5 pb-2">
          <ShieldCheck size={12} className="text-zinc-700" />
          <p className="text-[10px] text-zinc-700">Secured by Stripe — your card info never touches our servers.</p>
        </div>
      </div>
    </div>
  );
}
