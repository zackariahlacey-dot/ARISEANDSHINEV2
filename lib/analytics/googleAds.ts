// Google Ads (gtag) conversion tracking helpers.
// The gtag.js loader is initialized in app/layout.tsx and exposes
// window.gtag globally. These helpers wrap it with light typing + safe
// no-op behavior on SSR / when gtag hasn't loaded yet.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Google Ads conversion label for the "Purchase" event, from the Ads dashboard. */
export const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18281977763/09e6CMqpq8ccEKOvw41E";

/** Fire the Purchase conversion event to Google Ads. Safe on SSR + when gtag
 *  hasn't loaded yet (silent no-op). */
export function trackGoogleAdsPurchase(params: {
  /** Booking ID — becomes the transaction_id so Google can dedupe. */
  transactionId: string;
  /** Dollar amount (post-discount) — Google Ads uses this for ROAS. */
  value?: number;
  currency?: string;
  /** Set to true when the customer has no prior booking. */
  newCustomer?: boolean;
}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const payload: Record<string, unknown> = {
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
    transaction_id: params.transactionId,
  };
  if (typeof params.value === "number") payload.value = params.value;
  payload.currency = params.currency ?? "USD";
  if (typeof params.newCustomer === "boolean") payload.new_customer = params.newCustomer;
  try {
    window.gtag("event", "conversion", payload);
  } catch (e) {
    console.warn("Google Ads Purchase conversion failed to fire:", e);
  }
}
