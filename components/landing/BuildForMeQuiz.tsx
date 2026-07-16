"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, X, Check, ChevronRight, ChevronLeft, ArrowRight, RotateCcw,
  Sparkles, Sofa, Droplets, Zap, Car, Calendar, Info, Pencil, Minus, AlertTriangle,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";
import {
  bundlePctFor, addonDiscountedPrice,
} from "@/lib/bundleDiscount";
import {
  detectVehicleSize, getAllMakeSuggestions, getModelSuggestionsForMake,
} from "@/lib/detectVehicleSize";

// ─── Domain types ─────────────────────────────────────────────────────────────
type Scope = "interior" | "exterior" | "full";
type Severity = "light" | "medium" | "heavy";
type Size = "sedan" | "suv" | "xl";

type PainOption = {
  id: string;
  emoji: string;
  label: string;
  scopes: Array<"interior" | "exterior">; // which scope buckets show this pain
  addonIds: string[];                      // 1+ add-on ids this pain maps to
  heavyUpgradeAddonIds?: string[];         // swap-in when severity = heavy
};

const PAIN_OPTIONS: PainOption[] = [
  // Interior — kept in sync with the simplified builder addon set.
  // NOTE — both `caked_dirt` and `stains_seats` map to upholstery_shampoo
  // because most customers don't realize that a standard interior detail
  // vacuums + wipes carpets but does NOT lift ground-in dirt or set-in
  // stains without the Shampoo add-on. Two separate options let customers
  // self-identify whichever language matches their situation.
  { id: "pet_hair",       emoji: "🐾", label: "Heavy pet hair",                              scopes: ["interior"], addonIds: ["pet_hair"] },
  { id: "caked_dirt",     emoji: "🥾", label: "Carpets caked with dirt, grime, or mud",       scopes: ["interior"], addonIds: ["upholstery_shampoo"] },
  { id: "stains_seats",   emoji: "🍝", label: "Set-in stains on seats or carpet",            scopes: ["interior"], addonIds: ["upholstery_shampoo"] },
  { id: "salt_floor",     emoji: "❄️", label: "Salt stains on floor mats",                    scopes: ["interior"], addonIds: ["salt_stain_removal"] },
  { id: "odor_smell",     emoji: "👃", label: "Odor or smoke smell",                          scopes: ["interior"], addonIds: ["ozone_treatment"] },
  { id: "leather_dry",    emoji: "🪑", label: "Leather looks dry or faded",                   scopes: ["interior"], addonIds: ["leather_condition"] },
  // Exterior
  { id: "rough_paint",    emoji: "🪨", label: "Paint feels rough or gritty",       scopes: ["exterior"], addonIds: ["clay_bar"] },
  { id: "foggy_lights",   emoji: "💡", label: "Cloudy or yellow headlights",       scopes: ["exterior"], addonIds: ["headlight_restore"] },
  { id: "engine_bay",     emoji: "🔧", label: "Engine bay looks dirty",            scopes: ["exterior"], addonIds: ["engine_bay"] },
  { id: "want_shine",     emoji: "✨", label: "Want long-term ceramic shine",       scopes: ["exterior"], addonIds: ["gentech_5yr_body"] },
  { id: "brake_dust",     emoji: "🛞", label: "Brake dust caked on wheels",         scopes: ["exterior"], addonIds: ["gentech_5yr_wheels"] },
];

const FOUNDATION_DISPLAY: Record<Scope, { name: string; subtitle: string; icon: typeof Sofa; blurb: string }> = {
  interior: {
    name: "Interior Detail",
    subtitle: "Interior clean",
    icon: Sofa,
    blurb: "Full cabin refresh — every surface, crack & crevice.",
  },
  exterior: {
    name: "Exterior Detail",
    subtitle: "Exterior wash + protect",
    icon: Droplets,
    blurb: "Full hand wash + wheels + trim + ceramic sealant included.",
  },
  full: {
    name: "Full Detail",
    subtitle: "Interior + exterior",
    icon: Zap,
    blurb: "Both sides done in one visit — best value combo.",
  },
};

const FOUNDATION_SERVICE_NAME: Record<Scope, string> = {
  interior: "Interior Detail",
  exterior: "Exterior Detail",
  full:     "Full Detail",
};

// What's INCLUDED in each foundation service — shown on the result card so
// customers see what they're getting before add-ons stack on top.
const FOUNDATION_INCLUDES: Record<Scope, string[]> = {
  interior: [
    "Full vacuum of every surface, crack & crevice",
    "Wipe-down and protection of plastics + leather",
    "Floor mats & carpet cleaning (no shampoo)",
    "Streak-free interior glass",
  ],
  exterior: [
    "Full hand wash + foam bath + dry",
    "Wheels, tires, and wheel wells cleaned + dressed",
    "Plastic trim restoration",
    "Exterior glass cleaned",
    "INCLUDED: 1–3 month ceramic spray sealant",
  ],
  full: [
    "Everything in Interior Detail",
    "Everything in Exterior Detail",
    "1–3 month ceramic spray sealant INCLUDED",
    "Combo saves ~$35–$45 vs. buying separately",
  ],
};

const SCOPE_TILES: Array<{ id: Scope; label: string; sub: string; icon: typeof Sofa }> = [
  { id: "interior", label: "Interior",  sub: "Inside the cabin only", icon: Sofa     },
  { id: "exterior", label: "Exterior",  sub: "Outside wash + protect", icon: Droplets },
  { id: "full",     label: "Both",      sub: "Inside + outside",      icon: Zap      },
];

const SEVERITY_TILES: Array<{ id: Severity; label: string; sub: string; emoji: string }> = [
  { id: "light",  label: "A few months ago", sub: "Just light maintenance",  emoji: "🌟" },
  { id: "medium", label: "6+ months ago",    sub: "Normal wear has built up",emoji: "👍" },
  { id: "heavy",  label: "It's been a while",sub: "Heavy reset territory",  emoji: "💪" },
];

// ─── Build helpers ────────────────────────────────────────────────────────────
function painToAddons(painIds: string[], severity: Severity): string[] {
  const set = new Set<string>();
  for (const p of PAIN_OPTIONS) {
    if (!painIds.includes(p.id)) continue;
    const ids = severity === "heavy" && p.heavyUpgradeAddonIds ? p.heavyUpgradeAddonIds : p.addonIds;
    for (const id of ids) set.add(id);
  }
  return Array.from(set);
}

function getFoundationPriceFor(services: Service[], scope: Scope, size: Size = "sedan"): number {
  const svc = services.find(s => s.name === FOUNDATION_SERVICE_NAME[scope]);
  if (!svc) return 0;
  const key = ({ sedan: "price_medium", suv: "price_large", xl: "price_extra_large" } as const)[size];
  return Number((svc as any)[key] ?? (svc as any).price_medium ?? 0);
}

