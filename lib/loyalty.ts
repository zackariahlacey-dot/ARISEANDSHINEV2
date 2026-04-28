/**
 * Loyalty discount tier system.
 * Customers earn tiers based on completed car details (not boat/RV).
 * Discount auto-applies at checkout for vehicle detailing only.
 */

export const LOYALTY_TIERS = [
  { minDetails: 10, pct: 20, label: "VIP", badge: "VIP — 20% Off Forever" },
  { minDetails: 5,  pct: 15, label: "Gold", badge: "Gold — 15% Off" },
  { minDetails: 3,  pct: 10, label: "Silver", badge: "Silver — 10% Off" },
  { minDetails: 1,  pct: 5,  label: "Member", badge: "Member — 5% Off" },
] as const;

/** Services that count toward loyalty tier progress */
export const CAR_DETAIL_SERVICES = new Set([
  "Interior Detail",
  "Exterior Detail",
  "Full Detail",
  "Ultimate Interior Reset",
  "Ultimate Interior + Exterior Reset",
]);

/** Services that the loyalty discount applies to at checkout */
export const LOYALTY_DISCOUNT_SERVICES = new Set([
  "Interior Detail",
  "Exterior Detail",
  "Full Detail",
  "Ultimate Interior Reset",
  "Ultimate Interior + Exterior Reset",
]);

/** Returns the discount % (0–20) for a given completed detail count */
export function getDiscountPct(completedDetailCount: number): number {
  for (const tier of LOYALTY_TIERS) {
    if (completedDetailCount >= tier.minDetails) return tier.pct;
  }
  return 0;
}

/** Returns the full tier object for a count, or null if not yet at tier 1 */
export function getTier(completedDetailCount: number) {
  for (const tier of LOYALTY_TIERS) {
    if (completedDetailCount >= tier.minDetails) return tier;
  }
  return null;
}

/** Details until the next tier unlock, or null if already at max (VIP) */
export function detailsToNextTier(completedDetailCount: number): number | null {
  const thresholds = [1, 3, 5, 10];
  for (const t of thresholds) {
    if (completedDetailCount < t) return t - completedDetailCount;
  }
  return null; // Already VIP
}

/** Dollar amount saved by the loyalty discount */
export function loyaltyDiscountAmount(price: number, pct: number): number {
  if (pct <= 0) return 0;
  return Math.round((price * pct) / 100 * 100) / 100;
}
