// ─── Light Detailing item catalog ─────────────────────────────────────────
// Per-item pricing scaled by vehicle size. Kept in code so we can tune
// without a migration. The DB service row stores the MINIMUM per size
// so any accidental empty booking has a floor.
//
// Positioning: strictly maintenance. Not a deep clean. Customer must pick
// 2+ items to book. Always scheduled 1 hour regardless of count; anything
// over 1 hour on-site incurs additional charges at standard rate.

export type LightDetailSize = "sedan" | "suv" | "xl";

export type LightDetailItem = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  prices: Record<LightDetailSize, number>;
};

export const LIGHT_DETAIL_ITEMS: LightDetailItem[] = [
  {
    id: "vacuum",
    label: "Quick Vacuum Pass",
    emoji: "🧹",
    description: "Fast vacuum of seats, carpets, and floor mats — surface debris only, not embedded dirt.",
    prices: { sedan: 30, suv: 35, xl: 40 },
  },
  {
    id: "wipe_down",
    label: "Interior Wipe-Down",
    emoji: "🧽",
    description: "Quick wipe of dash, doors, and center console — dust and light grime, no deep detailing.",
    prices: { sedan: 25, suv: 30, xl: 35 },
  },
  {
    id: "floor_mats",
    label: "Floor Mats",
    emoji: "👟",
    description: "Shake out, rinse, and dress floor mats. Bring 'em back looking fresh.",
    prices: { sedan: 30, suv: 35, xl: 40 },
  },
  {
    id: "windows",
    label: "Windows (Interior + Exterior)",
    emoji: "🪟",
    description: "Streak-free clean on all windows inside and out.",
    prices: { sedan: 20, suv: 25, xl: 30 },
  },
  {
    id: "exterior_rinse",
    label: "Quick Exterior Rinse/Wash",
    emoji: "💦",
    description: "Fast hand wash + rinse + dry. Not a full exterior detail — no clay, wax, or sealant.",
    prices: { sedan: 35, suv: 45, xl: 55 },
  },
  {
    id: "tire_shine",
    label: "Tire Shine + Wheel Wipe",
    emoji: "🛞",
    description: "Wipe wheels, dress tires. Quick pop of shine — not a full wheel decontamination.",
    prices: { sedan: 20, suv: 25, xl: 30 },
  },
];

// Minimum charge per size. Enforced in UI + booking action.
export const LIGHT_DETAIL_MINIMUM: Record<LightDetailSize, number> = {
  sedan: 65,
  suv:   75,
  xl:    85,
};

// Minimum item count required to book.
export const LIGHT_DETAIL_MIN_ITEMS = 2;

// Base duration for 2–5 items (default flow).
export const LIGHT_DETAIL_DURATION_MINS = 60;
// Extended duration when the customer picks ALL items — the full pass takes
// up to 90 minutes. Slot always reserves 90 min in SERVICE_DURATIONS so we
// never under-book; the picker just tells the customer the honest ETA.
export const LIGHT_DETAIL_MAX_DURATION_MINS = 90;

/** Returns the honest expected duration for the customer based on their pick. */
export function getLightDetailDuration(itemCount: number): number {
  return itemCount >= LIGHT_DETAIL_ITEMS.length
    ? LIGHT_DETAIL_MAX_DURATION_MINS
    : LIGHT_DETAIL_DURATION_MINS;
}

// Items definitely NOT included in Light Detailing — surfaced in a
// "won't cover" list so customers know when to book Basic instead.
export const LIGHT_DETAIL_NOT_INCLUDED: string[] = [
  "Pet hair extraction",
  "Set-in stain or spill cleanup",
  "Salt stain removal or neutralization",
  "Embedded dirt or ground-in grime",
  "Clay bar or paint decontamination",
  "Leather deep-conditioning",
  "Ozone or odor removal",
];

/**
 * Compute the effective Light Detailing price for a set of selected items.
 * Applies the size minimum floor, and returns the breakdown.
 */
export function computeLightDetailPrice(
  selectedIds: string[],
  size: LightDetailSize,
): { subtotal: number; minimumApplied: boolean; finalPrice: number; itemsPriced: { id: string; label: string; price: number }[] } {
  const itemsPriced = selectedIds
    .map(id => {
      const item = LIGHT_DETAIL_ITEMS.find(i => i.id === id);
      if (!item) return null;
      return { id: item.id, label: item.label, price: item.prices[size] };
    })
    .filter((x): x is { id: string; label: string; price: number } => x !== null);

  const subtotal = itemsPriced.reduce((s, i) => s + i.price, 0);
  const minimum = LIGHT_DETAIL_MINIMUM[size];
  const finalPrice = Math.max(subtotal, minimum);
  return {
    subtotal,
    minimumApplied: subtotal < minimum,
    finalPrice,
    itemsPriced,
  };
}
