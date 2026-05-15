/** Premium Annual Membership — pricing & plan constants.
 *  Kept in lib/ (not app/actions/) because server-action files can only
 *  export async functions. Shared between server actions and client components.
 *
 *  Credit model: customer pays $999, receives $1,250 in service credit
 *  that can be applied to ANY service + add-on combination within 12 months. */

export const MEMBERSHIP_PRICE_USD   = 999;     // What the customer pays
export const MEMBERSHIP_CREDIT_USD  = 1250;    // What they get to spend
export const MEMBERSHIP_PRICE_CENTS  = 99900;
export const MEMBERSHIP_CREDIT_CENTS = 125000;
export const MEMBERSHIP_TIER = "premium_annual";

export type ActiveMembership = {
  id: string;
  tier: string;
  status: "active" | "expired" | "cancelled";
  started_at: string;
  expires_at: string;
  credit_balance_cents: number;
  credit_total_cents: number;
};

/** Convenience: format cents as a dollar string like "$1,250.00". */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Convenience: format cents as a whole-dollar string when round, else 2dp. */
export function formatCentsCompact(cents: number): string {
  if (cents % 100 === 0) return `$${Math.round(cents / 100).toLocaleString()}`;
  return `$${(cents / 100).toFixed(2)}`;
}
