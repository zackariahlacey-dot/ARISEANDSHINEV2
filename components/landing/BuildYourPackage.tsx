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
import type { AddonOverrideMap } from "@/app/actions/addonPricing";
import { BuildForMeQuiz } from "./BuildForMeQuiz";
import { matchPackage, describeIncludedAddons } from "@/lib/packageMatcher";

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

// Slimmed builder add-on lists — only what we actively promote to the
// customer. Other add-ons (leather conditioning, odor bomb, etc.) still
// exist downstream in BookingModal.tsx for paint-correction / work-van /
// RV / boat flows; they just don't surface in this builder anymore.
const INTERIOR_ADDONS: AddonDefExt[] = [
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo", price: 95, desc: "Deep steam shampoo of all seats, upholstery, and floorboards. Lifts stains, grime and odor. Flat $95 across all vehicle sizes.", side: "interior", popular: true },
  { id: "pet_hair",           label: "Heavy Pet Hair Removal",      price: 50, desc: "Deep extraction of embedded pet hair from seats, carpet, and cargo. Only charged if heavy accumulation present.", side: "interior", popular: true },
  { id: "salt_stain_removal", label: "Salt Stain Removal & Prevention", price: 50, desc: "Vermont winter survival: neutralize dried salt stains from carpets and door sills, then apply a salt repellent.", side: "interior" },
];

type AddonDefExt = AddonDef & {
  premium?: boolean;
  freeUnlock?: boolean;
  /** When present, price scales by vehicle size (matches BookingModal). */
  sizedPrice?: Record<VehicleSizeSlug, number>;
};

const EXTERIOR_ADDONS: AddonDefExt[] = [
  { id: "clay_bar",            label: "Clay Bar Treatment",         price: 50, desc: "Smooths paint by lifting embedded contaminants. Upgrades your 3-month ceramic spray to 6-month protection.", side: "exterior", popular: true },
  { id: "headlight_restore",   label: "Headlight Restoration",      price: 60, desc: "Restore cloudy or yellowed lenses to like-new clarity. UV sealed to prevent re-hazing.", side: "exterior", popular: true },
  // ── 2-Year Ceramic Package members (rendered separately, not as
  // individual rows). Kept in this list so price math + booking handoff
  // still finds them. See CERAMIC_PACKAGE_IDS below.
  { id: "ceramic_3yr",         label: "5-Year Gentech — Body",      price: 250, desc: "Graphene-infused ceramic bonded to the paint — locks in gloss, repels water, protects against UV and contaminants. 5-year durability. Pricing scales by vehicle size.", side: "exterior", premium: true,
    sizedPrice: { sedan: 300, suv: 350, xl: 400 } },
  { id: "wheel_ceramic",       label: "5-Year Gentech — Wheels",    price: 125, desc: "Graphene coat all 4 wheels and brake calipers. Brake dust wipes off, salt and grime can't grip, gloss lasts 5 years.", side: "exterior", premium: true },
  { id: "window_coat_all",     label: "5-Year Gentech — Windows",   price: 250, desc: "Full-vehicle graphene coating on every piece of glass — windshield, side windows, rear. Hydrophobic, anti-glare, 5 full years.", side: "exterior", premium: true },
];

// ── 2-Year Ceramic Package ────────────────────────────────────────────────
// Customer multi-picks Body / Wheels / Windows. Discount on the ceramic
// subtotal scales linearly: 1 pick = 10%, 2 = 20%, 3 = 30%. Ceramic items
// are excluded from the regular bundle discount math (they get THIS
// discount instead of being double-counted).
const CERAMIC_PACKAGE_IDS = ["ceramic_3yr", "wheel_ceramic", "window_coat_all"] as const;
const isCeramicPackageId = (id: string): boolean =>
  (CERAMIC_PACKAGE_IDS as readonly string[]).includes(id);
function ceramicPackagePct(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 0.15;
  return 0.25;
}

/** Seat Removal SKUs are face-value specialty add-ons — excluded from the
 *  basic bundle discount math. Their savings are baked into the 2-Row / 3-Row
 *  bundle pricing already. */
