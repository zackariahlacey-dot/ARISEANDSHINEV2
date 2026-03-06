"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getProfilePointsByPhone } from "@/app/actions/getProfilePointsByPhone";
import { getSuccessTier } from "@/lib/calculateLifetimeTier";

export interface SuccessModalData {
  confirmationId: string;
  date: string;
  serviceName: string;
  pointsEarned: number;
  firstName: string;
  /** Optional: phone for modal to re-fetch latest points when user is guest */
  phone?: string;
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SuccessModalData | null;
}

const GOLD = "#d4af37";
const CHAMPAGNE = "#f7e7ce";

function fireGoldConfetti() {
  const count = 80;
  const defaults = {
    origin: { y: 0.35 },
    zIndex: 9999,
    colors: [GOLD, CHAMPAGNE, "#c9a227", "#e8d5a3"],
    disableForReducedMotion: true,
  };
  confetti({
    ...defaults,
    particleCount: count * 0.5,
    spread: 100,
    startVelocity: 35,
  });
  confetti({
    ...defaults,
    particleCount: count * 0.4,
    spread: 80,
    angle: 60,
    startVelocity: 45,
  });
  confetti({
    ...defaults,
    particleCount: count * 0.4,
    spread: 80,
    angle: 120,
    startVelocity: 45,
  });
}

const stagger = 0.12;
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * stagger, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

type LiveTier = {
  currentPoints: number;
  tierLabel: string;
  nextTierGoal: number;
  percent: number;
};

export function SuccessModal({ isOpen, onClose, data }: SuccessModalProps) {
  const hasFiredConfetti = useRef(false);
  const [liveTier, setLiveTier] = useState<LiveTier | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && data && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      const t = setTimeout(fireGoldConfetti, 180);
      return () => clearTimeout(t);
    }
    if (!isOpen) hasFiredConfetti.current = false;
  }, [isOpen, data]);

  // Data refresh: fetch absolute latest points from Supabase when modal opens
  useEffect(() => {
    if (!isOpen || !data) {
      setLiveTier(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: row } = await supabase
          .from("profiles")
          .select("reward_points, lifetime_points")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        const lifetime = typeof row?.lifetime_points === "number" ? row.lifetime_points : 0;
        const tierData = getSuccessTier(lifetime);
        setLiveTier({
          currentPoints: lifetime,
          tierLabel: tierData.tierLabel,
          nextTierGoal: tierData.nextTierGoal,
          percent: tierData.percent,
        });
        return;
      }
      if (data.phone?.trim()) {
        getProfilePointsByPhone(data.phone).then((profile) => {
          if (cancelled) return;
          const lifetime = profile.lifetime_points;
          const tierData = getSuccessTier(lifetime);
          setLiveTier({
            currentPoints: lifetime,
            tierLabel: tierData.tierLabel,
            nextTierGoal: tierData.nextTierGoal,
            percent: tierData.percent,
          });
        }).catch(() => { if (!cancelled) setLiveTier(null); });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOpen, data?.phone, data?.confirmationId]);

  if (!isOpen) return null;

  const tier = liveTier;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-label="Booking confirmed"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered panel */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#d4af37]/30 bg-[#09090b] shadow-[0_0_50px_rgba(212,175,55,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-[#d4af37] hover:bg-white/5 transition-colors z-20"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 pt-10 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            {/* 1. Large gold-animated checkmark */}
            <motion.div
              key="checkmark"
              custom={0}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-center mb-5"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37]/50 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 200, damping: 18 },
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-12 h-12 overflow-visible"
                >
                  <motion.path
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            </motion.div>

            {/* 2. Title — Arise And Shine VT */}
            <motion.h2
              key="title"
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-2xl font-serif font-semibold text-white mb-1 tracking-tight"
            >
              Arise And Shine VT
            </motion.h2>
            <motion.p
              key="subtitle"
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-sm text-zinc-400 mb-6"
            >
              Booking Confirmed
            </motion.p>

            {/* 3. XP progress bar: (currentPoints / nextTierGoal) * 100; tier label */}
            {data && (
              <motion.div
                key="xp"
                custom={2}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-xs flex flex-col items-center mb-6"
              >
                <p className="text-sm mb-2.5 font-medium tracking-wide" style={{ color: CHAMPAGNE }}>
                  +{data.pointsEarned} points
                </p>
                {tier != null && (
                  <p
                    className={`text-xs font-semibold tracking-wide mb-2 ${
                      tier.tierLabel === "Silver Member"
                        ? "bg-gradient-to-r from-zinc-400 via-zinc-100 to-zinc-400 bg-clip-text text-transparent"
                        : tier.tierLabel === "Gold Member"
                          ? "text-[#d4af37]"
                          : "text-zinc-400"
                    }`}
                    style={
                      tier.tierLabel === "Silver Member"
                        ? { textShadow: "0 0 24px rgba(192,192,192,0.4)" }
                        : undefined
                    }
                  >
                    {tier.tierLabel}
                  </p>
                )}
                <div className="w-full relative">
                  {/* Bar width = (currentPoints / nextTierGoal) * 100 */}
                  <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.6)]"
                      initial={{ width: "0%" }}
                      animate={{
                        width: tier != null ? `${Math.min(100, tier.percent)}%` : "0%",
                      }}
                      transition={{
                        delay: 0.5,
                        duration: 1.2,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. Details card — refined glassmorphism */}
            {data && (
              <motion.div
                key="details"
                custom={3}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-xs mb-6"
              >
                <div className="rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(212,175,55,0.1)] p-4 text-center">
                  <p className="text-sm text-zinc-300 font-sans">
                    <span className="text-white font-medium">{data.date}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 font-mono">
                    Ref #{data.confirmationId}
                  </p>
                </div>
              </motion.div>
            )}

            {/* 5. View Points — primary button (shimmer + tilt), navigate to /dashboard */}
            <motion.div
              key="cta"
              custom={4}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-center"
            >
              <Button
                variant="primary"
                href="/dashboard"
                onClick={onClose}
              >
                View Points
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
