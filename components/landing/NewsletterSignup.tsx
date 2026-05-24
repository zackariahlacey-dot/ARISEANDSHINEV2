"use client";

import { useState, useTransition } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { subscribeToNewsletter } from "@/app/actions/subscribeToNewsletter";

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isPending) return;
    startTransition(async () => {
      const result = await subscribeToNewsletter({ email, source });
      if (result.success) {
        setStatus("success");
        setMessage(result.alreadySubscribed ? "You're already on the list — thanks!" : "You're in. Watch your inbox.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(result.error);
      }
    });
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-4 py-3 text-sm text-[#D4AF37]">
        <Check size={16} className="shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Detailing tips · Seasonal promos</p>
        <p className="text-sm text-zinc-400 mb-2">Free guide to keeping your car spotless through Vermont winters.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 focus-within:border-[#D4AF37]/40 transition-colors">
          <Mail size={14} className="shrink-0 text-zinc-600" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="you@email.com"
            disabled={isPending}
            className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-black text-zinc-950 transition-all hover:bg-[#F3E5AB] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : "Subscribe"}
        </button>
      </div>
      {status === "error" && message && (
        <p className="mt-2 text-center text-xs text-red-400">{message}</p>
      )}
      <p className="mt-2 text-center text-[10px] text-zinc-600">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
