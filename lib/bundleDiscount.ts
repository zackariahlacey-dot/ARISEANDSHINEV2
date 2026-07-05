/**
 * Bundle discount system — July 2026 lineup.
 *
 *   Basic add-on stacking (per user spec):
 *     1 add-on   → no discount
 *     2 add-ons  → 5% off each
 *     3 add-ons  → 10% off each
 *     4 add-ons  → 12% off each
 *     5+ add-ons → 15% off each
 *
 *   Ultimate + Exterior toggle unlock:
 *     When customer toggles "+ Exterior" on Ultimate Interior Reset,
 *     ALL basic add-ons additionally get 20% off. Stacks on top of the
 *     bundle tier if any (e.g. 4 add-ons + toggle = 12% + 20% = 32% off).
 *
 *   Premium Ceramic sections (separate volume tier):
 *     2 sections  → 5% off each
 *     3 sections  → 10%
 *     4 sections  → 15%
 *     5+ sections → 20% off each
 *
 * Premium Ceramic add-ons are EXCLUDED from the basic bundle math — they
 * have their own volume tier above. The Ultimate + Ext unlock does NOT
 * apply to Premium Ceramic (already flat-tiered).
 */

/** No caps in the new system — kept for backwards compatibility with old references. */
export const CAPPED_ADDON_DISCOUNTS: Record<string, number> = {};

/** Ultimate + Exterior toggle bonus applied on top of the basic bundle tier. */
export const ULTIMATE_EXT_UNLOCK_PCT = 0.20;

/** Legacy alias — kept so older imports keep compiling. Maps to the same
 *  20% Ultimate + Exterior toggle bonus. */
export const PREMIUM_ADDON_BONUS_PCT = ULTIMATE_EXT_UNLOCK_PCT;

/** Basic bundle tier — percentage off each add-on for the count. */
export function bundlePctFor(qualifyingAddonCount: number): number {
  if (qualifyingAddonCount <= 1) return 0;
  if (qualifyingAddonCount === 2) return 0.05;
  if (qualifyingAddonCount === 3) return 0.10;
  if (qualifyingAddonCount === 4) return 0.12;
  return 0.15; // 5+
}

/** Premium Ceramic section volume tier — separate stack. */
export function ceramicSectionPctFor(sectionCount: number): number {
  if (sectionCount <= 1) return 0;
  if (sectionCount === 2) return 0.05;
  if (sectionCount === 3) return 0.10;
  if (sectionCount === 4) return 0.15;
  return 0.20; // 5+
}

/** Effective percentage off basic add-ons, including Ultimate + Ext unlock. */
export function effectiveBundlePctFor(
  qualifyingAddonCount: number,
  ultimateExtToggled: boolean,
): number {
  const base = bundlePctFor(qualifyingAddonCount);
  return ultimateExtToggled ? base + ULTIMATE_EXT_UNLOCK_PCT : base;
}

/** Dollar amount off ONE add-on at the given effective percentage, rounded. */
export function addonDiscountAmount(_addonId: string, basePrice: number, pct: number): number {
  if (pct <= 0 || basePrice <= 0) return 0;
  return Math.round(basePrice * pct);
}

/** Final price for one add-on after discount, rounded to a whole dollar. */
export function addonDiscountedPrice(addonId: string, basePrice: number, pct: number): number {
  return Math.max(0, basePrice - addonDiscountAmount(addonId, basePrice, pct));
}

/** Total $ savings across an add-on list at the current basic tier (rounded). */
export function totalAddonBundleSavings(
  addons: Array<{ id: string; price: number }>,
  qualifyingAddonCount: number,
  ultimateExtToggled = false,
): number {
  const pct = effectiveBundlePctFor(qualifyingAddonCount, ultimateExtToggled);
  if (pct <= 0) return 0;
  return addons.reduce((s, a) => s + addonDiscountAmount(a.id, a.price, pct), 0);
}

/** Friendly label e.g. "10% off each" for UI hints. */
export function bundlePctLabel(qualifyingAddonCount: number, ultimateExtToggled = false): string {
  const p = effectiveBundlePctFor(qualifyingAddonCount, ultimateExtToggled);
  if (p <= 0) return "";
  return `${Math.round(p * 100)}% off each`;
}

/** Label for the Premium Ceramic section-by-section volume tier. */
export function ceramicSectionPctLabel(sectionCount: number): string {
  const p = ceramicSectionPctFor(sectionCount);
  if (p <= 0) return "";
  return `${Math.round(p * 100)}% off each section`;
}
