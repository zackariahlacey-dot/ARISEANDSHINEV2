"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

const ENTRIES = [
  { text: "Someone in Williston booked a Full Detail",           type: "book" },
  { text: "Someone in Burlington booked an Interior Detail",     type: "book" },
  { text: "Someone in Essex booked an Exterior Detail",          type: "book" },
  { text: "Someone in South Burlington booked a Full Detail",    type: "book" },
  { text: "Someone in Colchester booked an Interior Detail",     type: "book" },
  { text: "Someone in Shelburne booked a Full Detail",           type: "book" },
  { text: "Someone in Stowe booked an Exterior Detail",          type: "book" },
  { text: "Someone in Winooski joined the Maintenance Club",     type: "club" },
  { text: "Someone in Burlington joined the Maintenance Club",   type: "club" },
  { text: "Someone in Richmond booked a Boat Full Detail",       type: "book" },
  { text: "Someone in Charlotte booked a Boat Exterior",         type: "book" },
  { text: "Someone in Milton booked an RV Exterior Refresh",     type: "book" },
  { text: "Someone in Hinesburg booked an Exterior Detail",      type: "book" },
  { text: "Someone in Essex Jct booked an Interior Detail",      type: "book" },
];

const VISIBLE_MS  = 4500;
const MIN_WAIT_MS = 22000;
const MAX_WAIT_MS = 42000;
const FIRST_MS    = 6000;

function pickNext(lastIdx: number): { entry: typeof ENTRIES[0]; idx: number } {
  let idx: number;
  do { idx = Math.floor(Math.random() * ENTRIES.length); }
  while (idx === lastIdx);
  return { entry: ENTRIES[idx], idx };
}

function minsAgo(): string {
  const n = Math.floor(Math.random() * 9) + 1;
  return n === 1 ? "just now" : `${n} min ago`;
}

export function RecentActivityToast({ paused = false }: { paused?: boolean }) {
  const [visible, setVisible]   = useState(false);
  const [entry,   setEntry]     = useState(ENTRIES[0]);
  const [timeAgo, setTimeAgo]   = useState("just now");
  const lastIdxRef  = useRef(-1);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Start / stop based on paused
  useEffect(() => {
    if (paused) {
      clearAll();
      setVisible(false);
      return;
    }
    const t = setTimeout(show, FIRST_MS);
    return () => { clearTimeout(t); clearAll(); };
  }, [paused, show, clearAll]);

  return (
    <div
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-[60] pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={entry.text}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 8,  scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/40 w-[88vw] max-w-[320px]"
          >
            {/* Icon */}
            <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Check size={13} strokeWidth={2.5} className="text-emerald-400" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-zinc-200 leading-snug truncate">
                {entry.text}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