const SEAT_REMOVAL_ADDON_IDS = ["seat_removal_driver", "seat_removal_passenger", "seat_removal_rear", "seat_removal_3rd_row", "seat_removal_all_2row", "seat_removal_all_3row"] as const;
const isSeatRemovalAddonId = (id: string): boolean =>
  (SEAT_REMOVAL_ADDON_IDS as readonly string[]).includes(id);

// Three customer-facing popular details. Clicking one bypasses the builder
// and opens the booking section with that service pre-selected (the parent
// handles the handoff via onSelectPopularService).
const POPULAR_DETAILS: Array<{
  id: string;
  serviceName: string;
  label: string;
  tagline: string;
  icon: typeof Sofa;
}> = [
  { id: "basic-interior",          serviceName: "Interior Detail",                       label: "Basic Interior",            tagline: "Vacuum, wipe-down, refresh", icon: Sofa },
  { id: "ultimate-interior",       serviceName: "Ultimate Interior Reset",               label: "Ultimate Interior",         tagline: "Deep reset, everything inside", icon: Star },
  { id: "ultimate-interior-ext",   serviceName: "Ultimate Interior + Exterior Reset",    label: "Ultimate Interior + Exterior", tagline: "The full top-to-bottom reset", icon: Crown },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function getFoundationPrice(service: Service | null, size: VehicleSizeSlug): number {
  if (!service) return 0;
  const key = ({ sedan: "price_medium", suv: "price_large", xl: "price_extra_large" } as const)[size];
  return Number(service[key] ?? service.price_medium ?? 0);
}

function getAddonEffectivePrice(
  addon: AddonDefExt,
  size: VehicleSizeSlug,
  overrides?: AddonOverrideMap,
): number {
  // Admin override (per-size, then size-agnostic "all") wins over any base.
  if (overrides) {
    const ov = overrides[`${addon.id}:${size}`] ?? overrides[`${addon.id}:all`];
    if (ov?.price_cents != null) return ov.price_cents / 100;
  }
  if (addon.sizedPrice) return addon.sizedPrice[size] ?? addon.price;
  // Shampoo is flat $95 — no XL surcharge (July 2026).
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
  addonOverrides = {},
  onContinueToBooking,
  onBuilderActiveChange,
  onSelectPopularService,
}: {
  services: Service[];
  /** Admin-set per-size price/duration overrides (server-fetched). When a
   *  matching key exists, it wins over the hard-coded base. */
  addonOverrides?: AddonOverrideMap;
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
  /** Bubble up when the customer taps a Popular Detail card — parent opens
   *  the booking section with that service name pre-selected. */
  onSelectPopularService?: (serviceName: string) => void;
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

  // Click handler for a Popular Detail card — bubble to the parent so it
  // can open the booking section with the chosen service pre-selected.
  // The builder is bypassed entirely.
  const applyPopularDetail = (pd: typeof POPULAR_DETAILS[number]) => {
    onSelectPopularService?.(pd.serviceName);
  };

  // Live "From $X" for a Popular Detail card (sedan baseline). Reads from
  // the actual services table so admin price changes flow through.
  const popularDetailPriceFor = (pd: typeof POPULAR_DETAILS[number]): number => {
    const svc = services.find(s => s.name === pd.serviceName);
    return svc ? getFoundationPrice(svc, "sedan") : 0;
  };

  // ─── Price math ─────────────────────────────────────────────────────────
  // Ceramic items (Body / Wheels / Windows) are excluded from the regular
  // bundle math — they get their own tiered discount (10/20/30% based on
  // how many of the 3 are picked). Everything else is "qualifying" for the
  // standard bundle tiers.
  const foundationPrice = getFoundationPrice(foundationService, vehicleSize);
  const selectedAddons = allAvailable.filter(a => selectedAddonIds.includes(a.id));
  const qualifyingAddons = selectedAddons.filter(a => !isCeramicPackageId(a.id) && !isSeatRemovalAddonId(a.id));
  const ceramicAddons    = selectedAddons.filter(a =>  isCeramicPackageId(a.id));
  const qualifyingCount = qualifyingAddons.length;
  const bundlePct      = bundlePctFor(qualifyingCount);
  const nextTierPct    = bundlePctFor(qualifyingCount + 1);

  const addonsSubtotal = qualifyingAddons.reduce((s, a) => s + getAddonEffectivePrice(a, vehicleSize, addonOverrides), 0);
  const addonsBundleSavings = qualifyingAddons.reduce(
    (s, a) => s + addonDiscountAmount(a.id, getAddonEffectivePrice(a, vehicleSize, addonOverrides), bundlePct),
    0,
  );
  const bundleDiscount = addonsBundleSavings;

  // Ceramic Package math
  const ceramicSubtotal = ceramicAddons.reduce((s, a) => s + getAddonEffectivePrice(a, vehicleSize, addonOverrides), 0);
  const ceramicPct = ceramicPackagePct(ceramicAddons.length);
  const ceramicSavings = Math.round(ceramicSubtotal * ceramicPct);

  const currentVehicleTotal =
    foundationPrice
    + (addonsSubtotal - addonsBundleSavings)
    + (ceramicSubtotal - ceramicSavings);

  // ── Predefined-package match detection ───────────────────────────────────
  // When the customer's build maps cleanly onto one of our named packages
  // (Ultimate Interior Reset / Ultimate Full Reset / etc.), surface a hint
  // so they can switch with one tap instead of paying à la carte for
  // features the named package already includes.
  const pkgMatch = useMemo(() => {
    if (!foundationId) return null;
    return matchPackage({
      foundation: foundationId,
      selectedAddonIds,
    });
  }, [foundationId, selectedAddonIds]);

  /** Switch the customer to the matched package — opens the booking modal
   *  with the canonical service preselected and add-ons cleared (since
   *  they're now bundled into the named package). */
  const handleSwitchToMatchedPackage = () => {
    if (!pkgMatch || !vehicleConfirmed) return;
    onContinueToBooking({
      serviceName: pkgMatch.serviceName,
      addonIds: [], // matched package already includes them
      vehicleSize,
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleYear: vehicleYear.trim(),
      additionalVehicles: completedVehicles.length > 0
        ? completedVehicles.map(v => ({
            serviceName: v.serviceName,
            vehicleSize: v.vehicleSize,
            vehicleMake: v.vehicleMake,
            vehicleModel: v.vehicleModel,
            vehicleYear: v.vehicleYear,
            addons: v.addons,
          }))
        : undefined,
    });
  };

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
      // Ceramic items get the tiered ceramic-package discount; everything
      // else gets the percentage bundle discount so the modal + email see
      // the exact $ shown to the customer.
      price: isCeramicPackageId(a.id)
        ? Math.round(getAddonEffectivePrice(a, vehicleSize, addonOverrides) * (1 - ceramicPct))
        : addonDiscountedPrice(a.id, getAddonEffectivePrice(a, vehicleSize, addonOverrides), bundlePct),
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
    const isPremium = !!addon.premium;
    const base = getAddonEffectivePrice(addon, vehicleSize, addonOverrides);
    // When selected, show the customer their current-tier price.
    // When NOT selected, show a preview of what they'd pay if they added
    // this and bumped to the next tier — that's the upsell incentive.
    const effective = isSelected
      ? addonDiscountedPrice(addon.id, base, bundlePct)
      : addonDiscountedPrice(addon.id, base, nextTierPct);
    const showSelectedDiscount = isSelected && bundlePct > 0 && effective < base;
    const showPreviewDiscount = !isSelected && nextTierPct > 0 && effective < base;

    const handleClick = () => {
      toggleAddon(addon);
    };

    return (
      <div
        key={addon.id}
        className={`relative rounded-xl border transition-all overflow-hidden ${
          isSelected
            ? isPremium
              ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.15] via-[#F0D060]/[0.06] to-[#D4AF37]/[0.02] shadow-[0_0_20px_rgba(212,175,55,0.22)]"
              : "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.02] shadow-[0_0_14px_rgba(212,175,55,0.12)]"
            : isPremium
              ? "border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.04] via-zinc-900/40 to-zinc-900/40 hover:border-[#D4AF37]/65 hover:from-[#D4AF37]/[0.07]"
              : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/25"
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          aria-pressed={isSelected}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          className="w-full p-2.5 transition-transform text-left outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
              isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
            }`}>
              {isSelected
                ? <Check size={9} className="text-black" strokeWidth={3} />
                : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
            </span>

            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className={`text-[11.5px] font-bold leading-tight truncate ${isSelected ? "text-white" : "text-zinc-200"}`}>
                {addon.label}
              </span>
              {isPremium && !isSelected && (
                <span className="inline-flex items-center gap-0.5 px-1 py-px rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[7px] font-black uppercase tracking-wider shrink-0">
                  <Crown size={7} fill="currentColor" />Premium
                </span>
              )}
              {addon.popular && !isSelected && !isPremium && (
                <Flame size={10} className="text-amber-400 shrink-0" fill="currentColor" />
              )}
            </div>

            <div className="shrink-0 text-right">
              {showSelectedDiscount ? (
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

      {/* ── Popular Details ─────────────────────────────────────────────── */}
      <div className="mb-8 max-w-3xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 mb-3 text-center">Popular Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {POPULAR_DETAILS.map(pd => {
            const Icon = pd.icon;
            const price = popularDetailPriceFor(pd);
            return (
              <button
                key={pd.id}
                onClick={() => applyPopularDetail(pd)}
                className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.10] via-zinc-900/60 to-zinc-950 px-4 py-3.5 text-left hover:border-[#D4AF37]/60 hover:from-[#D4AF37]/[0.16] transition-all active:scale-[0.98] shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 w-44 h-24 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.22)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-2 mb-1.5">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                    <Icon size={13} className="text-[#D4AF37]" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 truncate">Direct booking</p>
                </div>
                <p className="relative text-[14px] font-black text-white leading-tight mb-0.5">{pd.label}</p>
                <p className="relative text-[10px] text-zinc-500 leading-snug mb-2.5">{pd.tagline}</p>
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
                        <span className="font-black text-[#D4AF37] uppercase tracking-wider">{({ sedan: "Sedan / Coupe", suv: "SUV / Truck", xl: "3-Row / Work Van" } as const)[vehicleSize]}</span>
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
                // Ceramic items render as ONE card with 3 multi-pick options
                // (Body / Wheels / Windows) and a tiered discount. Filter them
                // out of the regular addon grid so they only appear once.
                const regularExt = exteriorAvailable.filter(a => !isCeramicPackageId(a.id));
                const ceramicOpts = exteriorAvailable.filter(a => isCeramicPackageId(a.id));
                const ceramicCount = ceramicOpts.filter(o => selectedAddonIds.includes(o.id)).length;
                const ceramicNextPct = ceramicPackagePct(ceramicCount + 1);
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 text-left max-w-3xl mx-auto">
                      {regularExt.map(renderAddonCard)}
                    </div>

                    {/* ── 2-Year Ceramic Package — multi-pick with tiered discount ── */}
                    {ceramicOpts.length > 0 && (
                      <div className="mt-3 max-w-3xl mx-auto">
                        <div className={`relative rounded-2xl border overflow-hidden transition-all ${
                          ceramicCount > 0
                            ? "border-cyan-400 bg-gradient-to-br from-cyan-500/[0.10] via-[#D4AF37]/[0.04] to-zinc-950 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                            : "border-[#D4AF37]/40 bg-gradient-to-br from-cyan-500/[0.03] via-zinc-900/40 to-zinc-900/40 hover:border-cyan-400/60 hover:from-cyan-500/[0.06]"
                        }`}>
                          {/* Header */}
                          <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.06] text-left">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Sparkles size={13} className="text-cyan-400 shrink-0" />
                                <span className="text-sm font-black text-white leading-tight">5-Year Gentech Graphene Coating</span>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[8px] font-black uppercase tracking-wider shrink-0">
                                  <Crown size={8} fill="currentColor" />Premium
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug mb-2">
                              Pro-grade 2-year ceramic coating. Mix &amp; match Body, Wheels, and Windows — the more you pick, the more you save.
                            </p>
                            {/* Tier ladder */}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              {[1, 2, 3].map(tier => {
                                const reached = ceramicCount >= tier;
                                const tierPct = Math.round(ceramicPackagePct(tier) * 100);
                                return (
                                  <div key={tier} className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-md border transition-all ${
                                    reached
                                      ? tierPct === 0
                                        ? "border-zinc-500/40 bg-zinc-500/[0.08] text-zinc-400"
                                        : "border-cyan-400/60 bg-cyan-500/[0.12] text-cyan-300"
                                      : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
                                  }`}>
                                    {reached && <Check size={9} strokeWidth={3} />}
                                    {tier} pick{tier > 1 ? "s" : ""} = {tierPct}% off
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3-option multi-pick */}
                          <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-950/40">
                            {ceramicOpts.map(opt => {
                              const isSelected = selectedAddonIds.includes(opt.id);
                              const shortLabel = opt.id === "ceramic_3yr" ? "Body"
                                : opt.id === "wheel_ceramic" ? "Wheels"
                                : "Windows";
                              const subLabel = opt.id === "ceramic_3yr" ? "Paint coating"
                                : opt.id === "wheel_ceramic" ? "Wheels + calipers"
                                : "All glass";
                              const price = getAddonEffectivePrice(opt, vehicleSize, addonOverrides);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => toggleAddon(opt)}
                                  className={`relative px-2 py-3 rounded-xl border-2 text-center transition-all active:scale-[0.97] ${
                                    isSelected
                                      ? "bg-gradient-to-b from-cyan-500/30 to-cyan-500/10 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)] -translate-y-0.5"
                                      : "bg-zinc-900/60 border-white/10 hover:border-cyan-400/50 hover:bg-zinc-900"
                                  }`}
                                >
                                  <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                    isSelected ? "bg-cyan-400" : "bg-zinc-800 border border-zinc-700"
                                  }`}>
                                    {isSelected ? <Check size={9} className="text-black" strokeWidth={3} /> : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
                                  </div>
                                  <div className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isSelected ? "text-cyan-300" : "text-zinc-200"}`}>
                                    {shortLabel}
                                  </div>
                                  <div className={`text-[9px] font-medium mt-0.5 ${isSelected ? "text-cyan-300/80" : "text-zinc-500"}`}>
                                    {subLabel}
                                  </div>
                                  <div className={`text-sm font-black mt-1.5 tabular-nums ${isSelected ? "text-white" : "text-[#D4AF37]"}`}>
                                    ${price}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Live discount strip */}
                          {ceramicCount > 0 ? (
                            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-cyan-500/[0.04] flex items-center justify-between">
                              <span className="text-[11px] font-bold text-cyan-300">
                                {ceramicCount}/3 picked · {Math.round(ceramicPct * 100)}% off ceramic
                              </span>
                              <span className="text-[11px] font-black tabular-nums text-white">
                                <span className="text-zinc-500 line-through mr-1">${ceramicSubtotal}</span>
                                ${ceramicSubtotal - ceramicSavings}
                              </span>
                            </div>
                          ) : (
                            <div className="px-4 py-2 border-t border-white/[0.06] bg-cyan-500/[0.02]">
                              <p className="text-[10px] text-zinc-500 text-center">
                                Pick <span className="text-cyan-300 font-bold">2</span> for <span className="text-cyan-300 font-bold">15% off</span> · pick all <span className="text-cyan-300 font-bold">3</span> for <span className="text-cyan-300 font-bold">25% off</span>
                              </p>
                            </div>
                          )}
                          {ceramicCount > 0 && ceramicCount < 3 && ceramicNextPct > ceramicPct && (
                            <div className="px-4 py-1.5 border-t border-white/[0.04] bg-zinc-950/40">
                              <p className="text-[10px] text-zinc-500 text-center">
                                Add 1 more → <span className="text-cyan-300 font-bold">{Math.round(ceramicNextPct * 100)}% off</span> instead of {Math.round(ceramicPct * 100)}%
                              </p>
                            </div>
                          )}
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
            {/* Package-match hint — only shown when the build is close to a
                named package. Single-tap to switch and stop overpaying. */}
            {pkgMatch && (
              <PackageMatchBanner pkgMatch={pkgMatch} onSwitch={handleSwitchToMatchedPackage} />
            )}

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
              const base = getAddonEffectivePrice(a, vehicleSize, addonOverrides);
              const eff = isCeramicPackageId(a.id)
                ? Math.round(base * (1 - ceramicPct))
                : addonDiscountedPrice(a.id, base, bundlePct);
              return (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-zinc-500 truncate pr-2">+ {a.label}</span>
                  <span className="text-zinc-300 tabular-nums shrink-0">${eff}</span>
                </div>
              );
            })}
            {bundleDiscount > 0 && (
              <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-white/[0.04] text-violet-400 font-bold">
                <span>🎁 Bundle ({bundlePctLabel(qualifyingCount)})</span>
                <span className="tabular-nums">−${bundleDiscount}</span>
              </div>
            )}
            {ceramicSavings > 0 && (
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span>✨ Ceramic ({Math.round(ceramicPct * 100)}% off)</span>
                <span className="tabular-nums">−${ceramicSavings}</span>
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
            {/* Package-match hint on the desktop sticky sidebar */}
            {pkgMatch && canContinue && (
              <PackageMatchBanner pkgMatch={pkgMatch} onSwitch={handleSwitchToMatchedPackage} compact />
            )}

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
              {canContinue ? <>Use This Build<ChevronRight size={15} /></> : !foundationId ? "Pick foundation" : !vehicleConfirmed ? "Confirm vehicle" : "Use This Build"}
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

// ─── Package match banner ─────────────────────────────────────────────────
// Surfaces inline when the customer's build maps cleanly onto one of our
// named packages (Ultimate Interior Reset / Ultimate Full Reset). One tap
// switches them to the named package — the booking modal opens with that
// service preselected and add-ons cleared (since the package already
// includes them).
import type { PackageMatch } from "@/lib/packageMatcher";

function PackageMatchBanner({
  pkgMatch,
  onSwitch,
  compact = false,
}: {
  pkgMatch: PackageMatch;
  onSwitch: () => void;
  compact?: boolean;
}) {
  const includedLabels = describeIncludedAddons(pkgMatch.includedAddonIds);
  const tone = pkgMatch.matchKind === "better" ? "strong" : "soft";
  return (
    <div
      className={`relative rounded-2xl overflow-hidden mb-3 ${
        tone === "strong"
          ? "border border-[#D4AF37]/55 shadow-[0_0_18px_rgba(212,175,55,0.18)]"
          : "border border-[#D4AF37]/25"
      }`}
      style={{ background: "linear-gradient(170deg, #1a1a1c 0%, #0d0d0f 100%)" }}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/80 to-transparent" />
      <div className={`${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <Crown size={12} className="text-[#D4AF37] shrink-0" fill="currentColor" />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">
            {tone === "strong" ? "This Matches a Package" : "Close to a Package"}
          </p>
        </div>
        <p className={`font-black text-zinc-100 leading-tight ${compact ? "text-sm" : "text-base"}`}>
          {pkgMatch.displayName}
        </p>
        {!compact && includedLabels.length > 0 && (
          <p className="text-[11px] text-zinc-500 leading-snug mt-1">
            Already includes: {includedLabels.slice(0, 3).join(" · ")}
            {includedLabels.length > 3 && ` · +${includedLabels.length - 3} more`}
          </p>
        )}
        <button
          type="button"
          onClick={onSwitch}
          className={`mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-black uppercase tracking-wider bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/[0.18] active:scale-[0.97] transition-all ${
            compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
          }`}
        >
          Switch to {pkgMatch.displayName}
          <ChevronRight size={compact ? 11 : 12} />
        </button>
      </div>
    </div>
  );
}
