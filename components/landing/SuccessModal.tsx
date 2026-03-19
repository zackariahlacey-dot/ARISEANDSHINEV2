"use client";

import { useEffect, useRef } from "react";
import { X, Check, Calendar, Award, User, Sparkles, MapPin, Smartphone, ArrowRight, Gift, Trophy } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
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
  const count = 150;
  const defaults = {
    origin: { y: 0.5 },
    zIndex: 9999,
    colors: [GOLD, CHAMPAGNE, "#c9a227", "#e8d5a3", "#ffffff"],
    disableForReducedMotion: true,
  };
  
  // Side bursts
  confetti({
    ...defaults,
    particleCount: count * 0.4,
    spread: 70,
    origin: { x: 0.2, y: 0.6 },
    startVelocity: 45,
  });
  confetti({
    ...defaults,
    particleCount: count * 0.4,
    spread: 70,
    origin: { x: 0.8, y: 0.6 },
    startVelocity: 45,
  });
  
  // Center fountain
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: count * 0.5,
      spread: 120,
      startVelocity: 35,
      gravity: 0.8,
    });
  }, 200);
}

const stagger = 0.08;
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      delay: 0.15 + (i * stagger), 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1] as const
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
      const t = setTimeout(fireGoldConfetti, 400);
      return () => clearTimeout(t);
    }
    if (!isOpen) hasFiredConfetti.current = false;
  }, [isOpen, data]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop with sophisticated gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/95 backdrop-blur-xl"
            onClick={onClose}
          >
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
          </motion.div>

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-xl bg-zinc-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
            
            {/* Close button with better contrast/hover */}
            <button
              onClick={onClose}
              className="absolute top-8 right-8 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-[#d4af37]/20 border border-white/5 transition-all z-20 group"
            >
              <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <div className="w-full p-8 sm:p-12 md:p-14 flex flex-col items-center text-center">
              
              {/* 1. Icon Celebration */}
              <motion.div
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="relative mb-10"
              >
                <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-3xl opacity-20 animate-pulse" />
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#d4af37] to-[#AA771C] p-0.5 shadow-[0_0_40px_rgba(212,175,55,0.3)]">
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                    <Check size={48} className="text-[#d4af37]" strokeWidth={3.5} />
                  </div>
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles size={32} className="text-[#d4af37] drop-shadow-lg" fill="currentColor" />
                </motion.div>
              </motion.div>

              {/* 2. Success Title */}
              <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible" className="mb-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 uppercase italic tracking-tight leading-none">
                  Booking <span className="text-[#d4af37]">Confirmed!</span>
                </h2>
                <p className="text-zinc-400 text-sm sm:text-base font-medium max-w-sm mx-auto">
                  Excellent choice, {data?.firstName || "there"}. We&apos;ve sent your confirmation details to your email.
                </p>
              </motion.div>

              {/* 3. Main Reward & Summary Combined Card */}
              {data && (
                <motion.div
                  custom={2}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="w-full space-y-4 mb-10"
                >
                  {/* Reward Pill */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#d4af37]/30 to-amber-500/30 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-700" />
                    <div className="relative p-8 rounded-[2rem] bg-zinc-950/60 border border-[#d4af37]/30 shadow-inner overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                        <Trophy size={80} className="text-[#d4af37]" />
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Gift size={16} className="text-[#d4af37] animate-bounce" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Loyalty Reward Earned</span>
                        </div>
                        <div className="text-5xl font-black bg-gradient-to-r from-[#d4af37] via-[#f7e7ce] to-[#d4af37] bg-clip-text text-transparent tracking-tighter">
                          +{data.pointsEarned.toLocaleString()} <span className="text-2xl">PTS</span>
                        </div>
                        <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                          <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                            Available after service completion
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950/40 rounded-2xl p-5 border border-white/5 text-left group hover:border-[#d4af37]/20 transition-colors">
                      <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Calendar size={14} className="group-hover:text-[#d4af37] transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Arrival Date</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-200">{data.date}</div>
                    </div>
                    <div className="bg-zinc-950/40 rounded-2xl p-5 border border-white/5 text-left group hover:border-[#d4af37]/20 transition-colors">
                      <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <User size={14} className="group-hover:text-[#d4af37] transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Booking ID</span>
                      </div>
                      <div className="text-sm font-bold text-zinc-200">#{data.confirmationId}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. CTA Actions */}
              <motion.div
                custom={3}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="w-full space-y-5"
              >
                <button
                  onClick={onClose}
                  className="btn-primary-gold-shimmer w-full bg-[#d4af37] text-zinc-950 hover:scale-[1.02] py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-[0_10px_40px_rgba(212,175,55,0.2)]"
                >
                  RETURN TO HOME
                  <ArrowRight size={22} strokeWidth={3} />
                </button>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    <Smartphone size={12} />
                    Support: <span className="text-zinc-400">802-585-5563</span>
                  </div>
                  <span className="hidden sm:block text-zinc-800 text-xs">•</span>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    <MapPin size={12} />
                    VT-Owned & Operated
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
