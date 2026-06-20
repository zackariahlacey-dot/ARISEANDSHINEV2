/**
 * Bundle discount system — pure percentage per add-on.
 *
 *   Bundle (basic add-on stacking):
 *     1 add-on    → no discount
 *     2 add-ons   → 10% off each
 *     3+ add-ons  → 15% off each
 *
 *   Premium add-on bonus (unlocked when ANY premium add-on is selected
 *   — ceramic package member, seat removal, etc.):
 *     +15% off every basic add-on, applied on top of the bundle tier.
 *     2 basic + premium  → 25%  (10% bundle + 15% premium)
 *     3+ basic + premium → 30%  (15% bundle + 15% premium)
 *     1 basic + premium  → 15%  (premium only — bundle requires 2+)
 *
 * The body coating (`ceramic_3yr`) caps at $50 off max — even at the top
 * tier its absolute discount can't exceed that. Protects margin on the
 * single most expensive add-on; everything else takes the full percentage.
 *
 * Premium add-ons themselves (ceramic + seat removal) are EXCLUDED from
 * the basic bundle math. Ceramic items get their own 15/25% package
 * discount (tier-laddered separately). Seat Removal bundles have savings
 * baked into the bundle SKU prices already.
 */

/** The body coating capped at $50 off max regardless of tier. */
export const CAPPED_ADDON_DISCOUNTS: Record<string, number> = {
  ceramic_3yr: 50,
};

/** Bonus applied to basic add-ons when the customer has at least one
 *  Premium add-on selected (ceramic / seat removal). Stacks additively
 *  with the basic bundle tier. */
export const PREMIUM_ADDON_BONUS_PCT = 0.15;

/** Bundle-tier percentage off each add-on for the given paid-add-on count. */
export function bundlePctFor(qualifyingAddonCount: number): number {
  if (qualifyingAddonCount <= 1) return 0;
  if (qualifyingAddonCount === 2) return 0.10;
  return 0.15;
}

/** Effective percentage including the Premium add-on bonus.
 *  @param qualifyingAddonCount paid basic add-ons (ceramic + seat removal excluded)
 *  @param hasPremiumAddon true when ≥1 premium add-on (ceramic / seat removal) is picked
 */
export function effectiveBundlePctFor(
  qualifyingAddonCount: number,
  hasPremiumAddon: boolean,
): number {
  const base = bundlePctFor(qualifyingAddonCount);
  return hasPremiumAddon ? base + PREMIUM_ADDON_BONUS_PCT : base;
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
