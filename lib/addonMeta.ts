// Canonical metadata for every customer-facing add-on. Mirrors the source
// of truth in components/landing/BuildYourPackage.tsx + BookingModal.tsx.
// The admin pricing UI reads from here so it always knows what "base" is,
// even when the customer-facing components keep their own copies.
//
// KEEP IN SYNC when adding / renaming an add-on (the override layer doesn't
// auto-discover new add-ons — they need an entry here to show up in the
// pricing admin).

export type AddonSize = "sedan" | "suv" | "xl";

export type AddonMeta = {
  id: string;
  label: string;
  side: "interior" | "exterior";
  // Base price in dollars, per size. If a single number, applies to all sizes.
  basePrice: number | Record<AddonSize, number>;
  // Base duration in minutes, per size. If a single number, applies to all
  // sizes. If 0, the add-on doesn't extend the booking slot.
  baseDuration: number | Record<AddonSize, number>;
};

export const ADDON_META: AddonMeta[] = [
  // ── Interior ───────────────────────────────────────────────────────────
  { id: "upholstery_shampoo", label: "Carpet & Upholstery Shampoo", side: "interior",
    basePrice:   { sedan: 75,  suv: 75,  xl: 105 },
    baseDuration:{ sedan: 30,  suv: 30,  xl: 60  } },
  { id: "pet_hair",           label: "Heavy Pet Hair Removal",      side: "interior",
    basePrice: 75, baseDuration: 30 },
  { id: "leather_condition",  label: "Leather Conditioning",        side: "interior",
    basePrice: 45, baseDuration: 0 },
  { id: "uv_interior",        label: "UV / Trim & Plastic Restoration & Protection", side: "interior",
    basePrice: 35, baseDuration: 0 },
  { id: "odor_bomb",          label: "Strong Odor Elimination",     side: "interior",
    basePrice: 60, baseDuration: 60 },
  { id: "headliner_clean",    label: "Headliner Cleaning",          side: "interior",
    basePrice: 35, baseDuration: 30 },
  { id: "salt_stain_removal", label: "Minor Salt Stain Treatment",    side: "interior",
    basePrice: 50, baseDuration: 30 },
  { id: "extreme_salt_removal", label: "Extreme Salt Stain Treatment", side: "interior",
    basePrice: 150, baseDuration: 75 },
  { id: "seat_removal_driver",    label: "Seat Removal — Driver Side",    side: "interior",
    basePrice: 60,  baseDuration: 30 },
  { id: "seat_removal_passenger", label: "Seat Removal — Passenger Side", side: "interior",
    basePrice: 60,  baseDuration: 30 },
  { id: "seat_removal_rear",      label: "Seat Removal — Rear Seats",      side: "interior",
    basePrice: 85,  baseDuration: 45 },
  { id: "seat_removal_3rd_row",   label: "Seat Removal — 3rd Row",         side: "interior",
    basePrice: 95,  baseDuration: 45 },
  { id: "seat_removal_all_2row",  label: "All Seats Removed — 2-Row Bundle", side: "interior",
    basePrice: 150, baseDuration: 90 },
  { id: "seat_removal_all_3row",  label: "All Seats Removed — 3-Row Bundle", side: "interior",
    basePrice: 225, baseDuration: 135 },
  // ── Exterior ───────────────────────────────────────────────────────────
  { id: "clay_bar",           label: "Clay Bar Treatment",          side: "exterior",
    basePrice: 50, baseDuration: 0 },
  { id: "engine_bay",         label: "Engine Bay Detail",           side: "exterior",
    basePrice: 85, baseDuration: 30 },
  { id: "headlight_restore",  label: "Headlight Restoration",       side: "exterior",
    basePrice: 65, baseDuration: 30 },
  { id: "mech_chem_decon",    label: "Mechanical & Chemical Decontamination", side: "exterior",
    basePrice: 70, baseDuration: 30 },
  { id: "salt_recovery_addon",label: "Salt Recovery — Undercarriage", side: "exterior",
    basePrice: 75, baseDuration: 30 },
  { id: "wheel_ceramic",      label: "Wheel & Caliper Ceramic Coating", side: "exterior",
    basePrice: 125, baseDuration: 60 },
  { id: "ceramic_3yr",        label: "2-Year Pro Ceramic Sealant (Body)", side: "exterior",
    basePrice:   { sedan: 300, suv: 350, xl: 400 },
    baseDuration:{ sedan: 90,  suv: 120, xl: 150 } },
  { id: "window_coat_windshield", label: "Graphene Window — Windshield Only", side: "exterior",
    basePrice: 100, baseDuration: 60 },
  { id: "window_coat_front",      label: "Graphene Window — Front 3 Windows", side: "exterior",
    basePrice: 150, baseDuration: 60 },
  { id: "window_coat_all",        label: "Graphene Window — All Windows", side: "exterior",
    basePrice: 250, baseDuration: 60 },
];

export const ADDON_SIZES: AddonSize[] = ["sedan", "suv", "xl"];

export const SIZE_LABEL: Record<AddonSize, string> = {
  sedan: "Sedan / Coupe",
  suv:   "SUV / Truck",
  xl:    "3-Row / Work Van",
};

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
