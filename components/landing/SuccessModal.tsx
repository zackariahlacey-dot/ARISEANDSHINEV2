"use client";

import { useEffect, useRef } from "react";
import { X, Check, Calendar, Award, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";

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
  const count = 100;
  const defaults = {
    origin: { y: 0.4 },
    zIndex: 9999,
    colors: [GOLD, CHAMPAGNE, "#c9a227", "#e8d5a3", "#ffffff"],
    disableForReducedMotion: true,
  };
  confetti({
    ...defaults,
    particleCount: count * 0.6,
    spread: 120,
    startVelocity: 40,
  });
  confetti({
    ...defaults,
    particleCount: count * 0.4,
    spread: 80,
    angle: 60,
    startVelocity: 50,
  });
  confetti({
    ...defaults,
    particleCount: count * 0.4,
    spread: 80,
    angle: 120,
    startVelocity: 50,
  });
}

const stagger = 0.1;
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      delay: i * stagger, 
      duration: 0.5, 
      ease: [0.215, 0.61, 0.355, 1.0] 
    },
  }),
};

export function SuccessModal({ isOpen, onClose, data }: SuccessModalProps) {
  const hasFiredConfetti = useRef(false);

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
      const t = setTimeout(fireGoldConfetti, 300);
      return () => clearTimeout(t);
    }
    if (!isOpen) hasFiredConfetti.current = false;
  }, [isOpen, data]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
    >
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
              onClick={onClose}
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-zinc-900/50 shadow-2xl overflow-hidden backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative Header Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-[#d4af37]/10 to-transparent pointer-events-none" />

              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all z-20"
              >
                <X size={20} />
              </button>

              <div className="p-8 md:p-12 flex flex-col items-center text-center">
                {/* 1. Icon Celebration */}
                <motion.div
                  custom={0}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="relative mb-8"
                >
                  <div className="absolute -inset-4 bg-[#d4af37]/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#d4af37] to-[#f7e7ce] p-[2px]">
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                      <Check size={40} className="text-[#d4af37]" strokeWidth={3} />
                    </div>
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2 text-[#d4af37]"
                  >
                    <Sparkles size={24} fill="currentColor" />
                  </motion.div>
                </motion.div>

                {/* 2. Success Title */}
                <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible">
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                    Booking Confirmed!
                  </h2>
                  <p className="text-zinc-400 text-lg mb-8">
                    We&apos;ve sent a confirmation to your email.
                  </p>
                </motion.div>

                {/* 3. Points Reward Card */}
                {data && (
                  <motion.div
                    custom={2}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full mb-8"
                  >
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#d4af37]/50 to-amber-500/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                      <div className="relative py-6 px-8 rounded-2xl bg-zinc-950/50 border border-[#d4af37]/30 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1">
                          <Award size={16} className="text-[#d4af37]" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Loyalty Reward</span>
                        </div>
                        <div className="text-4xl font-black bg-gradient-to-r from-[#d4af37] via-[#f7e7ce] to-[#d4af37] bg-clip-text text-transparent">
                          +{data.pointsEarned.toLocaleString()} Points
                        </div>
                        <p className="text-xs text-zinc-500 mt-2 font-medium">
                          These will be added to your account after service.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. Booking Summary Grid */}
                {data && (
                  <motion.div
                    custom={3}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 gap-4 w-full mb-10"
                  >
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left">
                      <div className="flex items-center gap-2 text-zinc-500 mb-1">
                        <Calendar size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-200">{data.date}</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left">
                      <div className="flex items-center gap-2 text-zinc-500 mb-1">
                        <User size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ref ID</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-200">#{data.confirmationId}</div>
                    </div>
                  </motion.div>
                )}

                {/* 5. CTA Button */}
                <motion.div
                  custom={4}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="w-full"
                >
                  <Button
                    variant="primary"
                    href="/dashboard"
                    className="w-full py-7 text-lg rounded-2xl bg-[#d4af37] text-zinc-950 hover:bg-amber-400 shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                    onClick={onClose}
                  >
                    Go to My Dashboard
                  </Button>
                  <p className="mt-4 text-xs text-zinc-600 font-medium">
                    Questions? Call us at <span className="text-zinc-400">802-585-5563</span>
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
