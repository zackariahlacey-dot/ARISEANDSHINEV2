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
};

export const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;
