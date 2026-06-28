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
  Container,
  Tractor,
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
import { validateCrossSellCoupon } from "@/app/actions/crossSellCoupon";
import {
  getStoredCrossSellCoupon,
  clearStoredCrossSellCoupon,
} from "./CrossSellCouponCapture";
import { validateGiftCard } from "@/app/actions/validateGiftCard";
import { getBookingsForDate, type BookingOnDate } from "@/app/actions/getBookingsForDate";
import { getNextAvailableDays, type AvailableDay } from "@/app/actions/getNextAvailableDays";
import { detectVehicleSize } from "@/lib/detectVehicleSize";
import { todayInBusinessTz } from "@/lib/dates";
import { bundlePctFor, effectiveBundlePctFor, addonDiscountAmount, addonDiscountedPrice, PREMIUM_ADDON_BONUS_PCT } from "@/lib/bundleDiscount";
import {
  filterMakesByQuery,
  filterModelsByQuery,
  sizeTierToSlug,
} from "@/lib/vehicleDatabase";
import {
  filterTruckMakesByQuery,
  filterTruckModelsByQuery,
  filterHEMakesByQuery,
  filterHEModelsByQuery,
} from "@/lib/truckEquipmentDatabase";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getProfileByPhone } from "@/app/actions/getProfileByPhone";
import { getMyActiveMembership } from "@/app/actions/membership";
import { formatCentsCompact } from "@/lib/membership";
import { getAvailability, type OperatingHour } from "@/app/actions/getAvailability";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SERVICE_DURATIONS, VEHICLE_SIZE_MAP } from "@/lib/constants";
import { MONTHLY_PLAN_DURATIONS } from "@/lib/monthlyPlans";
import { cashPriceFor } from "@/lib/cashPricing";

/** Interior Monthly Maintenance = $75, Full Detail Monthly Maintenance = $120 */
function getMaintenanceSetupFee(serviceName: string): number {
  return serviceName.toLowerCase().includes("full") ? 100 : 75;
}

const ALL_ADD_ONS = [
  // ── Vehicle / Standard ────────────────────────────────────────────────────
  { id: "engine_bay",        label: "Engine Bay Detail",                    price: 85,  desc: "Deep degrease, dressing, and plastic care. Customers love the \"open the hood and it looks new\" moment. Skipped on vehicles with sensitive electronics by your request." },
  { id: "headlight_restore",   label: "Headlight Restoration",               price: 65,  desc: "Sand, polish, and UV-seal cloudy or yellowed lenses to like-new clarity. Visible result, lasts 2+ years. Pair pricing." },
  { id: "odor_bomb",           label: "Strong Odor Elimination",             price: 75,  desc: "Heavy-duty neutralizer bombs combat embedded smoke, food & pet odors throughout the cabin." },
  { id: "upholstery_shampoo",  label: "Carpet & Upholstery Shampoo",        price: 75,  desc: "Deep steam shampoo of all seats, upholstery panels, and floorboards — removes stains, grime & odor at the source. 3-row SUVs / work vans are automatically $105 (extra row + cargo area)." },
  { id: "uv_interior",         label: "UV Protection & Interior Restoration", price: 35, desc: "UV-protective coating applied to all interior plastics, vinyl, and trim — prevents fading, cracking, and sun damage while restoring a rich, factory finish." },
  { id: "leather_condition",   label: "Leather Conditioning",                 price: 45, desc: "Deep-clean and condition all leather surfaces with premium conditioner — restores softness, prevents cracking, and leaves a clean matte finish." },
  { id: "floor_1",           label: "Floorboard Shampoo – 1 Section",       price: 30,  desc: "Deep shampoo for one section of floorboards" },
  { id: "floor_2",           label: "Floorboard Shampoo – 2 Sections",      price: 45,  desc: "Deep shampoo for two sections of floorboards" },
  { id: "floor_all",         label: "Floorboard Shampoo – All Sections",     price: 60,  desc: "Full deep shampoo for all floorboard sections" },
  { id: "clay_bar",          label: "Clay Bar Treatment",                    price: 50,  desc: "Smooths paint by lifting embedded contaminants and upgrades your ceramic spray from 3-month to 6-month protection. Required prep before any sealant." },
  { id: "pet_hair",          label: "Heavy Pet Hair Removal",                 price: 75,  desc: "Beyond standard vacuum: pumice + electrostatic extraction lifts embedded pet hair from seats, carpets, and cargo area. Charged only when heavy accumulation is present (we'll confirm on inspection)." },
  { id: "tar_bug",           label: "Tar, Bug & Sap Removal",               price: 35,  desc: "Safely dissolve and remove road tar, bug splatter & tree sap before the detail wash." },
  // ── Build Your Package add-ons (new) ─────────────────────────────────────
  { id: "headliner_clean",     label: "Headliner Cleaning",                   price: 40,  desc: "Gentle dry-foam cleaning of the fabric headliner — lifts stains, smoke residue and dust without saturating the adhesive." },
  { id: "salt_stain_removal",  label: "Standard Salt Stain Removal",          price: 45,  desc: "Vermont winter survival for light-to-moderate staining: enzymatic neutralizer, hot water extraction, and a salt-repellent sealing pass on affected carpets and door sills. $45 sedan / $60 SUV / $75 3-row. Does NOT cover heavy caked-on salt piles or deep-set winter buildup — those are handled in the Ultimate Series packages (included free)." },
  // ── Seat Removal Deep Clean — premium upgrade (specialty, excluded from bundle discount) ──
  { id: "seat_removal_driver",     label: "Seat Removal — Driver Side",       price: 60,  desc: "Driver seat physically removed for under-rail and seat-underside hot water extraction. Premium spill / wear coverage." },
  { id: "seat_removal_passenger",  label: "Seat Removal — Passenger Side",    price: 60,  desc: "Front passenger seat physically removed for under-rail and seat-underside hot water extraction." },
  { id: "seat_removal_rear",       label: "Seat Removal — Rear Seats",        price: 85,  desc: "Rear bench or buckets physically removed. Reaches the carpet pockets and crevices nobody else touches — perfect after kids, dogs, or a long road trip." },
  { id: "seat_removal_3rd_row",    label: "Seat Removal — 3rd Row",           price: 95,  desc: "3rd-row bench or captain's chairs physically removed for deep extraction. Big rigs only." },
  { id: "seat_removal_all_2row",   label: "All Seats Removed — 2-Row Bundle", price: 150, desc: "Every seat physically removed (driver, passenger, rear) for the deepest interior clean we offer. Best value vs booking individually — saves $55." },
  { id: "seat_removal_all_3row",   label: "All Seats Removed — 3-Row Bundle", price: 225, desc: "Every seat physically removed (driver, passenger, rear, 3rd-row) for the deepest interior clean we offer. Big rigs / 3-row SUVs / work vans. Saves $75 vs individual." },
  { id: "steam_sanitation",    label: "Steam Sanitation",                     price: 45,  desc: "High-pressure steam sanitizes vents, cup holders, seat tracks and every crevice — kills bacteria and lifts grime nothing else can reach." },
  { id: "trim_dressing",       label: "Rubber, Plastics & Vinyl Dressing",    price: 30,  desc: "UV-protective dressing on all exterior trim, rubber seals, plastics, and vinyl — brings tired surfaces back to deep black. FREE when you stack 3 or more add-ons. (Glass polish is already included in every exterior package.)" },
  { id: "mech_chem_decon",     label: "Mechanical & Chemical Decontamination", price: 85,  desc: "The full-monty paint prep: clay bar + iron remover chemically dissolves embedded brake dust and industrial fallout from paint and wheels. Replaces basic Clay Bar." },
  { id: "salt_recovery_addon", label: "Winter Salt Recovery — Undercarriage",  price: 85,  desc: "Vermont winter survival: undercarriage flush, door-jamb deep clean, and salt-neutralizer treatment added to any exterior service. Recommended monthly Nov–Apr." },
  // ── Ultimate Series (premium upgrades — high-ticket) ─────────────────────
  { id: "polish_ceramic",    label: "1-Step Polish + 2-Year Ceramic Coating", price: 350, desc: "Targets light swirls and oxidation with a 1-step machine polish, then protects the paint with a professional 2-year ceramic coat. Requires a full-day appointment." },
  { id: "ozone_treatment",   label: "Ozone Odor Elimination",                price: 75,  desc: "Professional-grade ozone treatment permanently neutralises smoke, pet odor & mildew at the source." },
  // ── Paint Correction add-ons ─────────────────────────────────────────────
  { id: "ceramic_3yr",       label: "5-Year Gentech Graphene Coating",       price: 250, desc: "Pro-grade graphene-infused ceramic — 5 years of UV, salt, and water-spot protection. Hydrophobic, anti-static, locks in deep gloss. Adds 1.5–2.5 hrs to the appointment. Pricing scales by size: $250 sedan · $350 SUV · $400 3-row / work van." },
  { id: "ultimate_interior", label: "Ultimate Interior Add-on",              price: 175, desc: "Add the full Ultimate Interior service to your paint correction — hot water extraction, steam sanitation, salt neutralization. Adds 3 hrs to the appointment. Flat $175." },
  { id: "wheel_ceramic",     label: "Wheel & Caliper Ceramic Coating",       price: 125, desc: "Professional ceramic coating bonded to all 4 wheels and brake calipers. Brake dust wipes off, road grime can't grip, and the high-gloss finish lasts 2+ years. Flat $125 for all 4 wheels." },
  // ── 2-Year Graphene Ceramic Window Coating (flat-priced tiers) ───────────
  { id: "window_coat_windshield", label: "2-Year Graphene Window Coat — Windshield Only", price: 100, desc: "Hydrophobic graphene-infused ceramic coating bonded to the windshield. Rain beads off at speed, bugs and salt wipe clean. Lasts 2 full years." },
  { id: "window_coat_front",      label: "2-Year Graphene Window Coat — Front 3 Windows", price: 150, desc: "Windshield plus both front side windows — full driver-zone visibility coverage. Hydrophobic, anti-glare, protected for 2 full years." },
  { id: "window_coat_all",        label: "2-Year Graphene Window Coat — All Windows",     price: 250, desc: "Full-vehicle graphene ceramic coating on every piece of glass — windshield, all side windows, and rear. Hydrophobic, anti-glare, and protected for 2 full years." },
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
  // ── Semi Truck — Exterior add-ons ────────────────────────────────────────
  { id: "truck_aluminum",      label: "Aluminum Tank / Stack / Wheel Polish", price: 99, desc: "Restore mirror finish on aluminum tanks, stacks, steps & wheel faces. From $99 — confirmed on-site." },
  { id: "truck_engine_bay",    label: "Engine Bay Degrease & Steam",          price: 99, desc: "Full degreasing of the engine compartment, sensitive electronics protected. $99 flat." },
  { id: "truck_wax_upgrade",   label: "Hand Wax / Sealant Upgrade",           price: 99, desc: "Move from 6-month spray sealant to hand-applied paste wax or ceramic-grade sealant. From $99." },
  { id: "truck_trailer_wash",  label: "Trailer Washout",                      price: 80, desc: "Dry-van or reefer washout between loads — no food/biohazard contamination. From $80." },
  { id: "truck_bug_tar",       label: "Bug & Tar Pre-Treat",                  price: 39, desc: "Heavy bug, tar, and rail-dust pre-treatment before main wash. $39 flat." },
  // ── Semi Truck — Interior add-ons ────────────────────────────────────────
  { id: "truck_seat_shampoo",  label: "Driver Seat Shampoo",                  price: 39, desc: "Hot-water extraction on the cloth driver / passenger seat. $39." },
  { id: "truck_floor_shampoo", label: "Carpet / Floor Shampoo",               price: 39, desc: "Hot-water extraction on the full cab carpet. $39." },
  { id: "truck_headliner",     label: "Headliner Deep Clean",                 price: 49, desc: "Spot extraction + odor neutralize on a stained headliner. $49." },
  { id: "truck_fabric_protect",label: "Fabric / Leather Protection",          price: 49, desc: "UV + stain guard on seats and upholstery. $49." },
  { id: "truck_ozone",         label: "Odor / Ozone Treatment",               price: 79, desc: "30-minute ozone treatment — kills smoke, biological, and grease odor at the source. $79." },
  { id: "truck_biohazard",     label: "Biohazard / Bodily Fluid Removal",     price: 99, desc: "Spill, blood, vomit — sanitized, sealed, and ozone-treated. From $99 depending on scope." },
  // ── Semi Truck — Sleeper-only add-ons ────────────────────────────────────
  { id: "sleeper_mattress",    label: "Sleeper Mattress Deep Clean",          price: 49, desc: "Mattress vacuum + extraction + UV sanitize. Sleeper cab only. $49." },
  { id: "sleeper_fridge",      label: "Sleeper Fridge / Cabinet Clean",       price: 49, desc: "Deep-clean fridge interior + sleeper storage cabinets. Sleeper cab only. From $49." },
  // ── Heavy Equipment add-ons ──────────────────────────────────────────────
  { id: "he_grime",            label: "Heavy-Grime / Mud Surcharge",          price: 49, desc: "Pre-treat and extraction for equipment coming straight off the job. From $49 depending on contamination level." },
  { id: "he_seat_shampoo",     label: "Operator Seat Shampoo",                price: 39, desc: "Hot-water extraction on the cloth operator seat. $39." },
  { id: "he_floor_shampoo",    label: "Floor / Mat Shampoo",                  price: 39, desc: "Hot-water extraction on the cab floor mats. $39." },
  { id: "he_ozone",            label: "Odor / Ozone Treatment",               price: 79, desc: "30-minute ozone treatment — kills smoke, sweat, mildew, and fuel odor at the source. $79." },
  { id: "he_biohazard",        label: "Biohazard / Bodily Fluid Removal",     price: 99, desc: "Sanitized, sealed, and ozone-treated. From $99 depending on scope." },
  { id: "he_fabric_protect",   label: "Fabric / Leather Protection",          price: 49, desc: "UV + stain guard on the operator seat and upholstery. $49." },
] as const;

type AddonItem = typeof ALL_ADD_ONS[number];

const FLOOR_ADDON_IDS    = ["floor_1", "floor_2", "floor_all"];
const MARINE_ADDON_IDS   = ["marine_isinglass", "marine_engine_bay"];
const RV_ADDON_IDS       = ["rv_awning", "rv_slide_seal", "rv_roof_coat", "rv_generator", "rv_step"];
/** Semi truck add-ons. Sleeper-only items live in TRUCK_SLEEPER_ADDON_IDS and
 *  surface in addition to TRUCK_ADDON_IDS when a sleeper service is booked. */
