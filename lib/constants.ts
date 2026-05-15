import { VehicleSizeSlug } from "@/app/actions/bookDetailing";

// Service durations in minutes (pure service time, no travel)
export const SERVICE_DURATIONS: Record<string, Record<string, number>> = {
  "Interior Detail": {
    small: 180, medium: 180, large: 180, extra_large: 180,
    compact: 180, sedan: 180, suv: 180, xl: 180,
  },
  "Exterior Detail": {
    small: 120, medium: 120, large: 120, extra_large: 120,
    compact: 120, sedan: 120, suv: 120, xl: 120,
  },
  "Full Detail": {
    small: 210, medium: 210, large: 210, extra_large: 210,
    compact: 210, sedan: 210, suv: 210, xl: 210,
  },
  "Salt Season Recovery": {
    small: 90, medium: 90, large: 90, extra_large: 90,
    compact: 90, sedan: 90, suv: 90, xl: 90,
  },
  "Interior Monthly Maintenance": {
    small: 90, medium: 90, large: 120, extra_large: 120,
    compact: 90, sedan: 90, suv: 120, xl: 120,
  },
  "Full Detail Monthly Maintenance": {
    small: 150, medium: 150, large: 210, extra_large: 210,
    compact: 150, sedan: 150, suv: 210, xl: 210,
  },
  // Ultimate Series
  "Ultimate Interior Reset": {
    small: 210, medium: 210, large: 210, extra_large: 210,
    compact: 210, sedan: 210, suv: 210, xl: 210,
  },
  "Ultimate Interior + Exterior Reset": {
    small: 270, medium: 270, large: 270, extra_large: 270,
    compact: 270, sedan: 270, suv: 270, xl: 270,
  },
  // Paint Correction (Ultimate Exterior + 1-Step / 2-Step)
  // Times scale by vehicle size — these are full exterior + machine polish jobs.
  // Booking system uses the high-end for slot reservation to avoid double-booking.
  // Large/XL 2-Step is capped at 600 min (10 hrs = longest open day Tue/Wed/Fri 8a-6p);
  // realistic jobs may run 11-13+ hrs and the booking blocks the whole day.
  "Ultimate Exterior + 1-Step Paint Correction": {
    small: 270, medium: 330, large: 390, extra_large: 480,
    compact: 270, sedan: 330, suv: 390, xl: 480,
  },
  "Ultimate Exterior + 2-Step Paint Correction": {
    small: 480, medium: 540, large: 600, extra_large: 600,
    compact: 480, sedan: 540, suv: 600, xl: 600,
  },
  // Boat Detailing — durations scale by length bracket
  // compact/small = 15–20ft, sedan/medium = 21–30ft, suv/large = 31–45ft, xl/extra_large = 46ft+
  "Boat Interior": {
    small: 180, medium: 240, large: 300, extra_large: 360,
    compact: 180, sedan: 240, suv: 300, xl: 360,
  },
  "Boat Exterior": {
    small: 150, medium: 180, large: 240, extra_large: 300,
    compact: 150, sedan: 180, suv: 240, xl: 300,
  },
  "Boat Full Detail": {
    small: 300, medium: 390, large: 480, extra_large: 600,
    compact: 300, sedan: 390, suv: 480, xl: 600,
  },
  "Boat Showroom Package": {
    small: 240, medium: 300, large: 420, extra_large: 540,
    compact: 240, sedan: 300, suv: 420, xl: 540,
  },
  // RV Detailing — sizes map to length brackets: small/compact=20-28ft, medium/sedan=29-36ft, large/suv=37-45ft, xl/extra_large=46ft+
  "RV Exterior Refresh": {
    small: 240, medium: 270, large: 330, extra_large: 390,
    compact: 240, sedan: 270, suv: 330, xl: 390,
  },
  "RV Living Space Reset": {
    small: 300, medium: 360, large: 420, extra_large: 480,
    compact: 300, sedan: 360, suv: 420, xl: 480,
  },
  "RV Ultimate Transformation": {
    small: 480, medium: 570, large: 660, extra_large: 780,
    compact: 480, sedan: 570, suv: 660, xl: 780,
  },
  "RV Oxidation Restoration": {
    small: 480, medium: 540, large: 660, extra_large: 780,
    compact: 480, sedan: 540, suv: 660, xl: 780,
  },
};

export const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;
