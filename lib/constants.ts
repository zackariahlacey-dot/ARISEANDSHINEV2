import { VehicleSizeSlug } from "@/app/actions/bookDetailing";

// Service time + 30 min travel/buffer (minutes)
export const SERVICE_DURATIONS: Record<string, Record<string, number>> = {
  "Interior Detail": { 
    small: 180, medium: 180, large: 240, extra_large: 240,
    compact: 180, sedan: 180, suv: 240, xl: 240 
  },
  "Exterior Detail": { 
    small: 120, medium: 120, large: 180, extra_large: 180,
    compact: 120, sedan: 120, suv: 180, xl: 180 
  },
  "Full Detail": { 
    small: 240, medium: 240, large: 330, extra_large: 330,
    compact: 240, sedan: 240, suv: 330, xl: 330 
  },
  "Interior Monthly Maintenance": { 
    small: 90, medium: 90, large: 120, extra_large: 120,
    compact: 90, sedan: 90, suv: 120, xl: 120 
  },
  "Full Detail Monthly Maintenance": {
    small: 150, medium: 150, large: 210, extra_large: 210,
    compact: 150, sedan: 150, suv: 210, xl: 210
  },
  // Ultimate Series — block 5 hrs for Interior Reset, 8 hrs for Showroom Restoration
  "Ultimate Interior Reset + Wash": {
    small: 300, medium: 300, large: 300, extra_large: 300,
    compact: 300, sedan: 300, suv: 300, xl: 300,
  },
  "Ultimate Showroom Restoration": {
    small: 480, medium: 480, large: 480, extra_large: 480,
    compact: 480, sedan: 480, suv: 480, xl: 480,
  },
  // Paint Correction — block larger amount: 4 hrs normal / 8 hrs large for L1, 6 hrs normal / 8 hrs large for L2
  "Single-Stage Paint Enhancement": {
    small: 240, medium: 240, large: 480, extra_large: 480,
    compact: 240, sedan: 240, suv: 480, xl: 480,
  },
  "Two-Stage Paint Correction": {
    small: 360, medium: 360, large: 480, extra_large: 480,
    compact: 360, sedan: 360, suv: 480, xl: 480,
  },
};

export const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;
