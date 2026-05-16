"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Sofa, Droplets, Zap, Check, ChevronRight, Crown,
  Wrench, Star, ShieldCheck, Plus,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";
import { detectVehicleSize } from "@/lib/detectVehicleSize";

// ─── Foundation services ──────────────────────────────────────────────────
// Maps to existing Interior/Exterior/Full Detail rows in the DB. Pricing is
// pulled live from the services prop so we always show DB-current numbers.
type FoundationId = "interior" | "exterior" | "full";

const FOUNDATIONS: { id: FoundationId; serviceName: string; label: string; icon: typeof Sofa; tagline: string; includes: string[] }[] = [
  {
    id: "interior",
    serviceName: "Interior Detail",
    label: "Interior",
    icon: Sofa,
    tagline: "Inside the cabin only",
    includes: [
      "Full vacuum — every crack & crevice",
      "Wipe-down + disinfect of all surfaces",
      "Plastics, vinyl & leather conditioned",
      "Interior glass cleaned",
    ],
  },
  {
    id: "exterior",
    serviceName: "Exterior Detail",
    label: "Exterior",
    icon: Droplets,
    tagline: "Outside only — wash & protect",
    includes: [
      "Hand wash & foam bath",
      "3-month ceramic spray coating",
      "Wheel & wheel-well clean",
      "Tire shine",
    ],
  },
  {
    id: "full",
    serviceName: "Full Detail",
    label: "Full",
    icon: Zap,
    tagline: "Everything — inside and out",
    includes: [
      "All Interior foundation included",
      "All Exterior foundation included",
      "Save vs. booking separately",
    ],
  },
];

// ─── Add-ons ──────────────────────────────────────────────────────────────
type AddonDef = {
  id: string;
  label: string;
  price: number;
  desc: string;
  side: "interior" | "exterior";
  exclusiveGroup?: string;
};

const INTERIOR_ADDONS: AddonDef[] = [
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo", price: 75, desc: "Deep steam shampoo of all seats, upholstery, and floorboards. Lifts stains, grime and odor. XL adds $20.", side: "interior" },
  { id: "pet_hair",           label: "Heavy Pet Hair Removal",      price: 50, desc: "Deep extraction of embedded pet hair from seats, carpet, and cargo. Only charged if heavy accumulation present.", side: "interior" },
  { id: "uv_interior",        label: "UV Protection",               price: 35, desc: "UV-protective coating on all interior plastics, vinyl, and trim. Prevents fading, cracking, and sun damage.", side: "interior" },
  { id: "leather_condition",  label: "Leather Conditioning",        price: 45, desc: "Deep-clean and condition all leather surfaces. Restores softness, prevents cracking, matte finish.", side: "interior" },
  { id: "odor_bomb",          label: "Strong Odor Elimination",     price: 75, desc: "Heavy-duty neutralizer treatment kills embedded smoke, food, and pet odors throughout the cabin.", side: "interior" },
  { id: "headliner_clean",    label: "Headliner Cleaning",          price: 40, desc: "Gentle dry-foam cleaning of the fabric headliner. Lifts stains and smoke residue without saturating adhesive.", side: "interior" },
  { id: "salt_stain_removal", label: "Salt Stain Removal & Prevention", price: 50, desc: "Vermont winter survival: neutralize dried salt stains from carpets and door sills, then apply a salt repellent.", side: "interior" },
  { id: "steam_sanitation",   label: "Steam Sanitation",            price: 45, desc: "High-pressure steam sanitizes vents, cup holders, seat tracks. Kills bacteria nothing else can reach.", side: "interior" },
];

const EXTERIOR_ADDONS: AddonDef[] = [
  { id: "clay_bar",            label: "Clay Bar Treatment",         price: 50, desc: "Smooths paint by lifting embedded contaminants. Upgrades your 3-month ceramic spray to 6-month protection.", side: "exterior", exclusiveGroup: "decon" },
  { id: "mech_chem_decon",     label: "Mechanical & Chemical Decontamination", price: 85, desc: "Clay bar + iron remover chemically dissolves brake dust and industrial fallout from paint and wheels. Replaces basic Clay Bar.", side: "exterior", exclusiveGroup: "decon" },
  { id: "headlight_restore",   label: "Headlight Restoration",      price: 60, desc: "Restore cloudy or yellowed lenses to like-new clarity. UV sealed to prevent re-hazing.", side: "exterior" },
  { id: "trim_dressing",       label: "Trim, Rubber & Glass Dressing", price: 30, desc: "UV-protective dressing on all exterior trim, rubber seals + a streak-free glass polish. Brings tired plastics back to deep black.", side: "exterior" },
  { id: "exhaust_wheel_barrel", label: "Exhaust Tips & Wheel Barrels", price: 35, desc: "Polish exhaust tips to a mirror finish and deep-clean the inside (barrel) of each wheel. The part nobody else cleans.", side: "exterior" },
  { id: "salt_recovery_addon", label: "Salt Recovery — Undercarriage", price: 85, desc: "Add the full Salt Season Recovery: undercarriage flush, door-jamb deep clean, and salt-neutralizer treatment. Cheaper than booking standalone.", side: "exterior" },
];