const TRUCK_ADDON_IDS    = [
  "truck_aluminum", "truck_engine_bay", "truck_wax_upgrade", "truck_trailer_wash", "truck_bug_tar",
  "truck_seat_shampoo", "truck_floor_shampoo", "truck_headliner", "truck_fabric_protect", "truck_ozone", "truck_biohazard",
];
const TRUCK_SLEEPER_ADDON_IDS = ["sleeper_mattress", "sleeper_fridge"];
/** Heavy equipment cab add-ons */
const HE_ADDON_IDS       = ["he_grime", "he_seat_shampoo", "he_floor_shampoo", "he_ozone", "he_biohazard", "he_fabric_protect"];
/** All seat-removal SKUs — premium specialty, excluded from the basic bundle discount math. */
const SEAT_REMOVAL_ADDON_IDS = ["seat_removal_driver", "seat_removal_passenger", "seat_removal_rear", "seat_removal_3rd_row", "seat_removal_all_2row", "seat_removal_all_3row"] as const;
const isSeatRemovalAddonId = (id: string): boolean =>
  (SEAT_REMOVAL_ADDON_IDS as readonly string[]).includes(id);
/** High-ticket upgrades for Ultimate packages — engine bay, headlight, and seat removal.
 *  Heavy Pet Hair Removal is INCLUDED in Ultimate (no separate add-on row needed). */
const ULTIMATE_ADDON_IDS = ["engine_bay", "headlight_restore", "ozone_treatment", ...SEAT_REMOVAL_ADDON_IDS];
/** Simplified add-ons for Interior, Exterior, and Full Detail */
const STANDARD_ADDON_IDS = ["engine_bay", "headlight_restore", "odor_bomb", "upholstery_shampoo", "uv_interior", "leather_condition", "clay_bar"];
/** Build Your Package — Interior side add-ons (surfaces on Interior + Full foundations) */
// Basic services (Interior / Exterior / Full Detail) get a slimmed-down add-on
// list that mirrors Ultimate's premium upsells PLUS three basic-only specialties
// (carpet shampoo + minor & extreme salt treatments) that aren't included by
// default in basic packages. Customers wanting the full kitchen-sink list are
// nudged toward Ultimate via the upgrade banner.
const BUILDER_INTERIOR_ADDON_IDS = ["ozone_treatment", "upholstery_shampoo", "salt_stain_removal", "seat_removal_driver", "seat_removal_passenger", "seat_removal_rear", "seat_removal_3rd_row", "seat_removal_all_2row", "seat_removal_all_3row"];
/** Build Your Package — Exterior side add-ons (surfaces on Exterior + Full foundations) */
// Basic Exterior / Full Detail get the full Ceramic Package multi-pick
// (Body / Wheels / Windows) so the 2-pick = 15% / 3-pick = 25% tier ladder
// still works on basic bookings — same as Ultimate Interior + Exterior.
// Clay bar surfaces here too so Full Detail customers can add paint decon
// without upgrading to Ultimate; it's still included in Ultimate Int+Ext.
const BUILDER_EXTERIOR_ADDON_IDS = ["engine_bay", "headlight_restore", "clay_bar", "ceramic_3yr", "wheel_ceramic"];
/** Add-ons offered with Paint Correction (Ultimate Exterior + 1-Step / 2-Step) */
const PAINT_CORRECTION_ADDON_IDS = ["engine_bay", "headlight_restore", "ceramic_3yr", "ultimate_interior", "wheel_ceramic"];
/** Cargo cleaning tiers — mutually exclusive, only shown when vehicleSize === "xl" */
const CARGO_ADDON_IDS    = ["cargo_light", "cargo_heavy"];
/** Decontamination tiers — mutually exclusive (clay bar alone OR full mech/chem decon) */
const DECON_ADDON_IDS    = ["clay_bar", "mech_chem_decon"];
/** 2-Year Graphene Window Coating tiers — mutually exclusive (windshield / front 3 / all glass).
 *  Surfaced only on services that touch the exterior glass: Exterior, Full,
 *  Ultimate Interior + Exterior, and Paint Correction packages. */
const WINDOW_COATING_ADDON_IDS = ["window_coat_windshield", "window_coat_front", "window_coat_all"];

// ── 2-Year Ceramic Package ────────────────────────────────────────────────
// Body / Wheels / Windows multi-pick. Customer gets 10% off per item they
// add — capped at 30% for all three. Excluded from the regular bundle
// discount math so they don't double-dip.
const CERAMIC_PACKAGE_IDS = ["ceramic_3yr", "wheel_ceramic", "window_coat_all"] as const;
const isCeramicPackageId = (id: string): boolean =>
  (CERAMIC_PACKAGE_IDS as readonly string[]).includes(id);
function ceramicPackagePct(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 0.15;
  return 0.25;
}
/** Add-ons that are INCLUDED in Ultimate packages — selecting these triggers the upgrade nudge */
const INCLUDED_IN_ULTIMATE_IDS = ["upholstery_shampoo", "odor_bomb", "uv_interior", "leather_condition", "clay_bar", "salt_stain_removal"];
/** Add-ons that require a full-day appointment */
export const FULL_DAY_ADDON_IDS    = ["polish_ceramic"];
export const FULL_DAY_DURATION_MIN = 480; // 8 hours — blocks the whole day
/** Hard ceiling on a single-day booking. Longest open day is Tue/Wed/Fri 8am-6pm (600 min);
 *  if a service + add-ons would otherwise overflow that, we clamp here so the booking
 *  takes the whole day instead of failing to find any slots. Bookings longer than this
 *  will only show slots on the longest-open weekdays. */
export const MAX_SAME_DAY_BOOKING_MINS = 600;
/** Add-ons that extend service duration (additive) — id → minutes.
 *  Flat-duration add-ons live here; size-tiered add-ons (ceramic_3yr) are
 *  resolved inside getAddonExtraDurationMins. Per spec — these times are
 *  STRICT for slot booking (not the display window). */
const DURATION_EXTENDING_ADDONS: Record<string, number> = {
  ultimate_interior:    180, // Ultimate Interior add-on adds 3 hrs
  // Interior add-ons (also apply to Full Detail bookings since Full = Interior + Exterior)
  // upholstery_shampoo is size-tiered — see UPHOLSTERY_SHAMPOO_DURATION_MINS
  pet_hair:             30,  // Heavy Pet Hair Removal +30 min
  odor_bomb:            60,  // Strong Odor Elimination +1 hr
  headliner_clean:      30,  // Headliner Cleaning +30 min
  salt_stain_removal:   45,  // Standard Salt Stain Removal +45 min (scales w/ size)
  // Seat Removal — per-section + bundle tiers
  seat_removal_driver:     30,
  seat_removal_passenger:  30,
  seat_removal_rear:       45,
  seat_removal_3rd_row:    45,
  seat_removal_all_2row:   90,  // saves a little time vs per-section because we batch the work
  seat_removal_all_3row:  135,
  // Exterior add-ons
  // clay_bar — no extra time (works in parallel with hand wash drying)
  headlight_restore:    30,  // Headlight Restoration +30 min
  salt_recovery_addon:  30,  // Salt Recovery Undercarriage +30 min
  mech_chem_decon:      30,  // Mechanical & Chemical Decon +30 min
  // Ceramic coatings — flash + cure adds significant time
  wheel_ceramic:        60,  // Wheel & Caliper Ceramic +1 hr
  window_coat_windshield: 60, // Window coatings (any tier) +1 hr
  window_coat_front:    60,
  window_coat_all:      60,
  // Body ceramic (ceramic_3yr) — uses size-tiered CERAMIC_3YR_DURATION_MINS
  // already mapped in getAddonExtraDurationMins (90/90/120/150).
};

/** Carpet & Upholstery Shampoo — only the 3rd row in xl adds real labor.
 *  Sedan / regular SUV: 30 min. 3-row SUV / work van (xl): 60 min. */
const UPHOLSTERY_SHAMPOO_DURATION_MINS: Record<string, number> = {
  sedan: 30, suv: 30, xl: 60,
  medium: 30, large: 30, extra_large: 60,
};

/** 2-Year Pro Ceramic Sealant — application + flash time scales with surface area. */
const CERAMIC_3YR_DURATION_MINS: Record<string, number> = {
  sedan: 90, suv: 120, xl: 150,
  medium: 90, large: 120, extra_large: 150,
};

const CERAMIC_PRICES: Record<string, number> = {
  sedan: 350, suv: 500, xl: 650,
  medium: 350, large: 500, extra_large: 650,
};

/** 2-Year Professional Ceramic Sealant — 3-tier pricing for paint-correction & Ultimate packages. */
const CERAMIC_3YR_PRICES: Record<string, number> = {
  sedan: 300, suv: 350, xl: 400,
  medium: 300, large: 350, extra_large: 400,
};

/** 2-Year Graphene Window Coating — flat pricing across all vehicle sizes. */
const WINDOW_COAT_WINDSHIELD_PRICE = 100;
const WINDOW_COAT_FRONT_PRICE      = 150;
const WINDOW_COAT_ALL_PRICE        = 250;

function getEffectiveAddonPrice(
  addon: { id: string; price: number },
  vehicleSize: string,
  overrides?: import("@/app/actions/addonPricing").AddonOverrideMap,
): number {
  // Admin override (per-size, then size-agnostic "all") wins over any base.
  if (overrides) {
    const ov = overrides[`${addon.id}:${vehicleSize}`] ?? overrides[`${addon.id}:all`];
    if (ov?.price_cents != null) return ov.price_cents / 100;
  }
  if (addon.id === "upholstery_shampoo" && (vehicleSize === "xl" || vehicleSize === "extra_large")) return addon.price + 30;
  if (addon.id === "salt_stain_removal") {
    // Size-tiered: $45 sedan / $60 SUV / $75 3-row & work van
    if (vehicleSize === "xl" || vehicleSize === "extra_large") return 75;
    if (vehicleSize === "suv" || vehicleSize === "large")      return 60;
    return 45;
  }
  if (addon.id === "polish_ceramic") return CERAMIC_PRICES[vehicleSize] ?? addon.price;
  if (addon.id === "ceramic_3yr")    return CERAMIC_3YR_PRICES[vehicleSize] ?? addon.price;
  if (addon.id === "window_coat_windshield") return WINDOW_COAT_WINDSHIELD_PRICE;
  if (addon.id === "window_coat_front")      return WINDOW_COAT_FRONT_PRICE;
  if (addon.id === "window_coat_all")        return WINDOW_COAT_ALL_PRICE;
  return addon.price;
}

/** Returns true when the service is one of the new Ultimate Exterior + Paint Correction packages. */
function isPaintCorrectionService(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("paint correction") || n.includes("paint enhancement") || n.includes("single-stage") || n.includes("two-stage") || n.includes("1-step paint") || n.includes("2-step paint");
}

/** Total minutes added to the booking by selected duration-extending add-ons.
 *  `vehicleSize` is required for size-tiered add-ons (e.g. ceramic_3yr). */
function getAddonExtraDurationMins(
  selectedAddons: { id: string }[],
  vehicleSize: string = "sedan",
  overrides?: import("@/app/actions/addonPricing").AddonOverrideMap,
): number {
  return selectedAddons.reduce((sum, a) => {
    // Admin duration override wins over any hard-coded value.
    if (overrides) {
      const ov = overrides[`${a.id}:${vehicleSize}`] ?? overrides[`${a.id}:all`];
      if (ov?.duration_mins != null) return sum + ov.duration_mins;
    }
    if (a.id === "ceramic_3yr") return sum + (CERAMIC_3YR_DURATION_MINS[vehicleSize] ?? 90);
    if (a.id === "upholstery_shampoo") return sum + (UPHOLSTERY_SHAMPOO_DURATION_MINS[vehicleSize] ?? 30);
    return sum + (DURATION_EXTENDING_ADDONS[a.id] ?? 0);
  }, 0);
}

/**
 * Returns add-ons relevant to a given service.
 * Each service category only ever sees its own add-ons — no cross-category bleed.
 *
 * `vehicleSize` is optional and only used to surface Work Van cargo-cleaning add-ons
 * on interior-touching services when the customer's vehicle is a work van (xl).
 */
/** Salt-season add-ons (Salt Stain Removal + Winter Salt Recovery — Undercarriage)
 *  are hidden during the off-season (May–Jul) and surface again starting Aug 1.
 *  Vermont salt season runs roughly Aug → late Apr. */
// Salt Stain Removal is year-round — late-spring carpet staining is real even
// after the salt season ends. Only the winter undercarriage add-on (a true
// cold-season service) stays gated to Aug-Apr.
const SALT_SEASON_ADDON_IDS = new Set(["salt_recovery_addon"]);
function isSaltSeasonActive(now: Date = new Date()): boolean {
  const m = now.getMonth() + 1; // 1-12
  // Hidden May (5), June (6), July (7). Visible Aug-Apr.
  return m >= 8 || m <= 4;
}

