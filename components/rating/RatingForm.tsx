"use client";

import { useState } from "react";
import { Star, Loader2, Check, ThumbsUp, ThumbsDown, Copy } from "lucide-react";
import { submitRating } from "@/app/actions/customerRating";

export function RatingForm({
  token,
  contractorFirstName,
}: {
  token: string;
  contractorFirstName: string | null;
}) {
  const [overall, setOverall]   = useState(0);
  const [attitude, setAttitude] = useState(0);
  const [comments, setComments] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = overall > 0 && attitude > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const r = await submitRating({
      token,
      overallStars: overall,
      attitudeStars: attitude,
      comments,
      recommend: recommend ?? undefined,
    });
    setSubmitting(false);
    if (!r.ok) { setError(r.error ?? "Submission failed."); return; }
    setCoupon(r.couponCode ?? null);
  };

  if (coupon) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 mb-3">
          <Check size={26} className="text-emerald-400" strokeWidth={3} />
        </div>
        <p className="text-lg font-black text-white">Thanks for the rating!</p>
        <p className="text-[12px] text-zinc-400 mt-1">Here&apos;s your $15-off code for your next detail:</p>

        <div className="mt-5 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] p-5 mx-auto inline-block">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/70 mb-1">Your code</p>
          <p className="text-2xl font-black tracking-wider text-white tabular-nums select-all">{coupon}</p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(coupon);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/40 text-[10px] font-black uppercase tracking-wider text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy code</>}
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 mt-5 leading-relaxed">
          Apply at checkout when you book your next detail. Good for 60 days, single use.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-[11px] text-[#D4AF37] font-bold hover:underline"
        >
          Book another detail →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Overall detail quality</p>
        <StarRow value={overall} onChange={setOverall} />
        <p className="text-[10px] text-zinc-600 text-center mt-1.5">
          {overall === 0 ? "Tap a star" : overall === 5 ? "Wow — exceptional" : overall === 4 ? "Great" : overall === 3 ? "Decent" : overall === 2 ? "Below expectations" : "Disappointing"}
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          Your detailer's attitude{contractorFirstName ? ` (${contractorFirstName})` : ""}
        </p>
        <StarRow value={attitude} onChange={setAttitude} />
        <p className="text-[10px] text-zinc-600 text-center mt-1.5">
          {attitude === 0 ? "Tap a star" : attitude === 5 ? "Couldn't have been better" : attitude === 4 ? "Polite and professional" : attitude === 3 ? "Did the job" : attitude === 2 ? "Could improve" : "Unprofessional"}
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Would you book us again?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRecommend(true)}
            className={`py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              recommend === true ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-white/[0.06] text-zinc-400"
            }`}
          ><ThumbsUp size={13} /> Yes</button>
          <button
            type="button"
            onClick={() => setRecommend(false)}
            className={`py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              recommend === false ? "border-rose-500/50 bg-rose-500/15 text-rose-300" : "border-white/[0.06] text-zinc-400"
            }`}
          ><ThumbsDown size={13} /> No</button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Any comments? (optional)</p>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          placeholder="What stood out? What could we do better?"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2.5">
          <p className="text-[12px] text-rose-300">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.97] inline-flex items-center justify-center gap-2 ${
          canSubmit
            ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.3)]"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
        Submit & get $15 off
      </button>

      <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
        Your $15-off coupon appears on the next screen. Single use, 60-day expiry.
      </p>
    </div>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  return (
    <div className="flex items-center justify-center gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="p-1.5 transition-transform active:scale-90"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            size={32}
            className={n <= display ? "text-[#D4AF37] fill-[#D4AF37]" : "text-zinc-700"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
