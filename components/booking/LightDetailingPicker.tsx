"use client";

// ─── LightDetailingPicker ─────────────────────────────────────────────────────
// Shared UI for both the customer BookingModal and admin New Booking form.
// Renders the honesty callout, "when was last detail" question, checkbox
// item picker with live total, minimum-2 enforcement, not-included list,
// compare-to-Basic chip, and first-time customer flag.
//
// Emits selected items + final price. Parent handles handoff to the booking
// creation flow.

import { useMemo, useState } from "react";
import { Check, AlertTriangle, Sparkles, Info, Clock } from "lucide-react";
import {
  LIGHT_DETAIL_ITEMS,
  LIGHT_DETAIL_MINIMUM,
  LIGHT_DETAIL_MIN_ITEMS,
  LIGHT_DETAIL_NOT_INCLUDED,
  computeLightDetailPrice,
  getLightDetailDuration,
  type LightDetailSize,
} from "@/lib/lightDetailItems";

export type LightDetailingPickerProps = {
  vehicleSize: LightDetailSize;
  selectedItemIds: string[];
  onToggleItem: (id: string) => void;
  /** Foundation-tier prices for the "compare to Basic" chip. */
  basicInteriorPrice?: number;
  basicExteriorPrice?: number;
  basicFullPrice?: number;
  /** Called when customer clicks one of the "Switch to Basic" escape-hatch buttons */
  onSwitchToBasic?: (foundation: "interior" | "exterior" | "full") => void;
  /** If true, show the first-time-customer strong warning */
  isFirstTimeCustomer?: boolean;
  /** For admin mode — hides some customer-facing marketing copy */
  compact?: boolean;
};

