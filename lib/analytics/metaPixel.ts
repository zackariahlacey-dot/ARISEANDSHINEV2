// Meta Pixel event helpers. Pixel is loaded in app/layout.tsx via next/script;
// this module exposes typed wrappers so components can fire conversion events
// without touching `window.fbq` directly.
//
// SSR-safe: all helpers no-op when `window` is undefined or the pixel hasn't
// finished loading yet. The pixel script queues calls that happen before load,
// so early fires still make it through.

type FbEventName =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "AddToCart"
  | "Lead"
  | "CompleteRegistration"
  | "Contact"
  | "Purchase";

type FbEventParams = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  contents?: Array<{ id: string; quantity?: number; item_price?: number }>;
  num_items?: number;
  [key: string]: unknown;
};

declare global {
  interface Window {
    fbq?: (
      command: "track" | "trackCustom" | "init" | "consent",
      eventName: string,
      params?: FbEventParams,
    ) => void;
  }
}

/** Fire a standard Meta Pixel event. No-ops on the server. */
export function trackFbEvent(name: FbEventName, params?: FbEventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  try {
    if (params) window.fbq("track", name, params);
    else window.fbq("track", name);
  } catch {
    // Never let ad tracking break the app.
  }
}

/** Fire a non-standard custom event (shows up in Ads Manager as a Custom Event). */
export function trackFbCustom(name: string, params?: FbEventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  try {
    if (params) window.fbq("trackCustom", name, params);
    else window.fbq("trackCustom", name);
  } catch {
    // swallow
  }
}

/** Customer opened a booking flow — anywhere that leads toward a paid booking. */
export function trackFbInitiateCheckout(params?: {
  content_name?: string;
  content_category?: string;
  value?: number;
}): void {
  trackFbEvent("InitiateCheckout", { currency: "USD", ...params });
}

/** Customer submitted contact info without paying (Squeeze Me In, quote request). */
export function trackFbLead(params?: {
  content_name?: string;
  content_category?: string;
}): void {
  trackFbEvent("Lead", params);
}

/** Customer successfully booked and (for Stripe path) paid. `value` in dollars. */
export function trackFbPurchase(params: {
  value: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
}): void {
  trackFbEvent("Purchase", { currency: "USD", ...params });
}
