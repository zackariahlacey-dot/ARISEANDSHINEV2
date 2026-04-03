"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Car, Anchor, Truck } from "lucide-react";

const FLOWS = [
  {
    href: "/detailing",
    icon: Car,
    title: "My Vehicle",
    desc: "Cars, trucks, SUVs & vans — interior, exterior, full & ultimate packages",
    border: "border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.04]",
    iconColor: "text-[#D4AF37]",
    iconBg: "bg-[#D4AF37]/10",
    badge: null,
  },
  {
    href: "/boat-detailing",
    icon: Anchor,
    title: "My Boat",
    desc: "Powerboats, pontoons, sailboats & center consoles — per-foot pricing from $18/ft",
    border: "border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/[0.04]",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    badge: "15 ft min",
  },
  {
    href: "/rv-detailing",
    icon: Truck,
    title: "My RV / Motorhome",
    desc: "Class A/B/C motorhomes, travel trailers, fifth wheels & camper vans — from $12/ft",
    border: "border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    badge: "20 ft min",
  },
] as const;

interface BookingFlowSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookingFlowSelector({ isOpen, onClose }: BookingFlowSelectorProps) {
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

              <div className="px-5 pb-4 pt-1">
                <p className="text-center text-[11px] text-zinc-600">
                  Questions?{" "}
                  <a href="tel:8025855563" className="text-zinc-400 hover:text-white transition-colors">
                    Call 802-585-5563
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