function getAddonsForService(serviceName: string, vehicleSize?: string): readonly AddonItem[] {
  const n = serviceName.toLowerCase();
  const isWorkVan = vehicleSize === "xl";
  const cargoIds = isWorkVan ? CARGO_ADDON_IDS : [];
  const saltSeasonOn = isSaltSeasonActive();
  const seasonalFilter = (addons: readonly AddonItem[]): readonly AddonItem[] =>
    saltSeasonOn ? addons : addons.filter(a => !SALT_SEASON_ADDON_IDS.has(a.id));

  // ── Marine / Boat ────────────────────────────────────────────────────────
  if (n.includes("boat")) {
    return seasonalFilter(ALL_ADD_ONS.filter(a => MARINE_ADDON_IDS.includes(a.id)));
  }

  // ── RV ───────────────────────────────────────────────────────────────────
  if (n.includes("rv") || n.includes("motorhome")) {
    return seasonalFilter(ALL_ADD_ONS.filter(a => RV_ADDON_IDS.includes(a.id)));
  }

  // ── Heavy Equipment ─────────────────────────────────────────────────────
  // Flat-priced cab interiors get their own add-on tier — grime, biohazard,
  // operator-seat extraction, ozone, fabric protect. No car-detailing
  // add-ons surface in this flow.
  if (isHeavyEquipmentService(serviceName)) {
    return seasonalFilter(ALL_ADD_ONS.filter(a => HE_ADDON_IDS.includes(a.id)));
  }

  // ── Semi Truck ───────────────────────────────────────────────────────────
  // Truck-specific exterior + interior tier. Sleeper services additionally
  // surface the sleeper-only add-ons (mattress, fridge). Day-cab services
  // skip those — keeps the picker uncluttered when irrelevant.
  if (isTruckService(serviceName)) {
    const sleeperExtras = isSleeperCabService(serviceName) ? TRUCK_SLEEPER_ADDON_IDS : [];
    const ids = [...TRUCK_ADDON_IDS, ...sleeperExtras];
    return seasonalFilter(ALL_ADD_ONS.filter(a => ids.includes(a.id)));
  }

  // ── Vehicle services below — never include marine, RV, truck, or HE add-ons ──

  // Paint correction: clay bar already part of the process. Allow ceramic upgrade
  // and the Ultimate Interior add-on. Cargo cleaning surfaces only when the
  // Ultimate Interior add-on is implied (handled at render-time on the interior side).
  if (isPaintCorrectionService(serviceName)) {
    return seasonalFilter(ALL_ADD_ONS.filter(a => [...PAINT_CORRECTION_ADDON_IDS, ...WINDOW_COATING_ADDON_IDS].includes(a.id)));
  }

  // Ultimate packages: high-ticket upgrades. Cargo cleaning if work van.
  // Window coating + 2-yr ceramic sealant + wheel ceramic only when the package
  // includes exterior work (Ultimate Interior + Exterior — NOT Ultimate Interior Reset).
  if (n.includes("ultimate")) {
    const includesExterior = n.includes("exterior");
    const ids = [
      ...ULTIMATE_ADDON_IDS,
      ...cargoIds,
      ...(includesExterior ? [...WINDOW_COATING_ADDON_IDS, "ceramic_3yr", "wheel_ceramic"] : []),
    ];
    return seasonalFilter(ALL_ADD_ONS.filter(a => ids.includes(a.id)));
  }

  // Exterior Detail (Build Your Package foundation) — all exterior builder add-ons + window coating + cargo if work van
  if (n.includes("exterior") && !n.includes("full")) {
    return seasonalFilter(ALL_ADD_ONS.filter(a => [...BUILDER_EXTERIOR_ADDON_IDS, ...WINDOW_COATING_ADDON_IDS, "engine_bay"].includes(a.id)));
  }

  // Interior Detail (Build Your Package foundation) — all interior builder add-ons + cargo if work van.
  // No window coating — we don't touch exterior glass on an interior-only service.
  if (n.includes("interior") && !n.includes("full") && !n.includes("maintenance")) {
    const ids = [...BUILDER_INTERIOR_ADDON_IDS, ...cargoIds];
    return seasonalFilter(ALL_ADD_ONS.filter(a => ids.includes(a.id)));
  }

  // Maintenance plans: engine bay + floor shampoo (quick recurring visits)
  if (n.includes("maintenance")) {
    return seasonalFilter(ALL_ADD_ONS.filter(a => a.id === "engine_bay" || FLOOR_ADDON_IDS.includes(a.id)));
  }

  // Full Detail (Build Your Package foundation) → all interior + exterior add-ons + cargo if work van + window coating
  const ids = [...BUILDER_INTERIOR_ADDON_IDS, ...BUILDER_EXTERIOR_ADDON_IDS, ...cargoIds, ...WINDOW_COATING_ADDON_IDS];
  return seasonalFilter(ALL_ADD_ONS.filter(a => ids.includes(a.id)));
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
/** Returns true when a service is flat-priced and does not need a vehicle size
 *  picker. Truck + heavy equipment services are flat-priced regardless of cab
 *  configuration, so we skip the size step (which would block "Continue"). */
function isFlatPriceService(name: string, category?: string | null): boolean {
  return isTruckService(name, category) || isHeavyEquipmentService(name, category);
}
function isRVService(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("rv") || n.includes("motorhome");
}
// kept for backward compat with add-on filters
function isBoatService(name: string): boolean {
  return name.toLowerCase().includes("boat");
}
/** Semi-truck services live in the Truck category in Supabase but a name match
 *  keeps the modal robust even on legacy rows without a category column. */
function isTruckService(name: string, category?: string | null): boolean {
  if (category === "Truck") return true;
  const n = name.toLowerCase();
  return (
    n.startsWith("truck ") ||
    n.includes("day cab") ||
    n.includes("sleeper cab") ||
    (n.includes("premium exterior detail") && (n.includes("day cab") || n.includes("sleeper")))
  );
}
function isHeavyEquipmentService(name: string, category?: string | null): boolean {
  if (category === "Heavy Equipment") return true;
  const n = name.toLowerCase();
  return n.startsWith("equipment ");
}
/** Sleeper-cab services unlock the sleeper-only add-on tier (mattress, fridge). */
function isSleeperCabService(name: string): boolean {
  return name.toLowerCase().includes("sleeper");
}

/** Maps boat/RV footage to a size tier for duration lookups. */
function boatLengthToSize(feet: number | ""): VehicleSizeSlug {
  if (typeof feet !== "number") return "sedan";
  if (feet >= 46) return "xl";
  if (feet >= 31) return "suv";
  return "sedan";
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
  if (isHeavyEquipmentService(service.name, (service as any).category))
                                return { label: "Heavy Equipment",           color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
  if (isTruckService(service.name, (service as any).category))
                                return { label: "Semi Truck Detailing",       color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
  return                               { label: "One-Time Detailing",         color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" };
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Per-foot rates for footage-based services (boat / RV) */
const FOOTAGE_RATE: Record<string, number> = {
  // Boats — 15 ft minimum
  "Boat Interior":          15,
  "Boat Exterior":          16,
  "Boat Full Detail":       28,
  // RVs — 20 ft minimum
  "RV Exterior":            15,
  "RV Interior":            25,
  "RV Full Detail":         38,
};
/** Minimum footage per service */
const FOOTAGE_MIN_FEET: Record<string, number> = {
  "Boat Interior":          15,
  "Boat Exterior":          15,
  "Boat Full Detail":       15,
  "RV Exterior":            20,
  "RV Interior":            20,
  "RV Full Detail":         20,
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
  "Boat Interior":    { name: "Boat Interior",    tagline: "Full interior clean — vinyl, carpet, dash, storage & odor treatment. No buffing or polishing." },
  "Boat Exterior":    { name: "Boat Exterior",    tagline: "Hull wash, hand-applied wax, deck rinse & metal polish. No machine polishing." },
  "Boat Full Detail": { name: "Boat Full Detail", tagline: "Complete interior + exterior — hull, wax, interior vacuum & vinyl protect. Best value." },
};

type SizeKey = "price_small" | "price_medium" | "price_large" | "price_extra_large";

type VehicleSizeOption = {
  id: VehicleSizeSlug;
  label: string;
  desc: string;
  sizeKey: SizeKey;
};

/** 3-tier picker shown for ALL services — standard + paint correction. */
const VEHICLE_SIZES: VehicleSizeOption[] = [
  {
    id: "sedan",
    label: "Sedan / Coupe",
    desc: "Cars, coupes, compacts, 2-row crossovers",
    sizeKey: "price_medium",
  },
  {
    id: "suv",
    label: "SUV / Truck",
    desc: "2-row SUVs, midsize trucks, Sienna, Odyssey",
    sizeKey: "price_large",
  },
  {
    id: "xl",
    label: "3-Row / Work Van",
    desc: "Yukon, Suburban, 3-row SUVs, Sprinter, Transit",
    sizeKey: "price_extra_large",
  },
];

/** Same 3-tier picker for paint correction — kept as a separate constant so
 *  future re-introduction of a size-tier difference is one edit away. */
const PAINT_CORRECTION_SIZES: VehicleSizeOption[] = VEHICLE_SIZES;

/** Size → DB price column. With compact gone, sedan now points at the
 *  legacy price_medium column. price_small still exists in the DB but no
 *  customer-facing slug maps to it (the price migration keeps it pinned to
 *  price_medium for safety). */
const SIZE_TO_PRICE_KEY: Record<VehicleSizeSlug, SizeKey> = {
  sedan:   "price_medium",
  suv:     "price_large",
  xl:      "price_extra_large",
};

/** Identity now — every customer-facing slug has its own price tier. */
function getActiveTier(vehicleSize: VehicleSizeSlug | "" , _isPaintCorrection: boolean): VehicleSizeSlug | "" {
  void _isPaintCorrection;
  return vehicleSize;
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

function getDurationForService(serviceName: string, vehicleSize: VehicleSizeSlug = "sedan"): number {
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
      ?? getDurationForService(b.service_name ?? "", (b.vehicle_size as VehicleSizeSlug) ?? "sedan");
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

/** Flat multi-vehicle discount: $25 when combined vehicle subtotal ≤ $500,
 *  $40 when above $500. Only applies when 2+ vehicles are on the booking. */
function getMultiVehicleDiscountAmount(vehiclesSubtotal: number, vehicleCount: number): number {
  if (vehicleCount < 2) return 0;
  return vehiclesSubtotal <= 500 ? 25 : 40;
}

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

// ─── Generic single-input Autocomplete (used for truck + HE makes/models) ───
// Same UX as MakeAutocomplete / ModelAutocomplete but powered by a plain
// `(query) => string[]` filter so we can reuse it for any flat catalog.
// `disabled` blocks input + dropdown (used for "pick a make first" gate
// on the model field).
export function TextAutocomplete({
  value,
  onChange,
  filter,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  filter: (query: string) => readonly string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = disabled ? [] : filter(value);
  const showDropdown = open && !disabled && options.length > 0;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close the dropdown whenever the input becomes disabled OR the value is
  // cleared externally (e.g. parent clears the model field when the make
  // changes). Prevents a stale dropdown lingering with the previous make's
  // model list still visible underneath the input.
  useEffect(() => {
    if (disabled || !value) setOpen(false);
  }, [disabled, value]);

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
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className="w-full text-center bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-[70] mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl shadow-black/60">
          {options.slice(0, 16).map((opt, i) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                i === highlight ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-[#222] hover:text-white"
              }`}
            >
              {opt}
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
  bookingCategory?: "vehicle" | "boat" | "rv" | "truck" | "heavy_equipment" | null;
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
  initialCategory?: "vehicle" | "boat" | "rv" | "truck" | "heavy_equipment";
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
  /** Add-on IDs to pre-select when the modal opens — used by the Build Your
   *  Package flow to carry the customer's choices into the booking modal. */
  prefilledAddonIds?: string[] | null;
  /** Pre-seeded additional vehicles from the Build Your Package multi-vehicle
   *  builder. Each vehicle carries its own foundation service, size, year,
   *  make, model, and resolved add-on prices. */
  prefilledAdditionalVehicles?: Array<{
    serviceName: string;
    vehicleSize: VehicleSizeSlug;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    addons: { id: string; label: string; price: number }[];
  }> | null;
  /** Called whenever booking step/progress changes so parent can show a summary bar */
  onProgress?: (data: BookingProgressData | null) => void;
  /** Admin-set per-size add-on price/duration overrides (server-fetched). */
  addonOverrides?: import("@/app/actions/addonPricing").AddonOverrideMap;
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
  prefilledAddonIds = null,
  prefilledAdditionalVehicles = null,
  onProgress,
  addonOverrides = {},
}: BookingSectionProps) {
  const router = useRouter();
  const bookingRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  /** 1 = forward (Next), -1 = back; used for step slide direction */
  const [stepDirection, setStepDirection] = useState(1);
  /** True when a service was pre-selected from a card — shows the confirm-then-continue screen. */
  const [showServiceConfirm, setShowServiceConfirm] = useState(false);
  /** Which top-level category the user picked: null = show category picker */
  const [bookingCategory, setBookingCategory] = useState<"vehicle" | "boat" | "rv" | "truck" | "heavy_equipment" | null>(initialCategory ?? null);

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
        const base = ALL_ADD_ONS.find(a => a.id === "upholstery_shampoo")?.price ?? 75;
        updated.selectedAddons = updated.selectedAddons.map(a =>
          a.id === "upholstery_shampoo"
            ? { ...a, price: updated.vehicleSize === "xl" ? base + 30 : base }
            : a
        );
      }
      return updated;
    }));

  const toggleAdditionalAddon = (idx: number, addon: { id: string; label: string; price: number }) =>
    setAdditionalVehicles(prev => prev.map((v, i) => {
      if (i !== idx) return v;
      const has = v.selectedAddons.some(a => a.id === addon.id);
      if (has) {
        return { ...v, selectedAddons: v.selectedAddons.filter(a => a.id !== addon.id) };
      }
      // Mutually-exclusive groups: dropping a sibling tier when adding a new one
      let kept = v.selectedAddons;
      if (FLOOR_ADDON_IDS.includes(addon.id)) {
        kept = kept.filter(a => !FLOOR_ADDON_IDS.includes(a.id));
      } else if (WINDOW_COATING_ADDON_IDS.includes(addon.id)) {
        kept = kept.filter(a => !WINDOW_COATING_ADDON_IDS.includes(a.id));
      }
      return { ...v, selectedAddons: [...kept, addon] };
    }));

  const toggleAddon = (addon: AddonItem) => {
    const isBundleSeat = addon.id === "seat_removal_all_2row" || addon.id === "seat_removal_all_3row";
    const isIndividualSeat = isSeatRemovalAddonId(addon.id) && !isBundleSeat;
    setSelectedAddons(prev => {
      const isSelected = prev.some(a => a.id === addon.id);
      // Block selecting an individual seat-removal when a bundle is already active.
      // (Visual disable is also applied at render time — this is the safety net.)
      if (isIndividualSeat && !isSelected && prev.some(a => a.id === "seat_removal_all_2row" || a.id === "seat_removal_all_3row")) {
        return prev;
      }
      if (isSelected) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        // Mutually-exclusive groups: floorboard tiers, cargo tiers, window coating tiers,
        // and decon (Clay Bar OR Mech/Chem — picking one removes the other).
        let filtered = prev;
        if (FLOOR_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !FLOOR_ADDON_IDS.includes(a.id));
        } else if (CARGO_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !CARGO_ADDON_IDS.includes(a.id));
        } else if (WINDOW_COATING_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !WINDOW_COATING_ADDON_IDS.includes(a.id));
        } else if (DECON_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !DECON_ADDON_IDS.includes(a.id));
        } else if (isBundleSeat) {
          // Selecting an All-Seats bundle replaces any individual seat picks
          // AND any other bundle (only one bundle can be active at a time).
          filtered = prev.filter(a => !isSeatRemovalAddonId(a.id));
        }
        return [...filtered, { id: addon.id, label: addon.label, price: getEffectiveAddonPrice(addon, vehicleSize as string, addonOverrides) }];
      }
    });
  };

  /** Clears in-flight draft from localStorage + sessionStorage AND resets the
   *  in-modal state that would otherwise carry over (add-ons, category). Used
   *  by Cancel + Change Service buttons so customers actually get a clean
   *  start instead of being auto-restored to the booking they just abandoned. */
  const discardDraftAndReset = () => {
    try { localStorage.removeItem(PERSISTENT_DRAFT_KEY); } catch {}
    try { sessionStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
    setSelectedAddons([]);
    setBookingCategory(null);
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

  // Premium Annual Membership — credit balance for logged-in members
  const [activeMembership, setActiveMembership] = useState<{
    id: string;
    credit_balance_cents: number;
    credit_total_cents: number;
    expires_at: string;
  } | null>(null);
  const [applyMembershipCredit, setApplyMembershipCredit] = useState(true);

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

  // Cross-sell coupon (issued by the sister exterior site). Auto-loaded
  // from localStorage on open — captured upstream by
  // <CrossSellCouponCapture /> when the URL has ?coupon=DETAIL-XXXXX.
  // Separate from the in-house promo `appliedCoupon` so a customer can
  // stack both. Validated server-side via validateCrossSellCoupon().
  const [crossSellCoupon, setCrossSellCoupon] = useState<{
    eventId: string;
    code: string;
    discountPct: number;
  } | null>(null);
  const [crossSellNotice, setCrossSellNotice] = useState<
    { kind: "applied" | "error"; message: string } | null
  >(null);

  // Computed price
  const computedPrice = selectedService
    ? isFootageService(selectedService.name)
      ? (() => {
          const minFt = FOOTAGE_MIN_FEET[selectedService.name] ?? 15;
          const rate  = FOOTAGE_RATE[selectedService.name] ?? selectedService.price_small;
          if (typeof boatLength !== "number" || boatLength < minFt) return null;
          return Math.max(Math.round(rate * minFt), Math.round(rate * boatLength));
        })()
      : isFlatPriceService(selectedService.name, (selectedService as any).category)
        ? Number(selectedService.price_small)
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
  // ── Bundle discount (Build Your Package) ────────────────────────────────
  // Pure percentage per add-on: 0 / 15% / 22% / 28% / 35% at counts
  // 1 / 2 / 3 / 4 / 5+. Body ceramic caps at $50 off max (handled in the
  // shared lib). At 5+, the foundation gets an extra $25 off as a
  // milestone reward. Free-unlock add-ons (price 0) don't count toward
  // the bundle tier and aren't discounted further. Lib lives at
  // lib/bundleDiscount.ts and is shared with BuildYourPackage so both
  // surfaces show identical numbers.
  // Ceramic Package members get their OWN tiered discount (10/20/30%) and
  // are excluded from the regular bundle math so they can't double-dip.
  // Seat Removal SKUs are face-value specialty — also excluded from bundle math
  // (their savings are baked into the 2-Row / 3-Row bundle pricing already).
  const qualifyingAddons = selectedAddons.filter(a => a.price > 0 && !isCeramicPackageId(a.id) && !isSeatRemovalAddonId(a.id));
  const ceramicAddons    = selectedAddons.filter(a => isCeramicPackageId(a.id));
  // Premium add-on bonus: when the customer has selected ANY premium add-on
  // (ceramic package member, seat removal — anything excluded from the basic
  // bundle math), they unlock +15% off every basic add-on. Stacks on top of
  // the basic bundle tier. Not tied to the SERVICE — tied to the add-on
  // STACK, so a basic Interior Detail with one ceramic gets the bonus and
  // an Ultimate booking without any premium add-ons doesn't.
  const hasPremiumAddon = selectedAddons.some(a => isCeramicPackageId(a.id) || isSeatRemovalAddonId(a.id));
  const bundlePctRaw = bundlePctFor(qualifyingAddons.length);
  const bundlePct = effectiveBundlePctFor(qualifyingAddons.length, hasPremiumAddon);
  const addonsBundleSavings = qualifyingAddons.reduce(
    (sum, a) => sum + addonDiscountAmount(a.id, a.price, bundlePct),
    0,
  );
  const bundleDiscount = addonsBundleSavings;
  const ceramicSubtotalRaw = ceramicAddons.reduce((s, a) => s + a.price, 0);
  const ceramicPct = ceramicPackagePct(ceramicAddons.length);
  const ceramicSavings = Math.round(ceramicSubtotalRaw * ceramicPct);
  const addonsTotal =
    selectedAddons.reduce((sum, a) => sum + a.price, 0)
    - addonsBundleSavings
    - ceramicSavings;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountPercentage != null
      ? Math.round(servicePrice * (appliedCoupon.discountPercentage / 100) * 100) / 100
      : Math.min(appliedCoupon.discountAmount ?? 0, servicePrice)
    : 0;
  // Additional vehicles: full price for each (their add-ons too). The multi-
  // vehicle discount is applied ONCE at the booking-total level as a flat
  // $25 / $40 tier, not per-vehicle (see multiVehicleDiscount below).
  const additionalVehiclesTotal = additionalVehicles.reduce((sum, v) => {
    const addonSum = v.selectedAddons.reduce((s, a) => s + a.price, 0);
    return sum + v.servicePrice + addonSum;
  }, 0);
  // Combined vehicle subtotal (before tier discount) → drives the $25/$40 split.
  const vehiclesSubtotalForMulti = servicePrice + addonsTotal + additionalVehiclesTotal;
  const totalVehicleCount = 1 + additionalVehicles.filter(v => v.serviceName).length;
  const multiVehicleDiscount = getMultiVehicleDiscountAmount(vehiclesSubtotalForMulti, totalVehicleCount);
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

    const addonMins = getAddonExtraDurationMins(selectedAddons, sizeKey, addonOverrides);
    const total = Math.min(MAX_SAME_DAY_BOOKING_MINS, primaryMins + addlMins + addonMins);
    // Customer-facing display window: "1 hour less to full" — e.g., 150 min
    // total shows as "1.5–2.5 hrs". Booking system still uses strict total
    // (totalBookingDurationMins) for slot calculation — this only affects copy.
    return { minMins: Math.max(30, total - 60), maxMins: total };
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

  // Cross-sell coupon discount: percentage off the pre-discount goods
  // subtotal (services + addons + extra vehicles). Travel fee is excluded
  // because it's a pass-through driving cost, not something we discount.
  // Stacks WITH the in-house coupon — different program, different funder.
  const crossSellGoodsBase = Math.max(
    0,
    servicePrice + addonsTotal + additionalVehiclesTotal - multiVehicleDiscount - couponDiscount,
  );
  const crossSellDiscount = crossSellCoupon
    ? Math.round(crossSellGoodsBase * (crossSellCoupon.discountPct / 100) * 100) / 100
    : 0;

  const giftCardDiscount = appliedGiftCard
    ? Math.min(appliedGiftCard.remainingBalance, servicePrice + addonsTotal + additionalVehiclesTotal + setupFee + travelFee)
    : 0;
  const totalWithTravel =
    servicePrice - couponDiscount - crossSellDiscount - giftCardDiscount + setupFee + travelFee + addonsTotal + additionalVehiclesTotal - multiVehicleDiscount;

  // Loyalty discount: auto-applies for qualifying vehicle detail services
  const isLoyaltyEligible = loyaltyDiscountPct > 0 && !couponDiscount && (
    ["Interior Detail","Exterior Detail","Full Detail","Ultimate Interior Reset","Ultimate Interior + Exterior Reset"]
      .includes(selectedService?.name ?? "")
  );
  const loyaltyDiscountAmount = isLoyaltyEligible
    ? Math.round(servicePrice * loyaltyDiscountPct / 100 * 100) / 100
    : 0;
  const totalAfterLoyalty = Math.max(0, totalWithTravel - loyaltyDiscountAmount);

  // Membership credit: applied after loyalty/coupons/gift cards. Caps at the
  // remaining total OR the available balance, whichever is smaller. All math
  // done in cents to avoid float-precision drift, then converted to dollars
  // for the bookDetailing payload.
  const totalAfterLoyaltyCents = Math.round(totalAfterLoyalty * 100);
  const membershipBalanceCents = activeMembership?.credit_balance_cents ?? 0;
  const hasMembershipBalance = membershipBalanceCents > 0;
  const membershipCreditAppliedCents = activeMembership && applyMembershipCredit && hasMembershipBalance
    ? Math.min(membershipBalanceCents, totalAfterLoyaltyCents)
    : 0;
  const membershipCreditApplied = membershipCreditAppliedCents / 100;
  const totalAfterDiscount = Math.max(0, (totalAfterLoyaltyCents - membershipCreditAppliedCents) / 100);

  // Cash-on-arrival pricing — server enforces the actual discount; this just
  // displays the dual price so the customer can see the savings before they
  // pick a payment method. Skipped for monthly subscriptions (Stripe-only).
  const cashEligible =
    !isMonthlyPlan
    && selectedService?.is_subscription !== true
    && totalAfterDiscount > 0;
  const cashTotal = cashEligible ? cashPriceFor(totalAfterDiscount) : totalAfterDiscount;
  const showDualPrice = cashEligible && cashTotal < totalAfterDiscount;

  // Initialise today string client-side (avoids Next.js Cache Components error).
  // Use business-tz so the date picker aligns with the server's blocked-date
  // cutoff (the business is in Vermont — Eastern).
  useEffect(() => {
    setTodayStr(todayInBusinessTz());
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

  // Fetch active membership credit when modal opens (logged-in users only).
  // Guests don't have memberships — `initialLoyaltyDiscountPct === null` is
  // the guest signal already used elsewhere in this component.
  useEffect(() => {
    if (!isVisible) return;
    if (initialLoyaltyDiscountPct === null) {
      setActiveMembership(null);
      return;
    }
    getMyActiveMembership().then(m => {
      if (m && m.credit_balance_cents > 0) {
        setActiveMembership({
          id: m.id,
          credit_balance_cents: m.credit_balance_cents,
          credit_total_cents: m.credit_total_cents,
          expires_at: m.expires_at,
        });
      } else {
        setActiveMembership(null);
      }
    }).catch(() => setActiveMembership(null));
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

  // ── Window-coating "Learn More" popup ──────────────────────────────────────
  const [windowCoatInfoOpen, setWindowCoatInfoOpen] = useState(false);

  // ── Ultimate upsell nudge ──────────────────────────────────────────────────
  const [ultimateNudgeDismissed, setUltimateNudgeDismissed] = useState(false);
  useEffect(() => { setUltimateNudgeDismissed(false); }, [selectedService?.id]);

  const ultimateNudge = useMemo(() => {
    if (ultimateNudgeDismissed) return null;
    if (!selectedService) return null;
    const n = selectedService.name.toLowerCase();
    if (n.includes("ultimate") || n.includes("boat") || n.includes("rv") || n.includes("motorhome") || n.includes("maintenance") || n.includes("paint") || n.includes("correction")) return null;
    // Always show the upgrade banner on basic Interior / Full Detail bookings —
    // gives every customer a clear path to Ultimate without having to first
    // discover that they could be saving by upgrading.
    const targetName = (n.includes("interior") && !n.includes("full"))
      ? "Ultimate Interior Reset"
      : "Ultimate Interior + Exterior Reset";
    const targetService = services.find(s => s.name === targetName);
    if (!targetService) return null;
    // Ultimate is size-tiered — compare against the customer's actual vehicle size
    // so the upgrade delta is accurate. Falls back to price_small for safety.
    const targetPrice = vehicleSize
      ? getPriceForSize(targetService, vehicleSize as VehicleSizeSlug)
      : (targetService.price_small ?? 0);
    // Honest upgrade delta: only the add-ons INCLUDED in Ultimate become free
    // post-upgrade. Premium add-ons (engine bay, headlight, seat removal,
    // ceramic, etc.) survive and still cost the same on Ultimate, so they
    // shouldn't be counted as part of the "savings" from upgrading.
    const includedAddonsCost = selectedAddons
      .filter(a => INCLUDED_IN_ULTIMATE_IDS.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    const delta = targetPrice - (servicePrice + includedAddonsCost);
    return { targetService, targetName, targetPrice, delta };
  }, [ultimateNudgeDismissed, selectedService, selectedAddons, services, servicePrice, vehicleSize]);

  const handleSwitchToUltimate = () => {
    if (!ultimateNudge) return;
    onSelectService(ultimateNudge.targetService);
    setUltimateNudgeDismissed(true);
  };

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
  // Extra time from duration-extending add-ons (e.g. Ultimate Interior +3 hrs, ceramic_3yr +1.5-2.5 hrs) is folded in here.
  const addonExtraDurationMins = getAddonExtraDurationMins(selectedAddons, vehicleSize || "sedan", addonOverrides);
  const primaryDurationMins = selectedService
    ? getDurationForService(
        selectedService.name,
        (isFootageService(selectedService.name)
          ? boatLengthToSize(boatLength)
          : (vehicleSize || "sedan")) as VehicleSizeSlug
      ) + addonExtraDurationMins
    : 120;
  const additionalDurationMins = additionalVehicles.reduce((sum, v) => {
    if (!v.serviceName || !v.vehicleSize) return sum;
    const base = getDurationForService(v.serviceName, v.vehicleSize as VehicleSizeSlug);
    return sum + Math.max(30, base - 30);
  }, 0);
  // Cap at the same-day booking window so XL 2-Step + Ceramic-style combos
  // still book (as a full-day appointment) instead of returning zero slots.
  const totalBookingDurationMins = Math.min(MAX_SAME_DAY_BOOKING_MINS, primaryDurationMins + additionalDurationMins);
  // Ultimate services used to be flat-rate; now they're size-tiered, so the
  // customer must pick a vehicle size like any other service. No auto-set.

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
      setVehicleSize(prefilledVehicle?.size ?? "");
      setVehicleYear(prefilledVehicle?.year ?? "");
      setVehicleMake(prefilledVehicle?.make ?? "");
      setVehicleModel(prefilledVehicle?.model ?? "");
      setAutoDetected(!!(prefilledVehicle?.size));
      setBoatLength(20);
      // Pre-fill add-ons from the Build Your Package handoff (if provided).
      // Mapping addon id → ALL_ADD_ONS metadata so we get the right label + base price.
      const hasBuilderHandoff = !!(prefilledAddonIds !== null && prefilledVehicle?.year && prefilledVehicle?.make && prefilledVehicle?.model && prefilledVehicle?.size);
      if (prefilledAddonIds && prefilledAddonIds.length > 0) {
        const size = prefilledVehicle?.size as string | undefined;
        // Free-unlock add-ons (Steam Sanitation + Rubber/Plastics/Vinyl Dressing)
        // become free when 3+ other paid add-ons are stacked. Zero them out
        // here so the booking flow shows the actual $0 the customer expects.
        const FREE_UNLOCK_IDS_BM = ["steam_sanitation", "trim_dressing"] as const;
        const qualifyingCount = prefilledAddonIds.filter(id => !(FREE_UNLOCK_IDS_BM as readonly string[]).includes(id)).length;
        const freeUnlocked = qualifyingCount >= 3;
        const preAddons = prefilledAddonIds
          .map(id => ALL_ADD_ONS.find(a => a.id === id))
          .filter((a): a is AddonItem => !!a)
          .map(a => ({
            id: a.id,
            label: a.label,
            price: ((FREE_UNLOCK_IDS_BM as readonly string[]).includes(a.id) && freeUnlocked) ? 0 : getEffectiveAddonPrice(a, size ?? "sedan", addonOverrides),
          }));
        setSelectedAddons(preAddons);
      } else {
        setSelectedAddons([]);
      }
      // Builder handoff: skip Step 1 (vehicle + add-ons) since everything was
      // configured upstream. Drop them straight onto the schedule step.
      setStep(hasBuilderHandoff ? 2 : 1);
      // Seed additional vehicles from the builder if present. Each carries
      // its own service + size + resolved add-on prices; we resolve the
      // serviceId by looking up the named service in the loaded services list.
      if (prefilledAdditionalVehicles && prefilledAdditionalVehicles.length > 0) {
        const seeded: AdditionalVehicleForm[] = prefilledAdditionalVehicles.map(av => {
          const svc = services.find(s => s.name === av.serviceName);
          const sizeKey = (av.vehicleSize ?? "sedan") as VehicleSizeSlug;
          const basePrice = svc
            ? Number((svc as any)[({ sedan: "price_medium", suv: "price_large", xl: "price_extra_large" } as const)[sizeKey]] ?? svc.price_medium ?? 0)
            : 0;
          return {
            vehicleSize: sizeKey,
            vehicleYear: av.vehicleYear,
            vehicleMake: av.vehicleMake,
            vehicleModel: av.vehicleModel,
            serviceId: svc?.id ?? "",
            serviceName: av.serviceName,
            servicePrice: basePrice,
            selectedAddons: av.addons.map(a => ({ id: a.id, label: a.label, price: a.price })),
          };
        });
        setAdditionalVehicles(seeded);
      } else {
        setAdditionalVehicles([]);
      }
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
      setCrossSellCoupon(null);
      setCrossSellNotice(null);
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
      // Show running total (service + add-ons) as soon as a service is picked —
      // not just at step 3 — so the sticky "Back to booking" pill reflects
      // every add-on the customer toggles.
      price: selectedService && totalAfterDiscount > 0 ? totalAfterDiscount : null,
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
    // initialDraft takes priority (Stripe return / rebook); localStorage is the fallback.
    // When the builder hands off (prefilledAddonIds set), we still restore date/time/
    // contact from localStorage, but the resume toast is suppressed lower in the effect.
    if (initialDraft || !isVisible) return;
    let saved: DraftBooking | null = null;
    try {
      const raw = localStorage.getItem(PERSISTENT_DRAFT_KEY);
      if (raw) saved = JSON.parse(raw) as DraftBooking;
    } catch {}
    if (!saved || (!saved.serviceId && !saved.name && !saved.vehicleYear)) return;

    const service = services.find((s) => s.id === saved!.serviceId);
    // Builder handoff supplies service + vehicle from prefilled props. Don't
    // overwrite them with a possibly-stale localStorage draft.
    const fromBuilder = prefilledAddonIds !== null;
    if (!fromBuilder) {
      if (service) onSelectService(service);
      if (saved.bookingCategory) setBookingCategory(saved.bookingCategory);
      setVehicleSize(saved.vehicleSize || "");
      setVehicleYear(saved.vehicleYear || "");
      setVehicleMake(saved.vehicleMake || "");
      setVehicleModel(saved.vehicleModel || "");
    }

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
    if (saved.boatLength !== undefined && !fromBuilder) setBoatLength(saved.boatLength);
    // Add-ons: only restore from localStorage when there's no builder handoff
    // (the builder already supplies them via prefilledAddonIds, which the
    // open-effect resolves into selectedAddons with proper $0 for free unlocks).
    if (!fromBuilder && saved.selectedAddonIds?.length && service) {
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

    // Suppress the "Draft restored" toast for builder handoffs — customer is
    // mid-flow and doesn't need the prompt; the data restore is silent.
    if (prefilledAddonIds === null) setShowResumeToast(true);
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

  // ── Cross-sell coupon auto-apply ─────────────────────────────────────────
  // When the modal opens, check for a stored exterior-site coupon and
  // validate it. Success → silent banner so customer sees the discount
  // before they hit Pay. Expired / already-used → show a polite banner
  // and forget the code (don't block booking).
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    (async () => {
      const stored = getStoredCrossSellCoupon();
      if (!stored) return;
      const result = await validateCrossSellCoupon(stored);
      if (cancelled) return;
      if (result.ok) {
        setCrossSellCoupon({
          eventId:     result.eventId,
          code:        result.code,
          discountPct: result.discountPct,
        });
        setCrossSellNotice({
          kind: "applied",
          message: `Coupon ${result.code} applied — ${result.discountPct}% off your detail.`,
        });
      } else {
        setCrossSellCoupon(null);
        if (result.reason === "expired" || result.reason === "already_used") {
          setCrossSellNotice({
            kind: "error",
            message: result.reason === "expired"
              ? `Coupon ${stored} has expired — book without it or contact us.`
              : `Coupon ${stored} has already been used.`,
          });
          clearStoredCrossSellCoupon();
        } else if (result.reason === "not_found" || result.reason === "wrong_direction") {
          // Stored code doesn't match anything — quietly drop it.
          clearStoredCrossSellCoupon();
          setCrossSellNotice(null);
        }
        // lookup_error: leave both as-is so a retry can succeed.
      }
    })();
    return () => { cancelled = true; };
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
    // Always pass the actual total duration so days/slots reflect what the
    // customer is REALLY trying to book (foundation + add-ons + additional
    // vehicles). Previously this only passed a custom duration for multi-
    // vehicle bookings, so single-vehicle bookings with add-ons showed days
    // that didn't actually have enough open hours to fit the job.
    getNextAvailableDays(selectedService.name, vehicleSize || "sedan", 3, 21, totalBookingDurationMins)
      .then(days => { if (!cancelled) setNextAvailDays(days); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setNextAvailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedService?.name, vehicleSize, step, totalBookingDurationMins]);

  // ── Re-price upholstery shampoo if vehicle size changes after selection ────
  useEffect(() => {
    const base = ALL_ADD_ONS.find(a => a.id === "upholstery_shampoo")?.price ?? 75;
    setSelectedAddons(prev => prev.map(a =>
      a.id === "upholstery_shampoo"
        ? { ...a, price: vehicleSize === "xl" ? base + 30 : base }
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

  // Whole-day reservations (8+ hrs total) collapse the slot picker to a
  // single fixed slot at the day's open time so the booking always starts
  // when shop hours begin, and the rest of the day is implicitly blocked.
  const isWholeDayReservation = totalBookingDurationMins >= 480;

  useEffect(() => {
    async function updateAvailable() {
      if (selectedService && selectedDate) {
        // Whole-day path: existing bookings on this day disqualify it
        // entirely (no room for another job), and the open-hours window
        // must be at least 8 hrs. If both pass, surface ONE slot — the
        // open time — so the customer can confirm.
        if (isWholeDayReservation) {
          const hasAnyBooking = (existingBookingsForDate?.length ?? 0) > 0;
          const openMins = slotsForSelectedDate[0]
            ? await timeToMinutes(slotsForSelectedDate[0].time)
            : null;
          const fitsDay = openMins != null && closingMinutesForSelectedDate - openMins >= 480;
          if (!hasAnyBooking && fitsDay && slotsForSelectedDate.length > 0) {
            setAvailableSlots([slotsForSelectedDate[0]]);
          } else {
            setAvailableSlots([]);
          }
          return;
        }
        const slots = await getAvailableSlots(
          selectedService.name,
          isFootageService(selectedService.name) ? boatLengthToSize(boatLength) : (vehicleSize || "sedan"),
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
  }, [selectedService, selectedDate, vehicleSize, boatLength, existingBookingsForDate, slotsForSelectedDate, closingMinutesForSelectedDate, hasFullDayAddon, effectiveDurationOverride, isWholeDayReservation]);

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
          (selectedService && isFootageService(selectedService.name)) ? boatLengthToSize(boatLength) : (vehicleSize || "sedan"),
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
      // All vehicle services (including Ultimate, now size-tiered) require a size pick
      const primaryValid = !!(vehicleSize && vehicleYear && vehicleMake && vehicleModel);
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
        vehicleSize: (av.vehicleSize || "sedan") as VehicleSizeSlug,
        vehicleYear: av.vehicleYear,
        vehicleMake: av.vehicleMake,
        vehicleModel: av.vehicleModel,
        serviceId: av.serviceId,
        serviceName: av.serviceName,
        servicePrice: av.servicePrice,
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
        couponCode: appliedCoupon.code,
        couponDiscount,
      }),
      ...(crossSellCoupon && crossSellDiscount > 0 && {
        crossSellEventId:    crossSellCoupon.eventId,
        crossSellCouponCode: crossSellCoupon.code,
        crossSellDiscount,
        crossSellDiscountPct: crossSellCoupon.discountPct,
      }),
      ...(appliedGiftCard && giftCardDiscount > 0 && {
        giftCardId: appliedGiftCard.giftCardId,
        giftCardCode: appliedGiftCard.code,
        giftCardDiscount,
      }),
      ...(activeMembership && membershipCreditApplied > 0 && {
        membershipId: activeMembership.id,
        membershipCreditApplied,
      }),
      ...(loyaltyDiscountAmount > 0 && {
        loyaltyDiscountPct,
        loyaltyDiscountAmount,
      }),
      ...(bundleDiscount > 0 && {
        bundleDiscount,
        bundleAddonCount: selectedAddons.length,
      }),
      ...(multiVehicleDiscount > 0 && { multiVehicleDiscount }),
    };
  };

  // ── Pay at Arrival ───────────────────────────────────────────────────────
  const handlePayAtArrival = async () => {
    if (!selectedService || (!isFootageService(selectedService.name) && !isFlatPriceService(selectedService.name, (selectedService as any).category) && !vehicleSize) || !canConfirm()) return;
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
    if (!selectedService || (!isFootageService(selectedService.name) && !isFlatPriceService(selectedService.name, (selectedService as any).category) && !vehicleSize)) return;
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
    if (!selectedService || (!isFootageService(selectedService.name) && !isFlatPriceService(selectedService.name, (selectedService as any).category) && !vehicleSize) || !canConfirm()) return;
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

            {/* Cross-sell coupon banner — inline notice at the very top of
                the booking flow when an exterior-site code is detected. */}
            {crossSellNotice && (
              <div className="px-4 sm:px-6 pt-4 -mb-2">
                <div
                  className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${
                    crossSellNotice.kind === "applied"
                      ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300"
                      : "border-red-500/30 bg-red-500/[0.06] text-red-300"
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-base shrink-0" aria-hidden>
                      {crossSellNotice.kind === "applied" ? "✅" : "⚠️"}
                    </span>
                    <p className="text-sm font-semibold leading-snug">{crossSellNotice.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCrossSellNotice(null)}
                    aria-label="Dismiss notice"
                    className="shrink-0 text-current/60 hover:text-current"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

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

                  {/* Semi Truck */}
                  <button
                    type="button"
                    onClick={() => setBookingCategory("truck")}
                    className="w-full p-5 rounded-2xl border border-[#252525] bg-zinc-900/40 hover:border-orange-400/50 hover:bg-orange-500/[0.04] active:scale-[0.99] transition-all duration-150 group"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Container size={20} className="text-orange-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-orange-400 transition-colors">
                          Semi Truck Detailing
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Day cabs &amp; sleepers — yard washes from $99, premium details from $299
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Heavy Equipment */}
                  <button
                    type="button"
                    onClick={() => setBookingCategory("heavy_equipment")}
                    className="w-full p-5 rounded-2xl border border-[#252525] bg-zinc-900/40 hover:border-yellow-400/50 hover:bg-yellow-500/[0.04] active:scale-[0.99] transition-all duration-150 group"
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <Tractor size={20} className="text-yellow-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-yellow-400 transition-colors">
                          Heavy Equipment
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Excavators, dozers, loaders, log &amp; dump trucks — cab interiors or $95/hr on-site
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
                    !isTruckService(s.name, (s as any).category) &&
                    !isHeavyEquipmentService(s.name, (s as any).category) &&
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

                {bookingCategory === "truck" && (() => {
                  const truck = services.filter(s =>
                    !s.is_subscription && isTruckService(s.name, (s as any).category)
                  );
                  // Group into exterior / interior / complete for clarity
                  const exterior = truck.filter(s => /yard wash|exterior/i.test(s.name));
                  const interior = truck.filter(s => /interior reset/i.test(s.name));
                  const complete = truck.filter(s => /complete/i.test(s.name));
                  return (
                    <div>
                      <h2 className="text-xl font-black text-white mb-1">Semi Truck Detailing</h2>
                      <p className="text-sm text-zinc-500 mb-6">On-site service for day cabs &amp; sleepers — yard, terminal, or driveway</p>
                      <div className="space-y-6">
                        {exterior.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Container size={14} className="text-orange-400" />
                              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Exterior</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {exterior.map((service) => (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => onSelectService(service)}
                                  className="p-4 rounded-xl border border-orange-500/15 bg-orange-500/[0.02] text-left transition-all duration-150 hover:border-orange-500/40 hover:bg-orange-500/[0.06] active:scale-[0.99] group"
                                >
                                  <div className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">
                                    {service.name}
                                  </div>
                                  <div className="text-[11px] text-orange-300/80 font-medium mt-0.5">
                                    From ${service.price_small}
                                  </div>
                                  {service.description && (
                                    <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-3 leading-relaxed">
                                      {service.description}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {interior.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles size={14} className="text-orange-400" />
                              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Interior</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {interior.map((service) => (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => onSelectService(service)}
                                  className="p-4 rounded-xl border border-orange-500/15 bg-orange-500/[0.02] text-left transition-all duration-150 hover:border-orange-500/40 hover:bg-orange-500/[0.06] active:scale-[0.99] group"
                                >
                                  <div className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">
                                    {service.name}
                                  </div>
                                  <div className="text-[11px] text-orange-300/80 font-medium mt-0.5">
                                    From ${service.price_small}
                                  </div>
                                  {service.description && (
                                    <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-3 leading-relaxed">
                                      {service.description}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {complete.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Gem size={14} className="text-orange-400" />
                              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-300">Complete Packages</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {complete.map((service) => (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => onSelectService(service)}
                                  className="relative p-4 rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-500/[0.06] to-orange-500/[0.02] text-left transition-all duration-150 hover:border-orange-400/60 hover:from-orange-500/[0.10] active:scale-[0.99] group overflow-hidden"
                                >
                                  <div className="font-bold text-sm text-white group-hover:text-orange-300 transition-colors">
                                    {service.name}
                                  </div>
                                  <div className="text-sm text-orange-400 font-black mt-1">
                                    From ${service.price_small}
                                  </div>
                                  {service.description && (
                                    <div className="text-[11px] text-zinc-500 mt-1.5 line-clamp-3 leading-relaxed">
                                      {service.description}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {bookingCategory === "heavy_equipment" && (() => {
                  const he = services.filter(s =>
                    !s.is_subscription && isHeavyEquipmentService(s.name, (s as any).category)
                  );
                  return (
                    <div>
                      <h2 className="text-xl font-black text-white mb-1">Heavy Equipment Detailing</h2>
                      <p className="text-sm text-zinc-500 mb-6">Excavators, dozers, loaders, skid steers, log &amp; dump trucks — on-site at your yard or job</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Tractor size={14} className="text-yellow-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Cab Interiors &amp; Hourly</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {he.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.02] text-left transition-all duration-150 hover:border-yellow-500/40 hover:bg-yellow-500/[0.06] active:scale-[0.99] group"
                          >
                            <div className="font-bold text-sm text-white group-hover:text-yellow-300 transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[11px] text-yellow-300/80 font-medium mt-0.5">
                              {/equipment hourly/i.test(service.name) ? "$95/hr · 2 hr min" : `From $${service.price_small}`}
                            </div>
                            {service.description && (
                              <div className="text-[11px] text-zinc-600 mt-1.5 line-clamp-3 leading-relaxed">
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold text-white">
                    {isSubscription ? "Maintenance Club Setup" : "Book Your Detail"}
                  </h2>
                  {/* Easy-access "Change Service" button — only on Step 1 so
                      customers can swap services before locking in date/time. */}
                  {step === 1 && selectedService && onClearService && (
                    <button
                      type="button"
                      onClick={() => {
                        discardDraftAndReset();
                        onClearService();
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.1] active:scale-[0.97] transition-all"
                      aria-label="Choose a different service"
                    >
                      <ChevronLeft size={12} strokeWidth={3} />
                      Change Service
                    </button>
                  )}
                </div>
                {selectedService ? (() => {
                  // Builder handoff: re-label as "Custom Package (Foundation)" and
                  // include the full build total (foundation + add-ons after bundle),
                  // not just the foundation base price.
                  const svcLower = selectedService.name.toLowerCase();
                  const isBuilder = svcLower === "interior detail" || svcLower === "exterior detail" || svcLower === "full detail";
                  const fromBuilder = isBuilder && prefilledAddonIds !== null;
                  const foundationLabel = svcLower === "interior detail" ? "Interior"
                    : svcLower === "exterior detail" ? "Exterior"
                    : "Full";
                  const displayName = fromBuilder
                    ? `Custom Package (${foundationLabel})`
                    : (BOAT_DISPLAY_NAMES[selectedService.name]?.name ?? selectedService.name);
                  const buildTotal = (computedPrice ?? 0) + addonsTotal;
                  // Live running total — always shows service + add-ons - bundle/ceramic
                  // discounts so the desktop modal header acts as a sticky summary
                  // even before Step 3. Mirrors the mobile sticky pill.
                  const runningTotal = totalAfterDiscount > 0 ? totalAfterDiscount : null;
                  const headerPrice = fromBuilder ? buildTotal : (runningTotal ?? computedPrice ?? null);
                  return (
                    <>
                      <p className="text-sm text-[#D4AF37] mt-0.5 font-medium">
                        {displayName}
                        {headerPrice != null && (
                          <span className="text-white font-semibold">
                            {" "}— ${typeof headerPrice === "number" ? Math.round(headerPrice) : headerPrice}
                          </span>
                        )}
                      </p>
                      {/* Live breakdown — shows for builder OR any service with add-ons */}
                      {((fromBuilder && selectedAddons.length > 0) || (!fromBuilder && selectedAddons.length > 0)) && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Base ${computedPrice} · {selectedAddons.length} add-on{selectedAddons.length === 1 ? "" : "s"}
                          {bundleDiscount > 0 && (
                            <> · <span className="text-violet-400 font-bold">−${bundleDiscount} bundle</span></>
                          )}
                          {ceramicSavings > 0 && (
                            <> · <span className="text-cyan-400 font-bold">−${ceramicSavings} ceramic</span></>
                          )}
                        </p>
                      )}
                    </>
                  );
                })() : (
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Complete the steps below to schedule your service
                  </p>
                )}

                {/* Step progress — Midnight & Champagne.
                    Hidden when the builder hands off (foundation/vehicle/add-ons
                    are already done — showing 1/2/3 here is confusing/duplicative). */}
                <div className={`flex items-center mt-6 ${prefilledAddonIds !== null ? "hidden" : ""}`}>
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
              <div className={`px-4 sm:px-6 py-6 sm:py-8 pb-20 flex flex-col justify-start h-auto ${prefilledAddonIds !== null ? "max-w-md mx-auto w-full text-center [&_label]:text-center [&_label]:block [&_label]:w-full" : ""}`}>
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
                      /* ── VEHICLE / TRUCK / HEAVY EQUIPMENT: year + make + model
                       *  Cars get the autocomplete-with-size-detect. Trucks and
                       *  heavy equipment get plain text inputs with category-
                       *  specific placeholders since their fleet/spec data
                       *  doesn't live in the consumer vehicle DB. ── */
                      <>
                      {(() => {
                        const isTruck = !!selectedService && isTruckService(selectedService.name, (selectedService as any).category);
                        const isHE    = !!selectedService && isHeavyEquipmentService(selectedService.name, (selectedService as any).category);
                        const isFlat  = isTruck || isHE;
                        const makeLabel  = isHE ? "Brand" : "Make";
                        const modelLabel = isHE ? "Model / Type" : "Model";
                        const yearPh    = isHE ? "2018" : "2022";
                        const makePh    = isTruck ? "Peterbilt" : isHE ? "Caterpillar" : "Toyota";
                        const modelPh   = isTruck ? "389 Sleeper" : isHE ? "320 Excavator" : "Camry";
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">
                                Year
                              </label>
                              <input
                                type="text"
                                value={vehicleYear}
                                onChange={(e) => setVehicleYear(e.target.value)}
                                placeholder={yearPh}
                                maxLength={4}
                                className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm text-center"
                              />
                            </div>
                            <div>
                              <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">
                                {makeLabel}
                              </label>
                              {isTruck ? (
                                <TextAutocomplete
                                  value={vehicleMake}
                                  onChange={(v) => { setVehicleMake(v); setVehicleModel(""); }}
                                  filter={filterTruckMakesByQuery}
                                  placeholder={makePh}
                                />
                              ) : isHE ? (
                                <TextAutocomplete
                                  value={vehicleMake}
                                  onChange={(v) => { setVehicleMake(v); setVehicleModel(""); }}
                                  filter={filterHEMakesByQuery}
                                  placeholder={makePh}
                                />
                              ) : (
                                <MakeAutocomplete
                                  value={vehicleMake}
                                  onChange={setVehicleMake}
                                  onSelect={() => {
                                    setVehicleModel("");
                                    setAutoDetected(false);
                                  }}
                                  placeholder={makePh}
                                />
                              )}
                            </div>
                            <div>
                              <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2 text-center">
                                {modelLabel}
                              </label>
                              {isTruck ? (
                                <TextAutocomplete
                                  value={vehicleModel}
                                  onChange={setVehicleModel}
                                  filter={(q) => filterTruckModelsByQuery(vehicleMake, q)}
                                  placeholder={modelPh}
                                  disabled={!vehicleMake.trim()}
                                />
                              ) : isHE ? (
                                <TextAutocomplete
                                  value={vehicleModel}
                                  onChange={setVehicleModel}
                                  filter={(q) => filterHEModelsByQuery(vehicleMake, q)}
                                  placeholder={modelPh}
                                  disabled={!vehicleMake.trim()}
                                />
                              ) : (
                                <ModelAutocomplete
                                  value={vehicleModel}
                                  onChange={setVehicleModel}
                                  make={vehicleMake}
                                  onSelect={(_, sizeSlug) => {
                                    setVehicleSize(sizeSlug);
                                    setAutoDetected(true);
                                  }}
                                  placeholder={modelPh}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Vehicle Size — required for all vehicle services (Ultimate is now size-tiered) */}
                      {/* Skip size picker entirely for flat-priced truck / heavy-equipment services
                          and instead show a single fixed-price summary card. */}
                      {selectedService && isFlatPriceService(selectedService.name, (selectedService as any).category) ? (
                        <div className="w-full p-5 rounded-2xl border border-orange-400/40 bg-orange-500/[0.05] text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/70 mb-1">Flat Rate</p>
                          <p className="text-3xl font-black text-orange-300 tabular-nums">${selectedService.price_small}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">Final price confirmed on-site. Add-on services and travel fees calculated at checkout.</p>
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
                             * Both pickers now use the same 3-tier ladder
                             * (sedan / suv / xl) — getActiveTier is identity. */
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
                        // Ceramic items (Body, Wheels, all-glass Windows) get
                        // consolidated into a single multi-pick card with a
                        // tiered 10/20/30% discount — exclude them from the
                        // regular standalone grid AND the window-coat tier
                        // selector so they only render once.
                        const standAlone = available.filter(a =>
                          !FLOOR_ADDON_IDS.includes(a.id)
                          && !WINDOW_COATING_ADDON_IDS.includes(a.id)
                          && !isCeramicPackageId(a.id)
                          && !isSeatRemovalAddonId(a.id),
                        );
                        const seatRemovalOpts = available.filter(a => isSeatRemovalAddonId(a.id));
                        const floorOpts  = available.filter(a => FLOOR_ADDON_IDS.includes(a.id));
                        // Keep the original tier selector for windshield-only
                        // + front-3 (cheaper entry points). The all-glass tier
                        // now lives in the ceramic package card.
                        const windowCoatOpts = available.filter(a =>
                          WINDOW_COATING_ADDON_IDS.includes(a.id) && !isCeramicPackageId(a.id),
                        );
                        const ceramicOpts = available.filter(a => isCeramicPackageId(a.id));
                        const note       = getIncludedNote(selectedService?.name ?? "");
                        const isMarine   = !!(selectedService && BOAT_DISPLAY_NAMES[selectedService.name]);
                        const isRV       = !!(selectedService && isRVService(selectedService.name));
                        const isUltimate = !!(selectedService?.name.toLowerCase().includes("ultimate"));
                        if (!standAlone.length && !floorOpts.length && !windowCoatOpts.length && !ceramicOpts.length) return null;
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

                            {/* ── Live Discount Status Card — Premium bonus + basic bundle tier ──
                                Only renders when the customer has stacked enough basic add-ons
                                to unlock a bundle discount, OR has picked a Premium add-on
                                (ceramic / seat removal) that activates the +15% Premium bonus
                                on top of the bundle tier. Hidden at idle so the screen doesn't
                                feel premium-card-spammy at first paint. */}
                            {(hasPremiumAddon || qualifyingAddons.length >= 2) && (() => {
                              const count = qualifyingAddons.length;
                              const basicPct = bundlePctRaw;                                    // tier from add-on count alone
                              const totalPctNow = Math.round(bundlePct * 100);                  // includes premium
                              const premiumBonusPct = Math.round(PREMIUM_ADDON_BONUS_PCT * 100);
                              const nextTierAtCount = count < 2 ? 2 : count < 3 ? 3 : null;
                              const nextTierBasicPct = nextTierAtCount === 2 ? 10 : nextTierAtCount === 3 ? 15 : null;
                              const nextTierTotalPct = nextTierBasicPct != null
                                ? nextTierBasicPct + (hasPremiumAddon ? premiumBonusPct : 0)
                                : null;
                              return (
                                <div className={`rounded-2xl border overflow-hidden mb-3 transition-all ${
                                  bundlePct > 0
                                    ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/[0.07] via-zinc-950/40 to-zinc-950/40 shadow-[0_0_14px_rgba(16,185,129,0.10)]"
                                    : "border-white/[0.07] bg-zinc-950/40"
                                }`}>
                                  {/* Premium bonus row — fires when ANY premium add-on is picked */}
                                  {hasPremiumAddon && (
                                    <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-gradient-to-r from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.04] border-b border-white/[0.06]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Crown size={11} className="text-[#D4AF37] shrink-0" fill="currentColor" />
                                        <span className="text-[11px] font-bold text-[#F3E5AB] leading-tight">Premium bonus unlocked</span>
                                      </div>
                                      <span className="text-[11px] font-black tabular-nums text-[#D4AF37]">+{premiumBonusPct}% off all add-ons</span>
                                    </div>
                                  )}
                                  {/* Bundle tier row */}
                                  <div className="px-3.5 py-2.5 flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <Sparkles size={11} className={bundlePct > 0 ? "text-emerald-400" : "text-zinc-500"} />
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${bundlePct > 0 ? "text-emerald-300" : "text-zinc-400"}`}>
                                          Bundle savings
                                        </span>
                                      </div>
                                      {bundlePct > 0 ? (
                                        <p className="text-[11px] text-zinc-300 leading-snug">
                                          <span className="font-black text-white">{totalPctNow}% off</span> every basic add-on
                                          {hasPremiumAddon && <span className="text-zinc-500"> ({basicPct > 0 ? `${Math.round(basicPct * 100)}% bundle + ${premiumBonusPct}% Premium` : `${premiumBonusPct}% Premium bonus`})</span>}
                                          {nextTierTotalPct != null && (
                                            <> · <span className="text-zinc-400">Add 1 more → <span className="text-emerald-300 font-bold">{nextTierTotalPct}% off</span></span></>
                                          )}
                                        </p>
                                      ) : nextTierTotalPct != null ? (
                                        <p className="text-[11px] text-zinc-400 leading-snug">
                                          Pick <span className="font-black text-white">{nextTierAtCount}</span> basic add-ons to unlock <span className="font-black text-emerald-300">{nextTierTotalPct}% off</span> each
                                          {hasPremiumAddon && <span className="text-zinc-500"> (Premium bonus stacks)</span>}
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-zinc-500">Already at max basic discount. Add more if you&apos;d like — pricing holds.</p>
                                      )}
                                    </div>
                                    {/* Tier pill ladder */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      {[
                                        { c: 2, pct: 10 },
                                        { c: 3, pct: 15 },
                                      ].map(t => {
                                        const reached = count >= t.c;
                                        return (
                                          <div key={t.c} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black border transition-all ${
                                            reached
                                              ? "border-emerald-400/60 bg-emerald-500/[0.15] text-emerald-300"
                                              : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
                                          }`}>
                                            {reached && <Check size={8} strokeWidth={3} />}
                                            {t.c}+{t.pct}%
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

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

                                    {/* Price — only shows the discounted strikethrough when
                                        this specific row is selected AND a bundle/premium
                                        discount is actively reducing its price. Unselected rows
                                        always show their full base price so customers aren't
                                        confused by phantom discounts on items they haven't
                                        added yet. */}
                                    {(() => {
                                      const base = getEffectiveAddonPrice(addon, vehicleSize as string, addonOverrides);
                                      const discounted = addonDiscountedPrice(addon.id, base, bundlePct);
                                      const isDiscounted = isSelected && bundlePct > 0 && discounted < base;
                                      return (
                                        <div className={`shrink-0 flex items-baseline gap-1.5 tabular-nums`}>
                                          {isDiscounted && (
                                            <span className="text-[11px] font-bold text-zinc-500 line-through">${base}</span>
                                          )}
                                          <span className={`text-sm font-black ${
                                            isDiscounted ? "text-emerald-300" : isSelected ? "text-white" : "text-[#D4AF37]"
                                          }`}>
                                            +${isDiscounted ? discounted : base}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </button>
                                );
                              })}

                              {/* ── Premium Upgrade: Seat Removal Deep Clean ── */}
                              {seatRemovalOpts.length > 0 && (() => {
                                // Auto-detect vehicle row count from vehicleSize.
                                // 3-row vehicles (xl / extra_large): show 3rd-row + 3-row bundle, hide 2-row bundle.
                                // 2-row vehicles (sedan/medium/suv/large): hide 3rd-row + 3-row bundle.
                                // Unknown (no size yet): show all 6 so customer can choose.
                                const size = (vehicleSize as string) || "";
                                const is3Row = size === "xl" || size === "extra_large";
                                const is2Row = size === "sedan" || size === "medium" || size === "suv" || size === "large";
                                const HIDDEN_BY_SIZE: Set<string> = is3Row
                                  ? new Set(["seat_removal_all_2row"])
                                  : is2Row
                                    ? new Set(["seat_removal_3rd_row", "seat_removal_all_3row"])
                                    : new Set();
                                const sectionOpts = seatRemovalOpts.filter(o =>
                                  !HIDDEN_BY_SIZE.has(o.id) &&
                                  o.id !== "seat_removal_all_2row" &&
                                  o.id !== "seat_removal_all_3row");
                                const bundleOpts = seatRemovalOpts.filter(o =>
                                  !HIDDEN_BY_SIZE.has(o.id) &&
                                  (o.id === "seat_removal_all_2row" || o.id === "seat_removal_all_3row"));
                                const anySelected = seatRemovalOpts.some(o => selectedAddons.some(a => a.id === o.id));
                                const SHORT_LABEL: Record<string, string> = {
                                  seat_removal_driver:    "Driver",
                                  seat_removal_passenger: "Passenger",
                                  seat_removal_rear:      "Rear",
                                  seat_removal_3rd_row:   "3rd Row",
                                };
                                const SEAT_SAVINGS: Record<string, number> = {
                                  seat_removal_all_2row: 55,
                                  seat_removal_all_3row: 75,
                                };
                                return (
                                  <div className={`relative rounded-2xl border overflow-hidden transition-all ${
                                    anySelected
                                      ? "border-[#D4AF37]/60 bg-gradient-to-br from-[#D4AF37]/[0.08] via-zinc-950/40 to-zinc-950/40 shadow-[0_0_18px_rgba(212,175,55,0.15)]"
                                      : "border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.02] via-zinc-900/40 to-zinc-900/40 hover:border-[#D4AF37]/50"
                                  }`}>
                                    {/* Header — tightened: only show the description once
                                        any seat is selected (eliminates the always-on prose
                                        block that was eating ~36px of vertical space on a
                                        screen already filled with premium cards). */}
                                    <div className={`px-4 pt-2.5 pb-2 border-b border-white/[0.06] ${
                                      anySelected ? "bg-[#D4AF37]/[0.06]" : "bg-zinc-950/30"
                                    }`}>
                                      <div className="flex items-center gap-2">
                                        <Crown size={12} className="text-[#D4AF37] shrink-0" fill="currentColor" />
                                        <p className="text-sm font-bold text-zinc-100 leading-tight">Seat Removal — Deep Clean</p>
                                        <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[8px] font-black uppercase tracking-widest shrink-0">
                                          Premium
                                        </span>
                                      </div>
                                      {anySelected && (
                                        <p className="text-[10px] text-zinc-500 leading-snug mt-1">
                                          Seats physically removed for under-rail extraction. Pick per-section or bundle.
                                        </p>
                                      )}
                                    </div>

                                    {/* Per-section options — grid like ceramic package.
                                        Disabled when a bundle is active (mutual exclusivity). */}
                                    {(() => {
                                      const bundleActive = selectedAddons.some(a => a.id === "seat_removal_all_2row" || a.id === "seat_removal_all_3row");
                                      return (
                                    <div className={`grid gap-2 p-2 bg-zinc-950/40 ${sectionOpts.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
                                      {sectionOpts.map((opt) => {
                                        const isSelected = selectedAddons.some(a => a.id === opt.id);
                                        const price = getEffectiveAddonPrice(opt, vehicleSize as string, addonOverrides);
                                        return (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => toggleAddon(opt)}
                                            aria-pressed={isSelected}
                                            disabled={bundleActive}
                                            title={bundleActive ? "Included in the All Seats bundle" : undefined}
                                            className={`relative px-1.5 py-2.5 rounded-xl border-2 text-center transition-all active:scale-[0.97] ${
                                              bundleActive
                                                ? "bg-zinc-900/40 border-white/[0.05] opacity-40 cursor-not-allowed"
                                                : isSelected
                                                  ? "bg-gradient-to-b from-[#D4AF37]/30 to-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)] -translate-y-0.5"
                                                  : "bg-zinc-900/60 border-white/10 hover:border-[#D4AF37]/50 hover:bg-zinc-900"
                                            }`}
                                          >
                                            <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                              bundleActive
                                                ? "bg-zinc-800/60 border border-zinc-800"
                                                : isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                                            }`}>
                                              {bundleActive
                                                ? <Check size={9} className="text-[#D4AF37]/60" strokeWidth={3} />
                                                : isSelected
                                                  ? <Check size={9} className="text-black" strokeWidth={3} />
                                                  : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
                                            </div>
                                            <div className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                                              bundleActive ? "text-zinc-500" : isSelected ? "text-[#D4AF37]" : "text-zinc-200"
                                            }`}>
                                              {SHORT_LABEL[opt.id] ?? opt.label}
                                            </div>
                                            <div className={`text-sm font-black mt-1 tabular-nums ${
                                              bundleActive ? "text-zinc-600 line-through" : isSelected ? "text-white" : "text-[#D4AF37]"
                                            }`}>
                                              +${price}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                      );
                                    })()}

                                    {/* Bundle row — full-width, save badge */}
                                    {bundleOpts.length > 0 && (
                                      <div className="px-2 pb-2 bg-zinc-950/40">
                                        <div className={`flex items-center gap-1.5 mb-1.5 ${bundleOpts.length === 1 ? "justify-center" : ""}`}>
                                          <div className="flex-1 h-px bg-white/[0.05]" />
                                          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
                                            {bundleOpts.length === 2 ? "Or Bundle & Save" : "Best Value Bundle"}
                                          </span>
                                          <div className="flex-1 h-px bg-white/[0.05]" />
                                        </div>
                                        <div className={`grid gap-2 ${bundleOpts.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                                          {bundleOpts.map((opt) => {
                                            const isSelected = selectedAddons.some(a => a.id === opt.id);
                                            const price = getEffectiveAddonPrice(opt, vehicleSize as string, addonOverrides);
                                            const savings = SEAT_SAVINGS[opt.id];
                                            const isThree = opt.id === "seat_removal_all_3row";
                                            return (
                                              <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => toggleAddon(opt)}
                                                aria-pressed={isSelected}
                                                className={`relative px-3 py-2 rounded-xl border-2 transition-all active:scale-[0.97] flex items-center justify-between gap-2 ${
                                                  isSelected
                                                    ? "bg-gradient-to-b from-[#D4AF37]/30 to-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                                                    : "bg-gradient-to-b from-[#D4AF37]/[0.08] to-zinc-950/40 border-[#D4AF37]/40 hover:border-[#D4AF37]/70"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                                    isSelected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-[#D4AF37]/40"
                                                  }`}>
                                                    {isSelected ? <Check size={9} className="text-black" strokeWidth={3} /> : <Plus size={8} className="text-[#D4AF37]" strokeWidth={3} />}
                                                  </div>
                                                  <div className="text-left">
                                                    <div className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? "text-[#D4AF37]" : "text-[#F3E5AB]"}`}>
                                                      All Seats · {isThree ? "3-Row" : "2-Row"}
                                                    </div>
                                                    <div className="text-[9px] text-emerald-400 font-bold tabular-nums">Save ${savings}</div>
                                                  </div>
                                                </div>
                                                <div className={`shrink-0 text-base font-black tabular-nums ${isSelected ? "text-white" : "text-[#D4AF37]"}`}>
                                                  +${price}
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Footer note — only when both bundles shown (unknown size) */}
                                    {!is2Row && !is3Row && (
                                      <div className="px-3 py-1.5 border-t border-white/[0.05] bg-zinc-950/30">
                                        <p className="text-[10px] text-zinc-500 text-center">
                                          Select your vehicle size above so we can hide the option that doesn&apos;t fit.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

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

                              {/* Window coatings now live inside the 2-Year Ceramic Package
                                  card below — the windshield-only / front-3 tiers were
                                  removed per owner request; only "all-glass" remains as the
                                  Windows ceramic option. */}

                              {/* ── 2-Year Ceramic Package — multi-pick with tiered discount ── */}
                              {ceramicOpts.length > 0 && (() => {
                                const sizeKey = (vehicleSize as string) || "sedan";
                                const ceramicCount = ceramicOpts.filter(o => selectedAddons.some(a => a.id === o.id)).length;
                                const nextPct = ceramicPackagePct(ceramicCount + 1);
                                return (
                                  <div className={`relative rounded-2xl border overflow-hidden transition-all ${
                                    ceramicCount > 0
                                      ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/[0.08] via-zinc-950/40 to-zinc-950/40 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                                      : "border-[#D4AF37]/30 bg-gradient-to-br from-cyan-500/[0.02] via-zinc-900/40 to-zinc-900/40 hover:border-cyan-400/50"
                                  }`}>
                                    {/* Header + tier ladder — tightened: description prose
                                        only renders when at least one ceramic is picked, and
                                        the tier ladder only renders when something IS picked
                                        (it shows the "next tier to unlock" hint instead at
                                        idle, which is what customers actually need). */}
                                    <div className={`px-4 pt-2.5 pb-2.5 border-b border-white/[0.06] ${
                                      ceramicCount > 0 ? "bg-cyan-500/[0.05]" : "bg-zinc-950/30"
                                    }`}>
                                      <div className="flex items-center gap-2">
                                        <Sparkles size={12} className="text-cyan-400 shrink-0" />
                                        <p className="text-sm font-bold text-zinc-100 leading-tight">5-Year Gentech Graphene Coating</p>
                                        <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[8px] font-black uppercase tracking-widest shrink-0">
                                          Premium
                                        </span>
                                      </div>
                                      {ceramicCount > 0 && (
                                        <>
                                          <p className="text-[10px] text-zinc-500 leading-snug mt-1 mb-2">
                                            Graphene-infused — 5-year hydrophobic protection. Mix &amp; match Body, Wheels, Windows.
                                          </p>
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                            {[1, 2, 3].map(tier => {
                                              const reached = ceramicCount >= tier;
                                              const tierPct = Math.round(ceramicPackagePct(tier) * 100);
                                              return (
                                                <div key={tier} className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-md border transition-all ${
                                                  reached
                                                    ? tierPct === 0
                                                      ? "border-zinc-500/40 bg-zinc-500/[0.08] text-zinc-400"
                                                      : "border-cyan-400/60 bg-cyan-500/[0.12] text-cyan-300"
                                                    : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
                                                }`}>
                                                  {reached && <Check size={9} strokeWidth={3} />}
                                                  {tier} pick{tier > 1 ? "s" : ""} = {tierPct}% off
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* 3 multi-pick sub-buttons */}
                                    <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-950/40">
                                      {ceramicOpts.map(opt => {
                                        const isSelected = selectedAddons.some(a => a.id === opt.id);
                                        const shortLabel = opt.id === "ceramic_3yr" ? "Body"
                                          : opt.id === "wheel_ceramic" ? "Wheels"
                                          : "Windows";
                                        const subLabel = opt.id === "ceramic_3yr" ? "Paint coating"
                                          : opt.id === "wheel_ceramic" ? "Wheels + calipers"
                                          : "All glass";
                                        const price = getEffectiveAddonPrice(opt, sizeKey, addonOverrides);
                                        return (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => toggleAddon(opt)}
                                            className={`relative px-2 py-3 rounded-xl border-2 text-center transition-all active:scale-[0.97] ${
                                              isSelected
                                                ? "bg-gradient-to-b from-cyan-500/30 to-cyan-500/10 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)] -translate-y-0.5"
                                                : "bg-zinc-900/60 border-white/10 hover:border-cyan-400/50 hover:bg-zinc-900"
                                            }`}
                                            aria-pressed={isSelected}
                                          >
                                            <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                              isSelected ? "bg-cyan-400" : "bg-zinc-800 border border-zinc-700"
                                            }`}>
                                              {isSelected ? <Check size={9} className="text-black" strokeWidth={3} /> : <Plus size={8} className="text-zinc-500" strokeWidth={3} />}
                                            </div>
                                            <div className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isSelected ? "text-cyan-300" : "text-zinc-200"}`}>
                                              {shortLabel}
                                            </div>
                                            <div className={`text-[9px] font-medium mt-0.5 ${isSelected ? "text-cyan-300/80" : "text-zinc-500"}`}>
                                              {subLabel}
                                            </div>
                                            {(() => {
                                              // Only show ceramic strikethrough when this tile
                                              // is selected AND the package tier ladder has
                                              // unlocked a real discount on it. Unselected
                                              // tiles always render at full price so customers
                                              // aren't confused by phantom discounts on items
                                              // they haven't picked yet.
                                              const discountedPrice = ceramicPct > 0 ? Math.round(price * (1 - ceramicPct)) : price;
                                              const isDiscounted = isSelected && ceramicPct > 0 && discountedPrice < price;
                                              return (
                                                <div className="mt-1.5 tabular-nums">
                                                  {isDiscounted && (
                                                    <div className="text-[10px] font-bold text-zinc-500 line-through leading-none">${price}</div>
                                                  )}
                                                  <div className={`text-sm font-black leading-none mt-0.5 ${
                                                    isDiscounted ? "text-emerald-300" : isSelected ? "text-white" : "text-[#D4AF37]"
                                                  }`}>
                                                    ${isDiscounted ? discountedPrice : price}
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Live discount strip */}
                                    {ceramicCount > 0 ? (
                                      <div className="px-4 py-2.5 border-t border-white/[0.06] bg-cyan-500/[0.04] flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-cyan-300">
                                          {ceramicCount}/3 picked · {Math.round(ceramicPct * 100)}% off ceramic
                                        </span>
                                        <span className="text-[11px] font-black tabular-nums text-white">
                                          <span className="text-zinc-500 line-through mr-1">${ceramicSubtotalRaw}</span>
                                          ${ceramicSubtotalRaw - ceramicSavings}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="px-4 py-2 border-t border-white/[0.06] bg-cyan-500/[0.02]">
                                        <p className="text-[10px] text-zinc-500 text-center">
                                          Pick <span className="text-cyan-300 font-bold">2</span> for <span className="text-cyan-300 font-bold">15% off</span> · pick all <span className="text-cyan-300 font-bold">3</span> for <span className="text-cyan-300 font-bold">25% off</span>
                                        </p>
                                      </div>
                                    )}
                                    {ceramicCount > 0 && ceramicCount < 3 && nextPct > ceramicPct && (
                                      <div className="px-4 py-1.5 border-t border-white/[0.04] bg-zinc-950/40">
                                        <p className="text-[10px] text-zinc-500 text-center">
                                          Add 1 more → <span className="text-cyan-300 font-bold">{Math.round(nextPct * 100)}% off</span> instead of {Math.round(ceramicPct * 100)}%
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
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

                              {/* Price row + CTA — apples-to-apples: only count add-ons
                                  that become FREE on Ultimate. Premium ones (engine bay,
                                  headlight, seat removal, ceramic) survive the upgrade
                                  and shouldn't be in the strikethrough. */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const includedCost = selectedAddons
                                      .filter(a => INCLUDED_IN_ULTIMATE_IDS.includes(a.id))
                                      .reduce((sum, a) => sum + a.price, 0);
                                    const comparisonPrice = servicePrice + includedCost;
                                    return (
                                      <span className="text-xs text-zinc-600 line-through">
                                        ${Math.round(comparisonPrice)}
                                      </span>
                                    );
                                  })()}
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
                                      <span className="text-xs text-zinc-300 font-semibold tabular-nums">
                                        ${avBasePrice}
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
                                                          ${price}
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
                                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Ultimate Series</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                  {ultSvcs.map(svc => {
                                                    const selected = av.serviceId === svc.id;
                                                    // Ultimate is now size-tiered. If the additional vehicle already
                                                    // has a size from auto-detect, use it; otherwise default to compact
                                                    // (smallest price — customer can adjust if needed).
                                                    const avSize = (av.vehicleSize || "sedan") as VehicleSizeSlug;
                                                    const price = getPriceForSize(svc, avSize);
                                                    return (
                                                      <button
                                                        key={svc.id}
                                                        type="button"
                                                        onClick={() => updateAdditionalVehicle(idx, { serviceId: svc.id, serviceName: svc.name, servicePrice: price, selectedAddons: [], vehicleSize: avSize })}
                                                        className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                                                          selected
                                                            ? "bg-[#D4AF37]/15 border-[#D4AF37]/60"
                                                            : "border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] hover:border-[#D4AF37]/40"
                                                        }`}
                                                      >
                                                        <div className="min-w-0">
                                                          <span className={`text-sm font-semibold ${selected ? "text-[#D4AF37]" : "text-zinc-200"}`}>{svc.name}</span>
                                                          <p className="text-[10px] text-zinc-500 mt-0.5">Deep clean — from ${svc.price_small}</p>
                                                        </div>
                                                        <div className="shrink-0 flex flex-col items-end gap-0.5 ml-2">
                                                          <span className={`text-sm font-black tabular-nums ${selected ? "text-white" : "text-[#D4AF37]"}`}>
                                                            ${price}
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
                                        {avAddons.filter(a => !FLOOR_ADDON_IDS.includes(a.id) && !WINDOW_COATING_ADDON_IDS.includes(a.id)).map(addon => {
                                          const sel = av.selectedAddons.some(a => a.id === addon.id);
                                          return (
                                            <button
                                              key={addon.id}
                                              type="button"
                                              onClick={() => toggleAdditionalAddon(idx, { id: addon.id, label: addon.label, price: getEffectiveAddonPrice(addon, av.vehicleSize, addonOverrides) })}
                                              className={`w-full flex flex-col items-center px-3 py-2.5 rounded-xl border text-center transition-all ${
                                                sel
                                                  ? "bg-[#D4AF37]/10 border-[#D4AF37]/50"
                                                  : "border-white/[0.06] hover:border-white/15"
                                              }`}
                                            >
                                              <span className={`text-xs font-semibold ${sel ? "text-[#D4AF37]" : "text-zinc-300"}`}>{addon.label}</span>
                                              <span className={`text-xs font-black ${sel ? "text-white" : "text-[#D4AF37]"}`}>+${getEffectiveAddonPrice(addon, av.vehicleSize, addonOverrides)}</span>
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
                          <p className="text-sm font-semibold text-zinc-300">
                            {isWholeDayReservation ? "This day can't host a whole-day reservation" : "No openings on this day"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {isWholeDayReservation
                              ? "Your build is 8+ hours so we lock the entire day. Pick a day with no other appointments and at least 8 hours of operating time."
                              : "This date is fully booked. Tap one of the “Next Available” days above for instant booking."}
                          </p>
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
                      ) : isWholeDayReservation ? (
                        <button
                          type="button"
                          onClick={() => setSelectedTime(displaySlots[0].time)}
                          className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                            selectedTime === displaySlots[0].time
                              ? "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                              : "border-[#D4AF37]/30 bg-zinc-900/40 hover:border-[#D4AF37]/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-0.5">
                                Whole Day · Reserved
                              </p>
                              <p className="text-base font-black text-white">Starts at {displaySlots[0].time} <span className="text-zinc-500 font-bold text-xs">({displaySlots[0].period})</span></p>
                              <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                                Your build runs 8+ hours, so this day is yours alone — no other appointments will be booked.
                              </p>
                            </div>
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              selectedTime === displaySlots[0].time
                                ? "bg-[#D4AF37] text-black"
                                : "bg-zinc-800 border border-zinc-700"
                            }`}>
                              {selectedTime === displaySlots[0].time ? <Check size={13} strokeWidth={3} /> : <Plus size={12} className="text-zinc-500" />}
                            </span>
                          </div>
                        </button>
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
                      <a href="mailto:contact@ariseandshinedetailing.com" className="font-semibold text-white hover:text-zinc-200 transition-colors">
                        contact@ariseandshinedetailing.com
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
                          {additionalVehicles.filter(av => av.serviceId).map((av, i) => (
                            <div key={i}>
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0">
                                <span className="text-zinc-400">
                                  {av.vehicleYear} {av.vehicleMake} {av.vehicleModel} — {av.serviceName}
                                </span>
                                <span className="font-semibold text-white">${av.servicePrice.toFixed(2)}</span>
                              </div>
                              {av.selectedAddons.map(a => (
                                <div key={a.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center min-w-0 pl-2">
                                  <span className="text-zinc-400 text-xs">{a.label}</span>
                                  <span className="font-semibold text-white text-xs">${a.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                          {multiVehicleDiscount > 0 && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                              <span className="flex items-center gap-1.5">
                                🚗 Multi-vehicle discount
                                <span className="text-[10px] text-emerald-500/70">
                                  ({totalVehicleCount} vehicles)
                                </span>
                              </span>
                              <span>−${multiVehicleDiscount.toFixed(2)}</span>
                            </div>
                          )}
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
                          {crossSellDiscount > 0 && crossSellCoupon && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                              <span className="flex items-center gap-1.5">
                                🤝 Exterior Site Coupon
                                <span className="text-[10px] text-emerald-500/70 font-mono">
                                  {crossSellCoupon.code} · {crossSellCoupon.discountPct}%
                                </span>
                              </span>
                              <span className="font-semibold">−${crossSellDiscount.toFixed(2)}</span>
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
                          {activeMembership && (
                            <div className={`mt-2 rounded-xl border px-3 py-2.5 transition-colors ${
                              hasMembershipBalance
                                ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.04]"
                                : "border-white/[0.06] bg-zinc-900/30 opacity-70"
                            }`}>
                              <label className={`flex items-start gap-2.5 ${hasMembershipBalance ? "cursor-pointer" : "cursor-not-allowed"}`}>
                                <input
                                  type="checkbox"
                                  className="mt-0.5 w-4 h-4 accent-[#D4AF37] cursor-pointer disabled:cursor-not-allowed"
                                  checked={applyMembershipCredit && hasMembershipBalance}
                                  disabled={!hasMembershipBalance}
                                  onChange={(e) => setApplyMembershipCredit(e.target.checked)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className={`text-xs font-bold inline-flex items-center gap-1.5 ${hasMembershipBalance ? "text-[#D4AF37]" : "text-zinc-500"}`}>
                                      <Crown size={11} fill="currentColor" />
                                      {hasMembershipBalance ? "Apply membership credit" : "Membership credit used up"}
                                    </span>
                                    {membershipCreditApplied > 0 && (
                                      <span className="text-sm font-black text-[#D4AF37] tabular-nums">
                                        −${membershipCreditApplied.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">
                                    {hasMembershipBalance
                                      ? `Available: ${formatCentsCompact(activeMembership.credit_balance_cents)} of ${formatCentsCompact(activeMembership.credit_total_cents)}`
                                      : `0 remaining of ${formatCentsCompact(activeMembership.credit_total_cents)} — renews when membership is repurchased`}
                                  </p>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                        {showDualPrice && computedPrice !== null ? (
                          <div className="pt-4 mt-3 border-t border-[#2a2a2a]">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="font-bold text-zinc-300">Total</span>
                              <div className="flex flex-col items-end">
                                {/* Card price displayed as the main rate */}
                                <span className="text-2xl font-black text-white tabular-nums leading-none">
                                  ${totalAfterDiscount.toFixed(2)}
                                  <span className="text-[10px] font-bold text-zinc-500 ml-1.5 uppercase tracking-wider">card</span>
                                </span>
                                {/* Cash price emphasized as the savings offer */}
                                <span className="text-xs font-bold tabular-nums mt-1 text-[#D4AF37]">
                                  ${cashTotal.toFixed(2)} <span className="text-[9px] uppercase tracking-wider text-[#D4AF37]/80">cash · save ${(totalAfterDiscount - cashTotal).toFixed(0)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
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
                        )}
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
                                // Pass the raw value straight to formatPhoneNumber —
                                // it handles stripping non-digits, the leading "1"
                                // country code (autofill quirk), and slicing to 10.
                                // Pre-slicing to 10 here would chop off the last
                                // digit of an 11-digit autofill like "18025859179".
                                setPhone(formatPhoneNumber(e.target.value));
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

                      {/* Pay at Arrival — primary CTA (lower friction for first-time customers) */}
                      <button
                        onClick={handlePayAtArrival}
                        disabled={!canConfirm() || isSubmitting || isStripeLoading}
                        className={`w-full min-h-[50px] rounded-xl p-4 flex items-center justify-between text-left transition-all duration-300 active:scale-[0.99] group ${
                          isSubmitting
                            ? "bg-zinc-900/90 border border-[#D4AF37] btn-loading text-zinc-950"
                            : canConfirm() && !isStripeLoading
                              ? "bg-[#d4af37] text-zinc-950 hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] btn-pay-now-shimmer"
                              : "bg-zinc-900/50 border border-white/10 text-zinc-500 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 relative z-[1]">
                          <div className="w-10 h-10 rounded-lg bg-black/20 border border-black/20 flex items-center justify-center shrink-0">
                            <HandCoins className="w-5 h-5 text-zinc-950" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-inherit">
                              {isSubmitting
                                ? "Processing…"
                                : isSubscription
                                  ? "Subscribe & Pay at Arrival"
                                  : showDualPrice
                                    ? `Book — Pay $${totalAfterDiscount.toFixed(2)} on Arrival`
                                    : `Book — Pay $${totalAfterDiscount.toFixed(2)} on Arrival`}
                            </div>
                            <div className="text-xs text-zinc-800 mt-1">
                              {showDualPrice && !isSubmitting
                                ? <>Cash or card on the day · <span className="font-bold">or pay ${cashTotal.toFixed(2)} cash · save ${(totalAfterDiscount - cashTotal).toFixed(0)}</span></>
                                : "Cash or card on the day · We'll confirm via text"}
                            </div>
                          </div>
                        </div>
                        {!isSubmitting && (
                          <ChevronRight className="w-5 h-5 shrink-0 opacity-80 relative z-[1]" />
                        )}
                      </button>

                      {/* Pay Now — secondary outlined option (instant lock-in for those who prefer) */}
                      <button
                        onClick={handlePayNow}
                        disabled={!canConfirm() || isSubmitting || isStripeLoading}
                        className={`w-full min-h-[50px] rounded-xl p-4 flex items-center justify-between text-left transition-all duration-500 ease-in-out active:scale-[0.99] ${
                          isStripeLoading
                            ? "bg-zinc-950/50 border border-white/10 btn-loading"
                            : canConfirm() && !isSubmitting
                              ? "bg-transparent border border-[#d4af37]/50 text-[#d4af37] font-medium tracking-wide hover:bg-[#d4af37]/10 hover:border-[#d4af37] hover:-translate-y-0.5 btn-pay-arrival-shimmer"
                              : "bg-zinc-950/30 border border-white/5 text-zinc-500 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 relative z-[1]">
                          <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5 text-[#d4af37]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-medium text-inherit tracking-wide">
                              {isStripeLoading ? "Processing…" : isSubscription ? `Subscribe via Stripe — $${totalAfterDiscount.toFixed(2)}` : `Or pay now with card — $${totalAfterDiscount.toFixed(2)}`}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              Secure Stripe checkout · Instant confirmation
                            </div>
                          </div>
                        </div>
                        {!isStripeLoading && (
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
                <div className="sticky bottom-0 z-10 px-4 sm:px-6 pt-4 pb-4 sm:pb-6 border-t border-zinc-800/50 flex items-center justify-between gap-2 shrink-0 bg-inherit">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => {
                        // Cancel clears any in-flight draft so reopening the
                        // modal starts fresh instead of auto-restoring the
                        // booking the customer just abandoned.
                        if (step === 1) {
                          discardDraftAndReset();
                          onClose();
                        } else {
                          handleBack();
                        }
                      }}
                      className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors py-2 min-h-[44px] sm:min-h-0"
                    >
                      <ChevronLeft size={15} />
                      {step === 1 ? "Cancel" : "Back"}
                    </button>
                    {step === 1 && selectedService && onClearService && (
                      <button
                        type="button"
                        onClick={() => {
                          discardDraftAndReset();
                          onClearService();
                        }}
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.1] active:scale-[0.97] transition-all"
                      >
                        Change Service
                      </button>
                    )}
                  </div>
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
