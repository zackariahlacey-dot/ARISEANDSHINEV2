// Canonical metadata for every customer-facing passenger-vehicle add-on.
// July 2026 lineup — simplified to 8 basics + special (ceramic upgrade,
// Ultimate + Ext toggle) + Premium Ceramic section-by-section tier.
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
  /** Not counted toward the basic bundle discount tier (Premium Ceramic
   *  has its own volume tier; Ultimate + Ext toggle is a special modifier). */
  excludedFromBundleCount?: boolean;
  /** Only shown / applicable when Ultimate Interior Reset is the base package. */
  ultimateOnly?: boolean;
};

export const ADDON_META: AddonMeta[] = [
  // ── The 8 basics (interior) ──────────────────────────────────────────
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo", side: "interior",
    basePrice: 95, baseDuration: 0 },
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

  // ── Ceramic upgrade (special — replaces the free 1–3mo included) ─────
  { id: "ceramic_6_10_upgrade", label: "6–10 Month Ceramic Spray Upgrade", side: "special",
    basePrice: 45, baseDuration: 0, excludedFromBundleCount: true },

  // ── Ultimate + Exterior toggle (special — only on Ultimate Interior Reset) ──
  { id: "ultimate_ext_addon", label: "+ Exterior Detail (bundled)", side: "special",
    basePrice: { sedan: 65, suv: 80, xl: 95 },
    baseDuration: { sedan: 60, suv: 75, xl: 90 },
    excludedFromBundleCount: true, ultimateOnly: true },

  // ── Premium Ceramic sections (own volume tier) ───────────────────────
  { id: "premium_ceramic_hood",           label: "Premium Ceramic — Hood",             side: "ceramic",
    basePrice: 85,  baseDuration: 30, excludedFromBundleCount: true },
  { id: "premium_ceramic_roof",           label: "Premium Ceramic — Roof",             side: "ceramic",
    basePrice: 75,  baseDuration: 30, excludedFromBundleCount: true },
  { id: "premium_ceramic_trunk",          label: "Premium Ceramic — Trunk / Rear Hatch", side: "ceramic",
    basePrice: 60,  baseDuration: 20, excludedFromBundleCount: true },
  { id: "premium_ceramic_front_bumper",   label: "Premium Ceramic — Front Bumper",     side: "ceramic",
    basePrice: 65,  baseDuration: 25, excludedFromBundleCount: true },
  { id: "premium_ceramic_rear_bumper",    label: "Premium Ceramic — Rear Bumper",      side: "ceramic",
    basePrice: 65,  baseDuration: 25, excludedFromBundleCount: true },
  { id: "premium_ceramic_doors",          label: "Premium Ceramic — All Doors",        side: "ceramic",
    basePrice: 110, baseDuration: 60, excludedFromBundleCount: true },
  { id: "premium_ceramic_fenders",        label: "Premium Ceramic — All Fenders",      side: "ceramic",
    basePrice: 75,  baseDuration: 30, excludedFromBundleCount: true },
  { id: "premium_ceramic_mirrors",        label: "Premium Ceramic — Mirrors (pair)",   side: "ceramic",
    basePrice: 30,  baseDuration: 15, excludedFromBundleCount: true },
  { id: "premium_ceramic_wheels",         label: "Premium Ceramic — Wheels + Calipers", side: "ceramic",
    basePrice: 150, baseDuration: 60, excludedFromBundleCount: true },
  { id: "premium_ceramic_windshield",     label: "Premium Ceramic — Windshield",       side: "ceramic",
    basePrice: 95,  baseDuration: 30, excludedFromBundleCount: true },
  { id: "premium_ceramic_side_rear_glass", label: "Premium Ceramic — Side + Rear Glass", side: "ceramic",
    basePrice: 175, baseDuration: 45, excludedFromBundleCount: true },
  { id: "premium_ceramic_full_glass",     label: "Premium Ceramic — Full Glass (all)", side: "ceramic",
    basePrice: 250, baseDuration: 60, excludedFromBundleCount: true },
  { id: "premium_ceramic_full_body",      label: "Premium Ceramic — Full Body Bundle (best value)", side: "ceramic",
    basePrice:    { sedan: 650, suv: 775, xl: 895 },
    baseDuration: { sedan: 60, suv: 60, xl: 60 },
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

/** Sections available in the Premium Ceramic add-on picker (in display order). */
export const PREMIUM_CERAMIC_SECTION_IDS = [
  "premium_ceramic_hood",
  "premium_ceramic_roof",
  "premium_ceramic_trunk",
  "premium_ceramic_front_bumper",
  "premium_ceramic_rear_bumper",
  "premium_ceramic_doors",
  "premium_ceramic_fenders",
  "premium_ceramic_mirrors",
  "premium_ceramic_wheels",
  "premium_ceramic_windshield",
  "premium_ceramic_side_rear_glass",
  "premium_ceramic_full_glass",
];

/** Full Body Bundle — separate from the section picker. */
export const PREMIUM_CERAMIC_FULL_BODY_ID = "premium_ceramic_full_body";

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
