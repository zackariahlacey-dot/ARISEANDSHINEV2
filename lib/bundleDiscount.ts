/**
 * Bundle discount system — July 2026 v4 (flat-dollar per-item).
 *
 *   Basic add-on stacking:
 *     1 add-on   → no discount
 *     2 add-ons  → $15 off total (the 2nd add-on saves $15)
 *     3 add-ons  → $35 off total ($15 for 2nd + $20 for 3rd)
 *     4 add-ons  → $55 off total ($15 + $20 + $20)
 *     N add-ons  → $15 + $20 * max(0, N - 2)
 *
 *   Premium Ceramic sections (separate volume tier, unchanged):
 *     2 sections  → 5% off each
 *     3 sections  → 10%
 *     4 sections  → 15%
 *     5+ sections → 20% off each
 *
 * The old percentage-based API (bundlePctFor, addonDiscountedPrice, etc.) is
 * retained as no-ops (return 0 pct / base price) so existing per-item
 * strikethrough UI silently disappears. Discounts now surface as a single
 * "Bundle savings: −$X" line in the total breakdown.
 */

/** No caps in the new system — kept for backwards compatibility. */
export const CAPPED_ADDON_DISCOUNTS: Record<string, number> = {};

/** July 2026 v4 — Reset perk: every à-la-carte add-on stacked on a Reset
 *  package is 50% off. Overrides the flat-dollar bundle savings when active. */
export const RESET_ADDON_DISCOUNT_PCT = 0.5;

/** Returns the per-add-on % discount for a given service name.
 *  Reset (DB name "The Refresh — …" or legacy "Ultimate Interior Reset"
 *  / "The Reset — Full") triggers the 50% off perk. Everything else = 0. */
export function serviceAddonDiscountPct(serviceName: string | null | undefined): number {
  if (!serviceName) return 0;
  const n = serviceName.toLowerCase();
  if (n.includes("refresh") || n.includes("reset") || n.includes("ultimate")) return RESET_ADDON_DISCOUNT_PCT;
  return 0;
}

/** Retired — kept as 0 so any surviving reference compiles + adds nothing. */
export const ULTIMATE_EXT_UNLOCK_PCT = 0;

/** Legacy alias — kept so older imports keep compiling. */
export const PREMIUM_ADDON_BONUS_PCT = 0;

/** Per-add-on savings step (2nd add-on and 3rd+ add-on). */
const SAVE_ON_2ND = 15;
const SAVE_ON_3RD_PLUS = 20;

/** Total flat-dollar bundle savings for a given add-on count. */
export function flatBundleSavings(qualifyingAddonCount: number): number {
  if (qualifyingAddonCount <= 1) return 0;
  return SAVE_ON_2ND + SAVE_ON_3RD_PLUS * (qualifyingAddonCount - 2);
}

/** How much adding one more add-on would save on top of the current count. */
export function nextAddonSavings(currentCount: number): number {
  // Adding the next add-on takes count from N → N+1. The delta in flatBundleSavings:
  //   0 → 1: 0 (no discount)
  //   1 → 2: $15 (2nd unlocks)
  //   2 → 3: $20 (3rd adds $20)
  //   3+ → 4+: $20 each
  if (currentCount === 0) return 0;      // 1st add-on unlocks nothing
  if (currentCount === 1) return SAVE_ON_2ND;
  return SAVE_ON_3RD_PLUS;
}

/** Short label for the current tier — used in UI totals and inline hints. */
export function flatBundleSavingsLabel(qualifyingAddonCount: number): string {
  const s = flatBundleSavings(qualifyingAddonCount);
  if (s <= 0) return "";
  return `Save $${s}`;
}

/** ── Retained-for-compat: percentage-based API now returns 0 (no per-item pct) ── */

export function bundlePctFor(_qualifyingAddonCount: number): number {
  void _qualifyingAddonCount;
  return 0;
}

export function ceramicSectionPctFor(sectionCount: number): number {
  if (sectionCount <= 1) return 0;
  if (sectionCount === 2) return 0.05;
  if (sectionCount === 3) return 0.10;
  if (sectionCount === 4) return 0.15;
  return 0.20;
}

export function effectiveBundlePctFor(
  _qualifyingAddonCount: number,
  _ultimateExtToggled: boolean,
): number {
  void _qualifyingAddonCount; void _ultimateExtToggled;
  return 0;
}

export function addonDiscountAmount(_addonId: string, _basePrice: number, _pct: number): number {
  void _addonId; void _basePrice; void _pct;
  return 0;
}

export function addonDiscountedPrice(_addonId: string, basePrice: number, _pct: number): number {
  void _addonId; void _pct;
  return Math.max(0, basePrice);
}

export function totalAddonBundleSavings(
  _addons: Array<{ id: string; price: number }>,
  qualifyingAddonCount: number,
  _ultimateExtToggled = false,
): number {
  void _addons; void _ultimateExtToggled;
  // Route legacy callers to the new flat-dollar system so their totals stay accurate.
  return flatBundleSavings(qualifyingAddonCount);
}

export function bundlePctLabel(qualifyingAddonCount: number, _ultimateExtToggled = false): string {
  void _ultimateExtToggled;
  return flatBundleSavingsLabel(qualifyingAddonCount);
}

export function ceramicSectionPctLabel(sectionCount: number): string {
  const p = ceramicSectionPctFor(sectionCount);
  if (p <= 0) return "";
  return `${Math.round(p * 100)}% off each section`;
}
