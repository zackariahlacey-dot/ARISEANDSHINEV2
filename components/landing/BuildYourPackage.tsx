"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Sofa, Droplets, Zap, Check, ChevronRight, Crown,
  Wrench, Star, ShieldCheck, Plus, X, Info, Flame, Lock, Car,
  ArrowLeft, Edit3,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";
import { detectVehicleSize, getAllMakeSuggestions, getModelSuggestionsForMake } from "@/lib/detectVehicleSize";
import {
  bundlePctFor, addonDiscountAmount, addonDiscountedPrice,
  bundlePctLabel,
} from "@/lib/bundleDiscount";
import { BuildForMeQuiz } from "./BuildForMeQuiz";

// ─── Foundation services ──────────────────────────────────────────────────
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
      "Tire shine + exhaust tip polish (free)",
      "Glass polish & cleaning (free)",
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
  popular?: boolean;
};

const INTERIOR_ADDONS: AddonDefExt[] = [
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo", price: 75, desc: "Deep steam shampoo of all seats, upholstery, and floorboards. Lifts stains, grime and odor. 3-row SUVs add $30 (extra row + cargo area).", side: "interior", popular: true },
  { id: "pet_hair",           label: "Heavy Pet Hair Removal",      price: 50, desc: "Deep extraction of embedded pet hair from seats, carpet, and cargo. Only charged if heavy accumulation present.", side: "interior", popular: true },
  { id: "leather_condition",  label: "Leather Conditioning",        price: 45, desc: "Deep-clean and condition all leather surfaces. Restores softness, prevents cracking, matte finish.", side: "interior", popular: true },
  { id: "uv_interior",        label: "UV / Trim & Plastic Restoration & Protection", price: 35, desc: "Deep clean and restore matte color on all interior plastics, vinyl, and trim — brings tired, sun-faded surfaces back to life — then seal with a UV-protective coating to prevent future fading and cracking.", side: "interior" },
  { id: "odor_bomb",          label: "Strong Odor Elimination",     price: 60, desc: "Heavy-duty neutralizer treatment kills embedded smoke, food, and pet odors throughout the cabin.", side: "interior", premium: true },
  { id: "steam_sanitation",   label: "Steam Sanitation",            price: 45, desc: "FREE BONUS — unlocks automatically when you add 3 or more other add-ons. High-pressure steam sanitizes vents, cup holders, and seat tracks. Kills bacteria nothing else can reach.", side: "interior", freeUnlock: true },
  { id: "headliner_clean",    label: "Headliner Cleaning",          price: 35, desc: "Gentle dry-foam cleaning of the fabric headliner. Lifts stains and smoke residue without saturating adhesive.", side: "interior" },
  { id: "salt_stain_removal", label: "Salt Stain Removal & Prevention", price: 50, desc: "Vermont winter survival: neutralize dried salt stains from carpets and door sills, then apply a salt repellent.", side: "interior" },
  { id: "seat_removal",       label: "Seat Removal — Deepest Clean", price: 125, desc: "We physically remove all seats to reach the spots impossible to clean otherwise — under the rails, deep carpet pockets, and the underside of each seat. Hot water extraction on every surface.", side: "interior", premium: true },
];

type AddonDefExt = AddonDef & {
  premium?: boolean;
  freeUnlock?: boolean;
  /** When present, price scales by vehicle size (matches BookingModal). */
  sizedPrice?: Record<VehicleSizeSlug, number>;
};

const EXTERIOR_ADDONS: AddonDefExt[] = [
  { id: "clay_bar",            label: "Clay Bar Treatment",         price: 50, desc: "Smooths paint by lifting embedded contaminants. Upgrades your 3-month ceramic spray to 6-month protection.", side: "exterior", exclusiveGroup: "decon", popular: true },
  { id: "headlight_restore",   label: "Headlight Restoration",      price: 60, desc: "Restore cloudy or yellowed lenses to like-new clarity. UV sealed to prevent re-hazing.", side: "exterior", popular: true },
  { id: "mech_chem_decon",     label: "Mechanical & Chemical Decontamination", price: 70, desc: "Clay bar + iron remover chemically dissolves brake dust and industrial fallout from paint and wheels. Replaces basic Clay Bar.", side: "exterior", exclusiveGroup: "decon", premium: true },
  { id: "trim_dressing",       label: "Rubber, Plastics & Vinyl Dressing", price: 30, desc: "UV-protective dressing on all exterior trim, rubber seals, plastics, and vinyl. Brings tired surfaces back to deep black. Glass polish is already included free with every exterior package.", side: "exterior", freeUnlock: true },
  { id: "salt_recovery_addon", label: "Salt Recovery — Undercarriage", price: 75, desc: "Add the full Salt Season Recovery: undercarriage flush, door-jamb deep clean, and salt-neutralizer treatment. Cheaper than booking standalone.", side: "exterior", premium: true },
  // ── Ceramic Coatings (premium) ──────────────────────────────────────────
  { id: "ceramic_3yr",         label: "2-Year Pro Ceramic Sealant (Body)", price: 250, desc: "Pro-grade 2-year ceramic sealant bonded to the paint — locks in gloss, repels water, protects against UV and contaminants. Pricing scales by vehicle size.", side: "exterior", premium: true,
    sizedPrice: { compact: 250, sedan: 300, suv: 350, xl: 400 } },
  { id: "wheel_ceramic",       label: "Wheel & Caliper Ceramic Coating", price: 125, desc: "Ceramic-coat all 4 wheels and brake calipers. Brake dust wipes off, salt and grime can't grip, gloss lasts 1-2 years.", side: "exterior", premium: true },
  // Window coatings — mutually exclusive tier set
  { id: "window_coat_windshield", label: "Graphene Window — Windshield Only", price: 100, desc: "Hydrophobic graphene coating bonded to the windshield. Rain beads off at speed, bugs wipe clean. Lasts 2 full years.", side: "exterior", exclusiveGroup: "windowcoat", premium: true },
  { id: "window_coat_front",      label: "Graphene Window — Front 3 Windows", price: 150, desc: "Windshield + both front side windows for full driver-zone coverage. Side mirrors stay clear in the rain.", side: "exterior", exclusiveGroup: "windowcoat", premium: true },
  { id: "window_coat_all",        label: "Graphene Window — All Windows",     price: 250, desc: "Full-vehicle graphene coating on every piece of glass — windshield, side windows, rear. Hydrophobic, anti-glare, 2 full years.", side: "exterior", exclusiveGroup: "windowcoat", premium: true },
];

