// Canonical metadata for every customer-facing passenger-vehicle add-on.
// July 2026 lineup — simplified to 8 basics + special (Ultimate + Ext toggle)
// + 5-Year Gentech Graphene tier (Body / Body + Wheels / Full Vehicle).
//
// Marine, RV, Truck, Heavy Equipment add-ons live in their own catalogues
// under components/landing/* (this file is passenger-vehicle only).
//
// KEEP IN SYNC with lib/adminAddons.ts (admin catalogue).

export type AddonSize = "sedan" | "suv" | "xl";

export type AddonMeta = {
  id: string;
  label: string;
  side: "interior" | "exterior" | "ceramic" | "special";
  /** Base price in dollars, per size. Single number = flat across sizes. */
  basePrice: number | Record<AddonSize, number>;
  /** Base duration in minutes, per size. 0 = doesn't extend booking. */
  baseDuration: number | Record<AddonSize, number>;
  /** Not counted toward the basic bundle discount tier (Gentech + Ultimate +
   *  Ext toggle are special modifiers with their own discount rules). */
  excludedFromBundleCount?: boolean;
  /** Only shown / applicable when Ultimate Interior Reset is the base package. */
  ultimateOnly?: boolean;
};

export const ADDON_META: AddonMeta[] = [
  // ── The 8 basics (interior) ──────────────────────────────────────────
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo", side: "interior",
    basePrice: 75, baseDuration: 0 },
  { id: "salt_stain_removal", label: "Mild–Medium Salt Removal", side: "interior",
    basePrice: 65, baseDuration: 45 },
  { id: "leather_condition",  label: "Leather Conditioning", side: "interior",
    basePrice: 40, baseDuration: 0 },
  { id: "ozone_treatment",    label: "Ozone Treatment", side: "interior",
    basePrice: 60, baseDuration: 60 },
  { id: "pet_hair",           label: "Heavy Pet Hair Removal", side: "interior",
    basePrice: 50, baseDuration: 30 },

  // ── The 8 basics (exterior) ──────────────────────────────────────────
  { id: "engine_bay",        label: "Engine Bay Detail", side: "exterior",
    basePrice: 65, baseDuration: 30 },
  { id: "clay_bar",          label: "Clay Bar Treatment", side: "exterior",
    basePrice: 50, baseDuration: 30 },
  { id: "headlight_restore", label: "Headlight Restoration (pair)", side: "exterior",
    basePrice: 75, baseDuration: 30 },

  // ── Ceramic upgrade — RETIRED July 2026 v4 ─────
  // (kept out of the ADDON_META so it can't be selected anywhere new)

  // ── Ultimate + Exterior toggle (special — only on Ultimate Interior Reset) ──
  { id: "ultimate_ext_addon", label: "+ Exterior Detail (bundled)", side: "special",
    basePrice: { sedan: 65, suv: 80, xl: 95 },
    baseDuration: { sedan: 60, suv: 75, xl: 90 },
    excludedFromBundleCount: true, ultimateOnly: true },

  // ── Premium Ceramic sections — RETIRED July 2026 v5 ─────
  // Replaced by the 3 clean Gentech options below. Historical bookings
  // still render their line items via ADMIN_ADDONS legacy entries.

  // ── 5-Year Gentech Graphene Ceramic (the 3 clean options) ───────────
  { id: "gentech_5yr_body",         label: "5-Yr Gentech — Body Coating", side: "ceramic",
    basePrice: { sedan: 295, suv: 375, xl: 450 },
    baseDuration: { sedan: 60, suv: 75, xl: 90 },
    excludedFromBundleCount: true },
  { id: "gentech_5yr_body_wheels",  label: "5-Yr Gentech — Body + Wheels", side: "ceramic",
    basePrice: { sedan: 395, suv: 475, xl: 550 },
    baseDuration: { sedan: 90, suv: 105, xl: 120 },
    excludedFromBundleCount: true },
  { id: "gentech_5yr_full_vehicle", label: "5-Yr Gentech — Full Vehicle (Body + Wheels + Windows)", side: "ceramic",
    basePrice: { sedan: 495, suv: 575, xl: 650 },
    baseDuration: { sedan: 120, suv: 135, xl: 150 },
    excludedFromBundleCount: true },
];

export const ADDON_SIZES: AddonSize[] = ["sedan", "suv", "xl"];

export const SIZE_LABEL: Record<AddonSize, string> = {
  sedan: "Sedan / Coupe",
  suv:   "SUV / Truck",
  xl:    "3-Row / Work Van",
};

/** IDs that are included by default in Ultimate Interior Reset. */
export const ULTIMATE_INTERIOR_INCLUDED_ADDONS = new Set<string>([
  "upholstery_shampoo",  // seat + carpet shampoo is core to Ultimate
  "leather_condition",   // included if leather present
  "pet_hair",            // heavy vacuum + shampoo covers this
  "salt_stain_removal",  // salt neutralization included in the reset
  "clay_bar",            // paint decontamination prep baked into Ultimate
]);

/** Retired July 2026 v5 — Premium Ceramic sections were replaced by the
 *  3 clean Gentech options. Kept as an empty tuple so any surviving
 *  reference still compiles + iterates without side-effects. */
export const PREMIUM_CERAMIC_SECTION_IDS = [] as const;

export function getBasePriceForSize(meta: AddonMeta, size: AddonSize): number {
  return typeof meta.basePrice === "number" ? meta.basePrice : meta.basePrice[size];
}

export function getBaseDurationForSize(meta: AddonMeta, size: AddonSize): number {
  return typeof meta.baseDuration === "number" ? meta.baseDuration : meta.baseDuration[size];
}

/** True iff the addon's base price varies by size. */
export function isPriceSized(meta: AddonMeta): boolean {
  return typeof meta.basePrice !== "number";
}

/** True iff the addon's base duration varies by size. */
export function isDurationSized(meta: AddonMeta): boolean {
  return typeof meta.baseDuration !== "number";
}

/** Look up an add-on by id — returns undefined for unknown ids. */
export function getAddonMeta(id: string): AddonMeta | undefined {
  return ADDON_META.find(a => a.id === id);
}