// Size-aware add-on pricing. Mirrors BookingModal's getEffectiveAddonPrice
// for the specific add-ons the quiz recommends so the result card total
// matches what the customer sees in checkout.
const ADDON_BASE_PRICES: Record<string, number> = {
  upholstery_shampoo:  95,
  pet_hair:            50,
  salt_stain_removal:  65,
  ozone_treatment:     60,
  leather_condition:   40,
  clay_bar:            50,
  headlight_restore:   75,
  engine_bay:          65,
  gentech_5yr_body:   350,   // sedan default — size-tiered below
  gentech_5yr_wheels: 125,
};

function getAddonPriceForSize(id: string, size: Size): number {
  const base = ADDON_BASE_PRICES[id] ?? 0;
  // Shampoo is flat $95 — no XL surcharge (July 2026).
  // Gentech body coating is size-tiered — mirrors BookingModal pricing.
  if (id === "gentech_5yr_body") {
    if (size === "suv") return 425;
    if (size === "xl")  return 500;
    return 350;
  }
  return base;
}

const ADDON_LABELS: Record<string, string> = {
  upholstery_shampoo: "Carpet & Upholstery Shampoo",
  pet_hair:           "Heavy Pet Hair Removal",
  salt_stain_removal: "Salt Stain Removal",
  ozone_treatment:    "Ozone Treatment",
  leather_condition:  "Leather Conditioning",
  clay_bar:           "Clay Bar Treatment",
  headlight_restore:  "Headlight Restoration",
  engine_bay:         "Engine Bay Detail",
  gentech_5yr_body:   "5-Yr Gentech — Full Body",
  gentech_5yr_wheels: "5-Yr Gentech — Wheels + Calipers",
};

// Short customer-facing descriptions so the ResultCard tells them exactly
// what each add-on delivers before they commit. Kept to ~1 sentence each —
// long enough to explain, short enough to scan.
const ADDON_DESCRIPTIONS: Record<string, string> = {
  upholstery_shampoo: "Deep steam shampoo of all seats, upholstery panels, and floorboards — lifts set-in stains, caked-in dirt, and ground-in grime at the source. Most people assume this is included in a basic detail — it isn't. A standard interior only vacuums + wipes; the shampoo is what actually pulls dirt out of the fibers.",
  pet_hair:           "Pumice + electrostatic extraction lifts embedded pet hair from seats, carpets, and cargo area. Goes way beyond what a standard vacuum can pull.",
  salt_stain_removal: "Enzymatic salt neutralizer + hot-water extraction + a salt-repellent sealing pass on affected carpets and door sills. Vermont-winter essential.",
  ozone_treatment:    "Professional-grade ozone treatment permanently neutralizes smoke, pet odor & mildew at the source.",
  leather_condition:  "Deep-clean and condition all leather surfaces with premium conditioner — restores softness, prevents cracking, matte finish.",
  clay_bar:           "Smooths paint by lifting embedded contaminants (rail dust, fallout, tree sap residue). Great prep before any ceramic sealant so it bonds properly.",
  headlight_restore:  "Sand, polish, and UV-seal cloudy or yellowed headlight lenses to like-new clarity. Visible result, lasts 2+ years. Pair pricing.",
  engine_bay:         "Deep degrease, dressing, and plastic care under the hood. Customers love the \"pop the hood and it looks new\" moment.",
  ceramic_3yr:        "5-Year Gentech Graphene coating bonded to every body panel. UV, salt, and water-spot resistance for 5 years. Hydrophobic + anti-static.",
  wheel_ceramic:      "Ceramic coating bonded to all 4 wheels + brake calipers. Brake dust wipes off, road grime can't grip, 2+ year gloss.",
};

// Foundation service descriptions — same copy used elsewhere so customers
// see a consistent story from quiz → booking modal.
const FOUNDATION_DESCRIPTIONS: Record<Scope, string> = {
  interior: "Full vacuum, wipe-down and protection of all plastics/leather, floor mats & carpet cleaning, and streak-free interior glass. (Heavy dirt or set-in stains? Add the Shampoo add-on above.)",
  exterior: "Full hand wash and dry, wheels/tires cleaned and dressed, plastic trim restoration, exterior glass, and INCLUDED 1–3 month ceramic spray sealant.",
  full:     "Interior + Exterior in one visit — full interior clean plus hand wash, wheels/tires, trim, and INCLUDED 1–3 month ceramic sealant. Best value combo.",
};

const SIZE_LABELS: Record<Size, string> = {
  sedan: "Sedan / Coupe",
  suv:   "SUV / Small Truck",
  xl:    "3-Row / Full-Size Truck",
};

type UseBuildArgs = {
  foundation: Scope;
  addonIds: string[];
  vehicle: {
    year: string;
    make: string;
    model: string;
    size: VehicleSizeSlug;
  };
  /** When true, the parent should book Ultimate Interior Reset instead of
   *  the plain Interior/Full foundation (customer accepted the upgrade). */
  preferUltimate?: boolean;
};

// Add-ons that Ultimate Interior Reset already bakes in — dropped when the
// customer accepts the upgrade so they're not double-charged. Ozone is NOT
// included (it's a separate add-on on the Ultimate flow); salt removal IS.
// Clay bar is included in Ultimate as a paint-prep step even without +Ext.
const INCLUDED_IN_ULTIMATE_ADDON_IDS = [
  "upholstery_shampoo", "leather_condition", "pet_hair", "salt_stain_removal", "clay_bar",
];

