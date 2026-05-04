"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  Calendar,
  User,
  Car,
  Loader2,
  AlertCircle,
  Banknote,
  CreditCard,
  Lock,
  HandCoins,
  CircleHelp,
  Crown,
  Sparkles,
  Gem,
  Layers,
  Waves,
  Plus,
  X,
  Tag,
} from "lucide-react";
import type { Service } from "@/app/page";
import {
  bookDetailing,
  type BookingResult,
  type VehicleSizeSlug,
  type AdditionalVehicle,
} from "@/app/actions/bookDetailing";
import {
  validateCoupon,
  type CouponResult,
} from "@/app/actions/validateCoupon";
import { validateGiftCard } from "@/app/actions/validateGiftCard";
import { getBookingsForDate, type BookingOnDate } from "@/app/actions/getBookingsForDate";
import { getNextAvailableDays, type AvailableDay } from "@/app/actions/getNextAvailableDays";
import { detectVehicleSize } from "@/lib/detectVehicleSize";
import {
  filterMakesByQuery,
  filterModelsByQuery,
  sizeTierToSlug,
} from "@/lib/vehicleDatabase";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getProfileByPhone } from "@/app/actions/getProfileByPhone";
import { getAvailability, type OperatingHour } from "@/app/actions/getAvailability";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SERVICE_DURATIONS, VEHICLE_SIZE_MAP } from "@/lib/constants";
import { MONTHLY_PLAN_DURATIONS } from "@/lib/monthlyPlans";

/** Interior Monthly Maintenance = $75, Full Detail Monthly Maintenance = $120 */
function getMaintenanceSetupFee(serviceName: string): number {
  return serviceName.toLowerCase().includes("full") ? 100 : 75;
}

const ALL_ADD_ONS = [
  // ── Vehicle / Standard ────────────────────────────────────────────────────
  { id: "engine_bay",        label: "Engine Bay Detail",                    price: 50,  desc: "Deep clean and degrease the engine bay — great before any exterior detail." },
  { id: "headlight_restore",   label: "Headlight Restoration",               price: 40,  desc: "Restore cloudy or yellowed lenses to like-new clarity, UV sealed to prevent re-hazing." },
  { id: "odor_bomb",           label: "Strong Odor Elimination",             price: 60,  desc: "Heavy-duty neutralizer bombs combat embedded smoke, food & pet odors throughout the cabin." },
  { id: "upholstery_shampoo",  label: "Upholstery & Floorboard Shampoo",    price: 60,  desc: "Deep steam shampoo of all seats, upholstery panels, and floorboards — removes stains, grime & odor at the source. XL/3rd-row vehicles are automatically $75." },
  { id: "uv_interior",         label: "UV Protection & Interior Restoration", price: 35, desc: "UV-protective coating applied to all interior plastics, vinyl, and trim — prevents fading, cracking, and sun damage while restoring a rich, factory finish." },
  { id: "leather_condition",   label: "Leather Conditioning",                 price: 45, desc: "Deep-clean and condition all leather surfaces with premium conditioner — restores softness, prevents cracking, and leaves a clean matte finish." },
  { id: "floor_1",           label: "Floorboard Shampoo – 1 Section",       price: 30,  desc: "Deep shampoo for one section of floorboards" },
  { id: "floor_2",           label: "Floorboard Shampoo – 2 Sections",      price: 45,  desc: "Deep shampoo for two sections of floorboards" },
  { id: "floor_all",         label: "Floorboard Shampoo – All Sections",     price: 60,  desc: "Full deep shampoo for all floorboard sections" },
  { id: "clay_bar",          label: "Clay Bar Treatment",                    price: 30,  desc: "Remove embedded contaminants for a glass-smooth finish before wax or sealant." },
  { id: "pet_hair",          label: "Heavy Pet Hair Removal",                 price: 30,  desc: "Deep extraction of embedded pet hair from seats, carpet & cargo area. Applied upon inspection — only charged if heavy accumulation is present." },
  { id: "tar_bug",           label: "Tar, Bug & Sap Removal",               price: 35,  desc: "Safely dissolve and remove road tar, bug splatter & tree sap before the detail wash." },
  // ── Ultimate Series (premium upgrades — high-ticket) ─────────────────────
  { id: "polish_ceramic",    label: "1-Step Polish + 2-Year Ceramic Coating", price: 350, desc: "Targets light swirls and oxidation with a 1-step machine polish, then protects the paint with a professional 2-year ceramic coat. Requires a full-day appointment." },
  { id: "ozone_treatment",   label: "Ozone Odor Elimination",                price: 75,  desc: "Professional-grade ozone treatment permanently neutralises smoke, pet odor & mildew at the source." },
  // ── Paint Correction add-ons ─────────────────────────────────────────────
  { id: "ceramic_3yr",       label: "2–3 Year Pro Ceramic Sealant",          price: 300, desc: "Upgrade from the included 6-month spray to a professional-grade 2–3 year ceramic sealant. Pricing scales by size: $300 small · $350 mid · $425 large · $500 work van." },
  { id: "ultimate_interior", label: "Ultimate Interior Add-on",              price: 175, desc: "Add the full Ultimate Interior service to your paint correction — hot water extraction, steam sanitation, salt neutralization. Adds 3 hrs to the appointment. Flat $175." },
  // ── Work Van cargo cleaning (only shown when vehicle size = xl) ──────────
  { id: "cargo_light",       label: "Cargo Space — Light/Moderate",          price: 100, desc: "Vacuum and wipe-down of work van cargo area. Best for light to moderate dust, dirt, and tool residue." },
  { id: "cargo_heavy",       label: "Cargo Space — Heavy/Dirty",             price: 150, desc: "Deep clean of heavily soiled cargo area — built-up grime, embedded debris, stained surfaces and odors." },
  // ── Marine ───────────────────────────────────────────────────────────────
  { id: "marine_isinglass",  label: "Isinglass & Vinyl Window Clarity",      price: 100, desc: "Haze/scratch removal + UV sealant on all enclosure windows" },
  { id: "marine_engine_bay", label: "Marine Engine Bay Deep Clean",          price: 150, desc: "Full degreasing and detail of engine compartment & bilge" },
  // ── RV ───────────────────────────────────────────────────────────────────
  { id: "rv_awning",         label: "Awning Deep Clean",                     price: 60,  desc: "Remove mold, mildew & road grime from awning fabric, arms & housing. UV protectant applied." },
  { id: "rv_slide_seal",     label: "Slide-Out Seal Conditioning",           price: 50,  desc: "Condition & lubricate all rubber slide seals. Prevents cracking, water intrusion & leaks." },
  { id: "rv_roof_coat",      label: "Rubber Roof Sealant Coat",              price: 80,  desc: "UV-protective EPDM/TPO sealant applied to roof membrane. Extends life & prevents seam leaks." },
  { id: "rv_generator",      label: "Generator Bay Detail",                  price: 75,  desc: "Full degreasing & detailing of generator housing, exhaust housing & bay surrounds." },
  { id: "rv_step",           label: "Entry Step & Threshold Detail",         price: 30,  desc: "Deep scrub of all entry steps, grip treads & door threshold — the dirtiest spot on most rigs." },
] as const;

type AddonItem = typeof ALL_ADD_ONS[number];

const FLOOR_ADDON_IDS    = ["floor_1", "floor_2", "floor_all"];
const MARINE_ADDON_IDS   = ["marine_isinglass", "marine_engine_bay"];
const RV_ADDON_IDS       = ["rv_awning", "rv_slide_seal", "rv_roof_coat", "rv_generator", "rv_step"];
/** High-ticket upgrades for Ultimate packages — engine bay & headlight restore remain paid add-ons */
const ULTIMATE_ADDON_IDS = ["engine_bay", "polish_ceramic", "headlight_restore", "ozone_treatment"];
/** Simplified add-ons for Interior, Exterior, and Full Detail */
const STANDARD_ADDON_IDS = ["engine_bay", "headlight_restore", "odor_bomb", "upholstery_shampoo", "uv_interior", "leather_condition", "clay_bar"];
/** Add-ons offered with Paint Correction (Ultimate Exterior + 1-Step / 2-Step) */
const PAINT_CORRECTION_ADDON_IDS = ["engine_bay", "headlight_restore", "ceramic_3yr", "ultimate_interior"];
/** Cargo cleaning tiers — mutually exclusive, only shown when vehicleSize === "xl" */
const CARGO_ADDON_IDS    = ["cargo_light", "cargo_heavy"];
/** Add-ons that are INCLUDED in Ultimate packages — selecting these triggers the upgrade nudge */
const INCLUDED_IN_ULTIMATE_IDS = ["upholstery_shampoo", "odor_bomb", "uv_interior", "leather_condition", "clay_bar"];
/** Add-ons that require a full-day appointment */
export const FULL_DAY_ADDON_IDS    = ["polish_ceramic"];
export const FULL_DAY_DURATION_MIN = 480; // 8 hours — blocks the whole day
/** Add-ons that extend service duration (additive) — id → minutes */
const DURATION_EXTENDING_ADDONS: Record<string, number> = {
  ultimate_interior: 180, // Ultimate Interior add-on adds 3 hrs to the appointment
};

const CERAMIC_PRICES: Record<string, number> = {
  compact: 350, sedan: 350, suv: 500, xl: 650,
  small: 350, medium: 350, large: 500, extra_large: 650,
};

/** 2–3 Year Professional Ceramic Sealant — 4-tier pricing for paint-correction packages. */
const CERAMIC_3YR_PRICES: Record<string, number> = {
  compact: 300, sedan: 350, suv: 425, xl: 500,
  small: 300, medium: 350, large: 425, extra_large: 500,
};

function getEffectiveAddonPrice(addon: { id: string; price: number }, vehicleSize: string): number {
  if (addon.id === "upholstery_shampoo" && vehicleSize === "xl") return addon.price + 15;
  if (addon.id === "polish_ceramic") return CERAMIC_PRICES[vehicleSize] ?? addon.price;
  if (addon.id === "ceramic_3yr")    return CERAMIC_3YR_PRICES[vehicleSize] ?? addon.price;
  return addon.price;
}

/** Returns true when the service is one of the new Ultimate Exterior + Paint Correction packages. */
function isPaintCorrectionService(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("paint correction") || n.includes("paint enhancement") || n.includes("single-stage") || n.includes("two-stage") || n.includes("1-step paint") || n.includes("2-step paint");
}

/** Total minutes added to the booking by selected duration-extending add-ons. */
function getAddonExtraDurationMins(selectedAddons: { id: string }[]): number {
  return selectedAddons.reduce((sum, a) => sum + (DURATION_EXTENDING_ADDONS[a.id] ?? 0), 0);
}

/**
 * Returns add-ons relevant to a given service.
 * Each service category only ever sees its own add-ons — no cross-category bleed.
 *
 * `vehicleSize` is optional and only used to surface Work Van cargo-cleaning add-ons
 * on interior-touching services when the customer's vehicle is a work van (xl).
 */
function getAddonsForService(serviceName: string, vehicleSize?: string): readonly AddonItem[] {
  const n = serviceName.toLowerCase();
  const isWorkVan = vehicleSize === "xl";
  const cargoIds = isWorkVan ? CARGO_ADDON_IDS : [];

  // ── Marine / Boat ────────────────────────────────────────────────────────
  if (n.includes("boat")) {
    return ALL_ADD_ONS.filter(a => MARINE_ADDON_IDS.includes(a.id));
  }

  // ── RV ───────────────────────────────────────────────────────────────────
  if (n.includes("rv") || n.includes("motorhome")) {
    return ALL_ADD_ONS.filter(a => RV_ADDON_IDS.includes(a.id));
  }

  // ── Vehicle services below — never include marine or RV add-ons ──────────

  // Paint correction: clay bar already part of the process. Allow ceramic upgrade
  // and the Ultimate Interior add-on. Cargo cleaning surfaces only when the
  // Ultimate Interior add-on is implied (handled at render-time on the interior side).
  if (isPaintCorrectionService(serviceName)) {
    return ALL_ADD_ONS.filter(a => PAINT_CORRECTION_ADDON_IDS.includes(a.id));
  }

  // Ultimate packages: high-ticket upgrades. Cargo cleaning if work van.
  if (n.includes("ultimate")) {
    const ids = [...ULTIMATE_ADDON_IDS, ...cargoIds];
    return ALL_ADD_ONS.filter(a => ids.includes(a.id));
  }

  // Exterior Detail (no cargo — exterior only)
  if (n.includes("exterior") && !n.includes("full")) {
    return ALL_ADD_ONS.filter(a => STANDARD_ADDON_IDS.includes(a.id));
  }

  // Interior Detail (standalone) — cargo if work van
  if (n.includes("interior") && !n.includes("full") && !n.includes("maintenance")) {
    const ids = [...STANDARD_ADDON_IDS, ...cargoIds];
    return ALL_ADD_ONS.filter(a => ids.includes(a.id));
  }

  // Maintenance plans: engine bay + floor shampoo (quick recurring visits)
  if (n.includes("maintenance")) {
    return ALL_ADD_ONS.filter(a => a.id === "engine_bay" || FLOOR_ADDON_IDS.includes(a.id));
  }

  // Full Detail and anything else → standard 4 add-ons + cargo if work van
  const ids = [...STANDARD_ADDON_IDS, ...cargoIds];
  return ALL_ADD_ONS.filter(a => ids.includes(a.id));
}

/**
 * Returns a note when a feature the customer might add is already included in the service.
 */
function getIncludedNote(serviceName: string): string | null {
  const n = serviceName.toLowerCase();
  if (n.includes("paint") || n.includes("single-stage") || n.includes("two-stage") || n.includes("ultimate interior + exterior") || n.includes("ultimate showroom")) {
    return "Clay Bar Treatment is already included in this service.";
  }
  return null;
}

function isFootageService(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("boat") || n.includes("rv") || n.includes("motorhome");
}
function isRVService(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("rv") || n.includes("motorhome");
}
// kept for backward compat with add-on filters
function isBoatService(name: string): boolean {
  return name.toLowerCase().includes("boat");
}

/** Maps boat/RV footage to a size tier for duration lookups. */
function boatLengthToSize(feet: number | ""): VehicleSizeSlug {
  if (typeof feet !== "number") return "compact";
  if (feet >= 46) return "xl";
  if (feet >= 31) return "suv";
  if (feet >= 21) return "sedan";
  return "compact";
}

/**
 * Returns a display label for the service category.
 */
