import { VehicleSizeSlug } from "@/app/actions/bookDetailing";

// Service durations in minutes (pure service time, no travel)
//
// Boat & RV durations are calibrated to the high-end of each length bracket
// using the formula in lib/footageDuration.ts:
//   - medium/sedan = ≤30 ft (boats) / ≤30 ft (RVs)
//   - large/suv    = 31–45 ft
//   - extra_large/xl = 46+ ft
// This guarantees the booking system never under-reserves time on long boats/RVs.
export const SERVICE_DURATIONS: Record<string, Record<string, number>> = {
  "Interior Detail": {
    // 2.5 hrs base — customer-facing display window shows "1.5–2.5 hrs"
    small: 150, medium: 150, large: 150, extra_large: 150,
    sedan: 150, suv: 150, xl: 150,
  },
  "Exterior Detail": {
    small: 120, medium: 120, large: 120, extra_large: 120,
    sedan: 120, suv: 120, xl: 120,
  },
  "Full Detail": {
    // 3 hrs base — display window shows "2–3 hrs" to customer
    small: 180, medium: 180, large: 180, extra_large: 180,
    sedan: 180, suv: 180, xl: 180,
  },
  "Interior Monthly Maintenance": {
    small: 90, medium: 90, large: 120, extra_large: 120,
    sedan: 90, suv: 120, xl: 120,
  },
  "Full Detail Monthly Maintenance": {
    small: 150, medium: 150, large: 210, extra_large: 210,
    sedan: 150, suv: 210, xl: 210,
  },
  // Ultimate Series
  "Ultimate Interior Reset": {
    small: 210, medium: 210, large: 210, extra_large: 210,
    sedan: 210, suv: 210, xl: 210,
  },
  "Ultimate Interior + Exterior Reset": {
    small: 270, medium: 270, large: 270, extra_large: 270,
    sedan: 270, suv: 270, xl: 270,
  },
  // ── Boat Detailing — length-bracketed durations ─────────────────────
  // medium ≤30 ft · large 31–45 ft · xl 46+ ft
  "Boat Interior": {
    small: 225, medium: 225, large: 300, extra_large: 350,
    sedan: 225, suv: 300, xl: 350,
  },
  "Boat Exterior": {
    small: 180, medium: 180, large: 240, extra_large: 280,
    sedan: 180, suv: 240, xl: 280,
  },
  "Boat Full Detail": {
    small: 405, medium: 405, large: 540, extra_large: 600,
    sedan: 405, suv: 540, xl: 600,
  },
  // ── RV Detailing — length-bracketed durations ───────────────────────
  // medium ≤30 ft · large 31–45 ft · xl 46+ ft
  "RV Exterior": {
    small: 240, medium: 240, large: 330, extra_large: 390,
    sedan: 240, suv: 330, xl: 390,
  },
  "RV Interior": {
    small: 300, medium: 300, large: 390, extra_large: 450,
    sedan: 300, suv: 390, xl: 450,
  },
  "RV Full Detail": {
    small: 480, medium: 480, large: 600, extra_large: 600,
    sedan: 480, suv: 600, xl: 600,
  },
};

// Customer-facing sizes: 3 tiers only. "Sedan" now covers compacts,
// coupes, and small sedans — anything car-sized. "compact" is intentionally
// gone from the customer-facing slugs; price_small (the legacy DB column)
// is kept in sync with price_medium by the price migration so any old code
// that accidentally queries it still returns the sedan price.
export const VEHICLE_SIZE_MAP = {
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;