// Three Quick Picks designed to hit three distinct pain points at three
// distinct price tiers — and each one lands on the next-up bundle tier
// (3 / 4 / 5+ paid add-ons) so the customer hits a real discount tier.
const QUICK_PICKS = [
  {
    id: "daily-driver",
    label: "Daily Driver Refresh",
    subtitle: "Ultimate Interior",
    tagline: "Pets, kids, lived-in mess",
    foundation: "interior" as FoundationId,
    // 3 paid add-ons → 22% bundle + unlocks free Steam Sanitation + free Trim Dressing
    addonIds: ["pet_hair", "upholstery_shampoo", "uv_interior"],
    icon: Star,
  },
  {
    id: "winter-recovery",
    label: "Vermont Winter Recovery",
    subtitle: "Ultimate Interior + Exterior",
    tagline: "Undo what salt season did",
    foundation: "full" as FoundationId,
    // 4 paid add-ons → 28% bundle + free unlocks
    addonIds: ["salt_stain_removal", "salt_recovery_addon", "upholstery_shampoo", "clay_bar"],
    icon: Sparkles,
  },
  {
    id: "presale-showroom",
    label: "Pre-Sale Showroom Prep",
    subtitle: "Ultimate Showroom",
    tagline: "Get top dollar at sale",
    foundation: "full" as FoundationId,
    // 7 paid add-ons → 35% bundle + free unlocks
    addonIds: ["upholstery_shampoo", "leather_condition", "uv_interior", "headliner_clean", "salt_stain_removal", "headlight_restore", "mech_chem_decon"],
    icon: Crown,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function getFoundationPrice(service: Service | null, size: VehicleSizeSlug): number {
  if (!service) return 0;
  const key = ({ compact: "price_small", sedan: "price_medium", suv: "price_large", xl: "price_extra_large" } as const)[size];
  return Number(service[key] ?? service.price_small ?? 0);
}

function getAddonEffectivePrice(addon: AddonDefExt, size: VehicleSizeSlug): number {
  if (addon.sizedPrice) return addon.sizedPrice[size] ?? addon.price;
  if (addon.id === "upholstery_shampoo" && size === "xl") return addon.price + 30;
  return addon.price;
}

// Bundle discount math lives in lib/bundleDiscount.ts so the builder and the
// downstream BookingModal apply the exact same percentage/cap/milestone logic.

// ─── Styled Autocomplete (matches the site's gold-on-zinc colorway) ──────
function Autocomplete({
  value, placeholder, suggestions, onChange,
}: {
  value: string;
  placeholder: string;
  suggestions: string[];
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 12);
    const q = value.toLowerCase();
    return suggestions
      .filter(s => s.toLowerCase().includes(q))
      .sort((a, b) => {
        const ai = a.toLowerCase().indexOf(q);
        const bi = b.toLowerCase().indexOf(q);
        return ai - bi;
      })
      .slice(0, 15);
  }, [value, suggestions]);

  // Close on outside click
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        autoComplete="off"
        className="w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-all text-center"
      />
      <AnimatePresence>
        {focused && filtered.length > 0 && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-auto mt-1 min-w-full w-max max-w-[260px] rounded-xl border border-[#D4AF37]/30 bg-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.6)] overflow-y-auto max-h-72"
          >
            {filtered.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(s); setFocused(false); }}
                className="block w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Shape of an additional vehicle handed off to the booking modal. Each one
// carries its own foundation service, size, and resolved add-on prices so
// the modal can render the full multi-vehicle summary without re-doing
// price math.
export type BuilderAdditionalVehicle = {
  serviceName: string;
  vehicleSize: VehicleSizeSlug;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  addons: { id: string; label: string; price: number }[];
};

// Internal snapshot — same as BuilderAdditionalVehicle plus what the builder
// needs to re-render the summary card and compute totals.
type CompletedVehicle = BuilderAdditionalVehicle & {
  foundationId: FoundationId;
  vehicleSubtotal: number;
};

/** Flat multi-vehicle discount: $25 when combined subtotal ≤ $500, else $40.
 *  Only kicks in once there are 2+ vehicles on the booking. */
function getMultiVehicleDiscountAmount(subtotal: number, vehicleCount: number): number {
  if (vehicleCount < 2) return 0;
  return subtotal <= 500 ? 25 : 40;
}

// ─── Component ────────────────────────────────────────────────────────────
export function BuildYourPackage({
  services,
  onContinueToBooking,
  onBuilderActiveChange,
}: {
  services: Service[];
  onContinueToBooking: (args: {
    serviceName: string;
    addonIds: string[];
    vehicleSize: VehicleSizeSlug;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    /** Builds for vehicles 2+. Empty when single-vehicle booking. */
    additionalVehicles?: BuilderAdditionalVehicle[];
  }) => void;
  /** Fires when the customer has actively engaged the builder (foundation
   * picked). Lets the parent hide a redundant global Book Now CTA. */
  onBuilderActiveChange?: (active: boolean) => void;
}) {
  // Persist builder state across reloads so customers don't restart on refresh.
  // IMPORTANT: don't read sessionStorage during first render — that runs on
  // the server too (where window is undefined) and on the client first paint,
  // and a divergent client-only read creates a hydration mismatch. Read it
  // post-mount in a useEffect and bulk-apply via setters instead.
  const BUILDER_STORAGE_KEY = "buildYourPackageDraft";

  const [foundationId, setFoundationId] = useState<FoundationId | null>(null);
  const [vehicleMake, setVehicleMake] = useState<string>("");
  const [vehicleModel, setVehicleModel] = useState<string>("");
  const [vehicleYear, setVehicleYear] = useState<string>("");
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeSlug>("sedan");
  const [autoDetected, setAutoDetected] = useState<boolean>(false);
  const [vehicleConfirmed, setVehicleConfirmed] = useState<boolean>(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [expandedAddon, setExpandedAddon] = useState<string | null>(null);
  // Already-completed vehicles (when the customer adds a 2nd, 3rd, ... vehicle).
  // The state vars above always describe the CURRENT vehicle being built.
  const [completedVehicles, setCompletedVehicles] = useState<CompletedVehicle[]>([]);

  // Refs for smooth auto-scroll into each newly-unlocked step
  const vehicleStepRef = useRef<HTMLDivElement>(null);
  const addonsStepRef  = useRef<HTMLDivElement>(null);

  // Step lock state — once a step is completed it visually blurs + locks;
  // customer taps the "Edit" pill to unlock and change. Restored from session.
  const [foundationLocked, setFoundationLocked] = useState<boolean>(false);
  const [vehicleLocked, setVehicleLocked] = useState<boolean>(false);

  // Track whether we've finished hydrating from sessionStorage. Until then,
  // skip the save-back effect so we don't blow away the persisted draft with
  // the empty defaults rendered on first paint.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BUILDER_STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.foundationId !== undefined) setFoundationId(s.foundationId);
        if (s.vehicleMake !== undefined) setVehicleMake(s.vehicleMake);
        if (s.vehicleModel !== undefined) setVehicleModel(s.vehicleModel);
        if (s.vehicleYear !== undefined) setVehicleYear(s.vehicleYear);
        if (s.vehicleSize !== undefined) setVehicleSize(s.vehicleSize);
        if (s.autoDetected !== undefined) setAutoDetected(s.autoDetected);
        if (s.vehicleConfirmed !== undefined) setVehicleConfirmed(s.vehicleConfirmed);
        if (Array.isArray(s.selectedAddonIds)) setSelectedAddonIds(s.selectedAddonIds);
        if (Array.isArray(s.completedVehicles)) setCompletedVehicles(s.completedVehicles);
        if (s.foundationLocked !== undefined) setFoundationLocked(s.foundationLocked);
        else if (s.foundationId) setFoundationLocked(true);
        if (s.vehicleLocked !== undefined) setVehicleLocked(s.vehicleLocked);
        else if (s.vehicleConfirmed) setVehicleLocked(true);
      }
    } catch {}
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-lock as the customer progresses
  useEffect(() => { if (foundationId) setFoundationLocked(true); }, [foundationId]);
  useEffect(() => { if (vehicleConfirmed) setVehicleLocked(true); }, [vehicleConfirmed]);

  // Signal active/inactive so the parent can hide the global Book Now CTA
  // (the mobile sticky bar below replaces it once the customer has engaged).
  useEffect(() => {
    onBuilderActiveChange?.(!!foundationId);
  }, [foundationId, onBuilderActiveChange]);
  useEffect(() => {
    return () => onBuilderActiveChange?.(false);
  }, [onBuilderActiveChange]);

  // Hide the mobile sticky bar when the in-flow Continue card is visible —
  // otherwise both stack and the customer sees the same button twice.
  const inFlowContinueRef = useRef<HTMLDivElement>(null);
  const [inFlowVisible, setInFlowVisible] = useState(false);
  useEffect(() => {
    const node = inFlowContinueRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setInFlowVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -80px 0px", threshold: 0 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [foundationId, vehicleConfirmed]);

  // Save builder state on every change so refresh preserves progress. Gated
  // on `hydrated` so the empty pre-hydration render doesn't overwrite a
  // legitimately-persisted draft with defaults.
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify({
        foundationId, vehicleMake, vehicleModel, vehicleYear, vehicleSize,
        autoDetected, vehicleConfirmed, selectedAddonIds,
        foundationLocked, vehicleLocked, completedVehicles,
      }));
    } catch {}
  }, [hydrated, foundationId, vehicleMake, vehicleModel, vehicleYear, vehicleSize, autoDetected, vehicleConfirmed, selectedAddonIds, foundationLocked, vehicleLocked, completedVehicles]);

  const foundation = foundationId ? FOUNDATIONS.find(f => f.id === foundationId)! : null;
  const foundationService = useMemo(
    () => (foundation ? services.find(s => s.name === foundation.serviceName) ?? null : null),
    [services, foundation]
  );

  const interiorAvailable = foundationId === "exterior" ? [] : INTERIOR_ADDONS;
  const exteriorAvailable = foundationId === "interior" ? [] : EXTERIOR_ADDONS;
  const allAvailable = [...interiorAvailable, ...exteriorAvailable];

  // Drop add-ons no longer available after foundation change
  useEffect(() => {
    setSelectedAddonIds(prev => prev.filter(id => allAvailable.some(a => a.id === id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundationId]);

  // Auto-detect size from make/model
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

  // Auto-scroll when steps unlock
  useEffect(() => {
    if (foundationId) {
      setTimeout(() => vehicleStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    }
  }, [foundationId]);

  useEffect(() => {
    if (vehicleConfirmed) {
      setTimeout(() => addonsStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, [vehicleConfirmed]);

  const toggleAddon = (addon: AddonDef) => {
    setSelectedAddonIds(prev => {
      if (prev.includes(addon.id)) return prev.filter(id => id !== addon.id);
      let next = prev;
      if (addon.exclusiveGroup) {
        const groupIds = allAvailable.filter(a => a.exclusiveGroup === addon.exclusiveGroup).map(a => a.id);
        next = prev.filter(id => !groupIds.includes(id));
      }
      return [...next, addon.id];
    });
  };

  const removeAddon = (id: string) => setSelectedAddonIds(prev => prev.filter(x => x !== id));

  const applyQuickPick = (qp: typeof QUICK_PICKS[number]) => {
    setFoundationId(qp.foundation);
    setSelectedAddonIds(qp.addonIds);
    // Don't auto-confirm vehicle — they still need to fill in make/model
  };

  // Live "From $X" price for a Quick Pick card. Uses sedan baseline (matches
  // the BuildForMeQuiz preview) and applies the same bundle math the builder
  // will apply once the customer continues, so what they see here is real.
  const quickPickPriceFor = (qp: typeof QUICK_PICKS[number]): number => {
    const foundationDef = FOUNDATIONS.find(f => f.id === qp.foundation);
    const svc = foundationDef ? services.find(s => s.name === foundationDef.serviceName) : null;
    const fPrice = svc ? getFoundationPrice(svc, "sedan") : 0;
    const pct = bundlePctFor(qp.addonIds.length);
    const allAddons = [...INTERIOR_ADDONS, ...EXTERIOR_ADDONS];
    return qp.addonIds.reduce((sum, id) => {
      const addon = allAddons.find(a => a.id === id);
      if (!addon) return sum;
      const base = getAddonEffectivePrice(addon, "sedan");
      return sum + addonDiscountedPrice(id, base, pct);
    }, fPrice);
  };

  // ─── Price math ─────────────────────────────────────────────────────────
  // Free-unlock add-ons (steam_sanitation, trim_dressing) become FREE when
  // 3+ qualifying add-ons are stacked. They don't contribute to subtotal,
  // don't get the per-addon bundle discount, and don't count toward the
  // bundle-tier threshold themselves.
  const FREE_UNLOCK_IDS = ["steam_sanitation", "trim_dressing"] as const;
  const FREE_UNLOCK_THRESHOLD = 3;
  const isFreeUnlockId = (id: string) => (FREE_UNLOCK_IDS as readonly string[]).includes(id);
  const foundationPrice = getFoundationPrice(foundationService, vehicleSize);
  const selectedAddons = allAvailable.filter(a => selectedAddonIds.includes(a.id));
  const qualifyingAddons = selectedAddons.filter(a => !isFreeUnlockId(a.id));
  const qualifyingCount = qualifyingAddons.length;
  const bundlePct      = bundlePctFor(qualifyingCount);
  const nextTierPct    = bundlePctFor(qualifyingCount + 1);
  const freeUnlocked = qualifyingCount >= FREE_UNLOCK_THRESHOLD;

  // Auto-add ALL available free-unlock add-ons when threshold is met,
  // remove them when count drops below.
  useEffect(() => {
    const availableFreeIds = allAvailable.filter(a => isFreeUnlockId(a.id)).map(a => a.id);
    if (freeUnlocked) {
      setSelectedAddonIds(prev => {
        const missing = availableFreeIds.filter(id => !prev.includes(id));
        return missing.length > 0 ? [...prev, ...missing] : prev;
      });
    } else {
      setSelectedAddonIds(prev => prev.filter(id => !isFreeUnlockId(id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeUnlocked, foundationId]);

  const addonsSubtotal = qualifyingAddons.reduce((s, a) => s + getAddonEffectivePrice(a, vehicleSize), 0);
  const addonsBundleSavings = qualifyingAddons.reduce(
    (s, a) => s + addonDiscountAmount(a.id, getAddonEffectivePrice(a, vehicleSize), bundlePct),
    0,
  );
  // Total customer-facing savings = sum of per-add-on percentage discounts.
  const bundleDiscount = addonsBundleSavings;
  const currentVehicleTotal = foundationPrice + addonsSubtotal - addonsBundleSavings;

  // Multi-vehicle math: roll completed vehicles into the running total and
  // apply the flat tier discount ($25 ≤ $500, $40 > $500) once 2+ vehicles
  // are on the booking.
  const completedSubtotal = completedVehicles.reduce((s, v) => s + v.vehicleSubtotal, 0);
  const vehiclesSubtotal = completedSubtotal + currentVehicleTotal;
  const vehicleCount = completedVehicles.length + 1;
  const multiVehicleDiscount = getMultiVehicleDiscountAmount(vehiclesSubtotal, vehicleCount);
  const total = Math.max(0, vehiclesSubtotal - multiVehicleDiscount);

  const canConfirmVehicle = !!vehicleMake.trim() && !!vehicleModel.trim() && !!vehicleYear.trim();
  const canContinue = !!foundationService && vehicleConfirmed;


  // Snapshot the currently-built vehicle into a portable CompletedVehicle shape.
  const snapshotCurrentVehicle = (): CompletedVehicle | null => {
    if (!foundationService || !foundation || !vehicleConfirmed) return null;
    const resolvedAddons = selectedAddons.map(a => ({
      id: a.id,
      label: a.label,
      // Free-unlock add-ons are zeroed at the threshold; everything else gets
      // the percentage bundle discount (with ceramic body cap) baked in so
      // the modal + email see the exact $ shown to the customer.
      price: isFreeUnlockId(a.id) && freeUnlocked
        ? 0
        : addonDiscountedPrice(a.id, getAddonEffectivePrice(a, vehicleSize), bundlePct),
    }));
    return {
      serviceName: foundationService.name,
      foundationId: foundation.id,
      vehicleSize,
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleYear: vehicleYear.trim(),
      addons: resolvedAddons,
      vehicleSubtotal: currentVehicleTotal,
    };
  };

  // Reset the per-vehicle state so the customer can build vehicle N+1 fresh.
  const resetForNewVehicle = () => {
    setFoundationId(null);
    setFoundationLocked(false);
    setVehicleMake("");
    setVehicleModel("");
    setVehicleYear("");
    setVehicleSize("sedan");
    setAutoDetected(false);
    setVehicleConfirmed(false);
    setVehicleLocked(false);
    setSelectedAddonIds([]);
    setExpandedAddon(null);
  };

  const handleAddAnother = () => {
    const snap = snapshotCurrentVehicle();
    if (!snap) return;
    setCompletedVehicles(prev => [...prev, snap]);
    resetForNewVehicle();
    // Scroll back to the foundation step so they can start fresh
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const removeCompletedVehicle = (idx: number) => {
    setCompletedVehicles(prev => prev.filter((_, i) => i !== idx));
  };

  const editCompletedVehicle = (idx: number) => {
    const v = completedVehicles[idx];
    if (!v) return;
    // If current vehicle has progress, snapshot it first so we don't lose it
    const currentSnap = snapshotCurrentVehicle();
    setCompletedVehicles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (currentSnap) return [...next, currentSnap];
      return next;
    });
    // Load the picked vehicle back into the live builder state
    setFoundationId(v.foundationId);
    setFoundationLocked(true);
    setVehicleMake(v.vehicleMake);
    setVehicleModel(v.vehicleModel);
    setVehicleYear(v.vehicleYear);
    setVehicleSize(v.vehicleSize);
    setAutoDetected(true);
    setVehicleConfirmed(true);
    setVehicleLocked(true);
    setSelectedAddonIds(v.addons.map(a => a.id));
    setExpandedAddon(null);
  };

  const handleContinue = () => {
    if (!foundationService || !vehicleConfirmed) return;
    const additionalVehicles: BuilderAdditionalVehicle[] = completedVehicles.map(v => ({
      serviceName: v.serviceName,
      vehicleSize: v.vehicleSize,
      vehicleMake: v.vehicleMake,
      vehicleModel: v.vehicleModel,
      vehicleYear: v.vehicleYear,
      addons: v.addons,
    }));
    onContinueToBooking({
      serviceName: foundationService.name,
      addonIds: selectedAddonIds,
      vehicleSize,
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleYear: vehicleYear.trim(),
      additionalVehicles: additionalVehicles.length > 0 ? additionalVehicles : undefined,
    });
  };

  // ─── Add-on card (compact horizontal row) ──────────────────────────────
  const renderAddonCard = (addon: AddonDefExt) => {
    const isSelected = selectedAddonIds.includes(addon.id);
    const isExpanded = expandedAddon === addon.id;
    const isFreeUnlock = isFreeUnlockId(addon.id);
    const isLocked = isFreeUnlock && !freeUnlocked;
    const isPremium = !!addon.premium;
    const base = getAddonEffectivePrice(addon, vehicleSize);
    // When selected, show the customer their current-tier price.
    // When NOT selected, show a preview of what they'd pay if they added
    // this and bumped to the next tier — that's the upsell incentive.
    const effective = isSelected
      ? addonDiscountedPrice(addon.id, base, bundlePct)
      : addonDiscountedPrice(addon.id, base, nextTierPct);
    const showSelectedDiscount = isSelected && bundlePct > 0 && effective < base;
    const showPreviewDiscount = !isSelected && !isFreeUnlock && nextTierPct > 0 && effective < base;

    const handleClick = () => {
      if (isLocked) return;
      toggleAddon(addon);
    };

    return (
      <div
        key={addon.id}
        className={`relative rounded-xl border transition-all overflow-hidden ${
          isSelected
            ? isFreeUnlock
              ? "border-emerald-500 bg-gradient-to-br from-emerald-500/[0.10] to-emerald-500/[0.02] shadow-[0_0_14px_rgba(16,185,129,0.18)]"
              : isPremium
                ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.15] via-[#F0D060]/[0.06] to-[#D4AF37]/[0.02] shadow-[0_0_20px_rgba(212,175,55,0.22)]"
                : "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.02] shadow-[0_0_14px_rgba(212,175,55,0.12)]"
            : isFreeUnlock && freeUnlocked
              ? "border-emerald-500/60 bg-emerald-500/[0.05] hover:border-emerald-500"
              : isLocked
                ? "border-white/[0.05] bg-zinc-900/20 opacity-60"
                : isPremium
                  ? "border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.04] via-zinc-900/40 to-zinc-900/40 hover:border-[#D4AF37]/65 hover:from-[#D4AF37]/[0.07]"
                  : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/25"
        }`}
      >
        <div
          role="button"
          tabIndex={isLocked ? -1 : 0}
          aria-pressed={isSelected}
          aria-disabled={isLocked}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (isLocked) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          className={`w-full p-2.5 transition-transform text-left outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 ${isLocked ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
              isSelected
                ? isFreeUnlock ? "bg-emerald-500" : "bg-[#D4AF37]"
                : "bg-zinc-800 border border-zinc-700"
            }`}>
              {isSelected
                ? <Check size={9} className="text-black" strokeWidth={3} />
                : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
            </span>

            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className={`text-[11.5px] font-bold leading-tight truncate ${isSelected ? "text-white" : isLocked ? "text-zinc-500" : "text-zinc-200"}`}>
                {addon.label}
              </span>
              {isPremium && !isSelected && !isLocked && (
                <span className="inline-flex items-center gap-0.5 px-1 py-px rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[7px] font-black uppercase tracking-wider shrink-0">
                  <Crown size={7} fill="currentColor" />Premium
                </span>
              )}
              {addon.popular && !isSelected && !isLocked && !isPremium && (
                <Flame size={10} className="text-amber-400 shrink-0" fill="currentColor" />
              )}
            </div>

            <div className="shrink-0 text-right">
              {isFreeUnlock ? (
                isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <Check size={9} strokeWidth={3} /> Free
                  </span>
                ) : freeUnlocked ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Free · tap</span>
                ) : (
                  <span className="text-[9px] font-bold text-zinc-500 leading-tight inline-block text-right">
                    FREE at<br/>{FREE_UNLOCK_THRESHOLD} add-ons
                  </span>
                )
              ) : showSelectedDiscount ? (
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-xs font-black text-[#D4AF37] tabular-nums">${effective}</span>
                  <span className="text-[9px] text-zinc-600 line-through tabular-nums">${base}</span>
                </div>
              ) : showPreviewDiscount ? (
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-xs font-black text-violet-400 tabular-nums">${effective}</span>
                  <span className="text-[9px] text-zinc-600 line-through tabular-nums">${base}</span>
                </div>
              ) : (
                <span className={`text-xs font-black tabular-nums ${isSelected ? "text-[#D4AF37]" : "text-zinc-300"}`}>
                  ${base}
                </span>
              )}
            </div>

            {/* Info button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpandedAddon(isExpanded ? null : addon.id); }}
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                isExpanded ? "bg-[#D4AF37]/25 text-[#D4AF37]" : "bg-white/[0.06] text-zinc-500 hover:text-[#D4AF37]"
              }`}
              aria-expanded={isExpanded}
              aria-label="More info"
            >
              <Info size={10} />
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="desc"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/[0.06]"
            >
              <p className="px-3 py-2 text-[11px] text-zinc-400 leading-snug">{addon.desc}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── Step wrapper ───────────────────────────────────────────────────────
  const StepHeader = ({ step, label, complete, locked }: { step: number; label: string; complete?: boolean; locked?: boolean }) => (
    <div className="flex items-center justify-center gap-2 mb-3">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
        complete ? "bg-emerald-500 text-black" : locked ? "bg-zinc-800 text-zinc-600" : "bg-[#D4AF37] text-black"
      }`}>
        {complete ? <Check size={11} strokeWidth={3} /> : locked ? <Lock size={9} /> : step}
      </span>
      <p className={`text-xs font-black uppercase tracking-widest ${
        complete ? "text-emerald-400" : locked ? "text-zinc-600" : "text-zinc-300"
      }`}>{label}</p>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 text-center">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center gap-1.5 mb-2">
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

      {/* ── Trust strip ────────────────────────────────────────────────── */}
      <div className="mb-6 mx-auto max-w-3xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
          {[
            { icon: ShieldCheck, label: "Fully Insured" },
            { icon: Star,        label: "500+ Vermont Details" },
            { icon: Check,       label: "Satisfaction Guarantee" },
            { icon: Sparkles,    label: "Free Reschedule" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-[#D4AF37]/15 bg-zinc-900/40 text-zinc-400"
            >
              <Icon size={11} className="text-[#D4AF37] shrink-0" />
              <span className="font-bold tracking-tight whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Completed-vehicles summary (multi-vehicle bookings) ─────────
          Once the customer hits "Add Another Vehicle" the build for vehicle N
          is collapsed into a card here so they can see the running total,
          edit, or remove. Vehicle N+1 is built below using the same UI.
      ──────────────────────────────────────────────────────────────── */}
      {completedVehicles.length > 0 && (
        <div className="mb-6 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] p-3">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37] inline-flex items-center gap-1.5">
                <Car size={11} /> Vehicles on this booking ({vehicleCount})
              </p>
              {multiVehicleDiscount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  <Check size={9} strokeWidth={3} /> −${multiVehicleDiscount} multi-vehicle
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {completedVehicles.map((v, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 py-2.5 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Vehicle {idx + 1}</p>
                      <p className="text-sm font-black text-white truncate leading-tight">
                        {v.vehicleYear} {v.vehicleMake} {v.vehicleModel}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {v.serviceName.replace(" Detail", "")} {v.addons.length > 0 ? `· ${v.addons.length} add-on${v.addons.length === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-[#D4AF37] tabular-nums">${v.vehicleSubtotal}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => editCompletedVehicle(idx)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] hover:text-[#F0D060] transition-colors"
                    >
                      <Edit3 size={9} strokeWidth={3} /> Edit
                    </button>
                    <span className="text-zinc-700">·</span>
                    <button
                      type="button"
                      onClick={() => removeCompletedVehicle(idx)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <X size={9} strokeWidth={3} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-3">
              {foundationId
                ? <>Customize <span className="text-[#D4AF37] font-bold">Vehicle {vehicleCount}</span> below — or finish your build.</>
                : <>Pick a foundation below to start <span className="text-[#D4AF37] font-bold">Vehicle {vehicleCount}</span>.</>}
            </p>
          </div>
        </div>
      )}

      {/* ── Build-For-Me Quiz (above Quick Picks) ───────────────────────── */}
      <div className="max-w-3xl mx-auto">
        <BuildForMeQuiz
          services={services}
          onUseBuild={({ foundation, addonIds }) => {
            setFoundationId(foundation);
            setSelectedAddonIds(addonIds);
          }}
        />
      </div>

      {/* ── Quick Picks ─────────────────────────────────────────────────── */}
      <div className="mb-8 max-w-3xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 mb-3 text-center">Or Start with a Quick Pick</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {QUICK_PICKS.map(qp => {
            const Icon = qp.icon;
            const price = quickPickPriceFor(qp);
            return (
              <button
                key={qp.id}
                onClick={() => applyQuickPick(qp)}
                className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.10] via-zinc-900/60 to-zinc-950 px-4 py-3.5 text-left hover:border-[#D4AF37]/60 hover:from-[#D4AF37]/[0.16] transition-all active:scale-[0.98] shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 w-44 h-24 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.22)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-2 mb-1.5">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                    <Icon size={13} className="text-[#D4AF37]" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 truncate">{qp.subtitle}</p>
                </div>
                <p className="relative text-[14px] font-black text-white leading-tight mb-0.5">{qp.label}</p>
                <p className="relative text-[10px] text-zinc-500 leading-snug mb-2.5">{qp.tagline}</p>
                <div className="relative flex items-baseline justify-between border-t border-white/[0.05] pt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">From</span>
                  <span className="text-base font-black text-[#D4AF37] tabular-nums">${price}</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 text-center mt-3">— or build your own below —</p>
      </div>

      {/* ── 2-column layout on desktop: steps on left, sticky summary on right ── */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start lg:text-left">

      {/* LEFT — progressive steps */}
      <div className="lg:min-w-0">

      {/* ── STEP 1: Foundation (always visible) ─────────────────────────── */}
      <div className="mb-6 relative">
        {/* Lock overlay — appears once foundation is picked and customer moved on */}
        {foundationLocked && foundationId && (
          <button
            onClick={() => setFoundationLocked(false)}
            className="absolute inset-0 z-20 rounded-2xl bg-zinc-950/55 backdrop-blur-[2px] flex items-center justify-center group transition-all hover:bg-zinc-950/40"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(212,175,55,0.4)] group-hover:scale-105 transition-transform">
              <Edit3 size={11} strokeWidth={3} /> Change Foundation
            </span>
          </button>
        )}
        <StepHeader step={1} label="Pick Your Foundation" complete={!!foundationId} />
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
                className={`relative rounded-2xl border p-4 text-center transition-all active:scale-[0.98] ${
                  isSelected
                    ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.03] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                    : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/30"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Icon size={14} className={isSelected ? "text-[#D4AF37]" : "text-zinc-500"} />
                  <span className={`text-sm font-black ${isSelected ? "text-white" : "text-zinc-300"}`}>{f.label}</span>
                  {isSelected && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                      <Check size={11} className="text-black" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug mb-2 text-center">{f.tagline}</p>
                <p className={`text-xl font-black tabular-nums text-center ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>
                  {price > 0 ? `$${price}` : "—"}
                  <span className="text-[10px] font-bold text-zinc-600 ml-1 uppercase tracking-wider">base</span>
                </p>
              </button>
            );
          })}
        </div>

        {/* What's included — only shown after selection */}
        <AnimatePresence>
          {foundation && (
            <motion.div
              key="included"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center max-w-md mx-auto">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Included in {foundation.label} foundation:</p>
                <ul className="grid grid-cols-1 gap-1.5">
                  {foundation.includes.map(item => (
                    <li key={item} className="flex items-start justify-center gap-2 text-[11px] text-zinc-400 leading-snug">
                      <Check size={10} className="text-emerald-400 shrink-0 mt-0.5" strokeWidth={3} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STEP 2: Vehicle (unlocks after foundation) ──────────────────── */}
      <AnimatePresence initial={false}>
        {foundationId && (
          <motion.div
            ref={vehicleStepRef}
            key="step2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mb-6 pt-2 relative">
              {/* Lock overlay — appears once vehicle is confirmed and customer moved on */}
              {vehicleLocked && vehicleConfirmed && (
                <button
                  onClick={() => { setVehicleLocked(false); setVehicleConfirmed(false); }}
                  className="absolute inset-0 z-20 rounded-2xl bg-zinc-950/55 backdrop-blur-[2px] flex items-center justify-center group transition-all hover:bg-zinc-950/40"
                >
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(212,175,55,0.4)] group-hover:scale-105 transition-transform">
                    <Edit3 size={11} strokeWidth={3} /> Change Vehicle
                  </span>
                </button>
              )}
              <StepHeader step={2} label="Your Vehicle" complete={vehicleConfirmed} />
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Year"
                  value={vehicleYear}
                  onChange={e => { setVehicleYear(e.target.value); setVehicleConfirmed(false); }}
                  className="bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-all text-center"
                  inputMode="numeric"
                  maxLength={4}
                />
                <Autocomplete
                  value={vehicleMake}
                  placeholder="Make"
                  suggestions={getAllMakeSuggestions()}
                  onChange={v => {
                    setVehicleMake(v);
                    setVehicleModel("");
                    setAutoDetected(false);
                    setVehicleConfirmed(false);
                  }}
                />
                <Autocomplete
                  value={vehicleModel}
                  placeholder="Model"
                  suggestions={getModelSuggestionsForMake(vehicleMake)}
                  onChange={v => {
                    setVehicleModel(v);
                    setAutoDetected(false);
                    setVehicleConfirmed(false);
                  }}
                />
              </div>

              {/* Auto-detected size display (no manual override) */}
              {canConfirmVehicle && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 max-w-md mx-auto"
                >
                  {autoDetected ? (
                    <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-4 py-3 inline-flex items-center justify-center gap-2 w-full">
                      <Zap size={12} className="text-[#D4AF37] fill-[#D4AF37]" />
                      <p className="text-xs">
                        <span className="text-zinc-400">Your vehicle size: </span>
                        <span className="font-black text-[#D4AF37] uppercase tracking-wider">{({ compact: "Small", sedan: "Mid-Size", suv: "Large SUV/Truck", xl: "XL / Van" } as const)[vehicleSize]}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 inline-flex items-center justify-center gap-2 w-full">
                      <Info size={12} className="text-amber-400" />
                      <p className="text-[11px] text-amber-300">
                        Vehicle not in our database — we'll confirm the size at booking
                      </p>
                    </div>
                  )}

                  {/* Confirm button */}
                  {!vehicleConfirmed && (
                    <button
                      onClick={() => setVehicleConfirmed(true)}
                      className="mt-3 w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider active:scale-[0.97] transition-all inline-flex items-center justify-center gap-2"
                    >
                      <Check size={13} strokeWidth={3} /> Confirm Vehicle
                    </button>
                  )}
                  {vehicleConfirmed && (
                    <button
                      onClick={() => setVehicleConfirmed(false)}
                      className="mt-3 text-[10px] text-zinc-500 hover:text-[#D4AF37] inline-flex items-center justify-center gap-1 w-full"
                    >
                      <Car size={10} /> Change vehicle
                    </button>
                  )}
                </motion.div>
              )}

              {!canConfirmVehicle && (
                <p className="text-[10px] text-zinc-600 text-center mt-2">Enter year, make and model to continue</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP 3: Add-ons (unlocks after vehicle confirmed) ──────────── */}
      <AnimatePresence initial={false}>
        {vehicleConfirmed && (
          <motion.div
            ref={addonsStepRef}
            key="step3"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mb-7 pt-2">
              <StepHeader step={3} label="Stack Add-ons (Optional)" />
              <p className="text-[10px] text-zinc-600 text-center mb-3 inline-flex items-center justify-center gap-1 w-full">
                <Info size={9} /> Tap any card for details · the more you add, the cheaper each gets
              </p>

              {/* Bundle progress hint — spells out the actual unlock value
                  so a customer with 2 add-ons sees the 3rd add-on's
                  irresistible math (bigger %, free Steam + Trim, etc). */}
              {selectedAddonIds.length > 0 && (
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-3 py-2.5 mb-3 flex items-start justify-center gap-2 max-w-md mx-auto text-left">
                  <Sparkles size={13} className="text-violet-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-violet-300 leading-snug">
                    {bundlePct > 0 ? (
                      <>
                        <p className="font-black">
                          You&rsquo;re saving ${bundleDiscount} right now with the {bundlePctLabel(qualifyingCount)} bundle.
                        </p>
                        {qualifyingCount < 5 ? (
                          <p className="mt-0.5 text-violet-300/90">
                            <strong>Add 1 more →</strong> {bundlePctLabel(qualifyingCount + 1)} on every add-on
                            {qualifyingCount + 1 === 3 && <> + unlock free Steam Sanitation + free Trim Dressing</>}.
                          </p>
                        ) : (
                          <p className="mt-0.5 text-emerald-300/90">
                            🏆 Max bundle unlocked — biggest discount on every add-on.
                          </p>
                        )}
                      </>
                    ) : (
                      <p>
                        Add <span className="font-black">1 more</span> for <span className="font-black">15% off each</span> add-on.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Selected chip strip */}
              {selectedAddons.length > 0 && (
                <div className="mb-4 max-w-xl mx-auto">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 text-center">Your Build · {selectedAddons.length} added · tap to remove</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {selectedAddons.map(a => (
                      <button
                        key={a.id}
                        onClick={() => removeAddon(a.id)}
                        className="group inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-all"
                      >
                        {a.label}
                        <X size={9} className="opacity-60 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section headers for Full foundation */}
              {foundationId === "full" && interiorAvailable.length > 0 && (
                <div className="mb-2 flex items-center gap-2 max-w-lg mx-auto">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 inline-flex items-center gap-1">
                    <Sofa size={9} /> Interior
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              )}
              {interiorAvailable.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 mb-4 text-left max-w-3xl mx-auto">
                  {interiorAvailable.map(renderAddonCard)}
                </div>
              )}

              {foundationId === "full" && exteriorAvailable.length > 0 && (
                <div className="mb-2 mt-2 flex items-center gap-2 max-w-lg mx-auto">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500 inline-flex items-center gap-1">
                    <Droplets size={9} /> Exterior
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              )}
              {exteriorAvailable.length > 0 && (() => {
                // Window coatings render as ONE wide card with 3 sub-tier buttons,
                // not 3 separate cards in the grid. Filter them out here.
                const windowIds = ["window_coat_windshield", "window_coat_front", "window_coat_all"];
                const regularExt = exteriorAvailable.filter(a => !windowIds.includes(a.id));
                const windowOpts = exteriorAvailable.filter(a => windowIds.includes(a.id));
                const selectedWindow = windowOpts.find(a => selectedAddonIds.includes(a.id));
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 text-left max-w-3xl mx-auto">
                      {regularExt.map(renderAddonCard)}
                    </div>
                    {/* ── Graphene Window Coating — consolidated card ────────── */}
                    {windowOpts.length > 0 && (
                      <div className="mt-3 max-w-3xl mx-auto">
                        <div className={`relative rounded-2xl border overflow-hidden transition-all ${
                          selectedWindow
                            ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.15] via-[#F0D060]/[0.06] to-[#D4AF37]/[0.02] shadow-[0_0_20px_rgba(212,175,55,0.22)]"
                            : "border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.04] via-zinc-900/40 to-zinc-900/40 hover:border-[#D4AF37]/65 hover:from-[#D4AF37]/[0.07]"
                        }`}>
                          {/* Header */}
                          <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.06] text-left">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm font-black text-white leading-tight">2-Year Graphene Window Coating</span>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[8px] font-black uppercase tracking-wider shrink-0">
                                  <Crown size={8} fill="currentColor" />Premium
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">
                              Hydrophobic graphene ceramic on your glass — water beads + rolls off at speed, bugs and salt wipe clean. Lasts 2 full years.
                            </p>
                          </div>
                          {/* 3-tier sub-buttons */}
                          <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-950/40">
                            {windowOpts.map(opt => {
                              const isSelected = selectedAddonIds.includes(opt.id);
                              const shortLabel = opt.id === "window_coat_windshield" ? "Windshield"
                                : opt.id === "window_coat_front" ? "Front 3"
                                : "All Glass";
                              const subLabel = opt.id === "window_coat_windshield" ? "Front glass only"
                                : opt.id === "window_coat_front" ? "+ 2 side windows"
                                : "Every window + rear";
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => toggleAddon(opt)}
                                  className={`relative px-2 py-3 rounded-xl border-2 text-center transition-all active:scale-[0.97] ${
                                    isSelected
                                      ? "bg-gradient-to-b from-[#D4AF37]/30 to-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)] -translate-y-0.5"
                                      : "bg-zinc-900/60 border-white/10 hover:border-[#D4AF37]/50 hover:bg-zinc-900"
                                  }`}
                                >
                                  <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                    isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                                  }`}>
                                    {isSelected ? <Check size={9} className="text-black" strokeWidth={3} /> : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
                                  </div>
                                  <div className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isSelected ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                                    {shortLabel}
                                  </div>
                                  <div className={`text-[9px] font-medium mt-0.5 ${isSelected ? "text-[#D4AF37]/80" : "text-zinc-500"}`}>
                                    {subLabel}
                                  </div>
                                  <div className={`text-base font-black mt-1.5 tabular-nums ${isSelected ? "text-white" : "text-[#D4AF37]"}`}>
                                    +${opt.price}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── In-flow Continue card (mobile only — desktop uses sticky sidebar) ── */}
      <AnimatePresence initial={false}>
        {canContinue && (
          <motion.div
            ref={inFlowContinueRef}
            key="continue"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mt-6 max-w-md mx-auto lg:hidden"
          >
            <div className="rounded-2xl border border-[#D4AF37]/45 bg-zinc-950/80 overflow-hidden">
              <div className="px-5 py-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  {vehicleCount > 1 ? `Total · ${vehicleCount} vehicles` : "Your Total"}
                </p>
                <p className="text-4xl font-black text-white tabular-nums leading-none">${total}</p>
                {(bundleDiscount > 0 || multiVehicleDiscount > 0) && (
                  <p className="text-[11px] text-violet-400 font-bold mt-1">
                    {bundleDiscount > 0 && <>Saved ${bundleDiscount} with bundle</>}
                    {bundleDiscount > 0 && multiVehicleDiscount > 0 && " · "}
                    {multiVehicleDiscount > 0 && <span className="text-emerald-400">−${multiVehicleDiscount} multi-vehicle</span>}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleAddAnother}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] text-[#D4AF37] hover:bg-[#D4AF37]/[0.12] active:scale-[0.97] transition-all"
                >
                  <Plus size={13} strokeWidth={3} /> Add Another Vehicle
                  {vehicleCount === 1 && <span className="text-[9px] font-black text-emerald-400 ml-1">(−$25/$40)</span>}
                </button>
                <button
                  onClick={handleContinue}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_16px_rgba(212,175,55,0.3)] active:scale-[0.97] transition-all"
                >
                  Pick Date & Time <ChevronRight size={16} />
                </button>
                <p className="text-[9px] text-zinc-600 text-center mt-3">
                  <ShieldCheck size={9} className="inline -mt-0.5" /> Choose Pay at Arrival or Pay Now on the next screen
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* close LEFT column */}
      </div>

      {/* RIGHT — sticky summary sidebar (desktop only) */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 rounded-2xl border border-[#D4AF37]/30 bg-zinc-950/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              {vehicleCount > 1 ? `Total · ${vehicleCount} vehicles` : "Your Build"}
            </p>
            <p className="text-4xl font-black text-white tabular-nums leading-none">${total}</p>
            {(bundleDiscount > 0 || multiVehicleDiscount > 0) && (
              <p className="text-[11px] font-bold mt-1">
                {bundleDiscount > 0 && <span className="text-violet-400">Saved ${bundleDiscount}</span>}
                {bundleDiscount > 0 && multiVehicleDiscount > 0 && <span className="text-zinc-600"> · </span>}
                {multiVehicleDiscount > 0 && <span className="text-emerald-400">−${multiVehicleDiscount} multi-vehicle</span>}
              </p>
            )}
          </div>
          <div className="px-4 py-3 space-y-1 text-left text-[11px] max-h-[40vh] overflow-y-auto">
            {/* Already-completed vehicles (collapsed lines) */}
            {completedVehicles.map((v, i) => (
              <div key={`cv-${i}`} className="flex items-center justify-between">
                <span className="text-zinc-400 truncate pr-2 font-bold">
                  Vehicle {i + 1} · {v.vehicleMake} {v.vehicleModel}
                </span>
                <span className="text-zinc-300 tabular-nums shrink-0">${v.vehicleSubtotal}</span>
              </div>
            ))}
            {completedVehicles.length > 0 && foundation && (
              <div className="pt-1 mt-1 border-t border-white/[0.04]" />
            )}
            {foundation && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 truncate pr-2 font-bold">
                  {completedVehicles.length > 0 ? `Vehicle ${vehicleCount} · ${foundation.label}` : foundation.label}
                </span>
                <span className="text-zinc-300 tabular-nums shrink-0">${foundationPrice}</span>
              </div>
            )}
            {selectedAddons.length === 0 && foundation && (
              <p className="text-zinc-600 italic text-center pt-1">No add-ons yet</p>
            )}
            {selectedAddons.map(a => {
              const base = getAddonEffectivePrice(a, vehicleSize);
              const isFreeUnlock = isFreeUnlockId(a.id);
              const eff = isFreeUnlock && freeUnlocked
                ? 0
                : addonDiscountedPrice(a.id, base, bundlePct);
              return (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-zinc-500 truncate pr-2">+ {a.label}</span>
                  <span className="text-zinc-300 tabular-nums shrink-0">
                    {isFreeUnlock && freeUnlocked ? <span className="text-emerald-400">FREE</span> : `$${eff}`}
                  </span>
                </div>
              );
            })}
            {bundleDiscount > 0 && (
              <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-white/[0.04] text-violet-400 font-bold">
                <span>🎁 Bundle ({bundlePctLabel(qualifyingCount)})</span>
                <span className="tabular-nums">−${bundleDiscount}</span>
              </div>
            )}
            {multiVehicleDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>🚗 Multi-vehicle</span>
                <span className="tabular-nums">−${multiVehicleDiscount}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-white/[0.06] space-y-2">
            {canContinue && (
              <button
                type="button"
                onClick={handleAddAnother}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] text-[#D4AF37] hover:bg-[#D4AF37]/[0.12] active:scale-[0.97] transition-all"
              >
                <Plus size={11} strokeWidth={3} /> Add Another Vehicle
                {vehicleCount === 1 && <span className="text-[9px] font-black text-emerald-400 ml-1">(−$25/$40)</span>}
              </button>
            )}
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] ${
                canContinue
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              {canContinue ? <>Pick Date & Time<ChevronRight size={15} /></> : !foundationId ? "Pick foundation" : !vehicleConfirmed ? "Confirm vehicle" : "Pick Date & Time"}
            </button>
            <p className="text-[9px] text-zinc-600 text-center mt-2">
              <ShieldCheck size={9} className="inline -mt-0.5" /> Pay at Arrival or Pay Now next
            </p>
          </div>
        </div>
      </aside>

      </div>{/* close 2-column grid */}

      {/* ── Mobile sticky price + Continue bar ────────────────────────────
          Once the customer picks a foundation, a running price + Continue
          button sticks to the bottom of the viewport on mobile so they can
          commit from anywhere in the page. Hides while the in-flow
          Continue card is on-screen to avoid showing the same button twice.
      ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {foundationId && !inFlowVisible && (
          <motion.div
            key="sticky-builder"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", paddingTop: "0.5rem" }}
          >
            <div className="rounded-2xl border border-[#D4AF37]/40 bg-black/85 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.55)] px-3.5 py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 leading-none">
                  {vehicleCount > 1 ? `${vehicleCount} Vehicles` : "Your Build"}
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-white tabular-nums leading-none">${total}</span>
                  {multiVehicleDiscount > 0 ? (
                    <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">−${multiVehicleDiscount}</span>
                  ) : bundleDiscount > 0 ? (
                    <span className="text-[10px] text-violet-400 font-bold whitespace-nowrap">−${bundleDiscount} bundle</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (canContinue) { handleContinue(); return; }
                  // Jump to the next incomplete step
                  if (!vehicleConfirmed) {
                    vehicleStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  } else {
                    addonsStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-[0.96] ${
                  canContinue
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.35)]"
                    : "bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37]"
                }`}
              >
                {canContinue ? <>Pick Date & Time <ChevronRight size={14} /></>
                  : !vehicleConfirmed ? <>Add Vehicle <ChevronRight size={14} /></>
                  : <>Continue <ChevronRight size={14} /></>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