export function LightDetailingPicker({
  vehicleSize,
  selectedItemIds,
  onToggleItem,
  basicInteriorPrice,
  basicExteriorPrice,
  basicFullPrice,
  onSwitchToBasic,
  isFirstTimeCustomer,
  compact,
}: LightDetailingPickerProps) {
  const [lastDetail, setLastDetail] = useState<"lt3" | "3to6" | "gt6" | "never" | null>(null);
  const [showNotIncluded, setShowNotIncluded] = useState(false);
  const [dismissedFirstTimeWarning, setDismissedFirstTimeWarning] = useState(false);

  const priceInfo = useMemo(
    () => computeLightDetailPrice(selectedItemIds, vehicleSize),
    [selectedItemIds, vehicleSize],
  );

  const meetsMinimum = selectedItemIds.length >= LIGHT_DETAIL_MIN_ITEMS;
  const shouldNudgeToBasic = lastDetail === "gt6" || lastDetail === "never";

  return (
    <div className="space-y-4">
      {/* ── Honesty callout + escape hatch ─────────────────────────────── */}
      {!compact && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-2.5 mb-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-400 mb-1">
                Be honest with yourself
              </p>
              <p className="text-[12px] text-zinc-200 leading-snug">
                This is <span className="font-black text-white">strictly maintenance</span> — a light pass, not a deep clean.
                If your carpets are caked, seats stained, or paint hasn't been washed in months, book Basic instead.
                <br />
                <span className="text-[11px] text-zinc-400">
                  Scheduled for 1 hour. Anything over 1 hour or extra work requested on-site incurs additional charges at our standard rate.
                </span>
              </p>
            </div>
          </div>
          {onSwitchToBasic && (
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-amber-500/15">
              <button
                type="button"
                onClick={() => onSwitchToBasic("interior")}
                className="py-2 px-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.06] text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-amber-300 transition-all"
              >
                Switch to<br />Basic Interior
              </button>
              <button
                type="button"
                onClick={() => onSwitchToBasic("exterior")}
                className="py-2 px-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.06] text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-amber-300 transition-all"
              >
                Switch to<br />Basic Exterior
              </button>
              <button
                type="button"
                onClick={() => onSwitchToBasic("full")}
                className="py-2 px-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.06] text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-amber-300 transition-all"
              >
                Switch to<br />Basic Full
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── First-time customer warning ────────────────────────────────── */}
      {!compact && isFirstTimeCustomer && !dismissedFirstTimeWarning && (
        <div className="rounded-2xl border-2 border-red-500/40 bg-red-500/[0.08] p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-red-400 mb-1">
                First-time booking?
              </p>
              <p className="text-[12px] text-zinc-100 leading-snug">
                Light Detailing assumes your car is <span className="font-black">already in maintained shape</span>.
                Most first-time customers start with Basic to get a solid baseline first.
                Are you sure Light Detailing is the right fit?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDismissedFirstTimeWarning(true)}
              className="flex-1 py-2 rounded-lg border border-white/[0.1] bg-white/[0.02] hover:border-red-400/40 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-red-300 transition-all"
            >
              Yes, I know what I need
            </button>
            {onSwitchToBasic && (
              <button
                type="button"
                onClick={() => onSwitchToBasic("interior")}
                className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[10px] font-black uppercase tracking-widest text-black transition-all"
              >
                Show me Basic
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── "When was last detail?" ────────────────────────────────────── */}
      {!compact && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
            When was your last full detail?
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "lt3",   label: "< 3 months" },
              { id: "3to6",  label: "3–6 months" },
              { id: "gt6",   label: "6+ months" },
              { id: "never", label: "Never" },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLastDetail(opt.id as any)}
                className={`py-2 px-2 rounded-xl border text-[11px] font-black transition-all ${
                  lastDetail === opt.id
                    ? "bg-amber-500 border-amber-500 text-black"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-amber-500/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {lastDetail === "lt3" && (
            <p className="text-[10.5px] text-emerald-400 mt-2 flex items-center gap-1.5">
              <Check size={11} strokeWidth={2.5} /> Perfect fit — Light Detailing is exactly what you need.
            </p>
          )}
          {shouldNudgeToBasic && (
            <div className="mt-2 rounded-xl border border-orange-500/40 bg-orange-500/[0.08] p-3">
              <p className="text-[11px] text-orange-100 leading-snug">
                <span className="font-black">Light Detailing probably isn't enough.</span>{" "}
                Most customers in your shoes book Basic first to get a solid baseline, then use
                Light Detailing for maintenance between visits.
              </p>
              {onSwitchToBasic && (
                <button
                  type="button"
                  onClick={() => onSwitchToBasic("interior")}
                  className="mt-2 py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-[10px] font-black uppercase tracking-widest text-black transition-all"
                >
                  See Basic packages
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Item picker ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Pick what you need <span className="text-amber-400">(min {LIGHT_DETAIL_MIN_ITEMS})</span>
          </p>
          <p className="text-[10px] font-bold text-zinc-500">
            {selectedItemIds.length} picked
          </p>
        </div>
        <div className="space-y-1.5">
          {LIGHT_DETAIL_ITEMS.map(item => {
            const selected = selectedItemIds.includes(item.id);
            const price = item.prices[vehicleSize];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleItem(item.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all active:scale-[0.99] ${
                  selected
                    ? "border-amber-500 bg-amber-500/[0.10] shadow-[0_2px_10px_rgba(245,158,11,0.15)]"
                    : "border-white/[0.07] bg-zinc-900/40 hover:border-amber-500/35"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-xl leading-none mt-0.5">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className={`text-[13px] font-bold leading-tight ${selected ? "text-white" : "text-zinc-200"}`}>
                        {item.label}
                      </span>
                      <span className={`text-[13px] font-black tabular-nums shrink-0 ${selected ? "text-amber-300" : "text-zinc-400"}`}>
                        ${price}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-snug">{item.description}</p>
                  </div>
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all mt-0.5 ${
                    selected ? "bg-amber-500" : "bg-zinc-800 border border-zinc-700"
                  }`}>
                    {selected && <Check size={11} className="text-black" strokeWidth={3} />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Not-included list ────────────────────────────────────────────── */}
      {!compact && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40">
          <button
            type="button"
            onClick={() => setShowNotIncluded(v => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-[10.5px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Info size={12} /> What's NOT included
            </span>
            <span className="text-[10px] text-zinc-500">{showNotIncluded ? "▲ hide" : "▼ show"}</span>
          </button>
          {showNotIncluded && (
            <div className="px-3.5 pb-3.5 space-y-1">
              <p className="text-[10.5px] text-zinc-500 mb-2 leading-snug">
                Light Detailing does <span className="font-black text-zinc-400">NOT</span> cover the following.
                If your car needs any of these, book Basic instead:
              </p>
              <ul className="space-y-1">
                {LIGHT_DETAIL_NOT_INCLUDED.map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                    <span className="text-red-400 shrink-0 mt-[3px]">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Live total ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/[0.08] via-zinc-900 to-zinc-950 p-4">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Your total</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
              <Clock size={10} /> {getLightDetailDuration(selectedItemIds.length)} min
              {selectedItemIds.length >= LIGHT_DETAIL_ITEMS.length && (
                <span className="text-amber-500/80 font-black">· full pass</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-amber-300 tabular-nums leading-none">
              ${priceInfo.finalPrice}
            </span>
            {priceInfo.minimumApplied && meetsMinimum && (
              <p className="text-[9px] font-black tabular-nums text-amber-500/70 mt-1">
                (${LIGHT_DETAIL_MINIMUM[vehicleSize]} minimum applied)
              </p>
            )}
          </div>
        </div>
        {!meetsMinimum && (
          <p className="text-[11px] text-amber-400 leading-snug pt-2 border-t border-amber-500/15">
            Pick at least {LIGHT_DETAIL_MIN_ITEMS} items to continue.
          </p>
        )}
      </div>

      {/* ── Compare to Basic chip ─────────────────────────────────────────
          Picks the ONE most-relevant Basic package based on which items the
          customer selected. Interior-only items → Basic Interior. Exterior-
          only → Basic Exterior. Mix → Basic Interior + Exterior (Full). */}
      {!compact && meetsMinimum && basicInteriorPrice && (() => {
        const INTERIOR_ITEM_IDS = new Set(["vacuum", "wipe_down", "floor_mats"]);
        const EXTERIOR_ITEM_IDS = new Set(["exterior_rinse", "tire_shine"]);
        // Windows count as both since it covers interior + exterior glass.
        const hasInterior = selectedItemIds.some(id => INTERIOR_ITEM_IDS.has(id) || id === "windows");
        const hasExterior = selectedItemIds.some(id => EXTERIOR_ITEM_IDS.has(id) || id === "windows");

        let compareLabel = "Basic Interior";
        let comparePrice = basicInteriorPrice;
        if (hasInterior && hasExterior) {
          compareLabel = "Basic Interior + Exterior";
          comparePrice = basicFullPrice ?? (basicInteriorPrice + (basicExteriorPrice ?? 0));
        } else if (hasExterior && !hasInterior && basicExteriorPrice) {
          compareLabel = "Basic Exterior";
          comparePrice = basicExteriorPrice;
        }

        return (
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/30 px-3.5 py-3">
            <p className="text-[9.5px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
              <Sparkles size={11} className="text-zinc-500" />
              Compare with a real detail
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-400 font-black">Your Light Detailing</span>
                <span className="text-amber-300 font-black tabular-nums">${priceInfo.finalPrice}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 mt-1 border-t border-white/[0.05]">
                <span className="text-emerald-300 font-black">{compareLabel}</span>
                <span className="text-emerald-200 font-black tabular-nums">${comparePrice}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 leading-snug">
              {compareLabel} is way more thorough. Still want Light? You&apos;re good to book.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
