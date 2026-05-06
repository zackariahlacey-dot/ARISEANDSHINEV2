/**
 * Cash-payment discount.
 *
 * Quietly knocks a fixed dollar amount off the total when a customer pays
 * cash on arrival. Customers see the lower price; they don't see how it's
 * computed. Both client (booking modal) and server (bookDetailing) call
 * these helpers so a tampered client cannot fake a larger discount.
 */

/** Returns the cash discount (dollars) for a given card-price total. */
export function cashDiscountFor(cardPrice: number): number {
  if (!isFinite(cardPrice) || cardPrice <= 0) return 0;
  if (cardPrice <= 200) return 10;
  if (cardPrice <= 300) return 15;
  return 20;
}

/** Returns the cash price (rounded to cents, never below 0). */
export function cashPriceFor(cardPrice: number): number {
  const out = cardPrice - cashDiscountFor(cardPrice);
  return Math.max(0, Math.round(out * 100) / 100);
}
