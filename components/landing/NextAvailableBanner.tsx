"use client";

import { Calendar, ChevronRight, Zap } from "lucide-react";
import type { NextAvailableSlot } from "@/lib/nextAvailable";

type Props = {
  slot: NextAvailableSlot | null;
  onBookNow?: () => void;
};

/**
 * Real-scarcity banner — fed live from Supabase via the parent server component.
 * Sits above the hero headline. Renders nothing if there is no slot returned
 * (booked out >30 days) so we never show a fake/empty banner.
 */
export function NextAvailableBanner({ slot, onBookNow }: Props) {
  if (!slot) return null;

  const isUrgent = slot.dateStr === "Today" || slot.dateStr === "Tomorrow";

  return (
    <button
      type="button"
      onClick={onBookNow}
      className={`group mx-auto mb-6 inline-flex items-center gap-3 rounded-full border px-4 py-2 transition-all duration-300 active:scale-[0.98] ${
        isUrgent
          ? "border-amber-500/40 bg-amber-500/[0.06] hover:border-amber-500/60 hover:bg-amber-500/[0.1]"
          : "border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.08]"
      }`}
    >
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${isUrgent ? "bg-amber-500/15" : "bg-[#D4AF37]/15"}`}>
        {isUrgent ? (
          <Zap size={11} className="text-amber-400" strokeWidth={2.5} />
        ) : (
          <Calendar size={11} className="text-[#D4AF37]" strokeWidth={2.5} />
        )}
      </span>
      <span className="flex items-baseline gap-1.5 text-xs sm:text-sm">
        <span className={`font-semibold tracking-wide ${isUrgent ? "text-amber-300" : "text-zinc-400"}`}>Next available:</span>
        <span className="font-black text-white">{slot.dateStr}</span>
        <span className="text-zinc-600">·</span>
        <span className="font-bold text-zinc-200">{slot.timeStr}</span>
      </span>
      <ChevronRight size={13} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${isUrgent ? "text-amber-400" : "text-[#D4AF37]"}`} />
    </button>
  );
}
