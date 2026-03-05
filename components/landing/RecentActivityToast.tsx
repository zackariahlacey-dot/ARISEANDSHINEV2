"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

const bookings = [
  "Someone in Williston just booked a Full Detail",
  "Someone in Burlington just joined the Maintenance Club",
  "Someone in Essex just booked an Interior Detail",
  "Someone in Stowe just booked an Exterior Detail",
  "Someone in South Burlington just booked a Full Detail",
  "Someone in Colchester just booked a Full Detail",
  "Someone in Winooski just joined the Maintenance Club",
  "Someone in Shelburne just booked an Interior Detail",
  "Someone in Burlington just booked an Exterior Detail",
];

const VISIBLE_DURATION_MS = 4000;
const MIN_INTERVAL_MS = 15000;  // 15 seconds
const MAX_INTERVAL_MS = 30000;  // 30 seconds
const INITIAL_DELAY_MS = 3000;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBooking() {
  return bookings[Math.floor(Math.random() * bookings.length)];
}

export function RecentActivityToast() {
  const [currentBooking, setCurrentBooking] = useState(bookings[0]);
  const [isVisible, setIsVisible] = useState(false);
  const nextShowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showNext = () => {
      setCurrentBooking(randomBooking());
      setIsVisible(true);

      if (hideRef.current) clearTimeout(hideRef.current);
      hideRef.current = setTimeout(() => {
        setIsVisible(false);
        const delay = randomBetween(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
        nextShowRef.current = setTimeout(showNext, delay);
      }, VISIBLE_DURATION_MS);
    };

    const firstTimer = setTimeout(showNext, INITIAL_DELAY_MS);

    return () => {
      clearTimeout(firstTimer);
      if (hideRef.current) clearTimeout(hideRef.current);
      if (nextShowRef.current) clearTimeout(nextShowRef.current);
    };
  }, []);

  return (
    <div
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 w-[90%] md:w-auto max-w-sm z-50 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`transition-all duration-500 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="flex items-start gap-3 rounded-xl border border-[#D4AF37]/20 bg-zinc-900/90 backdrop-blur-md px-4 py-3 shadow-xl shadow-black/20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
            <Sparkles size={14} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
              Recent activity
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-zinc-200">
              {currentBooking}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
