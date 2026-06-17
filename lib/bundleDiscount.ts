/**
 * Bundle discount system — pure percentage per add-on.
 *
 *   1 add-on    → no discount
 *   2 add-ons   → 10% off each
 *   3+ add-ons  → 15% off each
 *
 * The body ceramic (`ceramic_3yr`) caps at $50 off max — even at the 15%
 * tier its absolute discount can't exceed that. Protects margin on the
 * single most expensive add-on; everything else (wheel ceramic, window
 * coatings, smaller add-ons) takes the full percentage.
 *
 * Seat Removal SKUs and Ceramic Package members are EXCLUDED from this
 * bundle math (see BookingModal.tsx + BuildYourPackage.tsx). Ceramic items
 * get their own 10/20/30% package discount. Seat Removal bundles already
 * have savings baked into the 2-Row ($150) and 3-Row ($225) package prices.
 *
 * All displayed dollar amounts are rounded to the nearest whole dollar so
 * the customer never sees $19.50.
 */

/** The body ceramic capped at $50 off max regardless of tier. */
export const CAPPED_ADDON_DISCOUNTS: Record<string, number> = {
  ceramic_3yr: 50,
};

/** Percentage off each add-on at the given tier. Pass the count of *paid*
 *  (non-free-unlock) add-ons stacked. */
export function bundlePctFor(qualifyingAddonCount: number): number {
  if (qualifyingAddonCount <= 1) return 0;
  if (qualifyingAddonCount === 2) return 0.10;
  return 0.15;
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
