"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Check, Loader2, Mail, User, CreditCard } from "lucide-react";
import { purchaseGiftCard } from "@/app/actions/purchaseGiftCard";
import { cn } from "@/lib/utils";

const AMOUNTS = [25, 50, 75, 100, 150, 200];

export default function GiftCardsPage() {
  const [amount, setAmount] = useState<number>(75);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = useCustom ? Number(customAmount) || 0 : amount;

  const handleCheckout = async () => {
    setError(null);
    if (effectiveAmount < 10) {
      setError("Minimum gift card amount is $10.");
      return;
    }
    if (!purchaserEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    const origin = window.location.origin;
    const result = await purchaseGiftCard({
      amount: effectiveAmount,
      purchaserEmail: purchaserEmail.trim().toLowerCase(),
      recipientEmail: recipientEmail.trim().toLowerCase() || undefined,
      recipientName: recipientName.trim() || undefined,
      successUrl: `${origin}/gift-cards?success=1`,
      cancelUrl: `${origin}/gift-cards`,
    });
    setLoading(false);

    if (result.success) {
      window.location.href = result.checkoutUrl;
    } else {
      setError(result.error);
    }
  };

  // Show success state
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("success") === "1") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto">
            <Check size={28} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-100">Gift Card Purchased!</h1>
            <p className="text-sm text-zinc-500 mt-2">
              The gift card code will be emailed to you shortly. It can be used at checkout on any detailing service.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-black text-zinc-950"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-10 pb-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-1.5">Arise &amp; Shine VT</p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100">Gift Cards</h1>
          <p className="text-sm text-zinc-500 mt-1">Give the gift of a spotless vehicle. Codes are delivered by email instantly after purchase.</p>
        </div>

        <div className="space-y-5">
          {/* Amount picker */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm p-5 space-y-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500">Choose amount</p>

            <div className="grid grid-cols-3 gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAmount(a); setUseCustom(false); }}
                  className={cn(
                    "rounded-xl border py-3 text-sm font-black transition-all",
                    !useCustom && amount === a
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                      : "border-white/[0.08] text-zinc-400 hover:border-white/20"
                  )}
                >
                  ${a}
                </button>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={cn(
                  "w-full rounded-xl border py-2.5 text-xs font-black transition-all mb-2",
                  useCustom ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]" : "border-white/[0.06] text-zinc-600 hover:border-white/20 hover:text-zinc-400"
                )}
              >
                Custom amount
              </button>
              {useCustom && (
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount (min $10)"
                  min={10}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Recipient info */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm p-5 space-y-3">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500">Recipient (optional)</p>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3">
              <User size={14} className="text-zinc-600 shrink-0" />
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient's name"
                className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3">
              <Mail size={14} className="text-zinc-600 shrink-0" />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Recipient's email (to notify them)"
                className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Your email */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm p-5 space-y-3">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500">Your email (for the code)</p>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3">
              <Mail size={14} className="text-zinc-600 shrink-0" />
              <input
                type="email"
                value={purchaserEmail}
                onChange={(e) => setPurchaserEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading || effectiveAmount < 10 || !purchaserEmail.trim()}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#D4AF37] py-4 text-base font-black text-zinc-950 transition-all hover:bg-[#e6c84a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <CreditCard size={18} />
                Buy ${effectiveAmount || "—"} Gift Card
              </>
            )}
          </button>

          <p className="text-center text-xs text-zinc-600">
            Powered by Stripe · Gift cards never expire
          </p>
        </div>
      </div>
    </div>
  );
}
