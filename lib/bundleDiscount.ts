/**
 * Bundle discount system — pure percentage per add-on.
 *
 *   Bundle (basic add-on stacking):
 *     1 add-on    → no discount
 *     2 add-ons   → 10% off each
 *     3+ add-ons  → 15% off each
 *
 *   Premium-service bonus (Ultimate Interior Reset, Ultimate Full Reset):
 *     +10% off every basic add-on, automatically applied — stacks on top
 *     of the bundle tier.
 *     1 add-on @ premium  → 10%
 *     2 add-ons @ premium → 20%   (10% bundle + 10% premium)
 *     3+ add-ons @ premium → 25%  (15% bundle + 10% premium)
 *
 * The body ceramic (`ceramic_3yr`) caps at $50 off max — even at the 25%
 * tier its absolute discount can't exceed that. Protects margin on the
 * single most expensive add-on; everything else takes the full percentage.
 *
 * Seat Removal SKUs and Ceramic Package members are EXCLUDED from this
 * bundle math. Ceramic items get their own 15/25% package discount.
 * Seat Removal bundles already have savings baked into the bundle prices.
 */

/** The body ceramic capped at $50 off max regardless of tier. */
export const CAPPED_ADDON_DISCOUNTS: Record<string, number> = {
  ceramic_3yr: 50,
};

/** Additional discount applied to basic add-ons when the booked service is a
 *  premium (Ultimate) package. Stacks additively with the bundle tier. */
export const PREMIUM_SERVICE_BONUS_PCT = 0.10;

/** True if the service name qualifies for the Premium add-on bonus. */
export function isPremiumServiceName(serviceName: string | null | undefined): boolean {
  if (!serviceName) return false;
  return serviceName.toLowerCase().includes("ultimate");
}

/** Bundle-tier percentage off each add-on for the given paid-add-on count. */
export function bundlePctFor(qualifyingAddonCount: number): number {
  if (qualifyingAddonCount <= 1) return 0;
  if (qualifyingAddonCount === 2) return 0.10;
  return 0.15;
}

/** Effective percentage including the Premium service bonus. */
export function effectiveBundlePctFor(
  qualifyingAddonCount: number,
  isPremiumService: boolean,
): number {
  const base = bundlePctFor(qualifyingAddonCount);
  return isPremiumService ? base + PREMIUM_SERVICE_BONUS_PCT : base;
}

/** Dollar amount off ONE add-on, applying the cap when relevant. */
export function addonDiscountAmount(addonId: string, basePrice: number, pct: number): number {
  if (pct <= 0 || basePrice <= 0) return 0;
  const raw = basePrice * pct;
  const cap = CAPPED_ADDON_DISCOUNTS[addonId];
  const amount = cap != null ? Math.min(raw, cap) : raw;
  return Math.round(amount);
}

/** Final price for one add-on after the bundle discount, rounded to a whole dollar. */
export function addonDiscountedPrice(addonId: string, basePrice: number, pct: number): number {
  return Math.max(0, basePrice - addonDiscountAmount(addonId, basePrice, pct));
}

/** Total $ savings across an add-on list at the current tier (rounded). */
export function totalAddonBundleSavings(
  addons: Array<{ id: string; price: number }>,
  qualifyingAddonCount: number,
): number {
  const pct = bundlePctFor(qualifyingAddonCount);
  if (pct <= 0) return 0;
  return addons.reduce((s, a) => s + addonDiscountAmount(a.id, a.price, pct), 0);
}

/** Friendly label e.g. "10% off each" for UI hints. */
export function bundlePctLabel(qualifyingAddonCount: number): string {
  const p = bundlePctFor(qualifyingAddonCount);
  if (p <= 0) return "";
  return `${Math.round(p * 100)}% off`;
}
