"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Car, Sparkles, Zap } from "lucide-react";

const FLOWS = [
  {
    href: "/detailing",
    icon: Car,
    title: "Auto Detailing",
    desc: "Basic · The Refresh · The Reset — Interior, Exterior, or Full",
    border: "border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.04]",
    iconColor: "text-[#D4AF37]",
    iconBg: "bg-[#D4AF37]/10",
    badge: null,
  },
  {
    href: "/paint-correction",
    icon: Sparkles,
    title: "Paint Correction",
    desc: "1-Step, 2-Step machine polish + Premium Ceramic coating",
    border: "border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.04]",
    iconColor: "text-[#D4AF37]",
    iconBg: "bg-[#D4AF37]/10",
    badge: "Premium",
  },
] as const;

interface BookingFlowSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSqueeze?: () => void;
}

export function BookingFlowSelector({ isOpen, onClose, onSqueeze }: BookingFlowSelectorProps) {
  const router = useRouter();

  const handleSelect = (href: string) => {
    onClose();
    router.push(`${href}?book=1`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="bfs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            key="bfs-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-sm mx-auto"
          >
            <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-start justify-between">
                <div>
                  <h2 className="text-base font-black text-white">What are you booking?</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Choose your service type to get started</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors -mt-0.5 ml-2 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Flow options */}
              <div className="p-3 space-y-2">
                {FLOWS.map(({ href, icon: Icon, title, desc, border, iconColor, iconBg, badge }) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => handleSelect(href)}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 active:scale-[0.99] ${border}`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={17} className={iconColor} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{title}</span>
                        {badge && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded-md border border-white/[0.06]">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-3 pb-3 pt-0 space-y-2">
                {onSqueeze && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onSqueeze(); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 text-[11px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all active:scale-[0.99]"
                  >
                    <Zap size={12} />
                    Need it urgently? Squeeze Me In
                  </button>
                )}
                <p className="text-center text-[11px] text-zinc-600">
                  Questions?{" "}
                  <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                    Call 
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
