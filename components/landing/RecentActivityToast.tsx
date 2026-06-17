"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Anchor, Truck, Star } from "lucide-react";

type EntryType = "auto" | "boat" | "rv" | "club";

const ENTRIES: { city: string; action: string; type: EntryType }[] = [
  { city: "Williston",       action: "Full Detail booked",            type: "auto" },
  { city: "Burlington",      action: "Interior Detail booked",        type: "auto" },
  { city: "Essex",           action: "Exterior Detail booked",        type: "auto" },
  { city: "South Burlington",action: "Full Detail booked",            type: "auto" },
  { city: "Colchester",      action: "Interior Detail booked",        type: "auto" },
  { city: "Shelburne",       action: "Full Detail booked",            type: "auto" },
  { city: "Stowe",           action: "Exterior Detail booked",        type: "auto" },
  { city: "Hinesburg",       action: "Exterior Detail booked",        type: "auto" },
  { city: "Essex Jct",       action: "Interior Detail booked",        type: "auto" },
  { city: "Williston",       action: "Maintenance Club joined",       type: "club" },
  { city: "Burlington",      action: "Maintenance Club joined",       type: "club" },
  { city: "Winooski",        action: "Maintenance Club joined",       type: "club" },
  { city: "Richmond",        action: "Boat Full Detail booked",       type: "boat" },
  { city: "Charlotte",       action: "Boat Exterior booked",          type: "boat" },
  { city: "Milton",          action: "RV Exterior booked",            type: "rv"   },
  { city: "Shelburne",       action: "Boat Interior booked",          type: "boat" },
];

const TYPE_CONFIG: Record<EntryType, { icon: React.ElementType; iconColor: string; iconBg: string; iconBorder: string }> = {
  auto: { icon: Car,    iconColor: "text-[#D4AF37]",   iconBg: "bg-[#D4AF37]/10",    iconBorder: "border-[#D4AF37]/20"    },
  boat: { icon: Anchor, iconColor: "text-blue-400",    iconBg: "bg-blue-500/10",     iconBorder: "border-blue-500/20"     },
  rv:   { icon: Truck,  iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10",  iconBorder: "border-emerald-500/20"  },
  club: { icon: Star,   iconColor: "text-violet-400",  iconBg: "bg-violet-500/10",   iconBorder: "border-violet-500/20"   },
};

const VISIBLE_MS  = 4800;
const MIN_WAIT_MS = 22000;
const MAX_WAIT_MS = 44000;
const FIRST_MS    = 7000;

function pickNext(lastIdx: number) {
  let idx: number;
  do { idx = Math.floor(Math.random() * ENTRIES.length); }
  while (idx === lastIdx);
  return { entry: ENTRIES[idx], idx };
}

function minsAgo(): string {
  const n = Math.floor(Math.random() * 8) + 1;
  return n === 1 ? "just now" : `${n}m ago`;
}

export function RecentActivityToast({ paused = false }: { paused?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [entry,   setEntry]   = useState(ENTRIES[0]);
  const [timeAgo, setTimeAgo] = useState("just now");

  const lastIdxRef = useRef(-1);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (nextTimer.current) { clearTimeout(nextTimer.current); nextTimer.current = null; }
  }, []);

  const show = useCallback(() => {
    const { entry: next, idx } = pickNext(lastIdxRef.current);
    lastIdxRef.current = idx;
    setEntry(next);
    setTimeAgo(minsAgo());
    setVisible(true);

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      const wait = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
      nextTimer.current = setTimeout(show, wait);
    }, VISIBLE_MS);
  }, []);

  useEffect(() => {
    if (paused) { clearAll(); setVisible(false); return; }
    const t = setTimeout(show, FIRST_MS);
    return () => { clearTimeout(t); clearAll(); };
  }, [paused, show, clearAll]);

  const cfg  = TYPE_CONFIG[entry.type];
  const Icon = cfg.icon;

  return (
    <div
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-5 md:translate-x-0 z-[60] pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={`${entry.city}-${entry.action}`}
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 6,  scale: 0.97, transition: { duration: 0.2, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-zinc-950/95 backdrop-blur-md px-3.5 py-3 shadow-2xl shadow-black/50 w-[88vw] max-w-[290px]"
          >
            {/* Service icon */}
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.iconBg} ${cfg.iconBorder}`}>
              <Icon size={15} className={cfg.iconColor} />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-white leading-tight">
                {entry.action}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-500">{entry.city}, VT</span>
                <span className="w-px h-2.5 bg-zinc-800 rounded-full" />
                <span className="text-[10px] text-zinc-600">{timeAgo}</span>
              </div>
            </div>

            {/* Live dot */}
            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_1px_rgba(16,185,129,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
