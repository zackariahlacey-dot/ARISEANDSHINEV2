/**
 * Length-based duration formula for boat & RV detailing services.
 *
 * Used by:
 *   - Boat/RV page price calculators (shows live "estimated time" next to price)
 *   - Booking confirmation screens (accurate duration estimate)
 *
 * Formula: base minutes at minimum length, then +increment per 5 ft over the minimum.
 * Slot reservation in the booking system uses the bracket-based duration in
 * SERVICE_DURATIONS (see lib/constants.ts) — which is calibrated to the high-end
 * of each length bracket using this same formula.
 */

export interface FootageDurationSpec {
  /** Service name (matches DB) */
  service: string;
  /** Minimum bookable length in feet */
  minFeet: number;
  /** Base minutes at minimum length */
  baseMins: number;
  /** Additional minutes per 5 ft over the minimum */
  per5ftMins: number;
}

/** Hard upper cap to prevent any single booking from blocking >10 hr of the day. */
const MAX_DURATION_MINS = 600;

export const FOOTAGE_DURATION_SPECS: Record<string, FootageDurationSpec> = {
  // ── Boats (15 ft minimum) ────────────────────────────────────────────
  "Boat Interior":    { service: "Boat Interior",    minFeet: 15, baseMins: 150, per5ftMins: 25 },
  "Boat Exterior":    { service: "Boat Exterior",    minFeet: 15, baseMins: 120, per5ftMins: 20 },
  "Boat Full Detail": { service: "Boat Full Detail", minFeet: 15, baseMins: 270, per5ftMins: 45 },

  // ── RVs (20 ft minimum) ──────────────────────────────────────────────
  "RV Exterior":    { service: "RV Exterior",    minFeet: 20, baseMins: 180, per5ftMins: 30 },
  "RV Interior":    { service: "RV Interior",    minFeet: 20, baseMins: 240, per5ftMins: 30 },
  "RV Full Detail": { service: "RV Full Detail", minFeet: 20, baseMins: 360, per5ftMins: 60 },
};

/**
 * Returns the estimated duration in minutes for a footage-based service at the
 * given length. Returns null if the service isn't a footage-based service.
 */
export function getFootageDurationMins(serviceName: string, feet: number): number | null {
  const spec = FOOTAGE_DURATION_SPECS[serviceName];
  if (!spec) return null;
  const effectiveFeet = Math.max(feet, spec.minFeet);
  const extraSteps = Math.ceil((effectiveFeet - spec.minFeet) / 5);
  const total = spec.baseMins + extraSteps * spec.per5ftMins;
  return Math.min(total, MAX_DURATION_MINS);
}

/**
 * Human-readable hour range for the duration. E.g. 225 min → "3.5–4 hrs".
 * Uses ±30 min window around the computed estimate for honest expectations.
 */
export function formatDurationRange(mins: number): string {
  if (mins <= 0) return "—";
  const lowH = Math.max(0.5, (mins - 30) / 60);
  const highH = (mins + 30) / 60;
  const fmt = (h: number) => (h % 1 === 0 ? `${h}` : `${h.toFixed(1).replace(/\.0$/, "")}`);
  return `${fmt(lowH)}–${fmt(highH)} hrs`;
}

/** Returns true if the named service is footage-based (boat or RV). */
export function isFootageService(serviceName: string): boolean {
  return serviceName in FOOTAGE_DURATION_SPECS;
}
