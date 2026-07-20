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
    // 2.5 hrs base (July 2026 update)
    small: 150, medium: 150, large: 150, extra_large: 150,
    sedan: 150, suv: 150, xl: 150,
  },
  // Light Detailing — maintenance-only. Slot reserves 90 min (max needed
  // when customer picks all items) so we never under-book. Typical 2–5 item
  // picks finish in ~60 min; picker shows the honest ETA to the customer.
  "Light Detailing": {
    small: 90, medium: 90, large: 90, extra_large: 90,
    sedan: 90, suv: 90, xl: 90,
  },
  // Refresh tier — Interior/Exterior/Full mid-tier bundles
  "The Refresh — Interior": {
    small: 210, medium: 210, large: 240, extra_large: 240,
    sedan: 210, suv: 240, xl: 240,
  },
  "The Refresh — Exterior": {
    small: 150, medium: 150, large: 180, extra_large: 180,
    sedan: 150, suv: 180, xl: 180,
  },
  "The Refresh — Full": {
    small: 300, medium: 300, large: 360, extra_large: 360,
    sedan: 300, suv: 360, xl: 360,
  },
  // Reset — Full: Reset Interior + full exterior + headlight + engine bay
  "The Reset — Full": {
    small: 360, medium: 360, large: 420, extra_large: 480,
    sedan: 360, suv: 420, xl: 480,
  },
  "Exterior Detail": {
    // 1.5 hrs base — display window shows "1–1.5 hrs"
    small: 90, medium: 90, large: 90, extra_large: 90,
    sedan: 90, suv: 90, xl: 90,
  },
  "Full Detail": {
    // 3 hrs base (July 2026 update)
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
  // Ultimate Series (July 2026): only one SKU. Seats-out deep clean.
  // Book 4 hrs — covers the 3.5–4.5 hr realistic window on the reset process.
  "Ultimate Interior Reset": {
    small: 240, medium: 240, large: 240, extra_large: 240,
    sedan: 240, suv: 240, xl: 240,
  },
  // Historical bookings snapshotted the old combo name — keep the duration
  // entry so admin/reschedule flows still calculate slot length correctly.
  "Ultimate Interior + Exterior Reset": {
    small: 240, medium: 240, large: 240, extra_large: 240,
    sedan: 240, suv: 240, xl: 240,
  },
  // Paint Correction (July 2026 rename — was "Ultimate Exterior + N-Step").
  "Paint Correction — 1 Step": {
    small: 300, medium: 300, large: 360, extra_large: 420,
    sedan: 300, suv: 360, xl: 420,
  },
  "Paint Correction — 2 Step": {
    small: 420, medium: 420, large: 480, extra_large: 540,
    sedan: 420, suv: 480, xl: 540,
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
  // ── Semi Truck — flat-priced services (size dimension ignored) ──────
  "Truck Yard Wash": {
    small: 45, medium: 45, large: 45, extra_large: 45,
    sedan: 45, suv: 45, xl: 45,
  },
  "Truck Exterior Refresh — Day Cab": {
    small: 90, medium: 90, large: 90, extra_large: 90,
    sedan: 90, suv: 90, xl: 90,
  },
  "Truck Exterior Refresh — Sleeper": {
    small: 120, medium: 120, large: 120, extra_large: 120,
    sedan: 120, suv: 120, xl: 120,
  },
  "Premium Exterior Detail — Day Cab": {
    small: 180, medium: 180, large: 180, extra_large: 180,
    sedan: 180, suv: 180, xl: 180,
  },
  "Premium Exterior Detail — Sleeper": {
    small: 240, medium: 240, large: 240, extra_large: 240,
    sedan: 240, suv: 240, xl: 240,
  },
  "Day Cab Interior Reset": {
    small: 150, medium: 150, large: 150, extra_large: 150,
    sedan: 150, suv: 150, xl: 150,
  },
  "Sleeper Cab Interior Reset": {
    small: 240, medium: 240, large: 240, extra_large: 240,
    sedan: 240, suv: 240, xl: 240,
  },
  "Day Cab Complete": {
    // ~5.5 hr combined exterior + interior on a day cab
    small: 330, medium: 330, large: 330, extra_large: 330,
    sedan: 330, suv: 330, xl: 330,
  },
  "Sleeper Cab Complete": {
    // ~8 hr — triggers whole-day reservation (WHOLE_DAY_THRESHOLD_MINS=480)
    small: 480, medium: 480, large: 480, extra_large: 480,
    sedan: 480, suv: 480, xl: 480,
  },
  // ── Heavy Equipment — cab interior + variable hourly ────────────────
  "Equipment Cab Reset": {
    small: 120, medium: 120, large: 120, extra_large: 120,
    sedan: 120, suv: 120, xl: 120,
  },
  "Equipment Hourly Service": {
    // 2 hr minimum default; admin overrides duration per job
    small: 120, medium: 120, large: 120, extra_large: 120,
    sedan: 120, suv: 120, xl: 120,
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