// ─── Component ────────────────────────────────────────────────────────────────
export function BuildForMeQuiz({
  services,
  onUseBuild,
  compact = false,
}: {
  services: Service[];
  onUseBuild: (args: UseBuildArgs) => void;
  /** When true, renders a small pill-style trigger for use in tight spots
   *  (hero CTAs, inside the booking modal). Full-width trigger otherwise. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [scope, setScope] = useState<Scope | null>(null);
  const [pains, setPains] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity | null>(null);
  // Vehicle info — collected on Step 3 so the result card can show real prices
  const [year, setYear]     = useState("");
  const [make, setMake]     = useState("");
  const [model, setModel]   = useState("");
  const [size, setSize]     = useState<Size>("sedan");
  const [autoDetected, setAutoDetected] = useState(false);
  // Collapse the year/make/model inputs into a compact chip once all three
  // are filled — keeps the vehicle step visually tidy on the result-review
  // trip back. Tapping the chip re-expands the fields for edits.
  const [vehicleCollapsed, setVehicleCollapsed] = useState(false);
  // Add-ons the customer has explicitly removed from the recommended build
  // on the Result screen (via the "-" button). Filtered out of the derived
  // addonIds so the total + rows update live. Cleared on reset.
  const [removedAddonIds, setRemovedAddonIds] = useState<string[]>([]);
  // Which add-on is currently showing the "confirm remove" popover.
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  // Whether to bundle an Exterior Detail with the recommended Ultimate on
  // the Result screen. Default: ON when scope=full (customer wanted both
  // sides anyway), OFF when scope=interior (customer picked interior-only
  // but can still opt in). Toggling updates the price display live and
  // decides whether ultimate_ext_addon is passed to the booking handoff.
  const [addExtToUltimate, setAddExtToUltimate] = useState(false);
  // One-shot latch — after the FIRST auto-collapse fires we never re-collapse
  // automatically. Otherwise tapping "Edit" would spring right back into the
  // chip 900ms later because year/make/model are still valid.
  const autoCollapsedOnceRef = useRef(false);

  const reset = () => {
    setStep(0);
    setScope(null);
    setPains([]);
    setSeverity(null);
    setYear(""); setMake(""); setModel("");
    setSize("sedan");
    setAutoDetected(false);
    setVehicleCollapsed(false);
    autoCollapsedOnceRef.current = false;
    setRemovedAddonIds([]);
    setConfirmingRemoveId(null);
    setAddExtToUltimate(false);
  };

  // Default the +Ext toggle to ON when the customer picked "Both" (they
  // wanted exterior work anyway); OFF otherwise. Fires whenever scope
  // changes — including on reset when scope goes back to null.
  useEffect(() => {
    setAddExtToUltimate(scope === "full");
  }, [scope]);
  const close = () => { setOpen(false); setTimeout(reset, 220); };

  // Auto-detect size when make/model change — mirrors homepage BookingModal
  useEffect(() => {
    if (!make.trim() || model.trim().length < 2) return;
    const t = setTimeout(() => {
      const detected = detectVehicleSize(make, model);
      if (detected) {
        setSize(detected as Size);
        setAutoDetected(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [make, model]);

  // Auto-collapse the vehicle inputs after the user stops typing (900ms
  // idle) and all three fields have valid-looking values. Debounce keeps
  // it from collapsing mid-keystroke. Fires ONCE per quiz session — after
  // the user opens the chip via "Edit", we leave it open until they finish
  // and tap the chip themselves (or the whole quiz resets).
  useEffect(() => {
    if (vehicleCollapsed || autoCollapsedOnceRef.current) return;
    const ready = year.trim().length === 4 && make.trim() && model.trim().length >= 2;
    if (!ready) return;
    const t = setTimeout(() => {
      setVehicleCollapsed(true);
      autoCollapsedOnceRef.current = true;
    }, 900);
    return () => clearTimeout(t);
  }, [year, make, model, vehicleCollapsed]);

  const availablePains = useMemo(() => {
    if (!scope) return [];
    if (scope === "full") return PAIN_OPTIONS;
    return PAIN_OPTIONS.filter(p => p.scopes.includes(scope as "interior" | "exterior"));
  }, [scope]);

  const buildSummary = useMemo(() => {
    if (!scope || !severity) return null;
    const derivedAddonIds = painToAddons(pains, severity);
    // Honor customer-side removals from the Result screen. Empty by default.
    const removed = new Set(removedAddonIds);
    const addonIds = derivedAddonIds.filter(id => !removed.has(id));
    const foundationPrice = getFoundationPriceFor(services, scope, size);

    // Ceramic items get the tiered ceramic-package discount (10/20/30%),
    // not the regular bundle. Mirror BuildYourPackage's split so the
    // preview total matches what the customer sees in the builder.
    const CERAMIC_IDS = ["ceramic_3yr", "wheel_ceramic", "window_coat_all"];
    const isCeramic = (id: string) => CERAMIC_IDS.includes(id);
    const ceramicIds   = addonIds.filter(isCeramic);
    const regularIds   = addonIds.filter(id => !isCeramic(id));
    const bundlePct = bundlePctFor(regularIds.length);
    const ceramicPct = ceramicIds.length >= 3 ? 0.25 : ceramicIds.length === 2 ? 0.15 : 0;

    const addonRows = addonIds.map(id => {
      const base = getAddonPriceForSize(id, size);
      const discounted = isCeramic(id)
        ? Math.round(base * (1 - ceramicPct))
        : addonDiscountedPrice(id, base, bundlePct);
      return { id, label: ADDON_LABELS[id] ?? id, base, discounted, savings: base - discounted };
    });
    const addonsTotal = addonRows.reduce((s, r) => s + r.discounted, 0);
    const totalSavings = addonRows.reduce((s, r) => s + r.savings, 0);
    const grandTotal = foundationPrice + addonsTotal;

    const labelParts: string[] = [];
    if (bundlePct > 0) labelParts.push(`${Math.round(bundlePct * 100)}% bundle off add-ons`);
    if (ceramicPct > 0) labelParts.push(`${Math.round(ceramicPct * 100)}% off ceramics`);

    // Ultimate upgrade logic. Ultimate Interior Reset bakes in the premium
    // interior add-ons customers stack (shampoo, salt, leather, pet hair)
    // PLUS seats-out access. For scope=full ("Both") we compare against
    // Ultimate + Exterior Detail toggle (the ultimate_ext_addon) so the
    // recommendation matches the customer's original intent — full-vehicle
    // service, not interior-only.
    //
    // Two thresholds:
    //   1. Build total >= Ultimate target → auto-default to Ultimate.
    //   2. Within $100 of Ultimate target → soft nudge card.
    // Skip both when scope is exterior-only.
    const ultimateSvc = services.find(s => s.name === "Ultimate Interior Reset");
    const ultimatePrice = ultimateSvc
      ? Number(({ sedan: (ultimateSvc as any).price_medium,
                  suv:   (ultimateSvc as any).price_large,
                  xl:    (ultimateSvc as any).price_extra_large }[size]) ?? 0)
      : 0;
    // "+ Exterior Detail (Ultimate bundle)" add-on prices — mirror the
    // BookingModal ALL_ADD_ONS.ultimate_ext_addon size tiers.
    const ULTIMATE_EXT_PRICES: Record<Size, number> = { sedan: 65, suv: 80, xl: 95 };
    const extPrice = ULTIMATE_EXT_PRICES[size];
    const isFullScope = scope === "full";
    // The TRIGGER threshold for "prefer Ultimate" uses a scope-based fair
    // comparison: scope=full compares against Ultimate + Ext (customer wanted
    // both sides), scope=interior compares against just Ultimate. This keeps
    // the recommendation honest without depending on the toggle state.
    const triggerExtPrice = isFullScope ? extPrice : 0;
    const targetUltimatePrice = ultimatePrice + triggerExtPrice;

    const interiorScope = scope === "interior" || scope === "full";
    const ultimatePreferred =
      interiorScope && ultimatePrice > 0 && grandTotal >= targetUltimatePrice;
    const ultimateDelta = targetUltimatePrice - grandTotal;
    const eligibleForUltimateNudge =
      interiorScope && ultimatePrice > 0 && !ultimatePreferred &&
      ultimateDelta > 0 && ultimateDelta <= 100;

    // Add-ons absorbed by the Ultimate (or Ultimate + Ext) package.
    // Clay bar is baked into Ultimate directly (part of the paint-prep step),
    // so it's covered whether or not the customer adds +Ext.
    const absorbedByUltimateIds = INCLUDED_IN_ULTIMATE_ADDON_IDS;

    // When we're defaulting to Ultimate, compute the bundle. Bundle DISPLAY
    // price honors the `addExtToUltimate` toggle so interior-scope customers
    // can opt into Exterior at the last minute, and full-scope customers can
    // opt out.
    let ultimateBundle: null | {
      price: number;      // combined foundation (Ultimate + optional Ext)
      extrasRows: typeof addonRows;
      extrasTotal: number;
      grandTotal: number;
      savings: number;    // vs à la carte base build
      includesExtToggle: boolean;
      extPrice: number;   // what +Ext would cost (for the toggle UI)
    } = null;
    if (ultimatePreferred) {
      const displayExtPrice = addExtToUltimate ? extPrice : 0;
      const displayBundlePrice = ultimatePrice + displayExtPrice;
      const extraIds = addonIds.filter(id => !absorbedByUltimateIds.includes(id));
      const extraCeramicIds = extraIds.filter(isCeramic);
      const extraRegularIds = extraIds.filter(id => !isCeramic(id));
      const extraBundlePct = bundlePctFor(extraRegularIds.length);
      const extraCeramicPct = extraCeramicIds.length >= 3 ? 0.25 : extraCeramicIds.length === 2 ? 0.15 : 0;
      const extrasRows = extraIds.map(id => {
        const base = getAddonPriceForSize(id, size);
        const discounted = isCeramic(id)
          ? Math.round(base * (1 - extraCeramicPct))
          : addonDiscountedPrice(id, base, extraBundlePct);
        return { id, label: ADDON_LABELS[id] ?? id, base, discounted, savings: base - discounted };
      });
      const extrasTotal = extrasRows.reduce((s, r) => s + r.discounted, 0);
      const ultimateGrandTotal = displayBundlePrice + extrasTotal;
      ultimateBundle = {
        price: displayBundlePrice,
        extrasRows,
        extrasTotal,
        grandTotal: ultimateGrandTotal,
        savings: grandTotal - ultimateGrandTotal,
        includesExtToggle: addExtToUltimate,
        extPrice,
      };
    }

    return {
      foundationPrice, addonRows, addonsTotal, totalSavings, grandTotal,
      pctLabel: labelParts.length > 0 ? labelParts.join(" · ") : null,
      ultimatePreferred,
      ultimateBundle,
      ultimateNudge: eligibleForUltimateNudge
        ? { price: ultimatePrice, delta: ultimateDelta }
        : null,
    };
  }, [scope, severity, pains, services, size, removedAddonIds, addExtToUltimate]);

  // ── Closed state — just the trigger button ────────────────────────────────
  if (!open) {
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] hover:bg-[#D4AF37]/[0.14] hover:border-[#D4AF37]/70 active:scale-[0.97] transition-all"
        >
          <Wand2 size={11} className="text-[#D4AF37] group-hover:rotate-12 transition-transform" />
          <span className="text-[10.5px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Build me a package</span>
          <ChevronRight size={11} className="text-[#D4AF37]/70 group-hover:translate-x-0.5 transition-transform" />
        </button>
      );
    }
    return (
      <div className="w-full max-w-3xl mx-auto mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative w-full inline-flex items-center justify-center gap-2.5 px-5 py-4 rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.14] via-[#D4AF37]/[0.05] to-zinc-900/70 hover:from-[#D4AF37]/[0.22] hover:border-[#D4AF37]/75 active:scale-[0.99] transition-all overflow-hidden shadow-[0_8px_28px_rgba(212,175,55,0.10)] hover:shadow-[0_12px_36px_rgba(212,175,55,0.20)]"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.22)_0%,transparent_65%)]" />
          <Wand2 size={16} className="text-[#D4AF37] group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-black uppercase tracking-[0.18em] text-[#D4AF37]">Build a package for me</span>
          <span className="hidden sm:inline text-[10px] text-zinc-500 font-bold">· ~60 seconds</span>
          <ChevronRight size={14} className="text-[#D4AF37]/70 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  const stepLabels = ["What needs love?", "What's bugging you?", "How long since last detail?", "Which vehicle?", "Your build"];

  // ── Open state — questionnaire shell ──────────────────────────────────────
  return (
    <div className="w-full max-w-lg mx-auto mb-4">
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="relative rounded-3xl border border-[#D4AF37]/45 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        {/* Gold glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.22)_0%,transparent_70%)]" />
        {/* Top accent line */}
        <div aria-hidden="true" className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

        {/* Top bar: progress + close */}
        <div className="relative flex items-center justify-between px-4 pt-4 pb-2.5">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map(n => (
              <div
                key={n}
                className={`h-1 rounded-full transition-all ${
                  n < step ? "w-5 bg-[#D4AF37]"
                  : n === step ? "w-8 bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                  : "w-3 bg-zinc-700"
                }`}
              />
            ))}
            <span className="ml-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Step {step + 1} of 5
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step title */}
        <div className="relative px-5 pb-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]/80">{stepLabels[step]}</p>
        </div>

        <div className="relative px-4 pb-4 pt-3">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Step 0 — Scope ──────────────────────────────────────── */}
            {step === 0 && (
              <motion.div key="step-scope" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                <p className="text-lg sm:text-xl font-black text-white text-center mb-1">Where does your ride need help?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">Pick the scope — we&apos;ll suggest the right package.</p>
                <div className="grid grid-cols-1 gap-2">
                  {SCOPE_TILES.map(tile => {
                    const Icon = tile.icon;
                    const selected = scope === tile.id;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => { setScope(tile.id); setPains([]); setSeverity(null); setStep(1); }}
                        className={`rounded-2xl border transition-all active:scale-[0.99] px-4 py-3.5 text-left flex items-center gap-3 ${
                          selected ? "border-[#D4AF37]/70 bg-[#D4AF37]/[0.08]"
                          : "border-white/[0.07] bg-zinc-900/60 hover:border-[#D4AF37]/55 hover:bg-zinc-900"
                        }`}
                      >
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/12 border border-[#D4AF37]/25 flex items-center justify-center">
                          <Icon size={16} className="text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white">{tile.label}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{tile.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 1 — Pains ──────────────────────────────────────── */}
            {step === 1 && scope && (
              <motion.div key="step-pains" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                <p className="text-lg sm:text-xl font-black text-white text-center mb-1">What&apos;s bothering you most?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">
                  Tap everything that applies. {pains.length > 0 ? <span className="text-[#D4AF37] font-bold">{pains.length} picked</span> : "Pick at least one — or skip if nothing specific."}
                </p>
                <div className="grid grid-cols-1 gap-1.5 mb-3 max-h-[50vh] overflow-y-auto pr-1">
                  {availablePains.map(p => {
                    const selected = pains.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPains(prev => selected ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                        className={`rounded-xl border px-3 py-2.5 text-left flex items-center gap-2.5 transition-all active:scale-[0.99] ${
                          selected
                            ? "border-[#D4AF37] bg-[#D4AF37]/[0.10] shadow-[0_2px_10px_rgba(212,175,55,0.15)]"
                            : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/35"
                        }`}
                      >
                        <span className="shrink-0 text-lg leading-none">{p.emoji}</span>
                        <span className={`flex-1 text-[12px] leading-tight ${selected ? "text-white font-bold" : "text-zinc-300"}`}>
                          {p.label}
                        </span>
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          selected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                        }`}>
                          {selected && <Check size={11} className="text-black" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <NavRow onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={false} nextLabel="Continue" />
              </motion.div>
            )}

            {/* ── Step 2 — Severity ───────────────────────────────────── */}
            {step === 2 && scope && (
              <motion.div key="step-severity" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                <p className="text-lg sm:text-xl font-black text-white text-center mb-1">When was your last detail?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">Tells us how deep to go on the recommended package.</p>
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {SEVERITY_TILES.map(tile => {
                    const selected = severity === tile.id;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => { setSeverity(tile.id); setStep(3); }}
                        className={`rounded-2xl border transition-all active:scale-[0.99] px-4 py-3.5 text-left flex items-center gap-3 ${
                          selected ? "border-[#D4AF37]/70 bg-[#D4AF37]/[0.08]"
                          : "border-white/[0.07] bg-zinc-900/60 hover:border-[#D4AF37]/55 hover:bg-zinc-900"
                        }`}
                      >
                        <span className="shrink-0 text-2xl">{tile.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white">{tile.label}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{tile.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-zinc-500 text-[11px] font-black uppercase tracking-wider hover:text-zinc-300"
                >
                  <ChevronLeft size={12} /> Back
                </button>
              </motion.div>
            )}

            {/* ── Step 3 — Vehicle ────────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step-vehicle" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                <p className="text-lg sm:text-xl font-black text-white text-center mb-1">Which vehicle?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">
                  So we can price it accurately — the modal will already know your car when you book.
                </p>
                <div className="space-y-2.5">
                  {vehicleCollapsed ? (
                    /* Compact chip — full-width single row with vehicle summary + edit affordance */
                    <button
                      type="button"
                      onClick={() => setVehicleCollapsed(false)}
                      className="w-full flex items-center gap-3 rounded-2xl border border-[#D4AF37]/45 bg-[#D4AF37]/[0.06] px-3.5 py-3 hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/[0.10] active:scale-[0.99] transition-all text-left"
                    >
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                        <Car size={15} className="text-[#D4AF37]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]/80 mb-0.5">Your vehicle</p>
                        <p className="text-sm font-black text-white truncate leading-tight">
                          {year} {make} {model}
                        </p>
                      </div>
                      <div className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/80">
                        <Pencil size={11} /> Edit
                      </div>
                    </button>
                  ) : (
                    /* Full form — expanded */
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Year</label>
                        <input
                          value={year}
                          onChange={e => setYear(e.target.value)}
                          placeholder="2022"
                          inputMode="numeric"
                          className="w-full bg-zinc-950/50 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Make</label>
                        <QuizAutocomplete value={make} onChange={setMake} placeholder="Toyota" getOptions={q => {
                          const nq = q.trim().toLowerCase();
                          return nq ? getAllMakeSuggestions().filter(m => m.toLowerCase().includes(nq)) : getAllMakeSuggestions();
                        }} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Model</label>
                        <QuizAutocomplete value={model} onChange={setModel} placeholder="Camry" disabled={!make.trim()} getOptions={q => {
                          const nq = q.trim().toLowerCase();
                          const all = getModelSuggestionsForMake(make);
                          return nq ? all.filter(m => m.toLowerCase().includes(nq)) : all;
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Size — when we auto-detect from the make/model, show a
                      locked read-only chip so the customer can't accidentally
                      pick the wrong tier. Manual pickers still surface if we
                      couldn't match the model against the DB. */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Size</label>
                    {autoDetected ? (
                      <div className="w-full rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/[0.10] px-3 py-2.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest">
                          <Zap size={8} className="fill-[#D4AF37]" /> Auto-detected
                        </span>
                        <span className="text-[12px] font-black text-white">{SIZE_LABELS[size]}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["sedan", "suv", "xl"] as Size[]).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSize(s)}
                            className={`py-2 rounded-xl border text-[10.5px] font-black transition-all ${
                              size === s
                                ? "bg-[#D4AF37] border-[#D4AF37] text-black"
                                : "border-white/[0.08] text-zinc-400 hover:border-[#D4AF37]/35"
                            }`}
                          >{SIZE_LABELS[s]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <NavRow
                    onBack={() => setStep(2)}
                    onNext={() => setStep(4)}
                    nextDisabled={!year || !make || !model}
                    nextLabel="See my build"
                  />
                  {(!year || !make || !model) && (
                    <p className="text-[10px] text-zinc-600 mt-2 text-center flex items-center justify-center gap-1">
                      <Info size={10} /> Enter year, make, and model to continue.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Step 4 — Result ─────────────────────────────────────── */}
            {step === 4 && scope && severity && buildSummary && (
              <motion.div key="step-result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }}>
                <ResultCard
                  scope={scope}
                  vehicle={{ year, make, model, size }}
                  buildSummary={buildSummary}
                  confirmingRemoveId={confirmingRemoveId}
                  onRequestRemove={id => setConfirmingRemoveId(id)}
                  onCancelRemove={() => setConfirmingRemoveId(null)}
                  onConfirmRemove={id => {
                    setRemovedAddonIds(prev => prev.includes(id) ? prev : [...prev, id]);
                    setConfirmingRemoveId(null);
                  }}
                  onUse={() => {
                    onUseBuild({
                      foundation: scope,
                      addonIds: buildSummary.addonRows.map(r => r.id),
                      vehicle: { year, make, model, size },
                    });
                    close();
                  }}
                  addExtToUltimate={addExtToUltimate}
                  onToggleExt={() => setAddExtToUltimate(v => !v)}
                  onSwitchToUltimate={() => {
                    // Upgrade path — swap to Ultimate and drop the add-ons it
                    // already covers (shampoo, salt, leather, pet hair, clay bar).
                    // If the customer toggled +Ext ON (default for "Both" scope,
                    // opt-in for interior-only), include ultimate_ext_addon so
                    // the booking flow charges + schedules the Exterior Detail
                    // bundle at the Ultimate bundle rate.
                    const absorbed = INCLUDED_IN_ULTIMATE_ADDON_IDS;
                    const kept = buildSummary.addonRows
                      .map(r => r.id)
                      .filter(id => !absorbed.includes(id));
                    const finalAddonIds = addExtToUltimate
                      ? ["ultimate_ext_addon", ...kept]
                      : kept;
                    onUseBuild({
                      foundation: "interior",  // maps to Ultimate via preferUltimate
                      addonIds: finalAddonIds,
                      vehicle: { year, make, model, size },
                      preferUltimate: true,
                    });
                    close();
                  }}
                  onRestart={reset}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Nav row shared by Steps 1, 3 ─────────────────────────────────────────────
function NavRow({ onBack, onNext, nextDisabled, nextLabel }: { onBack: () => void; onNext: () => void; nextDisabled: boolean; nextLabel: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-[11px] font-black uppercase tracking-wider hover:border-white/[0.16]"
      >
        <ChevronLeft size={12} /> Back
      </button>
      <button
        type="button"
        onClick={() => !nextDisabled && onNext()}
        disabled={nextDisabled}
        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.97] ${
          !nextDisabled
            ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.3)]"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        {nextLabel} <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Compact autocomplete used inside the quiz's vehicle step ─────────────────
function QuizAutocomplete({ value, onChange, placeholder, disabled, getOptions }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  getOptions: (q: string) => string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = disabled ? [] : getOptions(value);
  const show = open && !disabled && options.length > 0;
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full bg-zinc-950/50 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/50 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {show && (
        <div className="absolute top-full left-0 right-0 z-[80] mt-1 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl shadow-black/60">
          {options.slice(0, 10).map(o => (
            <button
              key={o}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({
  scope,
  vehicle,
  buildSummary,
  confirmingRemoveId,
  onRequestRemove,
  onCancelRemove,
  onConfirmRemove,
  onUse,
  onSwitchToUltimate,
  addExtToUltimate,
  onToggleExt,
  onRestart,
}: {
  scope: Scope;
  vehicle: { year: string; make: string; model: string; size: Size };
  buildSummary: NonNullable<ReturnType<typeof useBuildSummaryStub>>;
  confirmingRemoveId: string | null;
  onRequestRemove: (id: string) => void;
  onCancelRemove: () => void;
  onConfirmRemove: (id: string) => void;
  onUse: () => void;
  onSwitchToUltimate: () => void;
  addExtToUltimate: boolean;
  onToggleExt: () => void;
  onRestart: () => void;
}) {
  // Look up the add-on being confirmed for the popover. Search both the
  // main addon rows and Ultimate-extras rows so the confirmation works in
  // either result-card layout.
  const rowBeingRemoved =
    confirmingRemoveId
      ? (buildSummary.addonRows.find(r => r.id === confirmingRemoveId)
          ?? buildSummary.ultimateBundle?.extrasRows.find(r => r.id === confirmingRemoveId)
          ?? null)
      : null;
  const display = FOUNDATION_DISPLAY[scope];
  const Icon = display.icon;
  const includes = FOUNDATION_INCLUDES[scope];
  const vehicleLine = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");

  // Confirmation popover — shown as an absolute overlay over the current
  // ResultCard body when a "-" is clicked on an add-on row. Explains what
  // the customer will lose so they can make an informed call.
  const confirmDialog = rowBeingRemoved && (
    <div className="absolute inset-0 z-40 flex items-center justify-center px-3 py-3">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={onCancelRemove}
        aria-hidden
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-2xl border border-amber-500/45 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <AlertTriangle size={15} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-0.5">Are you sure?</p>
            <p className="text-[14px] font-black text-white leading-tight">Remove {rowBeingRemoved.label}?</p>
          </div>
        </div>
        <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5 mb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400/80 mb-1.5">You'll be missing out on</p>
          <p className="text-[11.5px] text-zinc-300 leading-snug mb-2">
            {ADDON_DESCRIPTIONS[rowBeingRemoved.id] ?? "This add-on covers work that the base package doesn't include."}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">You'll save</span>
            <span className="text-sm font-black text-emerald-300 tabular-nums">−${rowBeingRemoved.discounted}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancelRemove}
            className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-[11px] font-black uppercase tracking-wider active:scale-[0.97] transition-all"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={() => onConfirmRemove(rowBeingRemoved.id)}
            className="flex-1 py-2.5 rounded-xl border border-red-500/40 bg-red-500/[0.08] text-red-300 text-[11px] font-black uppercase tracking-wider hover:bg-red-500/[0.14] active:scale-[0.97] transition-all"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );

  // ── Auto-default to Ultimate ──────────────────────────────────────────
  // When the à la carte build costs the same or more than the Ultimate
  // tier, present Ultimate as THE recommendation with a clear "why this
  // is smarter" explainer. Customer can still tap the fallback to keep
  // their custom build if they explicitly want the base package.
  if (buildSummary.ultimatePreferred && buildSummary.ultimateBundle) {
    const bundle = buildSummary.ultimateBundle;
    return (
      <div className="relative">
        {confirmDialog}
        <div className="text-center mb-3">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400">
            ⭐ Smarter pick for your build
          </p>
        </div>

        {/* Why-explainer callout at the top so the "we changed your pick" moment is honest */}
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[0.08] px-3 py-2.5 mb-3">
          <p className="text-[11px] text-emerald-200 leading-snug">
            Based on what you picked, your à la carte build totals{" "}
            <span className="font-black text-emerald-100">${buildSummary.grandTotal}</span>.
            {" "}
            {bundle.includesExtToggle
              ? "Ultimate Reset + Exterior Detail covers everything you picked"
              : "Ultimate Interior Reset covers everything you picked"}
            {bundle.extrasRows.length > 0 ? " (plus the extras below)" : ""}{" "}
            for{" "}
            <span className="font-black text-emerald-100">${bundle.grandTotal}</span>
            {bundle.savings > 0 && (
              <>
                {" — saving you "}
                <span className="font-black text-emerald-100">${bundle.savings}</span>
              </>
            )}
            {" and adding seats-out access we don't do in the base packages."}
          </p>
        </div>

        {/* Ultimate foundation card — swapped in as the primary. When
            scope=full, title + include list also reflect the +Exterior
            Detail bundle that's been added on top of Ultimate. */}
        <div className="rounded-2xl border border-emerald-400/60 bg-gradient-to-br from-emerald-500/[0.10] via-zinc-900 to-zinc-950 p-4 mb-2.5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
          <div className="flex items-start gap-3 mb-3">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles size={17} className="text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-black text-white leading-tight">
                {bundle.includesExtToggle ? "Ultimate Reset + Exterior Detail" : "Ultimate Interior Reset"}
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                {bundle.includesExtToggle ? "Full-vehicle reset · seats out + exterior" : "Flagship interior · seats out"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-lg font-black text-emerald-300 tabular-nums">${bundle.price}</span>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-0.5">{SIZE_LABELS[vehicle.size]}</p>
            </div>
          </div>
          <div className="rounded-xl bg-zinc-950/60 border border-emerald-500/15 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/90 mb-1.5">All included</p>
            <ul className="grid grid-cols-1 gap-1">
              {ULTIMATE_INCLUDES.map(item => (
                <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-snug">
                  <Check size={10} className="text-emerald-400 shrink-0 mt-[3px]" strokeWidth={3} />
                  <span>{item}</span>
                </li>
              ))}
              {bundle.includesExtToggle && [
                "Full hand wash + wheels + tires + trim",
                "1–3 month ceramic spray sealant on paint",
                "Exterior glass cleaned + protected",
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-snug">
                  <Check size={10} className="text-emerald-400 shrink-0 mt-[3px]" strokeWidth={3} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Extras — add-ons that AREN'T already in Ultimate (headlights,
            engine bay, clay bar, ceramics, etc). Kept from original build. */}
        {bundle.extrasRows.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-3.5 mb-2.5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400 mb-2.5">
              Kept from your build ({bundle.extrasRows.length})
            </p>
            <ul className="space-y-2">
              {bundle.extrasRows.map(r => (
                <li key={r.id} className="rounded-xl border border-white/[0.05] bg-zinc-950/50 px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[12px] font-bold text-zinc-100 leading-tight flex-1 min-w-0">+ {r.label}</span>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[11px] tabular-nums">
                        {r.savings > 0 ? (
                          <>
                            <span className="text-zinc-600 line-through mr-1">${r.base}</span>
                            <span className="text-[#D4AF37] font-black">${r.discounted}</span>
                          </>
                        ) : (
                          <span className="text-zinc-200 font-bold">${r.discounted}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRequestRemove(r.id)}
                        aria-label={`Remove ${r.label}`}
                        title="Remove"
                        className="w-6 h-6 rounded-full border border-white/[0.08] bg-zinc-900/70 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/[0.08] active:scale-90 transition-all"
                      >
                        <Minus size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  {ADDON_DESCRIPTIONS[r.id] && (
                    <p className="text-[10.5px] text-zinc-500 leading-snug">{ADDON_DESCRIPTIONS[r.id]}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* + Exterior Detail upgrade toggle — always available on the Ultimate
            result. Defaults ON when scope=full (customer wanted both sides),
            OFF for interior-only. Toggling updates the total + booking handoff
            live so what they see IS what gets sent to the booking flow. */}
        <label
          className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 mb-3 cursor-pointer transition-all active:scale-[0.99] ${
            addExtToUltimate
              ? "border-emerald-400/60 bg-emerald-500/[0.10] hover:border-emerald-400/80"
              : "border-white/[0.08] bg-zinc-900/50 hover:border-emerald-400/40 hover:bg-zinc-900/70"
          }`}
        >
          <input
            type="checkbox"
            checked={addExtToUltimate}
            onChange={onToggleExt}
            className="sr-only"
          />
          <span className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            addExtToUltimate
              ? "border-emerald-400 bg-emerald-400"
              : "border-white/20 bg-zinc-950/60"
          }`}>
            {addExtToUltimate && <Check size={13} className="text-black" strokeWidth={3.5} />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Droplets size={12} className={addExtToUltimate ? "text-emerald-300" : "text-zinc-500"} />
              <p className={`text-[12.5px] font-black leading-tight ${addExtToUltimate ? "text-white" : "text-zinc-200"}`}>
                Add Exterior Detail
              </p>
            </div>
            <p className="text-[10.5px] text-zinc-500 leading-snug mt-0.5">
              Hand wash + wheels + tires + trim + 1–3mo ceramic sealant.
              Bundled rate saves ~$55 vs à la carte.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className={`text-[11px] font-black tabular-nums ${addExtToUltimate ? "text-emerald-300" : "text-zinc-400"}`}>
              +${bundle.extPrice}
            </span>
            <p className="text-[8.5px] font-bold uppercase tracking-widest text-zinc-600 mt-0.5">
              {SIZE_LABELS[vehicle.size].split(" / ")[0]}
            </p>
          </div>
        </label>

        {/* Total — Ultimate + extras */}
        <div className="rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/[0.10] via-zinc-900 to-zinc-950 px-4 py-3 mb-3 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                {vehicleLine ? `${vehicleLine} · ${SIZE_LABELS[vehicle.size]}` : SIZE_LABELS[vehicle.size]}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mt-0.5">
                Total ({bundle.includesExtToggle ? "Ultimate + Ext" : "Ultimate"})
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-300 tabular-nums leading-none">${bundle.grandTotal}</span>
              {bundle.savings > 0 && (
                <p className="text-[9px] font-black tabular-nums text-emerald-400 mt-1">
                  ${bundle.savings} less than à la carte
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchToUltimate}
          className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_6px_22px_rgba(52,211,153,0.35)] active:scale-[0.97] transition-all"
        >
          <Calendar size={16} /> Pick my date & time <ArrowRight size={15} />
        </button>
        <button
          type="button"
          onClick={onUse}
          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 border border-white/[0.06] hover:border-white/[0.12]"
        >
          Keep custom build (${buildSummary.grandTotal}) instead
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
        >
          <RotateCcw size={11} /> Start over
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {confirmDialog}
      <div className="text-center mb-3">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400">✨ Your custom build</p>
      </div>

      {/* Foundation card */}
      <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-4 mb-2.5 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <Icon size={17} className="text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-black text-white leading-tight">{display.name}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Foundation package</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg font-black text-zinc-100 tabular-nums">${buildSummary.foundationPrice}</span>
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-0.5">{SIZE_LABELS[vehicle.size]}</p>
          </div>
        </div>
        {/* Included features */}
        <div className="rounded-xl bg-zinc-950/60 border border-white/[0.04] px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80 mb-1.5">Included</p>
          <ul className="space-y-1">
            {includes.map(item => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-snug">
                <Check size={10} className="text-emerald-400 shrink-0 mt-[3px]" strokeWidth={3} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Add-ons — each with description */}
      {buildSummary.addonRows.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-3.5 mb-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
              Add-ons ({buildSummary.addonRows.length})
            </p>
            {buildSummary.pctLabel && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/[0.12] border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                <Sparkles size={8} /> {buildSummary.pctLabel}
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {buildSummary.addonRows.map(r => (
              <li key={r.id} className="rounded-xl border border-white/[0.05] bg-zinc-950/50 px-2.5 py-2">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[12px] font-bold text-zinc-100 leading-tight flex-1 min-w-0">+ {r.label}</span>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] tabular-nums">
                      {r.savings > 0 ? (
                        <>
                          <span className="text-zinc-600 line-through mr-1">${r.base}</span>
                          <span className="text-[#D4AF37] font-black">${r.discounted}</span>
                        </>
                      ) : (
                        <span className="text-zinc-200 font-bold">${r.discounted}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRequestRemove(r.id)}
                      aria-label={`Remove ${r.label}`}
                      title="Remove"
                      className="w-6 h-6 rounded-full border border-white/[0.08] bg-zinc-900/70 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/[0.08] active:scale-90 transition-all"
                    >
                      <Minus size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                {ADDON_DESCRIPTIONS[r.id] && (
                  <p className="text-[10.5px] text-zinc-500 leading-snug">{ADDON_DESCRIPTIONS[r.id]}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 px-3.5 py-3 mb-2.5">
          <p className="text-[11px] text-zinc-500 text-center">Just the foundation — no add-ons flagged based on your answers.</p>
        </div>
      )}

      {/* Ultimate upgrade nudge — fires when Ultimate is within $100 of the
          current build. Shows a comparison: what the customer already has vs
          what Ultimate adds on top (green = extras Ultimate gives you). */}
      {buildSummary.ultimateNudge && (() => {
        const selectedAddonIds = new Set(buildSummary.addonRows.map(r => r.id));
        // Full scope nudges toward Ultimate + Ext, not plain Ultimate.
        const nudgeIsFullBundle = scope === "full";
        const nudgeLabel = nudgeIsFullBundle ? "Ultimate + Exterior" : "Ultimate";
        // Split Ultimate includes into two lists — items already covered by
        // the customer's build (an add-on maps to it) and items that would
        // be NEW / EXTRA with Ultimate.
        const alreadyIncluded: string[] = [];
        const extraWithUltimate: string[] = [];
        for (const item of ULTIMATE_INCLUDES) {
          const addonId = ULTIMATE_INCLUDES_ADDON_MAP[item];
          if (addonId && selectedAddonIds.has(addonId)) alreadyIncluded.push(item);
          else extraWithUltimate.push(item);
        }
        // For full-scope nudges: clay bar is now baked into Ultimate itself
        // (handled via ULTIMATE_INCLUDES_ADDON_MAP above). Only the exterior
        // wash / trim / spray sealant come from the +Ext toggle.
        if (nudgeIsFullBundle) {
          extraWithUltimate.push("Full hand wash + wheels + tires + trim");
          extraWithUltimate.push("1–3 month ceramic spray sealant");
        }
        return (
          <div className="rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/[0.10] via-zinc-900 to-zinc-950 p-4 mb-3 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

            {/* Header — pitch + price comparison */}
            <div className="flex items-start gap-2.5 mb-3">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center">
                <Sparkles size={15} className="text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Almost there</p>
                <p className="text-[13px] font-black text-white leading-tight">
                  Upgrade to {nudgeLabel} for just{" "}
                  <span className="text-emerald-300">${buildSummary.ultimateNudge.delta} more</span>
                </p>
                <p className="text-[10.5px] text-zinc-400 mt-0.5 leading-snug">
                  Your build: <span className="text-zinc-300 font-black">${buildSummary.grandTotal}</span>{" "}
                  → {nudgeLabel}: <span className="text-emerald-300 font-black">${buildSummary.ultimateNudge.price}</span>
                </p>
              </div>
            </div>

            {/* Comparison — already-included vs Ultimate extras */}
            {alreadyIncluded.length > 0 && (
              <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5 mb-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                  Already in your build
                </p>
                <ul className="grid grid-cols-1 gap-1">
                  {alreadyIncluded.map(item => (
                    <li key={item} className="flex items-start gap-1.5 text-[10.5px] text-zinc-400 leading-snug">
                      <Check size={10} className="text-zinc-500 shrink-0 mt-[3px]" strokeWidth={3} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30 px-3 py-2.5 mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1.5">
                + Extra with Ultimate ({extraWithUltimate.length})
              </p>
              <ul className="grid grid-cols-1 gap-1">
                {extraWithUltimate.map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] text-emerald-100 leading-snug font-semibold">
                    <Check size={10} className="text-emerald-300 shrink-0 mt-[3px]" strokeWidth={3} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={onSwitchToUltimate}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_4px_14px_rgba(52,211,153,0.35)] active:scale-[0.97] transition-all"
            >
              Upgrade to {nudgeLabel} · ${buildSummary.ultimateNudge.price} <ArrowRight size={13} />
            </button>
          </div>
        );
      })()}

      {/* Total — big and prominent */}
      <div className="rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.10] via-zinc-900 to-zinc-950 px-4 py-3 mb-3 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              {vehicleLine ? `${vehicleLine} · ${SIZE_LABELS[vehicle.size]}` : SIZE_LABELS[vehicle.size]}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/80 mt-0.5">Total</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-[#D4AF37] tabular-nums leading-none">${buildSummary.grandTotal}</span>
            {buildSummary.totalSavings > 0 && (
              <p className="text-[9px] font-black tabular-nums text-emerald-400 mt-1">
                You save ${buildSummary.totalSavings}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onUse}
        className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_6px_22px_rgba(212,175,55,0.35)] hover:shadow-[0_8px_28px_rgba(212,175,55,0.45)] active:scale-[0.97] transition-all"
      >
        <Calendar size={16} /> Pick my date & time <ArrowRight size={15} />
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        <RotateCcw size={11} /> Start over
      </button>
    </div>
  );
}

// Helper to type ResultCard's props without circular imports.
function useBuildSummaryStub() {
  return null as null | {
    foundationPrice: number;
    addonsTotal: number;
    totalSavings: number;
    grandTotal: number;
    pctLabel: string | null;
    addonRows: Array<{ id: string; label: string; base: number; discounted: number; savings: number }>;
    ultimatePreferred: boolean;
    ultimateBundle: null | {
      price: number;
      extrasRows: Array<{ id: string; label: string; base: number; discounted: number; savings: number }>;
      extrasTotal: number;
      grandTotal: number;
      savings: number;
      includesExtToggle: boolean;
      extPrice: number;
    };
    ultimateNudge: null | { price: number; delta: number };
  };
}

// What Ultimate Interior Reset actually delivers — used for the included-
// features checklist on the Ultimate result card. Mirrors the DB description
// + ServicesPage marketing bullets. Salt/ozone are NOT here (they're
// separate add-ons on the Ultimate flow).
const ULTIMATE_INCLUDES: string[] = [
  "Seats REMOVED for deep steam clean",
  "Full carpet & upholstery shampoo",
  "Salt stain removal + neutralization",
  "Leather conditioning (if applicable)",
  "Heavy pet hair extraction",
  "Clay bar paint decontamination",
  "Steam clean every surface, vacuum every crevice",
  "Disinfect + protect all interior surfaces",
  "Interior glass streak-free (all windows)",
  "Rubber/carpet mats cleaned and protected",
  "Trunk fully included",
];

// Which entries in ULTIMATE_INCLUDES are ALREADY covered by a customer
// add-on. Used on the nudge card to highlight what's extra with Ultimate
// (items not already in the customer's build appear in green).
const ULTIMATE_INCLUDES_ADDON_MAP: Record<string, string> = {
  "Full carpet & upholstery shampoo":   "upholstery_shampoo",
  "Salt stain removal + neutralization":"salt_stain_removal",
  "Leather conditioning (if applicable)":"leather_condition",
  "Heavy pet hair extraction":          "pet_hair",
  "Clay bar paint decontamination":     "clay_bar",
};