function getServiceCategory(service: Service): { label: string; color: string } {
  const n = service.name.toLowerCase();
  if (service.is_subscription) return { label: "Maintenance Club",          color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  // Paint correction is checked before Ultimate because the new "Ultimate Exterior +
  // 1-Step / 2-Step Paint Correction" services contain both keywords.
  if (n.includes("paint") || n.includes("correction") || n.includes("single-stage") || n.includes("two-stage"))
                                return { label: "Paint Correction",           color: "text-violet-400 bg-violet-500/10 border-violet-500/20" };
  if (n.includes("ultimate"))   return { label: "Ultimate Series",           color: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20" };
  if (n.includes("boat"))       return { label: "Marine Detailing",          color: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20" };
  if (n.includes("rv") || n.includes("motorhome"))
                                return { label: "RV Detailing",              color: "text-green-400 bg-green-500/10 border-green-500/20" };
  return                               { label: "One-Time Detailing",         color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" };
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Per-foot rates for footage-based services (boat / RV) */
const FOOTAGE_RATE: Record<string, number> = {
  // Boats — 15 ft minimum
  "Boat Interior":          15,
  "Boat Exterior":          20,
  "Boat Full Detail":       32,
  "Boat Showroom Package":  55,
  // RVs — 20 ft minimum
  "RV Interior":            15,
  "RV Exterior":            12,
  "RV Full Detail":         25,
  "RV Showroom 1-Step":     25,
  "RV Showroom 2-Step":     40,
};
/** Minimum footage per service */
const FOOTAGE_MIN_FEET: Record<string, number> = {
  "Boat Interior":          15,
  "Boat Exterior":          15,
  "Boat Full Detail":       15,
  "Boat Showroom Package":  15,
  "RV Interior":            20,
  "RV Exterior":            20,
  "RV Full Detail":         20,
  "RV Showroom 1-Step":     20,
  "RV Showroom 2-Step":     20,
};
// backward-compat aliases used in a few inline JSX references
const BOAT_RATE = FOOTAGE_RATE;
const BOAT_MIN_FEET = 15;

/**
 * Frontend overrides for service descriptions shown in the booking confirm screen.
 * Keeps the UX accurate regardless of what's stored in the database.
 */
const SERVICE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "Ultimate Interior Reset":
    "Our deepest interior clean — hot water extraction, steam sanitation, full shampoo, road salt neutralization, and a 6-month ceramic sealant coat. No exterior paint work.",
  "Ultimate Interior + Exterior Reset":
    "Showroom quality inside and out. Full interior deep clean combined with a complete exterior decontamination wash, clay bar, iron & fallout removal, ceramic sealant application, and all trim/glass dressing. No machine polishing.",
};

/** Maps DB service names → display names shown on the booking confirmation screen */
const BOAT_DISPLAY_NAMES: Record<string, { name: string; tagline: string }> = {
  "Boat Interior":         { name: "Boat Interior",         tagline: "Full interior clean — vinyl, carpet, dash, storage & odor treatment. No buffing or polishing." },
  "Boat Exterior":         { name: "Boat Exterior",         tagline: "Hull wash, oxidation removal, wax/sealant & deck rinse. No buffing or polishing." },
  "Boat Full Detail":      { name: "Boat Full Detail",      tagline: "Complete interior + exterior — hull, wax, interior vacuum & vinyl protect. No buffing or polishing." },
  "Boat Showroom Package": { name: "Boat Showroom Package", tagline: "Exterior detail + machine polish — showroom-ready finish with ceramic or carnauba wax." },
};

type SizeKey = "price_small" | "price_medium" | "price_large" | "price_extra_large";

type VehicleSizeOption = {
  id: VehicleSizeSlug;
  label: string;
  desc: string;
  sizeKey: SizeKey;
};

/** 3-tier picker shown for all standard services (Interior, Exterior, Full, Ultimate, etc.).
 *  Compact and Sedan auto-detected sizes both display under "Small / Med". */
const VEHICLE_SIZES: VehicleSizeOption[] = [
  {
    id: "compact",
    label: "Small / Med",
    desc: "Sedans, Coupes, 2-Row SUVs",
    sizeKey: "price_small",
  },
  {
    id: "suv",
    label: "Large / 3-Row / Passenger Van",
    desc: "3-Row SUVs, Trucks, Sienna, Odyssey, Pacifica",
    sizeKey: "price_large",
  },
  {
    id: "xl",
    label: "Work Van",
    desc: "Sprinter, Transit, ProMaster, Express, Savana",
    sizeKey: "price_extra_large",
  },
];

/** 4-tier picker shown only for Ultimate Exterior + Paint Correction packages. */
const PAINT_CORRECTION_SIZES: VehicleSizeOption[] = [
  {
    id: "compact",
    label: "Small Car",
    desc: "Compacts, Sedans, Coupes",
    sizeKey: "price_small",
  },
  {
    id: "sedan",
    label: "Mid Size",
    desc: "Mid-size sedans & 2-Row SUVs",
    sizeKey: "price_medium",
  },
  {
    id: "suv",
    label: "Large SUV / Truck",
    desc: "3-Row SUVs, Trucks, Passenger Vans",
    sizeKey: "price_large",
  },
  {
    id: "xl",
    label: "Sprinter / Work Van",
    desc: "Sprinter, Transit, ProMaster, Express",
    sizeKey: "price_extra_large",
  },
];

/** Granular size → price column mapping. Always returns the most precise DB price.
 *  For services where price_small === price_medium and price_large === price_extra_large
 *  (the standard non-paint-correction case), the result naturally collapses to the right tier. */
const SIZE_TO_PRICE_KEY: Record<VehicleSizeSlug, SizeKey> = {
  compact: "price_small",
  sedan:   "price_medium",
  suv:     "price_large",
  xl:      "price_extra_large",
};

/** When the 3-tier picker is active, sedan-sized vehicles visually collapse into the compact tier. */
function getActiveTier(vehicleSize: VehicleSizeSlug | "" , isPaintCorrection: boolean): VehicleSizeSlug | "" {
  if (!vehicleSize) return "";
  if (isPaintCorrection) return vehicleSize;
  return vehicleSize === "sedan" ? "compact" : vehicleSize;
}

const WORKDAY_START = "1:00 PM";
const WORKDAY_END = "6:30 PM";
const SLOT_INTERVAL_MIN = 30;

// Fallback slots when no operating_hours (9:30 AM–6:00 PM, 30-min increments)
function buildFallbackSlots(): { time: string; period: string }[] {
  const slots: { time: string; period: string }[] = [];
  // 9:30 AM start
  for (let totalMins = 9 * 60 + 30; totalMins < 18 * 60; totalMins += 30) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    const period = h < 12 ? "Morning" : h < 15 ? "Afternoon" : "Late Afternoon";
    slots.push({
      time: `${displayH}:${m === 0 ? "00" : "30"} ${ampm}`,
      period,
    });
  }
  return slots;
}
const FALLBACK_SLOTS = buildFallbackSlots();

const STEPS = [
  { num: 1, label: "Vehicle", icon: Car },
  { num: 2, label: "Schedule", icon: Calendar },
  { num: 3, label: "Confirm", icon: User },
];

/** Step slide: direction 1 = forward (enter from right), -1 = back (enter from left) */
const stepTransition = { duration: 0.3, ease: "easeInOut" as const };
function getStepVariants(direction: number) {
  return {
    initial: { x: direction * 20, opacity: 0, transition: stepTransition },
    animate: { x: 0, opacity: 1, transition: stepTransition },
    exit: { x: -direction * 20, opacity: 0, transition: stepTransition },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPriceForSize(service: Service, sizeId: VehicleSizeSlug): number {
  const key = SIZE_TO_PRICE_KEY[sizeId];
  return key ? service[key] : service.price_small;
}

/** "9:00 AM" or "09:00:00" → minutes from midnight */
function timeToMinutes(t: string): number {
  const trimmed = t.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    if (match12[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (match12[3].toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  return 0;
}

/** Build slots from start/end time strings (HH:MM or HH:MM:SS). Interval 30 min. */
async function buildSlotsFromHours(
  startTime: string,
  endTime: string
): Promise<{ time: string; period: string }[]> {
  const startMin = await timeToMinutes(startTime);
  let endMin = await timeToMinutes(endTime);
  if (endMin <= startMin) endMin = startMin + 60 * 12;
  const slots: { time: string; period: string }[] = [];
  for (let m = startMin; m < endMin; m += SLOT_INTERVAL_MIN) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const isPM = h >= 12;
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const period =
      h < 12 ? "Morning" : h < 15 ? "Afternoon" : "Late Afternoon";
    slots.push({
      time: `${displayH}:${min === 0 ? "00" : "30"} ${isPM ? "PM" : "AM"}`,
      period,
    });
  }
  return slots;
}

async function getWORKDAY_END_MIN() { return await timeToMinutes("6:00 PM"); }

function getDurationForService(serviceName: string, vehicleSize: VehicleSizeSlug = "compact"): number {
  if (!serviceName) return 180;
  // Personal admin blocks store their duration (minutes) in the vehicle_size field
  if (serviceName === "Personal Block") {
    const mins = parseInt(vehicleSize ?? "60", 10);
    return isNaN(mins) ? 60 : mins;
  }
  // Monthly subscription plan names are not in SERVICE_DURATIONS
  if (MONTHLY_PLAN_DURATIONS[serviceName] != null) {
    return MONTHLY_PLAN_DURATIONS[serviceName];
  }
  const service = SERVICE_DURATIONS[serviceName];
  if (!service) return 180;
  return service[vehicleSize] ?? 180;
}

/**
 * How many minutes a booking is allowed to run past the scheduled closing time.
 * This lets the last slot of the day be accepted even if the job finishes slightly late.
 */
const OVERTIME_GRACE_MINS = 30;

/** Slots that fit before closing (+ overtime grace) and do not overlap existing bookings */
async function getAvailableSlots(
  serviceName: string,
  vehicleSize: VehicleSizeSlug,
  existingBookings: BookingOnDate[] | null,
  allSlots: { time: string; period: string }[],
  closingMinutes: number = 1080, // Default to 6:00 PM if not provided
  durationOverride?: number
): Promise<{ time: string; period: string }[]> {
  const duration = durationOverride ?? getDurationForService(serviceName, vehicleSize);
  
  const bookedBlocks = await Promise.all((existingBookings ?? []).map(async (b) => {
    const start = await timeToMinutes(b.booking_time);
    const dur = b.total_duration_mins
      ?? getDurationForService(b.service_name ?? "", (b.vehicle_size as VehicleSizeSlug) ?? "compact");
    return { start, end: start + dur };
  }));

  const results = await Promise.all(allSlots.map(async (slot) => {
    const start = await timeToMinutes(slot.time);
    const end = start + duration;
    // Allow the job to run up to OVERTIME_GRACE_MINS past closing
    if (end > closingMinutes + OVERTIME_GRACE_MINS) return null;
    const overlaps = bookedBlocks.some(
      (b) => start < b.end && end > b.start
    );
    if (overlaps) return null;
    return slot;
  }));

  return results.filter((s): s is { time: string; period: string } => s !== null);
}

/** $25 off per additional vehicle added to the same appointment */
const MULTI_VEHICLE_DISCOUNT = 25;

/** Services that support multi-vehicle bookings */
const MULTI_VEHICLE_SERVICE_NAMES = [
  "Interior Detail",
  "Exterior Detail",
  "Full Detail",
  "Ultimate Interior Reset",
  "Ultimate Interior + Exterior Reset",
];

/** Per-vehicle state for the multi-vehicle UI */
type AdditionalVehicleForm = {
  vehicleSize: VehicleSizeSlug | "";
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  selectedAddons: { id: string; label: string; price: number }[];
};

function emptyAdditionalVehicle(): AdditionalVehicleForm {
  return {
    vehicleSize: "", vehicleYear: "", vehicleMake: "", vehicleModel: "",
    serviceId: "", serviceName: "", servicePrice: 0, selectedAddons: [],
  };
}

/** True if the slot time has already passed today (only when selectedDate is today). Uses local date and regex so "8:00 AM Morning" parses correctly. */
function isTimeSlotPassed(timeData: unknown, selectedDate: unknown): boolean {
  if (!selectedDate || !timeData) return false;
  try {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    let selectedStr = "";
    if (selectedDate instanceof Date) {
      selectedStr = selectedDate.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    } else {
      const safeDateString = String(selectedDate).replace(/-/g, "/");
      selectedStr = new Date(safeDateString).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    }
    if (selectedStr !== todayStr) return false;

    const timeString =
      typeof timeData === "object" && timeData !== null
        ? String((timeData as { time?: string; label?: string }).time ?? (timeData as { time?: string; label?: string }).label ?? "")
        : String(timeData);
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) return false;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime < now;
  } catch (error) {
    console.error("Error checking time slot:", error);
    return false;
  }
}

/** True if the date is Saturday (6) or Sunday (0). Expects YYYY-MM-DD string. */
function isWeekend(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 10) return false;
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

// ─── Make Autocomplete ───────────────────────────────────────────────────────

export function MakeAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (make: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = filterMakesByQuery(value);
  const showDropdown = open && options.length > 0;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full text-center bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl shadow-black/60">
          {options.slice(0, 12).map((make, i) => (
            <button
              key={make}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(make);
                onSelect?.(make);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                i === highlight ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-[#222] hover:text-white"
              }`}
            >
              {make}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Model Autocomplete (scoped to selected make; onSelect provides size for auto-detect) ─

export function ModelAutocomplete({
  value,
  onChange,
  make,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  make: string;
  onSelect?: (model: string, sizeSlug: VehicleSizeSlug) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = filterModelsByQuery(make, value);
  const showDropdown = open && make.trim() !== "" && options.length > 0;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => make.trim() && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={!make.trim()}
        className="w-full text-center bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl shadow-black/60">
          {options.slice(0, 12).map((entry, i) => (
            <button
              key={entry.model}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(entry.model);
                onSelect?.(entry.model, sizeTierToSlug(entry.size));
                setOpen(false);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                i === highlight ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-[#222] hover:text-white"
              }`}
            >
              {entry.model}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface BookingSuccessData {
  confirmationId: string;
  date: string;
  time?: string;
  serviceName: string;
  firstName: string;
  serviceAddress?: string;
  isGuest?: boolean;
  phone?: string;
  email?: string;
  loyaltyNewCount?: number;
  loyaltyNewDiscountPct?: number;
  loyaltyTierJustUnlocked?: string;
}

/** Persisted draft for restoring after Stripe checkout cancel */
export interface DraftBooking {
  serviceId: string;
  vehicleSize: VehicleSizeSlug;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  selectedDate: string;
  selectedTime: string;
  serviceAddress: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  travelFee: number;
  distanceMiles: number | null;
  couponCode: string;
  appliedCoupon: {
    couponId: string;
    code: string;
    discountAmount: number | null;
    discountPercentage: number | null;
  } | null;
  pointsToRedeemInput: number;
  /** Footage (boat/RV length in feet) */
  boatLength?: number | "";
  /** IDs of selected add-ons to restore */
  selectedAddonIds?: string[];
  /** Step reached — used for full cross-reload persistence */
  step?: number;
  /** Category selected */
  bookingCategory?: "vehicle" | "boat" | "rv" | null;
  /** Additional vehicles state */
  additionalVehicleStates?: Array<{
    vehicleSize: VehicleSizeSlug | "";
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    selectedAddonIds: string[];
  }>;
}

const DRAFT_STORAGE_KEY = "draftBooking";
/** localStorage key for cross-reload draft persistence (versioned to avoid stale schema conflicts) */
const PERSISTENT_DRAFT_KEY = "bookingDraftPersistV1";

export type BookingProgressData = {
  step: number;
  serviceName: string | null;
  date: string | null;
  time: string | null;
  price: number | null;
};

export interface BookingSectionProps {
  /** When true, the section is expanded (accordion open). */
  isVisible: boolean;
  onClose: () => void;
  selectedService: Service | null;
  services: Service[];
  onSelectService: (service: Service) => void;
  /** Clears the currently selected service (returns to service picker). */
  onClearService?: () => void;
  /** Called when booking succeeds; parent should close dropdown and show success modal */
  onBookingSuccess?: (data: BookingSuccessData) => void;
  /** Initial loyalty discount % from auth profile — auto-applies at checkout for qualifying services */
  initialLoyaltyDiscountPct?: number | null;
  /** Restore form from this draft (e.g. after Stripe cancel); applied once when visible */
  initialDraft?: DraftBooking | null;
  /** Called after draft has been applied so parent can clear initialDraft */
  onDraftRestored?: () => void;
  /** Pre-select a service category so the picker opens straight to that category */
  initialCategory?: "vehicle" | "boat" | "rv";
  /** Pre-fill the vehicle fields when the section opens. Used by inline marketing
   *  CTAs (e.g. landing-page paint correction picker) so the customer doesn't
   *  re-type their make/model after picking a service. Applied once per open.
   *  `size` is optional — when omitted, the booking modal's own auto-detect
   *  will resolve the size from the typed make/model. */
  prefilledVehicle?: {
    make: string;
    model: string;
    size?: VehicleSizeSlug;
    year?: string;
  } | null;
  /** Called whenever booking step/progress changes so parent can show a summary bar */
  onProgress?: (data: BookingProgressData | null) => void;
}

export function BookingSection({
  isVisible,
  onClose,
  selectedService,
  services,
  onSelectService,
  onClearService,
  onBookingSuccess,
  initialLoyaltyDiscountPct = null,
  initialDraft = null,
  onDraftRestored,
  initialCategory,
  prefilledVehicle = null,
  onProgress,
}: BookingSectionProps) {
  const router = useRouter();
  const bookingRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  /** 1 = forward (Next), -1 = back; used for step slide direction */
  const [stepDirection, setStepDirection] = useState(1);
  /** True when a service was pre-selected from a card — shows the confirm-then-continue screen. */
  const [showServiceConfirm, setShowServiceConfirm] = useState(false);
  /** Which top-level category the user picked: null = show category picker */
  const [bookingCategory, setBookingCategory] = useState<"vehicle" | "boat" | "rv" | null>(initialCategory ?? null);

  // Step 1 — Vehicle
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeSlug | "">("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [boatLength, setBoatLength] = useState<number | "">(20);

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<{ id: string; label: string; price: number }[]>([]);

  // Multi-vehicle
  const [additionalVehicles, setAdditionalVehicles] = useState<AdditionalVehicleForm[]>([]);

  const addAdditionalVehicle = () =>
    setAdditionalVehicles(prev => [...prev, emptyAdditionalVehicle()]);

  const removeAdditionalVehicle = (idx: number) =>
    setAdditionalVehicles(prev => prev.filter((_, i) => i !== idx));

  const updateAdditionalVehicle = (idx: number, patch: Partial<AdditionalVehicleForm>) =>
    setAdditionalVehicles(prev => prev.map((v, i) => {
      if (i !== idx) return v;
      const updated = { ...v, ...patch };
      if ("vehicleSize" in patch) {
        const base = ALL_ADD_ONS.find(a => a.id === "upholstery_shampoo")?.price ?? 50;
        updated.selectedAddons = updated.selectedAddons.map(a =>
          a.id === "upholstery_shampoo"
            ? { ...a, price: updated.vehicleSize === "xl" ? base + 15 : base }
            : a
        );
      }
      return updated;
    }));

  const toggleAdditionalAddon = (idx: number, addon: { id: string; label: string; price: number }) =>
    setAdditionalVehicles(prev => prev.map((v, i) => {
      if (i !== idx) return v;
      const has = v.selectedAddons.some(a => a.id === addon.id);
      const filtered = has
        ? v.selectedAddons.filter(a => a.id !== addon.id)
        : [...v.selectedAddons.filter(a => !FLOOR_ADDON_IDS.includes(addon.id) || !FLOOR_ADDON_IDS.includes(a.id)), addon];
      return { ...v, selectedAddons: filtered };
    }));

  const toggleAddon = (addon: AddonItem) => {
    setSelectedAddons(prev => {
      const isSelected = prev.some(a => a.id === addon.id);
      if (isSelected) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        // Floorboard shampoo & cargo tiers are mutually exclusive within their group
        let filtered = prev;
        if (FLOOR_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !FLOOR_ADDON_IDS.includes(a.id));
        } else if (CARGO_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !CARGO_ADDON_IDS.includes(a.id));
        }
        return [...filtered, { id: addon.id, label: addon.label, price: getEffectiveAddonPrice(addon, vehicleSize as string) }];
      }
    });
  };

  // Step 2 — Date & Time
  const [todayStr, setTodayStr] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [nextAvailDays, setNextAvailDays] = useState<AvailableDay[]>([]);
  const [nextAvailLoading, setNextAvailLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [weekendDateError, setWeekendDateError] = useState<string | null>(null);
  const [existingBookingsForDate, setExistingBookingsForDate] = useState<
    BookingOnDate[] | null
  >(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // Availability from Supabase (operating_hours + blocked_dates)
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Step 3 — Contact & Location
  const [serviceAddress, setServiceAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Travel fee from distance (over 10 mi from home base: $0.50/mi)
  const [travelFee, setTravelFee] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const [travelFeeLoading, setTravelFeeLoading] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Stripe redirect state
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // Step-by-step progress during submit (0, 1, 2) for engagement
  const [submittingStep, setSubmittingStep] = useState(0);

  // Auto-detect: true when the current vehicleSize was set by the detector
  const [autoDetected, setAutoDetected] = useState(false);

  // Loyalty: discount % from profile (from auth prop or fetched by phone on step 3)
  const [loyaltyDiscountPct, setLoyaltyDiscountPct] = useState<number>(0);

  // VIP success — redeem button loading state (logged-in users only)
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Promo / coupon code
  const [couponCode, setCouponCode] = useState("");
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string;
    code: string;
    discountAmount: number | null;
    discountPercentage: number | null;
  } | null>(null);

  // Gift card
  const [giftCardCode, setGiftCardCode] = useState("");
  const [isGiftCardLoading, setIsGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<{
    giftCardId: string;
    code: string;
    remainingBalance: number;
  } | null>(null);

  // Computed price
  const computedPrice = selectedService
    ? isFootageService(selectedService.name)
      ? (() => {
          const minFt = FOOTAGE_MIN_FEET[selectedService.name] ?? 15;
          const rate  = FOOTAGE_RATE[selectedService.name] ?? selectedService.price_small;
          if (typeof boatLength !== "number" || boatLength < minFt) return null;
          return Math.max(Math.round(rate * minFt), Math.round(rate * boatLength));
        })()
      : vehicleSize
        ? getPriceForSize(selectedService, vehicleSize)
        : null
    : null;

  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    let phoneNumber = value.replace(/[^\d]/g, "");
    // Strip leading US country code (1) from autofill like "18025551234"
    if (phoneNumber.length === 11 && phoneNumber.startsWith("1")) {
      phoneNumber = phoneNumber.slice(1);
    }
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  // Price/points derived values (declared early so useEffect below can reference maxRedeemablePoints)
  const isMonthlyPlan = selectedService?.name.toLowerCase().includes("monthly maintenance");
  const setupFee = isMonthlyPlan ? getMaintenanceSetupFee(selectedService?.name ?? "") : 0;
  const servicePrice = computedPrice ?? selectedService?.price_small ?? 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountPercentage != null
      ? Math.round(servicePrice * (appliedCoupon.discountPercentage / 100) * 100) / 100
      : Math.min(appliedCoupon.discountAmount ?? 0, servicePrice)
    : 0;
  // Additional vehicles: each gets $25 off + their own add-ons included in their servicePrice
  const additionalVehiclesTotal = additionalVehicles.reduce((sum, v) => {
    const addonSum = v.selectedAddons.reduce((s, a) => s + a.price, 0);
    return sum + Math.max(0, v.servicePrice - MULTI_VEHICLE_DISCOUNT) + addonSum;
  }, 0);
  // ── Estimated duration ───────────────────────────────────────────────────
  const estimatedDuration = (() => {
    if (!selectedService) return null;
    const svcName = selectedService.name;
    // Full-day add-on overrides everything
    const hasFullDay = selectedAddons.some(a => FULL_DAY_ADDON_IDS.includes(a.id as any));
    if (hasFullDay) return { minMins: FULL_DAY_DURATION_MIN, maxMins: FULL_DAY_DURATION_MIN };

    const sizeKey = VEHICLE_SIZE_MAP[vehicleSize as VehicleSizeSlug] || vehicleSize || "medium";
    const primaryMins = SERVICE_DURATIONS[svcName]?.[sizeKey] ?? 180;

    const addlMins = additionalVehicles.reduce((sum, av) => {
      if (!av.serviceName || !av.vehicleSize) return sum;
      const avKey = VEHICLE_SIZE_MAP[av.vehicleSize as VehicleSizeSlug] || av.vehicleSize || "medium";
      const base = SERVICE_DURATIONS[av.serviceName]?.[avKey] ?? 180;
      return sum + Math.max(30, base - 30);
    }, 0);

    const addonMins = getAddonExtraDurationMins(selectedAddons);
    const total = primaryMins + addlMins + addonMins;
    const margin = 30;
    return { minMins: Math.max(30, total - margin), maxMins: total + margin };
  })();

  const formatDurationRange = (minMins: number, maxMins: number): string => {
    const fmt = (m: number) => {
      if (m < 60) return `${m} min`;
      const h = m / 60;
      const whole = Math.floor(h);
      const half = Math.round((h - whole) * 2) / 2;
      if (half === 0) return `${whole} hr${whole !== 1 ? "s" : ""}`;
      if (whole === 0) return "30 min";
      return `${whole}.5 hrs`;
    };
    if (minMins === maxMins) return fmt(minMins);
    return `${fmt(minMins)}–${fmt(maxMins)}`;
  };

  const durationLabel = estimatedDuration
    ? formatDurationRange(estimatedDuration.minMins, estimatedDuration.maxMins)
    : null;

  const giftCardDiscount = appliedGiftCard
    ? Math.min(appliedGiftCard.remainingBalance, servicePrice + addonsTotal + additionalVehiclesTotal + setupFee + travelFee)
    : 0;
  const totalWithTravel =
    servicePrice - couponDiscount - giftCardDiscount + setupFee + travelFee + addonsTotal + additionalVehiclesTotal;

  // Loyalty discount: auto-applies for qualifying vehicle detail services
  const isLoyaltyEligible = loyaltyDiscountPct > 0 && !couponDiscount && (
    ["Interior Detail","Exterior Detail","Full Detail","Ultimate Interior Reset","Ultimate Interior + Exterior Reset"]
      .includes(selectedService?.name ?? "")
  );
  const loyaltyDiscountAmount = isLoyaltyEligible
    ? Math.round(servicePrice * loyaltyDiscountPct / 100 * 100) / 100
    : 0;
  const totalAfterDiscount = Math.max(0, totalWithTravel - loyaltyDiscountAmount);

  // Initialise today string client-side (avoids Next.js Cache Components error)
  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
  }, []);

  // Fetch operating_hours and blocked_dates when booking section is visible
  useEffect(() => {
    if (!isVisible) return;
    getAvailability().then(({ operatingHours: hours, blockedDates: blocked }) => {
      setOperatingHours(hours);
      setBlockedDates(blocked);
    });
  }, [isVisible]);

  // Set loyalty discount from auth prop when modal opens
  useEffect(() => {
    if (!isVisible) return;
    setLoyaltyDiscountPct(initialLoyaltyDiscountPct ?? 0);
  }, [isVisible, initialLoyaltyDiscountPct]);

  // Fetch profile by phone on step 3 for pre-fill + loyalty discount for guests
  useEffect(() => {
    if (!isVisible || step !== 3 || !phone || phone.replace(/\D/g, "").length < 10) return;
    const t = setTimeout(() => {
      getProfileByPhone(phone).then((data) => {
        if (data.loyaltyDiscountPct > loyaltyDiscountPct) setLoyaltyDiscountPct(data.loyaltyDiscountPct);
        if (data.name && !name.trim()) setName(data.name);
        if (data.email && !email.trim()) setEmail(data.email);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isVisible, step, phone]); // eslint-disable-line react-hooks/exhaustive-deps



  // Advance step-by-step loader every ~800ms while submitting
  const isSubmittingAny = isSubmitting || isStripeLoading;
  useEffect(() => {
    if (!isSubmittingAny) return;
    setSubmittingStep(0);
    const t1 = setTimeout(() => setSubmittingStep(1), 800);
    const t2 = setTimeout(() => setSubmittingStep(2), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isSubmittingAny]);

  // Clear add-ons that are no longer valid when the service or vehicle size changes
  useEffect(() => {
    if (!selectedService) return;
    const available = getAddonsForService(selectedService.name, vehicleSize as string);
    const availableIds = available.map(a => a.id) as string[];
    setSelectedAddons(prev => prev.filter(a => availableIds.includes(a.id)));
  }, [selectedService?.id, vehicleSize]);

  // ── Ultimate upsell nudge ──────────────────────────────────────────────────
  const [ultimateNudgeDismissed, setUltimateNudgeDismissed] = useState(false);
  useEffect(() => { setUltimateNudgeDismissed(false); }, [selectedService?.id]);

  const ultimateNudge = useMemo(() => {
    if (ultimateNudgeDismissed) return null;
    if (!selectedService) return null;
    const n = selectedService.name.toLowerCase();
    if (n.includes("ultimate") || n.includes("boat") || n.includes("rv") || n.includes("motorhome") || n.includes("maintenance") || n.includes("paint") || n.includes("correction")) return null;
    const hasIncludedAddon = selectedAddons.some(a => INCLUDED_IN_ULTIMATE_IDS.includes(a.id));
    if (!hasIncludedAddon) return null;
    const targetName = (n.includes("interior") && !n.includes("full"))
      ? "Ultimate Interior Reset"
      : "Ultimate Interior + Exterior Reset";
    const targetService = services.find(s => s.name === targetName);
    if (!targetService) return null;
    const targetPrice = targetService.price_small ?? 0;
    const delta = targetPrice - (servicePrice + addonsTotal);
    return { targetService, targetName, targetPrice, delta };
  }, [ultimateNudgeDismissed, selectedService, selectedAddons, services, servicePrice, addonsTotal]);

  const handleSwitchToUltimate = () => {
    if (!ultimateNudge) return;
    onSelectService(ultimateNudge.targetService);
    setUltimateNudgeDismissed(true);
  };

  // Ultimate packages are flat-rate — auto-set a neutral size so validation passes
  // without ever showing the size picker to the customer.
  // Paint correction services include "Ultimate Exterior" in the name but are NOT flat-rate;
  // they use the 4-tier picker, so they are explicitly excluded here.
  const isUltimateService = !!(
    selectedService &&
    selectedService.name.toLowerCase().includes("ultimate") &&
    !isPaintCorrectionService(selectedService.name)
  );

  // Multi-vehicle support — only for standard car services (not boat/RV/paint/maintenance)
  const supportsMultiVehicle = !!(
    selectedService && MULTI_VEHICLE_SERVICE_NAMES.includes(selectedService.name)
  );

  // True when the current service can be upgraded to an Ultimate package
  const isUltimateUpgradeable = !!(selectedService && (() => {
    const n = selectedService.name.toLowerCase();
    return !n.includes("ultimate") && !n.includes("boat") && !n.includes("rv") && !n.includes("motorhome") && !n.includes("maintenance") && !n.includes("paint") && !n.includes("correction");
  })());

  // Total booking duration: each additional vehicle gets -30 min efficiency discount (min 30).
  // Extra time from duration-extending add-ons (e.g. Ultimate Interior +3 hrs) is folded in here.
  const addonExtraDurationMins = getAddonExtraDurationMins(selectedAddons);
  const primaryDurationMins = selectedService
    ? getDurationForService(
        selectedService.name,
        (isFootageService(selectedService.name)
          ? boatLengthToSize(boatLength)
          : (vehicleSize || "compact")) as VehicleSizeSlug
      ) + addonExtraDurationMins
    : 120;
  const additionalDurationMins = additionalVehicles.reduce((sum, v) => {
    if (!v.serviceName || !v.vehicleSize) return sum;
    const base = getDurationForService(v.serviceName, v.vehicleSize as VehicleSizeSlug);
    return sum + Math.max(30, base - 30);
  }, 0);
  const totalBookingDurationMins = primaryDurationMins + additionalDurationMins;
  useEffect(() => {
    if (isUltimateService) {
      setVehicleSize("compact");
    }
  }, [isUltimateService]);

  // Reset form state each time the booking section is opened (inline section — no body scroll lock).
  // If `prefilledVehicle` is supplied (e.g. from a marketing-page picker), seed the vehicle fields
  // instead of clearing them so the customer doesn't re-type their make/model.
  useEffect(() => {
    if (isVisible) {
      // Skip the service-confirm preview screen — when a service is preselected
      // (from a marketing card or paint-correction picker), drop the customer
      // straight into step 1 of the booking flow.
      setShowServiceConfirm(false);
      setBookingCategory(initialCategory ?? null);
      setStep(1);
      setVehicleSize(prefilledVehicle?.size ?? "");
      setVehicleYear(prefilledVehicle?.year ?? "");
      setVehicleMake(prefilledVehicle?.make ?? "");
      setVehicleModel(prefilledVehicle?.model ?? "");
      setAutoDetected(!!(prefilledVehicle?.size));
      setBoatLength(20);
      setSelectedAddons([]);
      setAdditionalVehicles([]);
      setSelectedDate("");
      setSelectedTime("");
      setExistingBookingsForDate(null);
      setSlotsLoading(false);
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setServiceAddress("");
      setTravelFee(0);
      setDistanceMiles(null);
      setTravelFeeLoading(false);
      setLoyaltyDiscountPct(0);
      setCouponCode("");
      setIsCouponLoading(false);
      setCouponError(null);
      setAppliedCoupon(null);
      setGiftCardCode("");
      setGiftCardError(null);
      setAppliedGiftCard(null);
      setBookingResult(null);
      setIsSubmitting(false);
      setIsStripeLoading(false);
      setStripeError(null);
      setAutoDetected(false);
      setStepDirection(1);
    }
  }, [isVisible]);

  const appliedDraftRef = useRef(false);
  useEffect(() => {
    if (!initialDraft) {
      appliedDraftRef.current = false;
      return;
    }
    if (!isVisible || appliedDraftRef.current) return;
    const service = services.find((s) => s.id === initialDraft!.serviceId);
    if (service) {
      onSelectService(service);
    }
    setVehicleSize(initialDraft.vehicleSize);
    setVehicleYear(initialDraft.vehicleYear);
    setVehicleMake(initialDraft.vehicleMake);
    setVehicleModel(initialDraft.vehicleModel);
    setSelectedDate(initialDraft.selectedDate);
    setSelectedTime(initialDraft.selectedTime);
    setServiceAddress(initialDraft.serviceAddress);
    setName(initialDraft.name);
    setPhone(initialDraft.phone);
    setEmail(initialDraft.email);
    setNotes(initialDraft.notes);
    setTravelFee(initialDraft.travelFee);
    setDistanceMiles(initialDraft.distanceMiles);
    setCouponCode(initialDraft.couponCode);
    setAppliedCoupon(initialDraft.appliedCoupon);
    // Restore boat/RV footage
    if (initialDraft.boatLength !== undefined) {
      setBoatLength(initialDraft.boatLength);
    }
    // Restore add-ons using the service we just found
    if (initialDraft.selectedAddonIds?.length && service) {
      const available = getAddonsForService(service.name);
      const toRestore = available.filter((a) => initialDraft.selectedAddonIds!.includes(a.id));
      setSelectedAddons(toRestore);
    }
    setStep(initialDraft.selectedDate ? 3 : 2);
    setStepDirection(1);
    appliedDraftRef.current = true;
    onDraftRestored?.();
  }, [isVisible, initialDraft, services, onSelectService, onDraftRestored]);

  // ── Emit booking progress to parent (for sticky summary bar) ──────────────
  useEffect(() => {
    if (!isVisible) { onProgress?.(null); return; }
    onProgress?.({
      step,
      serviceName: selectedService?.name ?? null,
      date: selectedDate || null,
      time: selectedTime || null,
      price: step >= 3 ? totalAfterDiscount : null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, step, selectedService?.name, selectedDate, selectedTime, totalAfterDiscount]);

  // ── Auto-save booking progress to localStorage (debounced 800ms) ──────────
  // Restores across page refreshes and accidental navigation.
  const persistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isVisible) return;
    // Don't persist a completely blank form
    if (!selectedService && !vehicleYear && !name && !phone && !email) return;
    if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
    persistDebounceRef.current = setTimeout(() => {
      const draft: DraftBooking = {
        serviceId: selectedService?.id ?? "",
        vehicleSize: (vehicleSize as VehicleSizeSlug) || "sedan",
        vehicleYear, vehicleMake, vehicleModel,
        selectedDate, selectedTime,
        serviceAddress, name, phone, email, notes,
        travelFee, distanceMiles,
        couponCode, appliedCoupon,
        pointsToRedeemInput: 0,
        ...(boatLength !== "" ? { boatLength } : {}),
        selectedAddonIds: selectedAddons.map((a) => a.id),
        step,
        bookingCategory,
        additionalVehicleStates: additionalVehicles.map((v) => ({
          vehicleSize: v.vehicleSize,
          vehicleYear: v.vehicleYear,
          vehicleMake: v.vehicleMake,
          vehicleModel: v.vehicleModel,
          serviceId: v.serviceId,
          serviceName: v.serviceName,
          servicePrice: v.servicePrice,
          selectedAddonIds: v.selectedAddons.map((a) => a.id),
        })),
      };
      try { localStorage.setItem(PERSISTENT_DRAFT_KEY, JSON.stringify(draft)); } catch {}
    }, 800);
    return () => { if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, step, selectedService, vehicleSize, vehicleYear, vehicleMake, vehicleModel,
      selectedDate, selectedTime, serviceAddress, name, phone, email, notes,
      travelFee, distanceMiles, couponCode, appliedCoupon,
      boatLength, selectedAddons, additionalVehicles, bookingCategory]);

  // Step 3 — collapsible booking details summary
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // ── Restore from localStorage when form opens (after the reset effect) ────
  const [showResumeToast, setShowResumeToast] = useState(false);
  useEffect(() => {
    // initialDraft takes priority (Stripe return / rebook); localStorage is the fallback
    if (initialDraft || !isVisible) return;
    let saved: DraftBooking | null = null;
    try {
      const raw = localStorage.getItem(PERSISTENT_DRAFT_KEY);
      if (raw) saved = JSON.parse(raw) as DraftBooking;
    } catch {}
    if (!saved || (!saved.serviceId && !saved.name && !saved.vehicleYear)) return;

    const service = services.find((s) => s.id === saved!.serviceId);
    if (service) onSelectService(service);
    if (saved.bookingCategory) setBookingCategory(saved.bookingCategory);
    setVehicleSize(saved.vehicleSize || "");
    setVehicleYear(saved.vehicleYear || "");
    setVehicleMake(saved.vehicleMake || "");
    setVehicleModel(saved.vehicleModel || "");

    // Only restore a future date — past dates are useless
    const today = new Date().toISOString().slice(0, 10);
    const dateIsValid = saved.selectedDate && saved.selectedDate >= today;
    if (dateIsValid) {
      setSelectedDate(saved.selectedDate!);
      if (saved.selectedTime) setSelectedTime(saved.selectedTime);
    }

    setServiceAddress(saved.serviceAddress || "");
    setName(saved.name || "");
    setPhone(saved.phone || "");
    setEmail(saved.email || "");
    setNotes(saved.notes || "");
    setTravelFee(saved.travelFee || 0);
    setDistanceMiles(saved.distanceMiles ?? null);
    setCouponCode(saved.couponCode || "");
    setAppliedCoupon(saved.appliedCoupon ?? null);
    if (saved.boatLength !== undefined) setBoatLength(saved.boatLength);
    if (saved.selectedAddonIds?.length && service) {
      const available = getAddonsForService(service.name);
      setSelectedAddons(available.filter((a) => saved!.selectedAddonIds!.includes(a.id)));
    }
    if (saved.additionalVehicleStates?.length) {
      setAdditionalVehicles(saved.additionalVehicleStates.map((v) => ({
        vehicleSize: v.vehicleSize || "",
        vehicleYear: v.vehicleYear || "",
        vehicleMake: v.vehicleMake || "",
        vehicleModel: v.vehicleModel || "",
        serviceId: v.serviceId || "",
        serviceName: v.serviceName || "",
        servicePrice: v.servicePrice || 0,
        selectedAddons: [],
      })));
    }

    // Restore step — only advance if the data for that step is present
    const savedStep = saved.step ?? 1;
    if (savedStep >= 3 && dateIsValid) {
      setStep(3);
    } else if (savedStep >= 2 && (saved.vehicleSize || saved.vehicleYear)) {
      setStep(2);
    }

    setShowResumeToast(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, initialDraft]);

  useEffect(() => {
    if (!showResumeToast) return;
    const t = setTimeout(() => setShowResumeToast(false), 3500);
    return () => clearTimeout(t);
  }, [showResumeToast]);

  // Apple-level smooth scroll after dropdown opens: short delay so height expansion has started
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => {
      const element = bookingRef.current;
      if (!element) return;
      const yOffset = -100; // Account for sticky header
      const y = element.getBoundingClientRect().top + (window.pageYOffset ?? window.scrollY ?? 0) + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 100);
    return () => clearTimeout(t);
  }, [isVisible]);

  // Smooth scroll to top of booking module when user moves to a new step (Vehicle → Schedule → Confirm)
  const prevStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isVisible) return;
    if (prevStepRef.current === null) {
      prevStepRef.current = step;
      return;
    }
    const t = setTimeout(() => {
      const yOffset = -100; // Account for the sticky header height
      const element = bookingRef.current;
      if (element) {
        const y = element.getBoundingClientRect().top + (window.pageYOffset ?? window.scrollY ?? 0) + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }, 100);
    prevStepRef.current = step;
    return () => clearTimeout(t);
  }, [step, isVisible]);

  // ── Auto-detect vehicle size ─────────────────────────────────────────────
  useEffect(() => {
    if (!vehicleMake.trim() || vehicleModel.trim().length < 2) return;
    const timer = setTimeout(() => {
      const detected = detectVehicleSize(vehicleMake, vehicleModel);
      if (detected) {
        setVehicleSize(detected);
        setAutoDetected(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [vehicleMake, vehicleModel]);

  // ── Fetch bookings when date changes (for Schedule step availability) ───
  // Time management is handled explicitly in the UI handlers and restore paths —
  // this effect only fetches the booked slots for the chosen date.
  useEffect(() => {
    if (!selectedDate) {
      setExistingBookingsForDate(null);
      setSlotsLoading(false);
      return;
    }
    setSlotsLoading(true);
    getBookingsForDate(selectedDate)
      .then(setExistingBookingsForDate)
      .finally(() => setSlotsLoading(false));
  }, [selectedDate]);

  // ── Fetch next available days whenever service / size / additional vehicles change ─
  useEffect(() => {
    if (!selectedService || step !== 2) return;
    let cancelled = false;
    setNextAvailLoading(true);
    setNextAvailDays([]);
    // Pass combined duration so multi-vehicle slots are correctly filtered
    const customDur = totalBookingDurationMins > primaryDurationMins ? totalBookingDurationMins : undefined;
    getNextAvailableDays(selectedService.name, vehicleSize || "sedan", 3, 21, customDur)
      .then(days => { if (!cancelled) setNextAvailDays(days); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setNextAvailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedService?.name, vehicleSize, step, totalBookingDurationMins]);

  // ── Re-price upholstery shampoo if vehicle size changes after selection ────
  useEffect(() => {
    const base = ALL_ADD_ONS.find(a => a.id === "upholstery_shampoo")?.price ?? 50;
    setSelectedAddons(prev => prev.map(a =>
      a.id === "upholstery_shampoo"
        ? { ...a, price: vehicleSize === "xl" ? base + 15 : base }
        : a
    ));
  }, [vehicleSize]);

  // ── Travel fee when address changes (debounced) ─────────────────────────────
  useEffect(() => {
    const addr = serviceAddress.trim();
    if (!addr || addr.length < 5) {
      setTravelFee(0);
      setDistanceMiles(null);
      setTravelFeeLoading(false);
      return;
    }
    setTravelFeeLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/travel-fee?address=${encodeURIComponent(addr)}`
        );
        const data = await res.json();
        if (res.ok && typeof data.travelFee === "number") {
          setTravelFee(data.travelFee);
          setDistanceMiles(
            typeof data.distanceMiles === "number" ? data.distanceMiles : null
          );
        } else {
          setTravelFee(0);
          setDistanceMiles(null);
        }
      } catch {
        setTravelFee(0);
        setDistanceMiles(null);
      } finally {
        setTravelFeeLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [serviceAddress]);

  // ── Resolve operating hours for a date: month override first, then default (month null) ─
  const { defaultByDay, overrideByMonthDay } = useMemo(() => {
    const defaultByDay = new Map<number, OperatingHour>();
    const overrideByMonthDay = new Map<string, OperatingHour>();
    operatingHours.forEach((h) => {
      if (h.month == null) defaultByDay.set(h.day_of_week, h);
      else overrideByMonthDay.set(`${h.month}-${h.day_of_week}`, h);
    });
    return { defaultByDay, overrideByMonthDay };
  }, [operatingHours]);

  const getResolvedForDate = useCallback(
    (dateStr: string): OperatingHour | null => {
      if (!dateStr || dateStr.length < 10) return null;
      const d = new Date(dateStr + "T12:00:00");
      const selectedMonth = d.getMonth() + 1;
      const selectedDay = d.getDay();
      const override = overrideByMonthDay.get(`${selectedMonth}-${selectedDay}`);
      if (override) return override;
      const defaultRow = defaultByDay.get(selectedDay);
      return defaultRow ?? null;
    },
    [defaultByDay, overrideByMonthDay]
  );

  const isDateDisabled = useCallback(
    (dateStr: string): boolean => {
      if (!dateStr || dateStr.length < 10) return true;

      // Universally disable weekends (0=Sun, 6=Sat)
      const day = new Date(dateStr + "T12:00:00").getDay();
      if (day === 0 || day === 6) return true;

      if (blockedDates.includes(dateStr)) return true;
      if (operatingHours.length === 0) return false;
      const row = getResolvedForDate(dateStr);
      // No DB row when hours ARE configured → treat as closed (matches slot behavior)
      return row?.isClosed ?? true;
    },
    [blockedDates, operatingHours.length, getResolvedForDate]
  );

  const [slotsForSelectedDate, setSlotsForSelectedDate] = useState<{ time: string; period: string }[]>(FALLBACK_SLOTS);
  const [closingMinutesForSelectedDate, setClosingMinutesForSelectedDate] = useState<number>(1080); // 6:00 PM

  useEffect(() => {
    async function updateSlots() {
      if (!selectedDate || operatingHours.length === 0) {
        setSlotsForSelectedDate(FALLBACK_SLOTS);
        setClosingMinutesForSelectedDate(1080);
        return;
      }
      const row = getResolvedForDate(selectedDate);
      if (!row || row.isClosed) {
        setSlotsForSelectedDate([]);
        setClosingMinutesForSelectedDate(1080);
        return;
      }
      const start = row.start_time?.trim() || "08:00";
      const end = row.end_time?.trim() || "18:00";
      const slots = await buildSlotsFromHours(start, end);
      const closingMin = await timeToMinutes(end);
      setSlotsForSelectedDate(slots);
      setClosingMinutesForSelectedDate(closingMin);
    }
    updateSlots();
  }, [selectedDate, operatingHours.length, getResolvedForDate]);

  // ── Available slots for selected date + service (no double-book, respect closing) ─
  const [availableSlots, setAvailableSlots] = useState<{ time: string; period: string }[]>([]);

  const hasFullDayAddon = selectedAddons.some(a => FULL_DAY_ADDON_IDS.includes(a.id));
  const effectiveDurationOverride = hasFullDayAddon
    ? FULL_DAY_DURATION_MIN
    : (additionalDurationMins > 0 || addonExtraDurationMins > 0)
      ? totalBookingDurationMins
      : undefined;

  useEffect(() => {
    async function updateAvailable() {
      if (selectedService && selectedDate) {
        const slots = await getAvailableSlots(
          selectedService.name,
          isFootageService(selectedService.name) ? boatLengthToSize(boatLength) : (vehicleSize || "compact"),
          existingBookingsForDate,
          slotsForSelectedDate,
          closingMinutesForSelectedDate,
          effectiveDurationOverride
        );
        setAvailableSlots(slots);
      } else {
        setAvailableSlots([]);
      }
    }
    updateAvailable();
  }, [selectedService, selectedDate, vehicleSize, boatLength, existingBookingsForDate, slotsForSelectedDate, closingMinutesForSelectedDate, hasFullDayAddon, effectiveDurationOverride]);

  // Remove past times for today so they don't render at all (pass full slot so regex can read .time or .label)
  const displaySlots = selectedDate
    ? availableSlots.filter((slot) => !isTimeSlotPassed(slot, selectedDate))
    : availableSlots;

  // Auto-deselect if the chosen time has passed (e.g. user had a time, then switched calendar to today)
  useEffect(() => {
    async function checkCurrentTime() {
      if (selectedTime && selectedDate) {
        if (isTimeSlotPassed(selectedTime, selectedDate)) {
          setSelectedTime("");
          return;
        }
        
        // Also check if it's still available in the new slots
        const available = await getAvailableSlots(
          selectedService?.name ?? "",
          (selectedService && isFootageService(selectedService.name)) ? boatLengthToSize(boatLength) : (vehicleSize || "compact"),
          existingBookingsForDate,
          slotsForSelectedDate,
          closingMinutesForSelectedDate,
          effectiveDurationOverride
        );
        if (available.length > 0 && !available.some((s) => s.time === selectedTime)) {
          setSelectedTime("");
        }
      }
    }
    checkCurrentTime();
  }, [selectedDate, existingBookingsForDate, selectedService?.name, selectedTime, slotsForSelectedDate, closingMinutesForSelectedDate, vehicleSize]);

  // ── Navigation guards ────────────────────────────────────────────────────
  const canGoNext = (): boolean => {
    if (step === 1) {
      if (selectedService && isFootageService(selectedService.name)) {
        const minFt = FOOTAGE_MIN_FEET[selectedService.name] ?? 15;
        return !!(vehicleYear && vehicleMake && vehicleModel &&
          typeof boatLength === "number" && boatLength >= minFt);
      }
      // Ultimate packages are flat-rate — no size selection needed
      const primaryValid = isUltimateService
        ? !!(vehicleYear && vehicleMake && vehicleModel)
        : !!(vehicleSize && vehicleYear && vehicleMake && vehicleModel);
      if (!primaryValid) return false;
      // Each additional vehicle must be fully filled out
      for (const av of additionalVehicles) {
        const isUlt = av.serviceName.toLowerCase().includes("ultimate");
        if (!av.vehicleYear || !av.vehicleMake || !av.vehicleModel || !av.serviceId) return false;
        if (!isUlt && !av.vehicleSize) return false;
      }
      return true;
    }
    if (step === 2)
      return !!(
        selectedDate &&
        selectedTime &&
        !isDateDisabled(selectedDate)
      );
    return false;
  };

  const canConfirm = (): boolean =>
    !!(
      serviceAddress.trim() &&
      name.trim() &&
      phone.trim() &&
      selectedService
    );

  const handleNext = () => {
    if (step < 3) {
      setStepDirection(1);
      setStep((s) => s + 1);
    }
  };
  const handleBack = () => {
    if (step > 1) {
      setStepDirection(-1);
      setStep((s) => s - 1);
    }
  };

  // ── Submit helpers ───────────────────────────────────────────────────────
  const buildPayload = () => {
    const addlVehicles: AdditionalVehicle[] = additionalVehicles
      .filter(av => av.serviceId && av.vehicleYear && av.vehicleMake && av.vehicleModel)
      .map(av => ({
        vehicleSize: (av.vehicleSize || "compact") as VehicleSizeSlug,
        vehicleYear: av.vehicleYear,
        vehicleMake: av.vehicleMake,
        vehicleModel: av.vehicleModel,
        serviceId: av.serviceId,
        serviceName: av.serviceName,
        servicePrice: Math.max(0, av.servicePrice - MULTI_VEHICLE_DISCOUNT),
        selectedAddons: av.selectedAddons,
      }));

    return {
      serviceId: selectedService!.id,
      serviceName: selectedService!.name,
      totalPrice: totalAfterDiscount,
      vehicleSize: (selectedService && isFootageService(selectedService.name) ? boatLengthToSize(boatLength) : vehicleSize) as VehicleSizeSlug,
      vehicleYear: vehicleYear,
      vehicleMake: vehicleMake,
      vehicleModel: selectedService && isFootageService(selectedService.name)
        ? `${vehicleModel} (${boatLength}ft)`
        : vehicleModel,
      bookingDate: selectedDate,
      bookingTime: selectedTime,
      serviceAddress,
      name,
      phone,
      email,
      notes,
      selectedAddons,
      ...(addlVehicles.length > 0 && { additionalVehicles: addlVehicles }),
      ...(travelFee > 0 && { travelFee }),
      ...(setupFee > 0 && { setupFee }),
      ...(appliedCoupon && {
        couponId: appliedCoupon.couponId,
        couponDiscount,
      }),
      ...(appliedGiftCard && giftCardDiscount > 0 && {
        giftCardId: appliedGiftCard.giftCardId,
        giftCardCode: appliedGiftCard.code,
        giftCardDiscount,
      }),
    };
  };

  // ── Pay at Arrival ───────────────────────────────────────────────────────
  const handlePayAtArrival = async () => {
    if (!selectedService || (!isFootageService(selectedService.name) && !vehicleSize) || !canConfirm()) return;
    setIsSubmitting(true);
    setBookingResult(null);
    setStripeError(null);
    const result = await bookDetailing({
      ...buildPayload(),
      paymentMethod: "pay_at_arrival",
    });
    setIsSubmitting(false);
    if (!result.success) {
      console.error("Profile Error:", result.error);
    }
    setBookingResult(result);
    if (result.success && onBookingSuccess && selectedService) {
      try { localStorage.removeItem(PERSISTENT_DRAFT_KEY); } catch {}
      onClose();
      router.refresh();
      onBookingSuccess?.({
        confirmationId: result.bookingId.slice(0, 8).toUpperCase(),
        date: selectedDate,
        time: selectedTime || undefined,
        serviceName: selectedService.name,
        firstName: name.trim().split(/\s+/)[0] ?? "there",
        serviceAddress: serviceAddress.trim() || undefined,
        isGuest: initialLoyaltyDiscountPct === null,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        loyaltyNewCount:         result.loyaltyNewCount,
        loyaltyNewDiscountPct:   result.loyaltyNewDiscountPct,
        loyaltyTierJustUnlocked: result.loyaltyTierJustUnlocked,
      });
    }
  };

  // ── Save draft and redirect to sign up (keeps booking state for after auth) ─
  const handleCreateAccountClick = () => {
    if (!selectedService || (!isFootageService(selectedService.name) && !vehicleSize)) return;
    const draft: DraftBooking = {
      serviceId: selectedService.id,
      vehicleSize: (isFootageService(selectedService.name) ? boatLengthToSize(boatLength) : vehicleSize) as VehicleSizeSlug,
      vehicleYear: vehicleYear,
      vehicleMake: vehicleMake,
      vehicleModel: isFootageService(selectedService.name) ? `${vehicleModel} (${boatLength}ft)` : vehicleModel,
      selectedDate,
      selectedTime,
      serviceAddress,
      name,
      phone,
      email,
      notes,
      travelFee,
      distanceMiles,
      couponCode,
      appliedCoupon,
      pointsToRedeemInput: 0,
      boatLength: isFootageService(selectedService.name) ? boatLength : undefined,
      selectedAddonIds: selectedAddons.map((a) => a.id),
    };
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
    const returnPath = typeof window !== "undefined"
      ? window.location.pathname.replace(/\/$/, "") || "/"
      : "/";
    const returnUrl = typeof window !== "undefined"
      ? `${window.location.origin}${returnPath}?restore_booking=1`
      : "/?restore_booking=1";
    window.location.href = `/auth/login?signup=true&redirect=${encodeURIComponent(returnUrl)}`;
  };

  // ── Pay Now via Stripe ───────────────────────────────────────────────────
  const stripeAbortRef = useRef(false);

  const handlePayNow = async () => {
    if (!selectedService || (!isFootageService(selectedService.name) && !vehicleSize) || !canConfirm()) return;
    stripeAbortRef.current = false;
    setIsStripeLoading(true);
    setStripeError(null);
    setBookingResult(null);
    try {
      // Use full page path so Stripe bounces back to the correct page (boat, RV, or home)
      const pageBase =
        typeof window !== "undefined"
          ? window.location.origin + window.location.pathname.replace(/\/$/, "")
          : "";
      const draft: DraftBooking = {
        serviceId: selectedService.id,
        vehicleSize: (isFootageService(selectedService.name) ? boatLengthToSize(boatLength) : vehicleSize) as VehicleSizeSlug,
        vehicleYear: vehicleYear,
        vehicleMake: vehicleMake,
        vehicleModel: isFootageService(selectedService.name) ? `${vehicleModel} (${boatLength}ft)` : vehicleModel,
        selectedDate,
        selectedTime,
        serviceAddress,
        name,
        phone,
        email,
        notes,
        travelFee,
        distanceMiles,
        couponCode,
        appliedCoupon,
        pointsToRedeemInput: 0,
        boatLength: isFootageService(selectedService.name) ? boatLength : undefined,
        selectedAddonIds: selectedAddons.map((a) => a.id),
      };
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
      try { localStorage.removeItem(PERSISTENT_DRAFT_KEY); } catch {}

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 28_000)
      );
      const result = await Promise.race([
        bookDetailing({ ...buildPayload(), paymentMethod: "pay_now", successUrl: pageBase, cancelUrl: pageBase }),
        timeout,
      ]);

      if (stripeAbortRef.current) return;
      if (!result.success) {
        setStripeError(result.error);
        setIsStripeLoading(false);
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setIsStripeLoading(false);
      setBookingResult(result);
      if (result.success && onBookingSuccess && selectedService) {
        onClose();
        router.refresh();
        onBookingSuccess?.({
          confirmationId: result.bookingId.slice(0, 8).toUpperCase(),
          date: selectedDate,
          time: selectedTime || undefined,
          serviceName: selectedService.name,
          firstName: name.trim().split(/\s+/)[0] ?? "there",
          serviceAddress: serviceAddress.trim() || undefined,
          isGuest: initialLoyaltyDiscountPct === null,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          loyaltyNewCount:         result.loyaltyNewCount,
          loyaltyNewDiscountPct:   result.loyaltyNewDiscountPct,
          loyaltyTierJustUnlocked: result.loyaltyTierJustUnlocked,
        });
      }
    } catch (err) {
      if (stripeAbortRef.current) return;
      setIsStripeLoading(false);
      if (err instanceof Error && err.message === "TIMEOUT") {
        setStripeError("This is taking longer than expected. Please try again — if the problem persists, call us at 802-585-5563.");
      } else {
        setStripeError(err instanceof Error ? err.message : "Something went wrong.");
      }
    }
  };

  // ── VIP success: redirect to dashboard after "Redeem" animation ─────────
  const handleRedeem = () => {
    setIsRedeeming(true);
    setTimeout(() => {
      router.push("/protected");
    }, 1200);
  };

  // ── Apply promo / coupon code ────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || appliedCoupon) return;
    setIsCouponLoading(true);
    setCouponError(null);
    const result: CouponResult = await validateCoupon(couponCode);
    setIsCouponLoading(false);
    if (result.valid) {
      setAppliedCoupon({
        couponId: result.couponId,
        code: result.code,
        discountAmount: result.discountAmount,
        discountPercentage: result.discountPercentage,
      });
      setCouponCode(result.code);
    } else {
      setCouponError(result.error);
    }
  };

  // ── Apply gift card ──────────────────────────────────────────────────────
  const handleApplyGiftCard = async () => {
    if (!giftCardCode.trim() || appliedGiftCard) return;
    setIsGiftCardLoading(true);
    setGiftCardError(null);
    const result = await validateGiftCard(giftCardCode);
    setIsGiftCardLoading(false);
    if (result.valid) {
      setAppliedGiftCard({
        giftCardId: result.giftCardId,
        code: result.code,
        remainingBalance: result.remainingBalance,
      });
      setGiftCardCode(result.code);
    } else {
      setGiftCardError(result.error);
    }
  };

  // ── Gift card UI ─────────────────────────────────────────────────────────
  const renderGiftCardUI = () => (
    <div className="pt-3 mt-2 border-t border-white/10">
      {!appliedGiftCard ? (
        <div>
          <p className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
            Gift Card
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={giftCardCode}
              onChange={(e) => {
                setGiftCardCode(e.target.value.toUpperCase());
                setGiftCardError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleApplyGiftCard()}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              name="gift-card-code-x"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 font-mono"
            />
            <button
              type="button"
              onClick={handleApplyGiftCard}
              disabled={!giftCardCode.trim() || isGiftCardLoading}
              className="px-4 py-3 rounded-xl text-sm font-semibold bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
            >
              {isGiftCardLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
            </button>
          </div>
          {giftCardError && (
            <p className="mt-1.5 text-xs text-red-400">{giftCardError}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Check size={12} strokeWidth={2.5} />
          <span>
            Gift card{" "}
            <span className="font-mono font-semibold">{appliedGiftCard.code}</span>{" "}
            applied (${appliedGiftCard.remainingBalance.toFixed(2)} available)
          </span>
          <button
            type="button"
            onClick={() => { setAppliedGiftCard(null); setGiftCardCode(""); }}
            className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );

  // ── Promo code UI (rendered inside both receipt cards) ───────────────────
  const renderCouponUI = () => (
    <div className="pt-3 mt-2 border-t border-white/10">
      {!appliedCoupon ? (
        <div>
          <p className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
            Promo Code
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              placeholder="ENTER CODE"
              disabled={isCouponLoading}
              autoComplete="off"
              name="promo-discount-x"
              className="flex-1 text-center bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-sm font-mono tracking-wider uppercase disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || isCouponLoading}
              className="px-4 py-3 rounded-xl text-sm font-semibold bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
            >
              {isCouponLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {couponError && (
            <p className="text-xs text-red-400 mt-1.5">{couponError}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Check size={12} strokeWidth={2.5} />
            <span>
              Code{" "}
              <span className="font-mono font-semibold">{appliedCoupon.code}</span>{" "}
              applied
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedCoupon(null);
              setCouponCode("");
              setCouponError(null);
            }}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );

  // ── Derived display values ───────────────────────────────────────────────
  const vehicleSizeLabel = (() => {
    const isPC = isPaintCorrectionService(selectedService?.name);
    const tiers = isPC ? PAINT_CORRECTION_SIZES : VEHICLE_SIZES;
    const activeTier = getActiveTier(vehicleSize as VehicleSizeSlug, isPC);
    return tiers.find((v) => v.id === activeTier)?.label ?? vehicleSize;
  })();
  const isSubscription = selectedService?.is_subscription === true;
  const isSuccess = bookingResult?.success === true;
  const confirmationId =
    bookingResult?.success === true
      ? bookingResult.bookingId.slice(0, 8).toUpperCase()
      : null;

  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          ref={bookingRef}
          layout
          key="booking-section-dropdown"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          id="booking-panel"
          className="overflow-visible w-full min-h-fit h-auto scroll-mt-[80px] box-border"
        >
          <div
            className="relative w-full min-h-fit h-auto flex flex-col justify-start overflow-visible box-border pb-10
              bg-zinc-950/80 backdrop-blur-xl border border-[#d4af37]/30
              rounded-b-xl shadow-lg"
          >
            {/* Resume toast — shown briefly when saved progress is restored.
             *  Wrapper is a full-width flex row that centers the toast pill regardless of
             *  parent/viewport quirks. Avoids the absolute+translate centering edge cases. */}
            <AnimatePresence>
              {showResumeToast && (
                <div className="absolute top-3 inset-x-0 z-50 px-4 flex justify-center pointer-events-none">
                  <motion.div
                    key="resume-toast"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full max-w-xs"
                  >
                    <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-zinc-900/95 border border-[#D4AF37]/25 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center mx-auto">
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-[#D4AF37]" />
                        <p className="text-xs font-bold text-white leading-tight">Draft restored</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-tight truncate text-center w-full">
                        {selectedService ? selectedService.name : "Picking up where you left off"}
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Success is shown in SuccessModal; brief placeholder if dropdown still visible */}
          {isSuccess ? (
            <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin mb-3" />
              <p className="text-sm text-zinc-400">Booking confirmed! Opening summary…</p>
            </div>
          ) : isSubmittingAny ? (
            /* ── Step-by-step progress loader (during confirm) ── */
            <div className="px-6 py-10">
              <h3 className="text-lg font-bold text-white mb-1">
                Preparing your booking…
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                This usually takes just a few seconds
              </p>
              <div className="space-y-3">
                {[
                  "Checking local availability…",
                  "Calculating travel distance…",
                  "Preparing your secure checkout…",
                ].map((label, i) => {
                  const isComplete = submittingStep > i;
                  const isCurrent = submittingStep === i;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                        isCurrent
                          ? "border-amber-500/40 bg-amber-500/10"
                          : isComplete
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-[#252525] bg-[#141414] text-zinc-500"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        {isComplete ? (
                          <Check size={16} className="text-emerald-400" strokeWidth={2.5} />
                        ) : isCurrent ? (
                          <Loader2 size={16} className="animate-spin text-amber-400" />
                        ) : (
                          <span className="text-xs font-medium text-zinc-600">{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isCurrent ? "text-amber-200" : isComplete ? "text-emerald-200/90" : "text-zinc-500"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : showServiceConfirm && selectedService ? (
            /* ── Service pre-selected: confirm or change ── */
            (() => {
              const cat = getServiceCategory(selectedService);
              const includedNote = getIncludedNote(selectedService.name);
              return (
                <div className="px-6 py-8 flex flex-col items-center gap-6 text-center">
                  {/* Category badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cat.color}`}>
                    {cat.label}
                  </span>

                  {/* Service name + price */}
                  <div>
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {BOAT_DISPLAY_NAMES[selectedService.name]?.name ?? selectedService.name}
                    </h2>
                    <p className="text-[#D4AF37] font-bold mt-1.5 text-base">
                      {isFootageService(selectedService.name) ? (
                        <>
                          ${FOOTAGE_RATE[selectedService.name] ?? selectedService.price_small}
                          <span className="text-zinc-500 font-normal text-xs ml-1">
                            / foot — enter your {isRVService(selectedService.name) ? "RV" : "boat"} length to calculate
                          </span>
                        </>
                      ) : (() => {
                        const prices = [selectedService.price_small, selectedService.price_medium, selectedService.price_large, selectedService.price_extra_large];
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        return minPrice === maxPrice ? (
                          <>
                            ${minPrice}
                            <span className="text-zinc-500 font-normal text-xs ml-1">— flat rate, all sizes</span>
                          </>
                        ) : (
                          <>
                            ${minPrice} – ${maxPrice}
                            <span className="text-zinc-500 font-normal text-xs ml-1">/ depending on vehicle size</span>
                          </>
                        );
                      })()}
                    </p>
                  </div>

                  {/* Description */}
                  {(SERVICE_DESCRIPTION_OVERRIDES[selectedService.name] ?? selectedService.description) && (
                    <p className="text-sm text-zinc-400 leading-relaxed -mt-2">
                      {SERVICE_DESCRIPTION_OVERRIDES[selectedService.name] ?? selectedService.description}
                    </p>
                  )}

                  {/* Included note */}
                  {includedNote && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 w-full justify-center">
                      <Check size={14} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
                      <p className="text-xs text-emerald-300/80 leading-relaxed">{includedNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-2 w-full">
                    <button
                      type="button"
                      onClick={() => setShowServiceConfirm(false)}
                      className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black text-sm tracking-wide hover:bg-amber-400 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      Continue to Booking
                      <ChevronRight size={16} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowServiceConfirm(false);
                        setBookingCategory(null);
                        onClearService?.();
                      }}
                      className="w-full py-3 rounded-xl border border-white/[0.06] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
                    >
                      Choose a Different Service
                    </button>
                  </div>
                </div>
              );
            })()
          ) : !selectedService && services.length > 0 ? (
            /* ── Service Category Picker / Service List ── */
            !bookingCategory ? (
              /* ── Step 0: Pick a Category ── */
              <div className="px-6 py-6">
                <h2 className="text-xl font-black text-white text-center">Book a Service</h2>
                <p className="text-sm text-zinc-500 mt-0.5 mb-6 text-center">
                  What are we detailing today?
                </p>
                <div className="flex flex-col gap-3">
                  {/* Vehicle */}
                  <button
                    type="button"
                    onClick={() => setBookingCategory("vehicle")}
                    className="w-full p-5 rounded-2xl border border-[#252525] bg-zinc-900/40 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.04] active:scale-[0.99] transition-all duration-150 group"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                        <Car size={20} className="text-[#D4AF37]" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                          Vehicle Detailing
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Cars, trucks, SUVs &amp; more — interior, exterior &amp; full detail packages
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Marine */}
                  <button
                    type="button"
                    onClick={() => setBookingCategory("boat")}
                    className="w-full p-5 rounded-2xl border border-[#252525] bg-zinc-900/40 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.04] active:scale-[0.99] transition-all duration-150 group"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                        <Waves size={20} className="text-[#D4AF37]" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                          Boat / Marine Detailing
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Dockside specialist — waterline up, no haul-out required
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* RV */}
                  <button
                    type="button"
                    onClick={() => setBookingCategory("rv")}
                    className="w-full p-5 rounded-2xl border border-[#252525] bg-zinc-900/40 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.04] active:scale-[0.99] transition-all duration-150 group"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                        <Layers size={20} className="text-[#D4AF37]" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                          RV Detailing
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Motorhomes &amp; campers — mobile service, priced per foot
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="mt-8 w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2 border-t border-white/5 pt-6"
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* ── Step 1: Service List (filtered by category) ── */
              <div className="px-6 py-6">
                {/* Back header */}
                <button
                  type="button"
                  onClick={() => setBookingCategory(null)}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-5 -ml-1 group"
                >
                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                  All Services
                </button>

                {bookingCategory === "vehicle" && (() => {
                  const isVehicleService = (s: Service) =>
                    !s.is_subscription && !isBoatService(s.name) && !isRVService(s.name) &&
                    !s.name.toLowerCase().includes("paint") && !s.name.toLowerCase().includes("correction");
                  const standard = services.filter(s => isVehicleService(s) && !s.name.toLowerCase().includes("ultimate"));
                  const ultimate = services.filter(s => isVehicleService(s) && s.name.toLowerCase().includes("ultimate"));
                  return (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-xl font-black text-white mb-1 text-center">Vehicle Detailing</h2>
                        <p className="text-sm text-zinc-500 mb-6 text-center">Price varies by vehicle size</p>

                        {/* Standard packages */}
                        {standard.length > 0 && (
                          <div>
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <Sparkles size={14} className="text-[#D4AF37]" />
                              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Detailing Packages</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {standard.map((service) => (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => onSelectService(service)}
                                  className="p-4 rounded-xl border border-[#252525] text-center transition-all duration-150 hover:border-[#D4AF37]/40 hover:bg-white/[0.02] active:scale-[0.99] group"
                                >
                                  <div className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                                    {service.name}
                                  </div>
                                  <div className="text-[11px] text-[#D4AF37]/80 font-medium mt-0.5">
                                    From ${service.price_small}
                                  </div>
                                  {service.description && (
                                    <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">
                                      {service.description}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ultimate Series — visually distinct */}
                        {ultimate.length > 0 && (
                          <div className={standard.length > 0 ? "mt-6" : ""}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Gem size={14} className="text-[#D4AF37]" />
                              <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Ultimate Series</h3>
                            </div>
                            <p className="text-[11px] text-zinc-600 mb-3 text-center">The full deep-clean experience — flat rate, no size upcharge</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {ultimate.map((service) => {
                                const flatPrice = service.price_small === service.price_large
                                  ? `$${service.price_small}`
                                  : `From $${service.price_small}`;
                                const isInterior = service.name.toLowerCase().includes("interior");
                                return (
                                  <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => onSelectService(service)}
                                    className="relative p-4 rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.06] to-[#D4AF37]/[0.02] text-center transition-all duration-150 hover:border-[#D4AF37]/60 hover:from-[#D4AF37]/[0.10] hover:to-[#D4AF37]/[0.04] active:scale-[0.99] group overflow-hidden"
                                  >
                                    <div className="absolute top-2 right-2">
                                      <Crown size={12} className="text-[#D4AF37]/40" />
                                    </div>
                                    <div className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors px-5">
                                      {service.name}
                                    </div>
                                    <div className="text-sm text-[#D4AF37] font-black mt-1">
                                      {flatPrice}
                                    </div>
                                    {(SERVICE_DESCRIPTION_OVERRIDES[service.name] ?? service.description) && (
                                      <div className="text-[11px] text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                                        {SERVICE_DESCRIPTION_OVERRIDES[service.name] ?? service.description}
                                      </div>
                                    )}
                                    <div className="mt-2 inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-[#D4AF37]/70 bg-[#D4AF37]/10 rounded-full px-2 py-0.5">
                                      <Crown size={9} />
                                      {isInterior ? "Deep Interior Reset" : "Full Exterior + Interior"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {bookingCategory === "boat" && (() => {
                  const marine = services.filter(s => !s.is_subscription && isBoatService(s.name));
                  return (
                    <div>
                      <h2 className="text-xl font-black text-white mb-1">Boat / Marine Detailing</h2>
                      <p className="text-sm text-zinc-500 mb-6">Dockside service — priced per foot, 15 ft minimum</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Waves size={14} className="text-[#D4AF37]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Waterline Up Packages</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {marine.map((service) => {
                          const display = BOAT_DISPLAY_NAMES[service.name];
                          const rate    = BOAT_RATE[service.name] ?? service.price_small;
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => onSelectService(service)}
                              className="p-4 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.02] text-left transition-all duration-150 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.05] active:scale-[0.99] group"
                            >
                              <div className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                                {display ? display.name : service.name}
                              </div>
                              <div className="text-[11px] text-[#D4AF37]/80 font-medium mt-0.5">
                                ${rate}/ft
                              </div>
                              <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">
                                {display ? display.tagline : service.description}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {bookingCategory === "rv" && (() => {
                  const rv = services.filter(s => !s.is_subscription && isRVService(s.name));
                  return (
                    <div>
                      <h2 className="text-xl font-black text-white mb-1">RV Detailing</h2>
                      <p className="text-sm text-zinc-500 mb-6">Mobile service — priced per foot, 20 ft minimum</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers size={14} className="text-[#D4AF37]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">RV Packages</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rv.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.02] text-left transition-all duration-150 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.05] active:scale-[0.99] group"
                          >
                            <div className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[11px] text-[#D4AF37]/80 font-medium mt-0.5">
                              ${FOOTAGE_RATE[service.name] ?? service.price_small}/ft
                            </div>
                            {service.description && (
                              <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">
                                {service.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Maintenance club is now invite-only via email after your first full detail */}

                <button
                  onClick={onClose}
                  className="mt-8 w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2 border-t border-white/5 pt-6"
                >
                  Cancel
                </button>
              </div>
            )
          ) : !selectedService ? (
            /* No service and no services list (edge case) */
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-zinc-500">No services available. Please check back later.</p>
              <button onClick={onClose} className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors">Close</button>
            </div>
          ) : (
            <>
              {/* ── HEADER ─────────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-zinc-800/50 shrink-0 bg-inherit">
                <h2 className="text-lg font-bold text-white">
                  {isSubscription ? "Maintenance Club Setup" : "Book Your Detail"}
                </h2>
                {selectedService ? (
                  <p className="text-sm text-[#D4AF37] mt-0.5 font-medium">
                    {BOAT_DISPLAY_NAMES[selectedService.name]?.name ?? selectedService.name}
                    {computedPrice != null && (
                      <span className="text-white font-semibold">
                        {" "}
                        — ${computedPrice}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Complete the steps below to schedule your service
                  </p>
                )}

                {/* Step progress — Midnight & Champagne */}
                <div className="flex items-center mt-6">
                  {STEPS.map((s, i) => {
                    const isDone = step > s.num;
                    const isActive = step === s.num;
                    return (
                      <div key={s.num} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                              isActive
                                ? "bg-[#D4AF37] text-zinc-950 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                                : isDone
                                  ? "bg-transparent border border-[#D4AF37] text-[#D4AF37]"
                                  : "bg-transparent border border-white/10 text-zinc-600"
                            }`}
                          >
                            {isDone ? <Check size={13} className="text-[#D4AF37]" /> : s.num}
                          </div>
                          <span
                            className={`text-[10px] font-medium tracking-wide ${
                              isActive
                                ? "text-[#D4AF37]"
                                : isDone
                                  ? "text-zinc-400"
                                  : "text-zinc-600"
                            }`}
                          >
                            {s.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`h-px flex-1 mx-2 mb-5 transition-all duration-500 ease-in-out ${
                              step > s.num ? "bg-[#D4AF37]/50" : "bg-white/10"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── STEP CONTENT ───────────────────────────────────────── */}
              <div className="px-4 sm:px-6 py-6 sm:py-8 pb-20 flex flex-col justify-start h-auto">
                <AnimatePresence mode="wait">
                  {/* Step 1: Vehicle Info — Year/Make/Model first, then size cards (auto-detect from make/model) */}
                  {step === 1 && (
                    <motion.div
                      key={1}
                      variants={getStepVariants(stepDirection)}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="space-y-6 min-h-[280px]"
                      layout
                    >
                    {selectedService && isFootageService(selectedService.name) ? (
                      /* ── BOAT / RV: year/make/model + footage + live price calc ── */
                      (() => {
                        const isRV = isRVService(selectedService.name);
                        const minFt = FOOTAGE_MIN_FEET[selectedService.name] ?? 15;
                        const rate  = FOOTAGE_RATE[selectedService.name] ?? selectedService.price_small;
                        const accentColor = isRV ? "text-green-400" : "text-[#D4AF37]";
                        const borderColor = isRV ? "border-green-500/15 bg-green-500/5" : "border-[#D4AF37]/15 bg-[#D4AF37]/[0.03]";
                        const textColor   = isRV ? "text-green-300/80" : "text-zinc-400";
                        const makePlaceholder  = isRV ? "Winnebago" : "Sea Ray";
                        const modelPlaceholder = isRV ? "Minnie Winnie" : "Sundancer 260";
                        const sizeRange = isRV ? "most RVs 20–45 ft" : "most boats 15–40 ft";
                        const maxFt = isRV ? 60 : 80;
                        return (
                          <div className="space-y-5">
                            {/* Year / Make / Model */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">Year</label>
                                <input
                                  type="text"
                                  value={vehicleYear}
                                  onChange={(e) => setVehicleYear(e.target.value)}
                                  placeholder="2021"
                                  maxLength={4}
                                  className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">Make</label>
                                <input
                                  type="text"
                                  value={vehicleMake}
                                  onChange={(e) => setVehicleMake(e.target.value)}
                                  placeholder={makePlaceholder}
                                  className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">Model</label>
                                <input
                                  type="text"
                                  value={vehicleModel}
                                  onChange={(e) => setVehicleModel(e.target.value)}
                                  placeholder={modelPlaceholder}
                                  className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
                                />
                              </div>
                            </div>

                            {/* Footage input — touch-friendly stepper */}
                            <div>
                              <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-3">
                                {isRV ? "RV Length (feet)" : "Boat Length (feet)"}
                              </label>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = typeof boatLength === "number" ? boatLength : minFt;
                                    setBoatLength(Math.max(minFt, cur - 1));
                                  }}
                                  disabled={typeof boatLength === "number" && boatLength <= minFt}
                                  className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0"
                                  aria-label="Decrease length"
                                >
                                  <ChevronLeft size={18} />
                                </button>
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={minFt}
                                    max={maxFt}
                                    value={boatLength}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBoatLength(val === "" ? "" : Math.max(1, parseInt(val, 10) || 1));
                                    }}
                                    placeholder={`e.g. ${minFt + 5}`}
                                    className="w-full text-center bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-4 outline-none transition-all placeholder:text-zinc-600 text-2xl font-black tabular-nums min-h-[52px]"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium pointer-events-none">ft</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = typeof boatLength === "number" ? boatLength : minFt;
                                    setBoatLength(Math.min(maxFt, cur + 1));
                                  }}
                                  disabled={typeof boatLength === "number" && boatLength >= maxFt}
                                  className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0"
                                  aria-label="Increase length"
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </div>
                              <p className="text-[11px] text-zinc-600 mt-2 text-center">
                                Minimum {minFt} ft · {sizeRange}
                              </p>
                            </div>

                            {/* Live price calculation */}
                            {computedPrice != null && (
                              <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 px-5 py-4 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Estimated Total</p>
                                <p className="text-3xl font-black text-[#D4AF37] tabular-nums">${computedPrice}</p>
                                <p className="text-[11px] text-zinc-500 mt-1">
                                  {typeof boatLength === "number" && boatLength < minFt
                                    ? `${minFt}ft minimum applies`
                                    : `${boatLength}ft × $${rate}/ft`}
                                </p>
                              </div>
                            )}

                            <div className={`rounded-xl border ${borderColor} px-4 py-3`}>
                              <p className={`text-[11px] ${textColor} leading-relaxed`}>
                                {isRV
                                  ? "Final price confirmed on-site. Slide-outs, awnings, and diesel pusher coaches may require a custom quote."
                                  : "Final price confirmed on-site after inspection. Pontoons, bowriders, and larger center consoles may require a quote for additional complexity."}
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* ── VEHICLE: year/make/model + size ── */
                      <>
                      {/* Year, Make, Model — Make/Model autocomplete with size auto-select on pick */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">
                            Year
                          </label>
                          <input
                            type="text"
                            value={vehicleYear}
                            onChange={(e) => setVehicleYear(e.target.value)}
                            placeholder="2022"
                            maxLength={4}
                            className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm text-center"
                          />
                        </div>
                        <div>
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">
                            Make
                          </label>
                          <MakeAutocomplete
                            value={vehicleMake}
                            onChange={setVehicleMake}
                            onSelect={() => {
                              setVehicleModel("");
                              setAutoDetected(false);
                            }}
                            placeholder="Toyota"
                          />
                        </div>
                        <div>
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">
                            Model
                          </label>
                          <ModelAutocomplete
                            value={vehicleModel}
                            onChange={setVehicleModel}
                            make={vehicleMake}
                            onSelect={(_, sizeSlug) => {
                              setVehicleSize(sizeSlug);
                              setAutoDetected(true);
                            }}
                            placeholder="Camry"
                          />
                        </div>
                      </div>

                      {/* Vehicle Size — hidden for flat-rate Ultimate packages */}
                      {isUltimateService ? (
                        <div className="flex flex-col items-center text-center gap-1.5 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.05] px-5 py-4">
                          <Crown size={16} className="text-[#D4AF37]" />
                          <p className="text-sm font-bold text-white">
                            {selectedService?.price_small != null ? `$${selectedService.price_small}` : ""} — Flat Rate
                          </p>
                          <p className="text-[11px] text-zinc-500">One price for all vehicle sizes. No upsell.</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-col items-center mb-3 gap-1">
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                              Vehicle Size
                            </label>
                            {autoDetected && vehicleSize && (
                              <span className="inline-flex items-center gap-1 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">
                                <Zap size={8} className="fill-[#D4AF37]" /> Auto-detected
                              </span>
                            )}
                          </div>

                          {!vehicleSize ? (
                            /* ── No size yet: prompt to enter vehicle ── */
                            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-950/40 px-5 py-4 text-zinc-600 text-center">
                              <Car size={16} className="opacity-50" />
                              <p className="text-sm">Enter your vehicle above to get your price</p>
                            </div>
                          ) : (
                            /* ── Size chosen: show only the selected card ──
                             * Paint correction services use the 4-tier picker (PAINT_CORRECTION_SIZES);
                             * everything else uses the 3-tier picker (VEHICLE_SIZES). When the 3-tier
                             * picker is active and the auto-detected size is "sedan", we collapse it
                             * visually to the "compact" tier card via getActiveTier. */
                            <>
                              {(() => {
                                const isPC = isPaintCorrectionService(selectedService?.name);
                                const tiers = isPC ? PAINT_CORRECTION_SIZES : VEHICLE_SIZES;
                                const activeTier = getActiveTier(vehicleSize as VehicleSizeSlug, isPC);
                                return tiers.filter(s => s.id === activeTier).map((size) => (
                                  <div
                                    key={size.id}
                                    className="w-full p-4 rounded-2xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 shadow-[0_0_18px_rgba(212,175,55,0.12)] text-center"
                                  >
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                      <span className="text-sm font-bold text-[#D4AF37]">{size.label}</span>
                                      <Check size={14} className="text-[#D4AF37]" strokeWidth={3} />
                                    </div>
                                    <p className="text-[11px] text-zinc-500 leading-snug">{size.desc}</p>
                                    {selectedService && (
                                      <p className="text-sm font-black mt-2 text-white">
                                        ${getPriceForSize(selectedService, vehicleSize as VehicleSizeSlug)}
                                      </p>
                                    )}
                                  </div>
                                ));
                              })()}
                            </>
                          )}

                          {!vehicleSize && vehicleMake.trim() && vehicleModel.trim() && (
                            <p className="text-[11px] text-zinc-500 mt-2.5 text-center">
                              Vehicle not found in our database — please select your size above
                            </p>
                          )}
                        </div>
                      )}

                      {/* Enhance Your Detail (Smart per-service Add-ons) */}
                      {(() => {
                        const available = getAddonsForService(selectedService?.name ?? "", vehicleSize as string);
                        const standAlone = available.filter(a => !FLOOR_ADDON_IDS.includes(a.id));
                        const floorOpts  = available.filter(a => FLOOR_ADDON_IDS.includes(a.id));
                        const note       = getIncludedNote(selectedService?.name ?? "");
                        const isMarine   = !!(selectedService && BOAT_DISPLAY_NAMES[selectedService.name]);
                        const isRV       = !!(selectedService && isRVService(selectedService.name));
                        const isUltimate = !!(selectedService?.name.toLowerCase().includes("ultimate"));
                        if (!standAlone.length && !floorOpts.length) return null;
                        return (
                          <div>
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <Sparkles size={14} className="text-[#D4AF37]" />
                              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                                {isMarine ? "Marine Specialist Add-ons" : isRV ? "RV Specialist Add-ons" : isUltimate ? "Ultimate Upgrades" : "Enhance Your Detail"}
                              </label>
                            </div>

                            {note && (
                              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 mb-3 text-center">
                                <Check size={12} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
                                <p className="text-[11px] text-emerald-300/80 leading-relaxed">{note}</p>
                              </div>
                            )}

                            {/* Full-day notice when 1-step polish is selected */}
                            {hasFullDayAddon && (
                              <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 mb-3 text-center">
                                <Zap size={12} className="text-amber-400 shrink-0" />
                                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                                  <span className="font-bold">Full-day appointment required.</span> Machine polishing takes the full day — only morning start times will be available.
                                </p>
                              </div>
                            )}

                            <div className="space-y-2">
                              {/* Standalone add-ons (non-floor) */}
                              {standAlone.map((addon) => {
                                const isSelected = selectedAddons.some(a => a.id === addon.id);
                                const isIncluded = isUltimateUpgradeable && INCLUDED_IN_ULTIMATE_IDS.includes(addon.id);
                                return (
                                  <button
                                    key={addon.id}
                                    type="button"
                                    onClick={() => toggleAddon(addon)}
                                    className={`w-full px-3.5 py-2.5 rounded-xl border transition-all duration-200 group flex items-center gap-3 text-left ${
                                      isSelected
                                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/50 shadow-[0_0_12px_rgba(212,175,55,0.08)]"
                                        : "bg-zinc-950/40 border-white/5 hover:border-white/15"
                                    }`}
                                  >
                                    {/* Check circle */}
                                    <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isSelected ? "bg-[#D4AF37] border-[#D4AF37]" : "border-zinc-700 group-hover:border-zinc-500"
                                    }`}>
                                      {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                                    </div>

                                    {/* Label + desc */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm font-bold leading-tight ${isSelected ? "text-[#D4AF37]" : "text-zinc-200 group-hover:text-white"}`}>
                                          {addon.label}
                                        </span>
                                        {isIncluded && (
                                          <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-[#D4AF37]/80 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-1.5 py-0.5 rounded-full">
                                            <Crown size={7} />
                                            Included in Ultimate
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-zinc-500 leading-snug mt-0.5 line-clamp-2">
                                        {addon.desc}
                                      </p>
                                    </div>

                                    {/* Price */}
                                    <div className={`shrink-0 text-sm font-black tabular-nums ${isSelected ? "text-white" : "text-[#D4AF37]"}`}>
                                      +${getEffectiveAddonPrice(addon, vehicleSize as string)}
                                    </div>
                                  </button>
                                );
                              })}

                              {/* Floorboard Shampoo — tiered selector */}
                              {floorOpts.length > 0 && (
                                <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                                  selectedAddons.some(a => FLOOR_ADDON_IDS.includes(a.id))
                                    ? "border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                    : "border-white/5"
                                }`}>
                                  <div className={`px-4 py-3 border-b border-white/[0.06] text-center ${
                                    selectedAddons.some(a => FLOOR_ADDON_IDS.includes(a.id))
                                      ? "bg-[#D4AF37]/10"
                                      : "bg-zinc-950/40"
                                  }`}>
                                    <p className="text-sm font-bold text-zinc-200">Sectional Floorboard Shampoo</p>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">Deep shampoo — pick how many sections</p>
                                  </div>
                                  <div className="flex divide-x divide-white/[0.06] bg-zinc-950/40">
                                    {floorOpts.map((addon) => {
                                      const isSelected = selectedAddons.some(a => a.id === addon.id);
                                      const shortLabel = addon.id === "floor_1" ? "1 Section" : addon.id === "floor_2" ? "2 Sections" : "All";
                                      return (
                                        <button
                                          key={addon.id}
                                          type="button"
                                          onClick={() => toggleAddon(addon)}
                                          className={`flex-1 py-3.5 text-center transition-all duration-200 ${
                                            isSelected ? "bg-[#D4AF37]/10" : "hover:bg-white/[0.03]"
                                          }`}
                                        >
                                          <div className={`text-xs font-bold ${isSelected ? "text-[#D4AF37]" : "text-zinc-400"}`}>
                                            {shortLabel}
                                          </div>
                                          <div className={`text-sm font-black mt-0.5 tabular-nums ${isSelected ? "text-white" : "text-[#D4AF37]"}`}>
                                            +${addon.price}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── Ultimate Upsell Nudge ── */}
                      <AnimatePresence>
                        {ultimateNudge && (
                          <motion.div
                            key="ultimate-nudge"
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.08] to-[#D4AF37]/[0.03]"
                          >
                            {/* Subtle top glow line */}
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
                            <div className="px-4 pt-4 pb-4">
                              {/* Header row */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
                                    <Crown size={15} className="text-[#D4AF37]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-white leading-tight">
                                      Upgrade to {ultimateNudge.targetName}
                                    </p>
                                    <p className="text-[11px] text-[#D4AF37]/70 font-medium mt-0.5">
                                      {ultimateNudge.delta < 0
                                        ? `Switch and save $${Math.abs(ultimateNudge.delta)} — get more for less`
                                        : ultimateNudge.delta === 0
                                        ? "You're already covering the cost — go all-in"
                                        : `Only $${ultimateNudge.delta} more for the full treatment`}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setUltimateNudgeDismissed(true)}
                                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.06] transition-all mt-0.5"
                                  aria-label="Dismiss"
                                >
                                  <X size={12} />
                                </button>
                              </div>

                              {/* What's included */}
                              <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                                {ultimateNudge.targetName === "Ultimate Interior Reset"
                                  ? "Full interior reset · deep shampoo · clay bar · upholstery treatment · everything included — no add-ons needed."
                                  : "Complete interior + exterior reset · clay bar · full shampoo · wax & sealant — the full package in one visit."}
                              </p>

                              {/* Price row + CTA */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-600 line-through">
                                    ${servicePrice + addonsTotal}
                                  </span>
                                  <span className="text-base font-black text-[#D4AF37]">
                                    ${ultimateNudge.targetPrice}
                                  </span>
                                  {ultimateNudge.delta > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                      +${ultimateNudge.delta} more
                                    </span>
                                  )}
                                  {ultimateNudge.delta === 0 && (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                      same price
                                    </span>
                                  )}
                                  {ultimateNudge.delta < 0 && (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                      save ${Math.abs(ultimateNudge.delta)}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSwitchToUltimate}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-black text-xs font-black transition-all active:scale-95 shrink-0"
                                >
                                  <Crown size={11} />
                                  Switch to Ultimate
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── Multi-Vehicle Add-on Section ── */}
                      {supportsMultiVehicle && (
                        <div className="pt-2">
                          {/* Savings banner */}
                          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 mb-4 text-center">
                            <Tag size={14} className="text-emerald-400 shrink-0" />
                            <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                              <span className="font-bold">Save $25 on each additional vehicle</span> — bring multiple cars and we'll detail them all in one visit!
                            </p>
                          </div>

                          {/* Added vehicles */}
                          {additionalVehicles.map((av, idx) => {
                            const avIsUltimate = av.serviceName.toLowerCase().includes("ultimate");
                            const eligibleServices = services.filter(
                              s => MULTI_VEHICLE_SERVICE_NAMES.includes(s.name)
                            );
                            const avAddons = av.serviceId
                              ? getAddonsForService(av.serviceName)
                              : [];
                            const avServiceObj = services.find(s => s.id === av.serviceId);
                            const avBasePrice = avIsUltimate
                              ? avServiceObj?.price_small ?? 0
                              : av.vehicleSize
                                ? (avServiceObj ? getPriceForSize(avServiceObj, av.vehicleSize as VehicleSizeSlug) : 0)
                                : 0;
                            return (
                              <div
                                key={idx}
                                className="mb-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] overflow-hidden"
                              >
                                {/* Card header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/10 bg-[#D4AF37]/[0.04]">
                                  <div className="flex items-center gap-2">
                                    <Car size={14} className="text-[#D4AF37]" />
                                    <span className="text-sm font-bold text-white">Vehicle {idx + 2}</span>
                                    {avBasePrice > 0 && (
                                      <span className="text-xs text-emerald-400 font-semibold">
                                        ${Math.max(0, avBasePrice - MULTI_VEHICLE_DISCOUNT)} <span className="line-through text-zinc-500">${avBasePrice}</span> (–${MULTI_VEHICLE_DISCOUNT} off)
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeAdditionalVehicle(idx)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    aria-label="Remove vehicle"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                <div className="p-4 space-y-4">
                                  {/* Step 1: Year / Make / Model */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-1.5 text-center">Year</label>
                                      <input
                                        type="text"
                                        value={av.vehicleYear}
                                        onChange={e => updateAdditionalVehicle(idx, { vehicleYear: e.target.value })}
                                        placeholder="2022"
                                        maxLength={4}
                                        className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 text-white rounded-xl px-3 py-2.5 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-1.5 text-center">Make</label>
                                      <MakeAutocomplete
                                        value={av.vehicleMake}
                                        onChange={v => updateAdditionalVehicle(idx, { vehicleMake: v, vehicleModel: "", vehicleSize: "" })}
                                        onSelect={make => updateAdditionalVehicle(idx, { vehicleMake: make, vehicleModel: "", vehicleSize: "" })}
                                        placeholder="Toyota"
                                      />
                                    </div>
                                    <div>
                                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-1.5 text-center">
                                        Model
                                      </label>
                                      <ModelAutocomplete
                                        value={av.vehicleModel}
                                        onChange={v => updateAdditionalVehicle(idx, { vehicleModel: v })}
                                        make={av.vehicleMake}
                                        onSelect={(model, sizeSlug) => {
                                          if (!avIsUltimate && sizeSlug) {
                                            const svcObj = services.find(s => s.id === av.serviceId);
                                            const price = svcObj ? getPriceForSize(svcObj, sizeSlug) : av.servicePrice;
                                            updateAdditionalVehicle(idx, { vehicleModel: model, vehicleSize: sizeSlug, servicePrice: price });
                                          } else {
                                            updateAdditionalVehicle(idx, { vehicleModel: model });
                                          }
                                        }}
                                        placeholder="Camry"
                                      />
                                    </div>
                                  </div>

                                  {/* Step 2: Service — shown once make is entered */}
                                  {av.vehicleMake && (
                                    <div>
                                      {/* Standard services */}
                                      {(() => {
                                        const stdSvcs = eligibleServices.filter(s => !s.name.toLowerCase().includes("ultimate"));
                                        const ultSvcs = eligibleServices.filter(s => s.name.toLowerCase().includes("ultimate"));
                                        return (
                                          <div className="space-y-3">
                                            {stdSvcs.length > 0 && (
                                              <div>
                                                <div className="flex items-center justify-center gap-1.5 mb-2">
                                                  <Sparkles size={11} className="text-zinc-500" />
                                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Standard Services</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                  {stdSvcs.map(svc => {
                                                    const selected = av.serviceId === svc.id;
                                                    const price = av.vehicleSize
                                                      ? getPriceForSize(svc, av.vehicleSize as VehicleSizeSlug)
                                                      : svc.price_small ?? 0;
                                                    return (
                                                      <button
                                                        key={svc.id}
                                                        type="button"
                                                        onClick={() => updateAdditionalVehicle(idx, { serviceId: svc.id, serviceName: svc.name, servicePrice: price, selectedAddons: [] })}
                                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                                                          selected ? "bg-[#D4AF37]/10 border-[#D4AF37]/50" : "border-white/[0.06] hover:border-white/20"
                                                        }`}
                                                      >
                                                        <span className={`text-sm font-semibold ${selected ? "text-[#D4AF37]" : "text-zinc-300"}`}>{svc.name}</span>
                                                        <span className={`text-sm font-black tabular-nums ${selected ? "text-white" : "text-[#D4AF37]"}`}>
                                                          ${Math.max(0, price - MULTI_VEHICLE_DISCOUNT)}
                                                        </span>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                            {ultSvcs.length > 0 && (
                                              <div>
                                                <div className="flex items-center justify-center gap-1.5 mb-2">
                                                  <Crown size={11} className="text-[#D4AF37]" />
                                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Ultimate Series — Flat Rate</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                  {ultSvcs.map(svc => {
                                                    const selected = av.serviceId === svc.id;
                                                    const price = svc.price_small ?? 0;
                                                    return (
                                                      <button
                                                        key={svc.id}
                                                        type="button"
                                                        onClick={() => updateAdditionalVehicle(idx, { serviceId: svc.id, serviceName: svc.name, servicePrice: price, selectedAddons: [], vehicleSize: "compact" })}
                                                        className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                                                          selected
                                                            ? "bg-[#D4AF37]/15 border-[#D4AF37]/60"
                                                            : "border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] hover:border-[#D4AF37]/40"
                                                        }`}
                                                      >
                                                        <div className="min-w-0">
                                                          <span className={`text-sm font-semibold ${selected ? "text-[#D4AF37]" : "text-zinc-200"}`}>{svc.name}</span>
                                                          <p className="text-[10px] text-zinc-500 mt-0.5">Deep clean — flat rate, any size</p>
                                                        </div>
                                                        <div className="shrink-0 flex flex-col items-end gap-0.5 ml-2">
                                                          <span className={`text-sm font-black tabular-nums ${selected ? "text-white" : "text-[#D4AF37]"}`}>
                                                            ${Math.max(0, price - MULTI_VEHICLE_DISCOUNT)}
                                                          </span>
                                                          <Crown size={10} className={selected ? "text-[#D4AF37]" : "text-[#D4AF37]/40"} />
                                                        </div>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Add-ons for this vehicle */}
                                  {avAddons.length > 0 && (
                                    <div>
                                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">Add-ons</label>
                                      <div className="space-y-1.5">
                                        {avAddons.filter(a => !FLOOR_ADDON_IDS.includes(a.id)).map(addon => {
                                          const sel = av.selectedAddons.some(a => a.id === addon.id);
                                          return (
                                            <button
                                              key={addon.id}
                                              type="button"
                                              onClick={() => toggleAdditionalAddon(idx, { id: addon.id, label: addon.label, price: getEffectiveAddonPrice(addon, av.vehicleSize) })}
                                              className={`w-full flex flex-col items-center px-3 py-2.5 rounded-xl border text-center transition-all ${
                                                sel
                                                  ? "bg-[#D4AF37]/10 border-[#D4AF37]/50"
                                                  : "border-white/[0.06] hover:border-white/15"
                                              }`}
                                            >
                                              <span className={`text-xs font-semibold ${sel ? "text-[#D4AF37]" : "text-zinc-300"}`}>{addon.label}</span>
                                              <span className={`text-xs font-black ${sel ? "text-white" : "text-[#D4AF37]"}`}>+${getEffectiveAddonPrice(addon, av.vehicleSize)}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Add vehicle button */}
                          <button
                            type="button"
                            onClick={addAdditionalVehicle}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-[#D4AF37]/40 text-[#D4AF37] text-sm font-bold hover:bg-[#D4AF37]/[0.05] hover:border-[#D4AF37]/60 transition-all active:scale-[0.98]"
                          >
                            <Plus size={15} strokeWidth={2.5} />
                            Add Another Vehicle — Save $25
                          </button>
                        </div>
                      )}
                      </>
                    )}
                  </motion.div>
                  )}

                  {/* Step 2: Date & Time — slots filtered by existing bookings + service duration */}
                  {step === 2 && (
                    <motion.div
                      key={2}
                      variants={getStepVariants(stepDirection)}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="space-y-6 min-h-[280px]"
                      layout
                    >
                    {isSubscription && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 mb-2">
                        <h3 className="text-sm font-bold text-amber-200/90 mb-1">
                          Schedule Your Initial Deep Clean
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Pick the date for your mandatory ${setupFee > 0 ? `$${setupFee}` : ""} reset detail. Your monthly maintenance schedule will be locked in after this.
                        </p>
                      </div>
                    )}
                    {/* ── Next Available quick-pick ──────────────────────── */}
                    <div>
                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                        Next Available
                      </label>
                      {nextAvailLoading ? (
                        <div className="grid grid-cols-3 gap-2">
                          {[0,1,2].map(i => (
                            <div key={i} className="skeleton-shimmer h-[72px] rounded-xl border border-zinc-800/40" style={{ animationDelay: `${i*0.1}s` }} />
                          ))}
                        </div>
                      ) : nextAvailDays.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-1">No openings in the next 3 weeks — please call us.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {nextAvailDays.map(day => {
                            const isSelected = selectedDate === day.date;
                            return (
                              <button
                                key={day.date}
                                type="button"
                                onClick={() => {
                                  setWeekendDateError(null);
                                  setSelectedDate(day.date);
                                  // Pre-select the earliest time by converting back to raw "HH:MM" format
                                  // day.earliestSlot is "H:MM AM/PM", convert to slot key used by displaySlots
                                  // We store it in selectedTime as the 12h display string used in slot.time
                                  setSelectedTime(day.earliestSlot);
                                }}
                                className={`flex flex-col items-center justify-center gap-0.5 py-3 px-1 rounded-xl border transition-all active:scale-95 ${
                                  isSelected
                                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/60 text-[#D4AF37]"
                                    : "bg-zinc-900/30 border-white/[0.07] text-zinc-300 hover:border-[#D4AF37]/40"
                                }`}
                              >
                                <span className="text-[10px] font-black uppercase tracking-wide">{day.label}</span>
                                <span className={`text-xs font-bold mt-0.5 ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>{day.earliestSlot}</span>
                                <span className="text-[9px] text-zinc-500">{day.totalSlots} open</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ── Manual date picker ─────────────────────────────── */}
                    <div className="w-full max-w-[calc(100vw-40px)] min-w-0">
                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                        Or Pick a Different Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (isDateDisabled(value)) {
                            setWeekendDateError(
                              "This date is not available for booking. Choose another day."
                            );
                            return;
                          }
                          setWeekendDateError(null);
                          setSelectedDate(value);
                          setSelectedTime("");
                        }}
                        min={todayStr}
                        className={`w-full text-center max-w-full min-h-[44px] box-border bg-zinc-950/50 border rounded-xl px-4 py-3 outline-none transition-all [color-scheme:dark] text-[16px] md:text-sm ${
                          weekendDateError
                            ? "border-amber-500/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                            : "border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50"
                        } text-white`}
                      />
                      <p className="text-zinc-500 text-xs mt-1.5">
                        Weekends and blocked days are unavailable.
                      </p>
                      {weekendDateError && (
                        <p className="text-amber-400 text-sm mt-1.5 font-medium" role="alert">
                          {weekendDateError}
                        </p>
                      )}
                    </div>

                    {/* ── Time slots ─────────────────────────────────────── */}
                    <div>
                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                        {selectedDate ? "All Available Times" : "Available Times"}
                      </label>
                      {!selectedDate ? (
                        <p className="text-sm text-zinc-500 py-2">
                          Tap a quick-pick above or choose a date to see all times.
                        </p>
                      ) : slotsLoading ? (
                        <div className="grid grid-cols-2 gap-2" aria-label="Loading available times…">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="skeleton-shimmer h-[42px] rounded-xl border border-zinc-800/40"
                              style={{ animationDelay: `${i * 0.1}s` }}
                            />
                          ))}
                        </div>
                      ) : !selectedService ? (
                        <p className="text-sm text-zinc-500 py-2">
                          Select a service first to see available times.
                        </p>
                      ) : displaySlots.length === 0 ? (
                        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 px-4 py-4 space-y-2">
                          <p className="text-sm font-semibold text-zinc-300">No openings on this day</p>
                          <p className="text-xs text-zinc-500">This date is fully booked. Tap one of the &ldquo;Next Available&rdquo; days above for instant booking.</p>
                          {nextAvailDays.length > 0 && (
                            <div className="flex gap-2 pt-1">
                              {nextAvailDays.map(day => (
                                <button
                                  key={day.date}
                                  type="button"
                                  onClick={() => { setSelectedDate(day.date); setSelectedTime(day.earliestSlot); setWeekendDateError(null); }}
                                  className="flex-1 py-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/5 text-[#D4AF37] text-[10px] font-black uppercase tracking-wide"
                                >
                                  {day.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {displaySlots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedTime(slot.time)}
className={`min-h-[44px] py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                                  selectedTime === slot.time
                                    ? "bg-zinc-900/90 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)] scale-[1.02]"
                                    : "bg-zinc-900/30 border-white/5 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
                                }`}
                            >
                              <span className="font-medium text-sm">{slot.time}</span>
                              <span className={`text-[10px] uppercase tracking-wider ${selectedTime === slot.time ? "text-[#D4AF37]/70" : "text-zinc-500"}`}>
                                {slot.period}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Estimated duration — shown once a time is picked or always as context */}
                      {durationLabel && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                          <span className="text-base">⏱</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-zinc-400">
                              Estimated time:{" "}
                              <span className="font-semibold text-zinc-200">{durationLabel}</span>
                            </span>
                            {additionalVehicles.filter(v => v.vehicleSize && v.serviceName).length > 0 && (
                              <span className="ml-1.5 text-[10px] text-zinc-600">
                                ({1 + additionalVehicles.filter(v => v.vehicleSize && v.serviceName).length} vehicles)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  )}

                  {/* Step 3: Contact & Confirm */}
                  {step === 3 && (
                    <motion.div
                      key={3}
                      variants={getStepVariants(stepDirection)}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="pt-8 space-y-5 min-h-[280px]"
                      layout
                    >
                    {/* Contact info for customers */}
                    <div className="rounded-xl border border-[#252525] bg-[#141414] px-4 py-3 text-center text-sm text-zinc-400">
                      Questions? Reach us at{" "}
                      <a href="tel:802-585-5563" className="font-semibold text-white hover:text-zinc-200 transition-colors">
                        802-585-5563
                      </a>
                      {" "}or{" "}
                      <a href="mailto:contact@ariseandshinevt.com" className="font-semibold text-white hover:text-zinc-200 transition-colors">
                        contact@ariseandshinevt.com
                      </a>
                    </div>

                    {/* Booking summary — collapsible receipt card */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
                      {/* Always-visible summary header */}
                      <button
                        type="button"
                        onClick={() => setSummaryExpanded(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-0.5">Booking Summary</p>
                          <p className="text-sm font-semibold text-white truncate">
                            {selectedService?.name ?? "—"}
                            {selectedDate && selectedTime && (
                              <span className="text-zinc-400 font-normal"> · {selectedDate} @ {selectedTime}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="text-xs text-[#D4AF37]">{summaryExpanded ? "Hide" : "Details"}</span>
                          <ChevronRight size={14} className={`text-zinc-500 transition-transform ${summaryExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </button>

                      {/* Expandable details */}
                      {summaryExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/[0.05] space-y-2.5 text-sm">
                          <ReceiptRow label="Service" value={selectedService?.name ?? "—"} />
                          <ReceiptRow
                            label="Vehicle"
                            value={
                              vehicleYear && vehicleMake && vehicleModel
                                ? `${vehicleYear} ${vehicleMake} ${vehicleModel} (${vehicleSizeLabel})`
                                : "—"
                            }
                          />
                          <ReceiptRow
                            label="Appointment"
                            value={
                              selectedDate && selectedTime
                                ? `${selectedDate} at ${selectedTime}`
                                : "—"
                            }
                          />
                          {durationLabel && (
                            <ReceiptRow label="Est. Duration" value={durationLabel} />
                          )}
                          <ReceiptRow label="Location" value={serviceAddress || "—"} />
                          {selectedAddons.length > 0 && (
                            <div className="flex flex-col gap-1.5 pt-1">
                              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.15em]">Add-ons</span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedAddons.map(a => (
                                  <span key={a.id} className="px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-bold rounded-lg uppercase">
                                    {a.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Loyalty discount auto-applied banner */}
                    {isLoyaltyEligible && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-base">✓</span>
                            <span className="text-sm font-bold text-emerald-300">Loyalty Discount Applied</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-400">{loyaltyDiscountPct}% off</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1.5">Your loyalty discount auto-applies to qualifying vehicle details.</p>
                      </div>
                    )}

                    {/* Pricing breakdown — subscription vs one-off */}
                    {isSubscription ? (
                      <>
                        <div className="rounded-xl border border-[#222] bg-[#141414] p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
                            Due Today
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                              <span className="text-zinc-400">Initial Deep Clean & Setup Fee</span>
                              <span className="font-semibold text-white">${setupFee.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                              <span className="text-zinc-400">First Month (Based on Vehicle Size)</span>
                              <span className="font-semibold text-white">${(servicePrice ?? 0).toFixed(2)}</span>
                            </div>
                            {selectedAddons.map(a => (
                              <div key={a.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                                <span className="text-zinc-400">{a.label}</span>
                                <span className="font-semibold text-white">${a.price.toFixed(2)}</span>
                              </div>
                            ))}
                            {couponDiscount > 0 && (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                                <span className="flex items-center gap-1.5">
                                  🏷️ Promo Code
                                  <span className="text-[10px] text-emerald-500/70 font-mono">
                                    {appliedCoupon?.code}
                                  </span>
                                </span>
                                <span className="font-semibold">−${couponDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            {giftCardDiscount > 0 && (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                                <span className="flex items-center gap-1.5">
                                  🎁 Gift Card
                                  <span className="text-[10px] text-emerald-500/70 font-mono">
                                    {appliedGiftCard?.code}
                                  </span>
                                </span>
                                <span className="font-semibold">−${giftCardDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            {travelFeeLoading && (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-zinc-500 text-xs min-w-0">
                                <span>Travel Fee (if applicable)</span>
                                <span>Checking…</span>
                              </div>
                            )}
                            {!travelFeeLoading && (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                                <span className="text-zinc-400">Travel Fee</span>
                                <span className="font-semibold text-white">
                                  {travelFee === 0 ? "FREE" : `$${travelFee.toFixed(2)}`}
                                </span>
                              </div>
                            )}
{renderCouponUI()}
                            {renderGiftCardUI()}
                            {loyaltyDiscountAmount > 0 && (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400/90 min-w-0">
                                <span>Loyalty discount ({loyaltyDiscountPct}% off)</span>
                                <span className="font-semibold">−${loyaltyDiscountAmount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center pt-4 mt-3 border-t border-[#2a2a2a] min-w-0">
                            <span className="font-bold text-zinc-300">
                              Total Due Today
                            </span>
                            <span className="text-xl font-black text-white tabular-nums">
                              {computedPrice !== null ? `$${totalAfterDiscount.toFixed(2)}` : "—"}
                            </span>
                          </div>
                          {computedPrice !== null && totalAfterDiscount > 0 && (
                            <p className="text-[11px] text-[#D4AF37]/70 mt-2 text-right">
                              Counts toward your loyalty tier
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-[#222] bg-[#141414] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
                          Price Summary
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                            <span className="text-zinc-400">
                              {selectedService?.name ?? "—"}
                            </span>
                            <span className="font-semibold text-white">
                              ${(servicePrice ?? 0).toFixed(2)}
                            </span>
                          </div>
                          {selectedAddons.map(a => (
                            <div key={a.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                              <span className="text-zinc-400">{a.label}</span>
                              <span className="font-semibold text-white">${a.price.toFixed(2)}</span>
                            </div>
                          ))}
                          {/* Additional vehicle line items */}
                          {additionalVehicles.filter(av => av.serviceId).map((av, i) => {
                            const addonSum = av.selectedAddons.reduce((s, a) => s + a.price, 0);
                            const discountedPrice = Math.max(0, av.servicePrice - MULTI_VEHICLE_DISCOUNT);
                            return (
                              <div key={i}>
                                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                                  <span className="text-zinc-400">
                                    {av.vehicleYear} {av.vehicleMake} {av.vehicleModel} — {av.serviceName}
                                  </span>
                                  <span className="font-semibold text-white">${discountedPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-[11px] text-emerald-400 pl-2 min-w-0">
                                  <span>Multi-vehicle discount</span>
                                  <span>−${MULTI_VEHICLE_DISCOUNT.toFixed(2)}</span>
                                </div>
                                {av.selectedAddons.map(a => (
                                  <div key={a.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0 pl-2">
                                    <span className="text-zinc-400 text-xs">{a.label}</span>
                                    <span className="font-semibold text-white text-xs">${a.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          {couponDiscount > 0 && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                              <span className="flex items-center gap-1.5">
                                🏷️ Promo Code
                                <span className="text-[10px] text-emerald-500/70 font-mono">
                                  {appliedCoupon?.code}
                                </span>
                              </span>
                              <span className="font-semibold">−${couponDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {travelFeeLoading && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-zinc-500 text-xs min-w-0">
                              <span>Travel Fee</span>
                              <span>Checking…</span>
                            </div>
                          )}
                          {!travelFeeLoading && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                              <span className="text-zinc-400">Travel Fee</span>
                              <span className="font-semibold text-white">
                                {travelFee === 0 ? "FREE" : `$${travelFee.toFixed(2)}`}
                              </span>
                            </div>
                          )}
                          {isMonthlyPlan && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                              <span className="text-zinc-400">
                                Initial Setup & Reset Fee
                              </span>
                              <span className="font-semibold text-white">
                                ${setupFee.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {renderCouponUI()}
                          {loyaltyDiscountAmount > 0 && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400/90 min-w-0">
                              <span>Loyalty discount ({loyaltyDiscountPct}% off)</span>
                              <span className="font-semibold">−${loyaltyDiscountAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center pt-4 mt-3 border-t border-[#2a2a2a] min-w-0">
                          <span className="font-bold text-zinc-300">
                            Total
                          </span>
                          <span className="text-xl font-black text-white tabular-nums">
                            {computedPrice !== null
                              ? `$${totalAfterDiscount.toFixed(2)}`
                              : "—"}
                          </span>
                        </div>
                        {computedPrice !== null && totalAfterDiscount > 0 && (
                          <p className="text-[11px] text-[#D4AF37]/70 mt-2 text-right">
                            Counts toward your loyalty tier
                          </p>
                        )}
                      </div>
                    )}

                    {/* Guest loyalty sign-up prompt */}
                    {initialLoyaltyDiscountPct === null && selectedService && vehicleSize && (
                      <div className="rounded-xl p-4 bg-black/60 backdrop-blur-md border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.08)]">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent mb-1">
                              Unlock Loyalty Discounts
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                              Create a free account so this booking counts toward your tier. 1 detail = 5% off, 3 = 10%, 5 = 15%, 10 = 20% forever.
                            </p>
                            <button
                              type="button"
                              onClick={handleCreateAccountClick}
                              className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#D4AF37] text-zinc-950 hover:bg-amber-400 shadow-[0_0_16px_rgba(212,175,55,0.3)] transition-all duration-200"
                            >
                              Create Account & Join Rewards
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No service warning */}
                    {!selectedService && (
                      <div className="flex items-start gap-2.5 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-400">
                        <AlertCircle
                          size={15}
                          className="shrink-0 mt-0.5 text-zinc-500"
                        />
                        No service selected. Close this modal and tap &quot;Book
                        This Service&quot; on a specific package.
                      </div>
                    )}

                    {/* Address autocomplete */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-1.5">
                        Service Location
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <AddressAutocomplete
                        value={serviceAddress}
                        onChange={setServiceAddress}
                      />
                      <p className="text-[10px] text-zinc-600 mt-1.5">
                        Where should we come to detail your vehicle?
                      </p>
                    </div>

                    {/* Contact fields */}
                    <div className="space-y-3">
                      {[
                        {
                          id: "name",
                          label: "Full Name",
                          value: name,
                          setter: setName,
                          placeholder: "John Smith",
                          type: "text",
                        },
                        {
                          id: "phone",
                          label: "Phone Number",
                          value: phone,
                          setter: setPhone,
                          placeholder: "(802) 555-0100",
                          type: "tel",
                        },
                        {
                          id: "email",
                          label: "Email Address",
                          value: email,
                          setter: setEmail,
                          placeholder: "john@example.com",
                          type: "email",
                        },
                      ].map((field) => (
                        <div key={field.id}>
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            inputMode={field.id === "phone" ? "tel" : field.id === "email" ? "email" : undefined}
                            autoComplete={field.id === "phone" ? "tel" : field.id === "email" ? "email" : field.id === "name" ? "name" : undefined}
                            value={field.value}
                            onChange={(e) => {
                              if (field.id === "phone") {
                                const rawValue = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
                                setPhone(formatPhoneNumber(rawValue));
                              } else {
                                field.setter(e.target.value);
                              }
                            }}
                            placeholder={field.placeholder}
                            maxLength={field.id === "phone" ? 14 : undefined}
                            className="w-full text-center min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                          Notes{" "}
                          <span className="text-zinc-600 normal-case font-normal tracking-normal">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any special requests or details about your vehicle…"
                          rows={3}
                          className="w-full text-center min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Payment options — in-flow (no sticky); compact premium buttons */}
                    <div className="flex flex-col gap-3 w-full mt-6">
                      {isSubscription && (
                        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-amber-200/95">
                            Recurring: ${(servicePrice ?? 0).toFixed(2)}/month starting 30 days after your initial detail. Cancel anytime.
                          </p>
                        </div>
                      )}
                      {(bookingResult?.success === false || stripeError) && (
                        <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                          {bookingResult?.success === false
                            ? bookingResult.error
                            : stripeError}
                        </div>
                      )}

                      <button
                        onClick={handlePayNow}
                        disabled={!canConfirm() || isSubmitting || isStripeLoading}
                        className={`w-full min-h-[50px] rounded-xl p-4 flex items-center justify-between text-left transition-all duration-300 active:scale-[0.99] group ${
                            isStripeLoading
                              ? "bg-zinc-900/90 border border-[#D4AF37] btn-loading text-zinc-950"
                              : canConfirm() && !isSubmitting
                                ? "bg-[#d4af37] text-zinc-950 hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] btn-pay-now-shimmer"
                                : "bg-zinc-900/50 border border-white/10 text-zinc-500 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 relative z-[1]">
                            <div className="w-10 h-10 rounded-lg bg-black/20 border border-black/20 flex items-center justify-center shrink-0">
                              <CreditCard className="w-5 h-5 text-zinc-950" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-inherit">
                                {isStripeLoading ? "Processing…" : isSubscription ? `Subscribe via Stripe — $${totalAfterDiscount.toFixed(2)}` : `Pay Now — $${totalAfterDiscount.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-zinc-700 mt-1">
                                Secure card checkout · Instant confirmation
                              </div>
                            </div>
                          </div>
                          {!isStripeLoading && (
                            <ChevronRight className="w-5 h-5 shrink-0 opacity-80 relative z-[1]" />
                          )}
                        </button>

                      <button
                        onClick={handlePayAtArrival}
                        disabled={!canConfirm() || isSubmitting || isStripeLoading}
                        className={`w-full min-h-[50px] rounded-xl p-4 flex items-center justify-between text-left transition-all duration-500 ease-in-out active:scale-[0.99] ${
                          isSubmitting
                            ? "bg-zinc-950/50 border border-white/10 btn-loading"
                            : canConfirm() && !isStripeLoading
                              ? "bg-transparent border border-[#d4af37]/50 text-[#d4af37] font-medium tracking-wide hover:bg-[#d4af37]/10 hover:border-[#d4af37] hover:-translate-y-0.5 btn-pay-arrival-shimmer"
                              : "bg-zinc-950/30 border border-white/5 text-zinc-500 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 relative z-[1]">
                          <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                            <HandCoins className="w-5 h-5 text-[#d4af37]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-medium text-inherit tracking-wide">
                              {isSubmitting ? "Processing…" : isSubscription ? "Subscribe & Pay at Arrival" : "Book & Pay at Arrival"}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              We&apos;ll confirm via text · Pay cash or card on the day
                            </div>
                          </div>
                        </div>
                        {!isSubmitting && (
                          <ChevronRight className="w-5 h-5 text-[#d4af37]/70 shrink-0 relative z-[1]" />
                        )}
                      </button>

                      {isStripeLoading && (
                        <button
                          type="button"
                          onClick={() => { stripeAbortRef.current = true; setIsStripeLoading(false); setStripeError("Checkout cancelled. Please try again."); }}
                          className="w-full flex items-center justify-center py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={handleBack}
                        disabled={isSubmitting || isStripeLoading}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
                      >
                        <ChevronLeft size={14} />
                        Back to date & time
                      </button>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── FOOTER / NAVIGATION (Steps 1 & 2 only) ───────────────── */}
              {step < 3 && (
                <div className="sticky bottom-0 z-10 px-4 sm:px-6 pt-4 pb-4 sm:pb-6 border-t border-zinc-800/50 flex items-center justify-between shrink-0 bg-inherit">
                  <button
                    onClick={step === 1 ? onClose : handleBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors py-2 min-h-[44px] sm:min-h-0"
                  >
                    <ChevronLeft size={15} />
                    {step === 1 ? "Cancel" : "Back"}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className={`flex items-center gap-1.5 font-bold px-8 min-h-[44px] py-3 rounded-xl text-sm ${
                      canGoNext()
                        ? "btn-primary-gold-shimmer bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] transition-all duration-500 ease-in-out"
                        : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed border border-white/10"
                    }`}
                  >
                    <span className="relative z-[1] flex items-center gap-1.5">
                      Next <ChevronRight size={15} />
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Summary Row ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-200 font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Receipt Row (label left, value right bold) ───────────────────────────────

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-start sm:gap-4 min-w-0">
      <span className="text-zinc-500 text-sm shrink-0">{label}</span>
      <span className="text-white font-semibold text-sm sm:text-right break-words">{value}</span>
    </div>
  );
}