// ─── Quick Picks (preset bundles) ─────────────────────────────────────────
const QUICK_PICKS = [
  {
    id: "family",
    label: "Family Ride",
    tagline: "Pets, kids, the works",
    foundation: "full" as FoundationId,
    addonIds: ["pet_hair", "upholstery_shampoo", "uv_interior"],
    icon: Star,
  },
  {
    id: "presale",
    label: "Pre-Sale Prep",
    tagline: "Make it shine for the listing",
    foundation: "full" as FoundationId,
    addonIds: ["upholstery_shampoo", "headlight_restore", "clay_bar", "trim_dressing"],
    icon: Sparkles,
  },
  {
    id: "deep",
    label: "Deep Reset",
    tagline: "Top-to-bottom restoration",
    foundation: "full" as FoundationId,
    addonIds: ["upholstery_shampoo", "steam_sanitation", "leather_condition", "mech_chem_decon", "trim_dressing", "salt_recovery_addon"],
    icon: Crown,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function getFoundationPrice(service: Service | null, size: VehicleSizeSlug): number {
  if (!service) return 0;
  const key = ({ compact: "price_small", sedan: "price_medium", suv: "price_large", xl: "price_extra_large" } as const)[size];
  return Number(service[key] ?? service.price_small ?? 0);
}

function getAddonEffectivePrice(addon: AddonDef, size: VehicleSizeSlug): number {
  // XL upcharge for upholstery shampoo, mirrored from BookingModal
  if (addon.id === "upholstery_shampoo" && size === "xl") return addon.price + 20;
  return addon.price;
}

function computeBundleDiscountPerAddon(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 5;
  if (count === 3) return 10;
  if (count === 4) return 15;
  return 20;
}

// ─── Component ────────────────────────────────────────────────────────────
export function BuildYourPackage({
  services,
  onContinueToBooking,
}: {
  services: Service[];
  onContinueToBooking: (args: {
    serviceName: string;
    addonIds: string[];
    vehicleSize: VehicleSizeSlug;
    vehicleMake: string;
    vehicleModel: string;
  }) => void;
}) {
  const [foundationId, setFoundationId] = useState<FoundationId>("full");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeSlug>("sedan");
  const [autoDetected, setAutoDetected] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [expandedAddon, setExpandedAddon] = useState<string | null>(null);

  const foundation = FOUNDATIONS.find(f => f.id === foundationId)!;
  const foundationService = useMemo(
    () => services.find(s => s.name === foundation.serviceName) ?? null,
    [services, foundation.serviceName]
  );

  // Available add-ons based on foundation: interior shows interior add-ons,
  // exterior shows exterior add-ons, full shows both.
  const availableAddons = useMemo<AddonDef[]>(() => {
    if (foundationId === "interior") return INTERIOR_ADDONS;
    if (foundationId === "exterior") return EXTERIOR_ADDONS;
    return [...INTERIOR_ADDONS, ...EXTERIOR_ADDONS];
  }, [foundationId]);

  // Drop add-ons that are no longer available after a foundation change
  useEffect(() => {
    setSelectedAddonIds(prev => prev.filter(id => availableAddons.some(a => a.id === id)));
  }, [availableAddons]);

  // Auto-detect vehicle size from typed make/model
  useEffect(() => {
    if (!vehicleMake.trim() || vehicleModel.trim().length < 2) return;
    const t = setTimeout(() => {
      const detected = detectVehicleSize(vehicleMake, vehicleModel);
      if (detected) {
        setVehicleSize(detected);
        setAutoDetected(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [vehicleMake, vehicleModel]);

  const toggleAddon = (addon: AddonDef) => {
    setSelectedAddonIds(prev => {
      if (prev.includes(addon.id)) {
        return prev.filter(id => id !== addon.id);
      }
      // Handle mutual exclusivity (e.g. clay_bar vs mech_chem_decon)
      let next = prev;
      if (addon.exclusiveGroup) {
        const groupIds = availableAddons.filter(a => a.exclusiveGroup === addon.exclusiveGroup).map(a => a.id);
        next = prev.filter(id => !groupIds.includes(id));
      }
      return [...next, addon.id];
    });
  };

  const applyQuickPick = (qp: typeof QUICK_PICKS[number]) => {
    setFoundationId(qp.foundation);
    setSelectedAddonIds(qp.addonIds);
  };

  // ─── Live price math ─────────────────────────────────────────────────────
  const foundationPrice = getFoundationPrice(foundationService, vehicleSize);
  const selectedAddons = availableAddons.filter(a => selectedAddonIds.includes(a.id));
  const addonsSubtotal = selectedAddons.reduce((s, a) => s + getAddonEffectivePrice(a, vehicleSize), 0);
  const discountPerAddon = computeBundleDiscountPerAddon(selectedAddonIds.length);
  const bundleDiscount = selectedAddons.reduce((s, a) => {
    const base = getAddonEffectivePrice(a, vehicleSize);
    const eff = Math.max(20, base - discountPerAddon);
    return s + (base - eff);
  }, 0);
  const total = foundationPrice + addonsSubtotal - bundleDiscount;

  const canContinue = !!foundationService && !!vehicleMake.trim() && !!vehicleModel.trim();

  const handleContinue = () => {
    if (!foundationService) return;
    onContinueToBooking({
      serviceName: foundationService.name,
      addonIds: selectedAddonIds,
      vehicleSize,
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 mb-2">
          <Wrench size={14} className="text-[#D4AF37]" />
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/80">Build Your Package</p>
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          Pay For What You Need
        </h2>
        <p className="text-zinc-400 mt-3 text-sm max-w-md mx-auto leading-relaxed">
          Pick your base, stack the extras you actually want. The more you add, the cheaper each one gets.
        </p>
      </div>

      {/* ── Quick Picks ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 mb-3 text-center">Or Start with a Quick Pick</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {QUICK_PICKS.map(qp => {
            const Icon = qp.icon;
            return (
              <button
                key={qp.id}
                onClick={() => applyQuickPick(qp)}
                className="group rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/[0.04] to-zinc-900/40 px-4 py-3 text-left hover:border-[#D4AF37]/45 hover:from-[#D4AF37]/[0.08] transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={12} className="text-[#D4AF37]" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37]">{qp.label}</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug">{qp.tagline}</p>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 text-center mt-3">— or build your own below —</p>
      </div>

      {/* ── Step 1: Foundation ──────────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-3 justify-center">
          <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-black">1</span>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Pick Your Foundation</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FOUNDATIONS.map(f => {
            const Icon = f.icon;
            const isSelected = foundationId === f.id;
            const svc = services.find(s => s.name === f.serviceName);
            const price = svc ? getFoundationPrice(svc, vehicleSize) : 0;
            return (
              <button
                key={f.id}
                onClick={() => setFoundationId(f.id)}
                className={`relative rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.03] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                    : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/30"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={isSelected ? "text-[#D4AF37]" : "text-zinc-500"} />
                    <span className={`text-sm font-black ${isSelected ? "text-white" : "text-zinc-300"}`}>{f.label}</span>
                  </div>
                  {isSelected && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                      <Check size={11} className="text-black" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug mb-2">{f.tagline}</p>
                <p className={`text-xl font-black tabular-nums ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>
                  {price > 0 ? `$${price}` : "—"}
                  <span className="text-[10px] font-bold text-zinc-600 ml-1 uppercase tracking-wider">base</span>
                </p>
              </button>
            );
          })}
        </div>

        {/* What's included */}
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Included in {foundation.label} foundation:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {foundation.includes.map(item => (
              <li key={item} className="flex items-start gap-2 text-[11px] text-zinc-400 leading-snug">
                <Check size={10} className="text-emerald-400 shrink-0 mt-0.5" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Step 2: Vehicle ─────────────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-3 justify-center">
          <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-black">2</span>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Your Vehicle</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="text"
            placeholder="Make (e.g. Toyota)"
            value={vehicleMake}
            onChange={e => { setVehicleMake(e.target.value); setAutoDetected(false); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
          />
          <input
            type="text"
            placeholder="Model (e.g. Camry)"
            value={vehicleModel}
            onChange={e => { setVehicleModel(e.target.value); setAutoDetected(false); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
          />
        </div>
        {/* Size pills */}
        <div className="grid grid-cols-4 gap-1.5 mt-2.5">
          {(["compact", "sedan", "suv", "xl"] as VehicleSizeSlug[]).map(size => {
            const isSelected = vehicleSize === size;
            const label = ({ compact: "Small", sedan: "Mid", suv: "Large", xl: "XL/Van" } as const)[size];
            return (
              <button
                key={size}
                onClick={() => { setVehicleSize(size); setAutoDetected(false); }}
                className={`py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
                  isSelected
                    ? "border-[#D4AF37] bg-[#D4AF37]/[0.10] text-[#D4AF37]"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {autoDetected && (
          <p className="text-[10px] text-[#D4AF37]/70 mt-1.5 text-center inline-flex items-center justify-center gap-1 w-full">
            <Zap size={9} className="fill-[#D4AF37]/70" /> Size auto-detected from vehicle
          </p>
        )}
      </div>

      {/* ── Step 3: Add-ons ─────────────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1 justify-center">
          <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-black">3</span>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Stack Add-ons</p>
        </div>
        <p className="text-[10px] text-zinc-600 text-center mb-3">Tap any card for details · the more you add, the cheaper each gets</p>

        {/* Bundle discount progress hint */}
        {selectedAddonIds.length > 0 && discountPerAddon > 0 && (
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-3 py-2.5 mb-3 flex items-center gap-2">
            <Sparkles size={13} className="text-violet-400 shrink-0" />
            <p className="text-[11px] text-violet-300 leading-snug flex-1">
              <span className="font-black">Bundle active:</span> Each add-on is <span className="font-black">−${discountPerAddon} off</span> right now. Add {discountPerAddon < 20 ? "one more for an even bigger discount" : "as many as you want — max discount unlocked"}.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableAddons.map(addon => {
            const isSelected = selectedAddonIds.includes(addon.id);
            const isExpanded = expandedAddon === addon.id;
            const base = getAddonEffectivePrice(addon, vehicleSize);
            const effective = isSelected ? Math.max(20, base - discountPerAddon) : base;
            const showDiscount = isSelected && discountPerAddon > 0 && effective < base;
            return (
              <div
                key={addon.id}
                className={`relative rounded-xl border transition-all ${
                  isSelected
                    ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.08] to-[#D4AF37]/[0.02]"
                    : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/25"
                }`}
              >
                <button
                  onClick={() => toggleAddon(addon)}
                  className="w-full text-left p-3 active:scale-[0.98] transition-transform"
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                        }`}>
                          {isSelected ? <Check size={9} className="text-black" strokeWidth={3} /> : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
                        </span>
                        <span className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-zinc-300"}`}>
                          {addon.label}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {showDiscount ? (
                        <>
                          <p className="text-sm font-black text-[#D4AF37] tabular-nums">${effective}</p>
                          <p className="text-[9px] text-zinc-600 line-through tabular-nums">${base}</p>
                        </>
                      ) : (
                        <p className={`text-sm font-black tabular-nums ${isSelected ? "text-[#D4AF37]" : "text-zinc-300"}`}>
                          ${base}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedAddon(isExpanded ? null : addon.id)}
                  className="w-full px-3 pb-2 text-[10px] text-zinc-500 hover:text-[#D4AF37] flex items-center gap-1 transition-colors"
                >
                  <ChevronRight size={9} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  {isExpanded ? "Hide details" : "What's this?"}
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="desc"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-3 pb-3 text-[11px] text-zinc-400 leading-snug">{addon.desc}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Total ──────────────────────────────────────────────────── */}
      <div className="sticky bottom-2 z-10 mb-2">
        <div className="rounded-2xl border border-[#D4AF37]/40 bg-zinc-950/95 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="px-4 pt-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">{foundation.label} foundation</span>
              <span className="text-zinc-300 tabular-nums">${foundationPrice}</span>
            </div>
            {selectedAddons.length > 0 && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-zinc-500">{selectedAddons.length} add-on{selectedAddons.length === 1 ? "" : "s"}</span>
                <span className="text-zinc-300 tabular-nums">${addonsSubtotal}</span>
              </div>
            )}
            {bundleDiscount > 0 && (
              <div className="flex items-center justify-between text-xs mt-1 text-violet-400">
                <span>🎁 Bundle savings</span>
                <span className="tabular-nums font-bold">−${bundleDiscount}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Your Total</p>
              <p className="text-2xl font-black text-white tabular-nums">${total}</p>
            </div>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] ${
                canContinue
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              {canContinue ? "Continue to Booking" : "Add your vehicle"}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 text-center mt-2">
        <ShieldCheck size={9} className="inline -mt-0.5" /> Mobile detail · We bring everything to you · Pay cash and save
      </p>
    </div>
  );
}
