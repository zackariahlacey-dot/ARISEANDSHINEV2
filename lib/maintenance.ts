/**
 * Maintenance Detail pricing + duration model.
 *
 * After a customer completes a qualifying car detail (Interior / Exterior /
 * Full / Ultimate), they unlock a 3-month window for a discounted, shorter
 * "Maintenance Detail" on the SAME vehicle. The discount and time depend on
 * how rough the vehicle has gotten since the last detail — they self-report
 * a condition tier in the booking flow.
 *
 * Tier mapping (from the customer pick → pricing/time):
 *   Showroom  — 45% of base, fastest                 (1-3 hrs cleaner range)
 *   Lived-in  — 60% of base, mid                     (light daily-driver wear)
 *   Rough     — 75% of base, longest                 (pets, kids, salt season)
 *
 * Prices are rounded UP to the nearest $5 so quotes never display
 * awkward fractions and never under-price (we'd rather over-collect a few
 * dollars than dip below the chosen percentage).
 */

export type ConditionTier = "showroom" | "lived_in" | "rough";

export type MaintenanceFoundation = "interior" | "exterior" | "full";

export type ConditionTierDef = {
  id: ConditionTier;
  label: string;
  emoji: string;
  headline: string;
  description: string;
  /** Display range the customer sees ("45–50% off") — single number under
   *  the hood (PCT) is what actually drives pricing. */
  discountCopy: string;
  /** Decimal multiplier of the source service base price. */
  pct: number;
  /** Minutes for an Interior-only maintenance at this tier. */
  interiorMins: number;
  /** Minutes for a Full Detail maintenance at this tier. */
  fullMins: number;
  /** Minutes for an Exterior-only maintenance — same as interior here. */
  exteriorMins: number;
};

export const CONDITION_TIERS: ConditionTierDef[] = [
  {
    id: "showroom",
    label: "Showroom",
    emoji: "🌟",
    headline: "Mostly clean — just a touch-up",
    description: "Normal use since your last detail. Light dust, a few crumbs, fingerprints on the doors.",
    discountCopy: "55% off",
    pct: 0.45,
    interiorMins: 60,
    fullMins: 90,
    exteriorMins: 60,
  },
  {
    id: "lived_in",
    label: "Lived-in",
    emoji: "👍",
    headline: "Daily-driver wear",
    description: "Footprints, fingerprints, a little dog hair, a bit of road grime on the outside.",
    discountCopy: "40% off",
    pct: 0.60,
    interiorMins: 90,
    fullMins: 120,
    exteriorMins: 90,
  },
  {
    id: "rough",
    label: "Rough",
    emoji: "😬",
    headline: "Heavy use — needs a reset",
    description: "Kids, pets, off-road, or salt season took a toll. Stains, hair, embedded grime.",
    discountCopy: "25% off",
    pct: 0.75,
    interiorMins: 120,
    fullMins: 150,
    exteriorMins: 120,
  },
];

export function getConditionTier(id: ConditionTier): ConditionTierDef {
  return CONDITION_TIERS.find(t => t.id === id) ?? CONDITION_TIERS[1];
}

/** Round UP to nearest $5 — never under-charge the chosen percentage. */
export function roundUpToFive(price: number): number {
  return Math.ceil(price / 5) * 5;
}

/** Resolve maintenance foundation from a source service name. */
export function maintenanceFoundationFor(serviceName: string): MaintenanceFoundation {
  const n = serviceName.toLowerCase();
  if (n.includes("full")) return "full";
  if (n.includes("interior")) return "interior";
  return "exterior";
}

/** Service name used at the booking level for the maintenance detail — we
 *  re-use the foundation service so duration/availability math + email
 *  templates keep working. */
export function maintenanceServiceNameFor(foundation: MaintenanceFoundation): string {
  if (foundation === "interior") return "Interior Detail";
  if (foundation === "exterior") return "Exterior Detail";
  return "Full Detail";
}

/** Compute the customer-facing maintenance price for a given base + tier. */
export function maintenancePrice(basePrice: number, tier: ConditionTier): number {
  const def = getConditionTier(tier);
  return roundUpToFive(basePrice * def.pct);
}

/** Duration in minutes for a maintenance detail at the given tier + foundation. */
export function maintenanceDurationMins(tier: ConditionTier, foundation: MaintenanceFoundation): number {
  const def = getConditionTier(tier);
  if (foundation === "full")     return def.fullMins;
  if (foundation === "exterior") return def.exteriorMins;
  return def.interiorMins;
}

/** True when a source service name qualifies for the maintenance program. */
export function isMaintenanceEligibleService(serviceName: string): boolean {
  const n = serviceName.toLowerCase();
  return (
    n === "interior detail" ||
    n === "exterior detail" ||
    n === "full detail" ||
    n.includes("ultimate")
  );
}

/** Eligible-until date string (YYYY-MM-DD) — exactly 3 months after the
 *  source booking_date. Uses local date math to match how booking_date is
 *  stored (date column, no timezone). */
export function maintenanceEligibleUntil(sourceBookingDate: string): string {
  const [y, m, d] = sourceBookingDate.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setMonth(dt.getMonth() + 3);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Pretty "expires in X days/weeks" copy for dashboard cards. */
export function maintenanceExpiryCopy(eligibleUntil: string): string {
  const [y, m, d] = eligibleUntil.split("-").map(Number);
  const exp = new Date(y, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "expired";
  if (days === 1) return "ends tomorrow";
  if (days < 14) return `ends in ${days} days`;
  if (days < 60) return `ends in ${Math.round(days / 7)} weeks`;
  return `ends in ${Math.round(days / 30)} months`;
}
