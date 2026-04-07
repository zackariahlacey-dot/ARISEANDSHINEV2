"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Search, Loader2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { checkGiftCardBalance } from "@/app/actions/validateGiftCard";
import type { GiftCardBalanceResult } from "@/app/actions/validateGiftCard";

function formatCode(raw: string) {
  const clean = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 16);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) parts.push(clean.slice(i, i + 4));
  return parts.join("-");
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return "No expiry";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function GiftCardBalancePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GiftCardBalanceResult | null>(null);

  const handleCheck = async () => {
    const clean = code.replace(/\s/g, "");
    if (clean.length < 4) return;
    setLoading(true);
    setResult(null);
    const res = await checkGiftCardBalance(clean);
    setResult(res);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCheck();
  };

  const pct =
    result?.found
      ? Math.round((result.remainingBalance / result.initialAmount) * 100)
      : 0;

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-10 pb-20">
        <Link
          href="/gift-cards"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Gift Cards
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-1.5">
            Gift Card
          </p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">Check Balance</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Enter your gift card code to see the remaining balance.
          </p>
        </div>

        {/* Input card */}
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm p-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500 mb-2">
              Gift Card Code
            </p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3">
                <Gift size={14} className="text-zinc-600 shrink-0" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off"
                  name="gift-card-balance-x"
                  spellCheck={false}
                  className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none tracking-widest font-mono uppercase"
                />
              </div>
              <button
                type="button"
                onClick={handleCheck}
                disabled={loading || code.replace(/\D/g, "").length < 4}
                className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-black text-zinc-950 transition-all hover:bg-[#e6c84a] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Check
              </button>
            </div>
          </div>

          {/* Error state */}
          {result && !result.found && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2 text-sm text-zinc-400">
              <AlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
              {result.error}
            </div>
          )}
        </div>

        {/* Result card */}
        {result?.found && (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                <Gift size={18} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-500">
                  Gift Card
                </p>
                <p className="text-sm font-mono font-bold text-zinc-300 tracking-wider">
                  {result.code}
                </p>
              </div>
              {result.isActive && !result.isExpired && result.remainingBalance > 0 && (
                <CheckCircle2 size={18} className="ml-auto text-emerald-400 shrink-0" />
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Balance display */}
              <div className="text-center py-2">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-zinc-600 mb-1">
                  Remaining Balance
                </p>
                <p className="text-5xl font-black text-[#D4AF37]">
                  ${result.remainingBalance.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  of ${result.initialAmount.toFixed(2)} original value
                </p>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#e6c84a] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Status rows */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Status</span>
                  {!result.isActive ? (
                    <span className="text-zinc-600 font-semibold">Deactivated</span>
                  ) : result.isExpired ? (
                    <span className="text-red-400 font-semibold">Expired</span>
                  ) : result.remainingBalance <= 0 ? (
                    <span className="text-zinc-600 font-semibold">Fully Redeemed</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Active</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Expires</span>
                  <span className={result.isExpired ? "text-red-400 font-semibold" : "text-zinc-300"}>
                    {formatExpiry(result.expiresAt)}
                  </span>
                </div>
              </div>

              {/* CTA */}
              {result.isActive && !result.isExpired && result.remainingBalance > 0 && (
                <Link
                  href="/#services"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#D4AF37] text-zinc-950 text-sm font-black hover:bg-[#e6c84a] transition-colors"
                >
                  Book a Detail <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Buy another */}
        <div className="mt-6 text-center">
          <Link
            href="/gift-cards"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-[#D4AF37] transition-colors"
          >
            Buy a gift card <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
