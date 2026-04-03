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
  "Interior Monthly Maintenance": {
    small: 90, medium: 90, large: 120, extra_large: 120,
    compact: 90, sedan: 90, suv: 120, xl: 120,
  },
  "Full Detail Monthly Maintenance": {
    small: 150, medium: 150, large: 210, extra_large: 210,
    compact: 150, sedan: 150, suv: 210, xl: 210,
  },
  // Ultimate Series
  "Ultimate Interior Reset + Wash": {
    small: 270, medium: 270, large: 270, extra_large: 270,
    compact: 270, sedan: 270, suv: 270, xl: 270,
  },
  "Ultimate Showroom Restoration": {
    small: 360, medium: 360, large: 360, extra_large: 360,
    compact: 360, sedan: 360, suv: 360, xl: 360,
  },
  // Paint Correction
  "Single-Stage Paint Enhancement": {
    small: 240, medium: 240, large: 240, extra_large: 240,
    compact: 240, sedan: 240, suv: 240, xl: 240,
  },
  "Two-Stage Paint Correction": {
    small: 480, medium: 480, large: 480, extra_large: 480,
    compact: 480, sedan: 480, suv: 480, xl: 480,
  },
  // Boat Detailing — durations scale by length bracket
  // compact/small = 15–20ft, sedan/medium = 21–30ft, suv/large = 31–45ft, xl/extra_large = 46ft+
  "Boat Interior Detail": {
    small: 180, medium: 240, large: 300, extra_large: 360,
    compact: 180, sedan: 240, suv: 300, xl: 360,
  },
  "Boat Exterior Detail": {
    small: 150, medium: 180, large: 240, extra_large: 300,
    compact: 150, sedan: 180, suv: 240, xl: 300,
  },
  "Full Boat Detail": {
    small: 300, medium: 390, large: 480, extra_large: 600,
    compact: 300, sedan: 390, suv: 480, xl: 600,
  },
  // RV Detailing
  "RV Interior Detail": {
    small: 300, medium: 300, large: 360, extra_large: 360,
    compact: 300, sedan: 300, suv: 360, xl: 360,
  },
  "RV Exterior Detail": {
    small: 240, medium: 240, large: 300, extra_large: 300,
    compact: 240, sedan: 240, suv: 300, xl: 300,
  },
  "RV Full Detail": {
    small: 480, medium: 480, large: 600, extra_large: 600,
    compact: 480, sedan: 480, suv: 600, xl: 600,
  },
};

export const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;
