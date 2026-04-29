"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Zap, ShieldCheck, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { getTier, LOYALTY_TIERS } from "@/lib/loyalty";

const STORAGE_KEY = "loyalty_last_seen_tier";

function fireTierConfetti() {
  const gold = "#D4AF37";
  const opts = { origin: { y: 0.45 }, zIndex: 9999, disableForReducedMotion: true,
    colors: [gold, "#F3E5AB", "#c9a227", "#ffffff"] };
  confetti({ ...opts, particleCount: 80, spread: 70, origin: { x: 0.2, y: 0.5 }, startVelocity: 50 });
  confetti({ ...opts, particleCount: 80, spread: 70, origin: { x: 0.8, y: 0.5 }, startVelocity: 50 });
  setTimeout(() =>
    confetti({ ...opts, particleCount: 60, spread: 120, startVelocity: 25, gravity: 0.8 }), 250);
}

const TIER_ICONS: Record<string, React.ElementType> = {
  VIP:    Trophy,
  Gold:   Zap,
  Silver: ShieldCheck,
  Member: Star,
};

export function LevelUpConfetti({ completedDetailCount }: { completedDetailCount: number }) {
  const [show, setShow] = useState(false);
  const [tierLabel, setTierLabel] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || typeof window === "undefined") return;
    fired.current = true;

    const currentTier = getTier(completedDetailCount);
    if (!currentTier) return;

    const lastSeen = localStorage.getItem(STORAGE_KEY) ?? "";
    if (lastSeen === currentTier.label) return;

    // Check if this is an actual upgrade (not just first visit)
    const tierOrder = ["Member", "Silver", "Gold", "VIP"];
    const lastIdx    = tierOrder.indexOf(lastSeen);
    const currentIdx = tierOrder.indexOf(currentTier.label);

    // Always save new tier
    localStorage.setItem(STORAGE_KEY, currentTier.label);

    // Only show animation if we've moved up (or it's the first time we see a tier)
    if (currentIdx > lastIdx || lastSeen === "") {
      setTierLabel(currentTier.label);
      setDiscountPct(currentTier.pct);
      setShow(true);
      fireTierConfetti();
      setTimeout(() => setShow(false), 7000);
    }
  }, [completedDetailCount]);

  const Icon = TIER_ICONS[tierLabel] ?? Star;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[98] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.12) 0%, transparent 70%)" }}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -16,  scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[99] w-[calc(100vw-2rem)] max-w-sm"
          >
            <div
              className="relative rounded-2xl border border-[#D4AF37]/40 bg-zinc-950/95 backdrop-blur-xl px-5 py-5 shadow-[0_0_40px_rgba(212,175,55,0.2)]"
            >
              {/* Gold top shimmer */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent rounded-t-2xl" />

              <button
                type="button"
                onClick={() => setShow(false)}
                className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={13} />
              </button>

              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 18 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#AA771C] flex items-center justify-center shrink-0 shadow-lg shadow-[#D4AF37]/30"
                >
                  <Icon size={22} className="text-zinc-900" />
                </motion.div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D4AF37]/70 mb-0.5"
                  >
                    Tier Unlocked
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-lg font-black text-white leading-tight"
                  >
                    {tierLabel} Member 🎉
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-[11px] text-zinc-400 mt-0.5"
                  >
                    You now get <span className="text-white font-bold">{discountPct}% off</span> every vehicle detail — forever.
                  </motion.p>
                </div>
              </div>

              {/* Tier ladder */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 flex gap-1.5"
              >
                {LOYALTY_TIERS.slice().reverse().map((t) => {
                  const active = t.label === tierLabel;
                  const order  = ["Member","Silver","Gold","VIP"];
                  const past   = order.indexOf(t.label) < order.indexOf(tierLabel);
                  return (
                    <div
                      key={t.label}
                      className={`flex-1 text-center py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                        active ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37] scale-105" :
                        past   ? "bg-white/[0.04] border-white/[0.08] text-zinc-500" :
                                 "bg-white/[0.02] border-white/[0.04] text-zinc-700"
                      }`}
                    >
                      {t.label}
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
