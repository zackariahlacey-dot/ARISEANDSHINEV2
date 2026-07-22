/**
 * Cash-payment discount — RETIRED July 2026.
 *
 * The per-booking cash discount ($10 / $15 / $20 based on total) was removed
 * per owner request. Both helpers are kept as no-ops so every downstream
 * caller (booking modal display, admin schedule, email templates, server
 * booking action) still compiles and the "if (cashPrice < cardPrice)" guards
 * around cash rendering all fail — silently hiding the dual-price display,
 * "save $X cash" line, and email cash callout everywhere.
 *
 * Monthly-plan cash pricing is a separate system (lib/monthlyPlans.ts) with
 * its own hardcoded cashPrice per plan — that is NOT affected.
 */

/** Returns 0 — cash discount retired. */
export function cashDiscountFor(_cardPrice: number): number {
  void _cardPrice;
  return 0;
}

/** Returns the card price unchanged — cash discount retired. */
export function cashPriceFor(cardPrice: number): number {
  if (!isFinite(cardPrice) || cardPrice <= 0) return 0;
  return Math.max(0, Math.round(cardPrice * 100) / 100);
}
