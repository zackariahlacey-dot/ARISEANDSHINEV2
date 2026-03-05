"use client";

import { useState } from "react";
import { Copy, Check, Users, Gift, Sparkles } from "lucide-react";

const SITE_URL = "https://ariseandshinevt.com";

interface ReferAndEarnCardProps {
  /** From Supabase profiles.referral_code — not local state */
  referralCode: string | null | undefined;
}

export function ReferAndEarnCard({ referralCode }: ReferAndEarnCardProps) {
  const [copied, setCopied] = useState(false);
  const linkRef = referralCode
    ? `https://ariseandshinevt.com/auth/sign-up?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    const textToCopy = `https://ariseandshinevt.com/auth/sign-up?ref=${referralCode ?? ""}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const el = document.createElement("textarea");
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/80 backdrop-blur-sm p-6 md:p-8">
      {/* Subtle gold glow corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
          <Users size={20} className="text-[#D4AF37]" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37] mb-0.5">
            Refer &amp; Earn
          </p>
          <h3 className="text-lg font-bold text-zinc-100">
            Share &amp; get rewarded
          </h3>
        </div>
      </div>

      {/* Value prop */}
      <div className="flex items-start gap-3 mb-6 bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-xl p-4">
        <Sparkles size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-300 leading-relaxed">
          Give your friend{" "}
          <span className="text-white font-semibold">10% off</span> their first
          detail — you earn{" "}
          <span className="text-[#D4AF37] font-semibold">
            200 points ($20 value)
          </span>{" "}
          when they book.
        </p>
      </div>

      {/* Your code badge — displays profile.referral_code from DB */}
      <div className="flex items-center gap-2 mb-3">
        <Gift size={13} className="text-zinc-500" />
        <span className="text-xs text-zinc-500 tracking-wide">
          Your referral code:{" "}
          <span className="text-[#D4AF37] font-bold font-mono tracking-widest">
            {referralCode ?? "Loading..."}
          </span>
        </span>
      </div>

      {/* Link + copy button — dynamic link from profile.referral_code */}
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0 flex items-center bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2.5 overflow-hidden">
          <span className="text-xs text-zinc-400 truncate font-mono">
            {linkRef || "https://ariseandshinevt.com/auth/sign-up?ref="}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!referralCode}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all
            bg-white text-zinc-950 hover:bg-zinc-100 hover:shadow-[0_0_18px_rgba(212,175,55,0.25)]
            active:scale-95 disabled:opacity-60"
          aria-label="Copy referral link"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Toast */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full
          bg-zinc-800 border border-white/10 text-sm text-white shadow-lg
          transition-all duration-300 ${copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
        aria-live="polite"
      >
        <Check size={13} className="text-green-400" />
        Link copied to clipboard
      </div>
    </div>
  );
}
