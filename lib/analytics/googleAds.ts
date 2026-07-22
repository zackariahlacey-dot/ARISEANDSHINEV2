// Google Ads (gtag) conversion tracking helpers.
// The gtag.js loader is initialized in app/layout.tsx and exposes
// window.gtag globally. These helpers wrap it with light typing + safe
// no-op behavior on SSR / when gtag hasn't loaded yet.
//
// Enhanced Conversions: Google requires passing hashed customer data
// (email, phone, name, address) with the conversion for higher-quality
// attribution. gtag automatically hashes these client-side before sending —
// nothing plaintext leaves the browser.
// Docs: https://support.google.com/google-ads/answer/13258081

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Google Ads conversion label for the "Purchase" event, from the Ads dashboard. */
export const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18281977763/09e6CMqpq8ccEKOvw41E";

/** Best-effort split of a full name into first/last. Google Ads Enhanced
 *  Conversions wants them separate — passing them combined weakens attribution. */
function splitName(fullName?: string): { first_name?: string; last_name?: string } {
  const s = (fullName ?? "").trim();
  if (!s) return {};
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0] };
  return {
    first_name: parts[0],
    last_name:  parts.slice(1).join(" "),
  };
}

/** Reduce a US phone to +1XXXXXXXXXX (E.164). Returns undefined if not enough digits. */
function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  let d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return undefined;
  return `+1${d}`;
}

/** Fire the Purchase conversion event to Google Ads with Enhanced Conversions
 *  user data (email/phone/name/address). Safe on SSR + when gtag hasn't loaded. */
export function trackGoogleAdsPurchase(params: {
  /** Booking ID — becomes the transaction_id so Google can dedupe. */
  transactionId: string;
  /** Dollar amount (post-discount) — Google Ads uses this for ROAS. */
  value?: number;
  currency?: string;
  /** Set to true when the customer has no prior booking. */
  newCustomer?: boolean;
  /** Enhanced Conversions — passed through gtag('set', 'user_data') before
   *  the event fires. gtag hashes these client-side before sending. */
  userEmail?: string;
  userPhone?: string;
  userFullName?: string;
  userStreet?: string;
  userCity?: string;
  userRegion?: string;   // state code, e.g. "VT"
  userPostalCode?: string;
  userCountry?: string;  // default "US"
}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  // ── Enhanced Conversions ─── set user_data BEFORE firing the event.
  // gtag automatically hashes email/phone/name — plaintext never leaves
  // the browser. Only set fields we actually have.
  const email = params.userEmail?.trim().toLowerCase();
  const phone = normalizePhone(params.userPhone);
  const name  = splitName(params.userFullName);
  const address: Record<string, string> = {};
  if (name.first_name) address.first_name = name.first_name;
  if (name.last_name)  address.last_name  = name.last_name;
  if (params.userStreet)     address.street      = params.userStreet.trim();
  if (params.userCity)       address.city        = params.userCity.trim();
  if (params.userRegion)     address.region      = params.userRegion.trim();
  if (params.userPostalCode) address.postal_code = params.userPostalCode.trim();
  address.country = (params.userCountry ?? "US").trim();

  const userData: Record<string, unknown> = {};
  if (email) userData.email = email;
  if (phone) userData.phone_number = phone;
  if (Object.keys(address).length > 1) userData.address = address; // > 1 because country is always set

  if (Object.keys(userData).length > 0) {
    try {
      window.gtag("set", "user_data", userData);
    } catch (e) {
      console.warn("Google Ads Enhanced Conversions user_data failed:", e);
    }
  }

  // ── Conversion event ──────────────────────────────────────────────────
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
