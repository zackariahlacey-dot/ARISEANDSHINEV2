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
  Wrench,
  Sofa,
  Snowflake,
  Palette,
  Wind,
  PawPrint,
  Sun,
  Shield,
  Droplets,
  Info,
  ChevronDown,
  XCircle,
  Wand2,
} from "lucide-react";
import { LightDetailingPicker } from "@/components/booking/LightDetailingPicker";
import { LIGHT_DETAIL_ITEMS, computeLightDetailPrice, LIGHT_DETAIL_MIN_ITEMS } from "@/lib/lightDetailItems";
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
import { trackFbPurchase } from "@/lib/analytics/metaPixel";
import { getServiceDisplayName } from "@/lib/serviceDisplay";
import { BuildForMeQuiz } from "./BuildForMeQuiz";
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
  // ── Vehicle / Standard (the 8 basics, July 2026) ─────────────────────────
  { id: "engine_bay",        label: "Engine Bay Detail",                    price: 65,  desc: "Deep degrease, dressing, and plastic care. Customers love the \"open the hood and it looks new\" moment. Skipped on vehicles with sensitive electronics by your request." },
  { id: "headlight_restore",   label: "Headlight Restoration (pair)",        price: 75,  desc: "Sand, polish, and UV-seal cloudy or yellowed lenses to like-new clarity. Visible result, lasts 2+ years. Pair pricing." },
  { id: "odor_bomb",           label: "Strong Odor Elimination",             price: 75,  desc: "Heavy-duty neutralizer bombs combat embedded smoke, food & pet odors throughout the cabin." },
  { id: "upholstery_shampoo",  label: "Carpet & Upholstery Shampoo",        price: 95,  desc: "Deep steam shampoo of all seats, upholstery panels, and floorboards — removes stains, grime & odor at the source. ⚠️ Highly recommended when carpets or seats are heavily soiled or stained — a standard interior clean alone will NOT lift set-in dirt or discoloration without this." },
  { id: "uv_interior",         label: "UV Protection & Interior Restoration", price: 35, desc: "UV-protective coating applied to all interior plastics, vinyl, and trim — prevents fading, cracking, and sun damage while restoring a rich, factory finish." },
  { id: "leather_condition",   label: "Leather Conditioning",                 price: 40, desc: "Deep-clean and condition all leather surfaces with premium conditioner — restores softness, prevents cracking, and leaves a clean matte finish." },
  { id: "floor_1",           label: "Floorboard Shampoo – 1 Section",       price: 30,  desc: "Deep shampoo for one section of floorboards" },
  { id: "floor_2",           label: "Floorboard Shampoo – 2 Sections",      price: 45,  desc: "Deep shampoo for two sections of floorboards" },
  { id: "floor_all",         label: "Floorboard Shampoo – All Sections",     price: 60,  desc: "Full deep shampoo for all floorboard sections" },
  { id: "clay_bar",          label: "Clay Bar Treatment",                    price: 50,  desc: "Smooths paint by lifting embedded contaminants. Great prep before any ceramic sealant." },
  { id: "pet_hair",          label: "Heavy Pet Hair Removal",                 price: 50,  desc: "Beyond standard vacuum: pumice + electrostatic extraction lifts embedded pet hair from seats, carpets, and cargo area. Charged only when heavy accumulation is present (we'll confirm on inspection)." },
  { id: "tar_bug",           label: "Tar, Bug & Sap Removal",               price: 35,  desc: "Safely dissolve and remove road tar, bug splatter & tree sap before the detail wash." },
  // ── Build Your Package add-ons (new) ─────────────────────────────────────
  { id: "headliner_clean",     label: "Headliner Cleaning",                   price: 40,  desc: "Gentle dry-foam cleaning of the fabric headliner — lifts stains, smoke residue and dust without saturating the adhesive." },
  { id: "salt_stain_removal",  label: "Mild–Medium Salt Removal",             price: 65,  desc: "Vermont winter survival for light-to-moderate staining: enzymatic neutralizer, hot water extraction, and a salt-repellent sealing pass on affected carpets and door sills. Does NOT cover heavy caked-on salt piles or deep-set winter buildup — those are handled in the Ultimate Interior Reset." },
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
  // ── Ultimate Series (premium upgrades — high-ticket) ─────────────────────
  { id: "polish_ceramic",    label: "1-Step Polish + 2-Year Ceramic Coating", price: 350, desc: "Targets light swirls and oxidation with a 1-step machine polish, then protects the paint with a professional 2-year ceramic coat. Requires a full-day appointment." },
  { id: "ozone_treatment",   label: "Ozone Treatment",                       price: 60,  desc: "Professional-grade ozone treatment permanently neutralises smoke, pet odor & mildew at the source." },
  // ── July 2026 special add-ons ────────────────────────────────────────────
  { id: "ceramic_6_10_upgrade", label: "6–10 Month Ceramic Spray Upgrade",   price: 45,  desc: "Upgrade the INCLUDED 1–3 month ceramic spray to a 6–10 month professional sealant. Discounted to $30 when Ultimate + Exterior is toggled." },
  { id: "ultimate_ext_addon",   label: "+ Exterior Detail (Ultimate bundle)", price: 65, desc: "Add a full Exterior Detail to your Ultimate Interior Reset. Saves ~$55 vs. buying separately AND unlocks 20% off all other add-ons. Sedan $65 / SUV $80 / 3-row $95." },
  // ── Premium Ceramic — section-by-section (own volume tier: 5/10/15/20%) ──
  { id: "premium_ceramic_hood",           label: "Premium Ceramic — Hood",              price: 85,  desc: "Premium 2-year ceramic coating bonded to the hood." },
  { id: "premium_ceramic_roof",           label: "Premium Ceramic — Roof",              price: 75,  desc: "Premium 2-year ceramic coating on the roof." },
  { id: "premium_ceramic_trunk",          label: "Premium Ceramic — Trunk / Rear Hatch", price: 60, desc: "Premium 2-year ceramic on the trunk lid or rear hatch." },
  { id: "premium_ceramic_front_bumper",   label: "Premium Ceramic — Front Bumper",      price: 65,  desc: "Premium 2-year ceramic on the front bumper." },
  { id: "premium_ceramic_rear_bumper",    label: "Premium Ceramic — Rear Bumper",       price: 65,  desc: "Premium 2-year ceramic on the rear bumper." },
  { id: "premium_ceramic_doors",          label: "Premium Ceramic — All Doors",         price: 110, desc: "Premium 2-year ceramic on all 4 doors." },
  { id: "premium_ceramic_fenders",        label: "Premium Ceramic — All Fenders",       price: 75,  desc: "Premium 2-year ceramic on all fenders." },
  { id: "premium_ceramic_mirrors",        label: "Premium Ceramic — Mirrors (pair)",    price: 30,  desc: "Premium 2-year ceramic on both mirror housings." },
  { id: "premium_ceramic_wheels",         label: "Premium Ceramic — Wheels + Calipers", price: 150, desc: "Premium 2-year ceramic on all 4 wheels + brake calipers." },
  { id: "premium_ceramic_windshield",     label: "Premium Ceramic — Windshield",        price: 95,  desc: "Premium 2-year ceramic on the windshield." },
  { id: "premium_ceramic_side_rear_glass", label: "Premium Ceramic — Side + Rear Glass", price: 175, desc: "Premium 2-year ceramic on all side + rear glass (not windshield)." },
  { id: "premium_ceramic_full_glass",     label: "Premium Ceramic — Full Glass (all)",  price: 250, desc: "Premium 2-year ceramic on every piece of glass on the vehicle." },
  { id: "premium_ceramic_full_body",      label: "Premium Ceramic — Full Body Bundle",  price: 650, desc: "Best value — every body panel coated. Sedan $650 / SUV $775 / 3-row $895." },
  // ── Top-tier: 5-Year Gentech Graphene Ceramic (mobile application-only pricing) ──
  // Note: This is APPLICATION ONLY on already-prepped paint. No paint correction
  // (shops charge $1400+ because that includes correction). Prep runs in parallel
  // with the base service (Ultimate + Ext, Full Detail, etc.) so we only price
  // for coating labor + product allocation.
  { id: "gentech_5yr_body",           label: "5-Yr Gentech — Full Body",           price: 350, desc: "Graphene-infused 5-year ceramic on every body panel. Sedan $350 / SUV $425 / 3-row $500." },
  { id: "gentech_5yr_wheels",         label: "5-Yr Gentech — Wheels + Calipers",   price: 125, desc: "5-year graphene ceramic bonded to all 4 wheels + brake calipers. Brake dust wipes off, road grime can't grip." },
  { id: "gentech_5yr_windshield",     label: "5-Yr Gentech — Windshield Only",     price: 50, desc: "Hydrophobic 5-year graphene ceramic on the windshield. Rain beads at speed." },
  { id: "gentech_5yr_windows_front",  label: "5-Yr Gentech — Windshield + Front 3", price: 85, desc: "Windshield plus both front side windows. Full driver-zone visibility." },
  { id: "gentech_5yr_windows_all",    label: "5-Yr Gentech — All Windows",         price: 145, desc: "Every piece of glass on the vehicle." },
  { id: "gentech_5yr_full",           label: "5-Yr Gentech — Full Package (Body + Wheels + All Glass)",  price: 525, desc: "Flagship graphene package — body, wheels + calipers, all glass. Sedan $525 / SUV $650 / 3-row $775. Best value bundle." },
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
/** Premium Ceramic section-by-section add-ons (own volume tier: 5/10/15/20%). */
const PREMIUM_CERAMIC_SECTION_IDS = [
  "premium_ceramic_hood", "premium_ceramic_roof", "premium_ceramic_trunk",
  "premium_ceramic_front_bumper", "premium_ceramic_rear_bumper", "premium_ceramic_doors",
  "premium_ceramic_fenders", "premium_ceramic_mirrors", "premium_ceramic_wheels",
  "premium_ceramic_windshield", "premium_ceramic_side_rear_glass", "premium_ceramic_full_glass",
] as const;
const isPremiumCeramicSection = (id: string): boolean =>
  (PREMIUM_CERAMIC_SECTION_IDS as readonly string[]).includes(id);
/** Ultimate Interior Reset — the 8 basics visible on the Ultimate flow.
 *  Shampoo, Leather, Pet Hair are INCLUDED so they don't surface as add-ons here. */
const ULTIMATE_ADDON_IDS = [
  "engine_bay", "salt_stain_removal", "ozone_treatment",
  "clay_bar", "headlight_restore",
  "ceramic_6_10_upgrade",  // ceramic spray upgrade
  "ultimate_ext_addon",     // the special "+ Exterior Detail" toggle
];
/** The 8 basics for Interior, Exterior, and Full Detail (July 2026 lineup). */
const STANDARD_ADDON_IDS = [
  "engine_bay", "upholstery_shampoo", "salt_stain_removal", "leather_condition",
  "ozone_treatment", "clay_bar", "pet_hair", "headlight_restore",
  "ceramic_6_10_upgrade",  // ceramic spray upgrade available on all base packages
];
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
/** Add-ons functionally INCLUDED in Ultimate Interior Reset (July 2026 scope).
 *  Selecting these on a base package triggers the upgrade nudge to Ultimate. */
const INCLUDED_IN_ULTIMATE_IDS = ["upholstery_shampoo", "leather_condition", "pet_hair", "salt_stain_removal", "clay_bar"];

/** Add-ons baked into each Refresh / Reset tier — used to flag them as
 *  "Included" in the add-on picker so customers see they're already getting
 *  them (and can't accidentally double-charge). Keyed by DB name. */
const INCLUDED_ADDONS_BY_SERVICE: Record<string, readonly string[]> = {
  // Refresh tier — top popular add-ons per foundation.
  // (July 2026 v2 reprice: salt dropped from Refresh Interior; headlight
  // dropped from Refresh Full — both are now à-la-carte add-ons only.)
  "The Refresh — Interior": ["upholstery_shampoo", "pet_hair"],
  "The Refresh — Exterior": ["clay_bar", "headlight_restore", "engine_bay"],
  "The Refresh — Full":     ["upholstery_shampoo", "pet_hair", "clay_bar", "engine_bay"],
  // Reset tier — Ultimate Interior Reset kept under its DB name.
  "Ultimate Interior Reset": INCLUDED_IN_ULTIMATE_IDS,
  "The Reset — Full":        [...INCLUDED_IN_ULTIMATE_IDS, "headlight_restore", "engine_bay"],
};

/** Returns true if the given add-on id is already included in the selected
 *  service's package price (so it should render as "Included" in the picker,
 *  not as a paid add-on). */
function isAddonIncludedInService(serviceName: string | undefined, addonId: string): boolean {
  if (!serviceName) return false;
  const included = INCLUDED_ADDONS_BY_SERVICE[serviceName];
  return !!included && included.includes(addonId);
}
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
  mech_chem_decon:      30,  // Mechanical & Chemical Decon +30 min
  // Ceramic coatings — flash + cure adds significant time
  wheel_ceramic:        60,  // Wheel & Caliper Ceramic +1 hr
  window_coat_windshield: 60, // Window coatings (any tier) +1 hr
  window_coat_front:    60,
  window_coat_all:      60,
  // Body ceramic (ceramic_3yr) — uses size-tiered CERAMIC_3YR_DURATION_MINS
  // already mapped in getAddonExtraDurationMins (90/90/120/150).
  // July 2026 additions:
  ceramic_6_10_upgrade: 0,   // spray upgrade — no extra time
  // ultimate_ext_addon — size-tiered, mapped in getAddonExtraDurationMins below
  // Premium Ceramic sections — each adds application + flash time
  premium_ceramic_hood: 30,
  premium_ceramic_roof: 30,
  premium_ceramic_trunk: 20,
  premium_ceramic_front_bumper: 25,
  premium_ceramic_rear_bumper: 25,
  premium_ceramic_doors: 60,
  premium_ceramic_fenders: 30,
  premium_ceramic_mirrors: 15,
  premium_ceramic_wheels: 60,
  premium_ceramic_windshield: 30,
  premium_ceramic_side_rear_glass: 45,
  premium_ceramic_full_glass: 60,
  // premium_ceramic_full_body — size-tiered, mapped in getAddonExtraDurationMins below
};

/** Ultimate + Ext toggle — size-tiered duration. */
const ULTIMATE_EXT_ADDON_DURATION_MINS: Record<string, number> = {
  sedan: 60, suv: 75, xl: 90,
  medium: 60, large: 75, extra_large: 90,
};

/** Premium Ceramic — Full Body Bundle duration. Flat 1 hr (July 2026). */
const PREMIUM_CERAMIC_FULL_BODY_DURATION_MINS: Record<string, number> = {
  sedan: 60, suv: 60, xl: 60,
  medium: 60, large: 60, extra_large: 60,
};

/** 5-Year Gentech Ceramic — size-tiered section pricing. */
const GENTECH_5YR_FULL_PRICES: Record<string, number> = {
  sedan: 525, suv: 650, xl: 775,
  medium: 525, large: 650, extra_large: 775,
};
const GENTECH_5YR_BODY_PRICES: Record<string, number> = {
  sedan: 350, suv: 425, xl: 500,
  medium: 350, large: 425, extra_large: 500,
};
/** 5-Year Gentech application + flash times. */
const GENTECH_5YR_FULL_DURATION_MINS: Record<string, number> = {
  sedan: 180, suv: 210, xl: 240,
  medium: 180, large: 210, extra_large: 240,
};
const GENTECH_5YR_BODY_DURATION_MINS: Record<string, number> = {
  sedan: 120, suv: 150, xl: 180,
  medium: 120, large: 150, extra_large: 180,
};

/** Carpet & Upholstery Shampoo — July 2026: no booking time bump.
 *  Runs in parallel with other interior work. */
const UPHOLSTERY_SHAMPOO_DURATION_MINS: Record<string, number> = {
  sedan: 0, suv: 0, xl: 0,
  medium: 0, large: 0, extra_large: 0,
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
  // Shampoo is flat $95 across all sizes per July 2026 pricing decision —
  // no XL surcharge. Historical +$30 removed.
  // salt_stain_removal is a flat $65 in the July 2026 lineup (was size-tiered).
  if (addon.id === "polish_ceramic") return CERAMIC_PRICES[vehicleSize] ?? addon.price;
  if (addon.id === "ceramic_3yr")    return CERAMIC_3YR_PRICES[vehicleSize] ?? addon.price;
  if (addon.id === "window_coat_windshield") return WINDOW_COAT_WINDSHIELD_PRICE;
  if (addon.id === "window_coat_front")      return WINDOW_COAT_FRONT_PRICE;
  if (addon.id === "window_coat_all")        return WINDOW_COAT_ALL_PRICE;
  // Ultimate + Ext toggle — size-tiered.
  if (addon.id === "ultimate_ext_addon") {
    if (vehicleSize === "xl" || vehicleSize === "extra_large") return 95;
    if (vehicleSize === "suv" || vehicleSize === "large")      return 80;
    return 65;
  }
  // Premium Ceramic Full Body Bundle — size-tiered.
  if (addon.id === "premium_ceramic_full_body") {
    if (vehicleSize === "xl" || vehicleSize === "extra_large") return 895;
    if (vehicleSize === "suv" || vehicleSize === "large")      return 775;
    return 650;
  }
  // 5-Year Gentech Ceramic — size-tiered on body + full package.
  if (addon.id === "gentech_5yr_full") return GENTECH_5YR_FULL_PRICES[vehicleSize] ?? addon.price;
  if (addon.id === "gentech_5yr_body") return GENTECH_5YR_BODY_PRICES[vehicleSize] ?? addon.price;
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
    if (a.id === "ultimate_ext_addon") return sum + (ULTIMATE_EXT_ADDON_DURATION_MINS[vehicleSize] ?? 60);
    if (a.id === "premium_ceramic_full_body") return sum + (PREMIUM_CERAMIC_FULL_BODY_DURATION_MINS[vehicleSize] ?? 240);
    // Gentech application-only times per user spec (July 2026):
    // body = 1 hr, wheels + calipers = 30 min, any window tier = 30 min.
    if (a.id === "gentech_5yr_body")             return sum + 60;
    if (a.id === "gentech_5yr_wheels")           return sum + 30;
    if (a.id === "gentech_5yr_windshield")       return sum + 30;
    if (a.id === "gentech_5yr_windows_front")    return sum + 30;
    if (a.id === "gentech_5yr_windows_all")      return sum + 30;
    // Full Package = body (60) + wheels (30) + all windows (30) = 120 min.
    if (a.id === "gentech_5yr_full")             return sum + 120;
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
// Salt season gating retired July 2026 — Mild-Medium Salt Removal is
// year-round; the winter undercarriage add-on is retired. Any add-ons that
// should be season-restricted in the future can be filtered inside the
// per-service branches directly.

function getAddonsForService(serviceName: string, vehicleSize?: string): readonly AddonItem[] {
  const n = serviceName.toLowerCase();
  // Light Detailing has its own item picker on step 1 (LightDetailingPicker) —
  // it doesn't surface any regular add-ons. Items are converted into fake
  // addon rows on Continue so downstream code renders them as line items.
  if (n === "light detailing") return [];
  const isWorkVan = vehicleSize === "xl";
  const cargoIds = isWorkVan ? CARGO_ADDON_IDS : [];

  // ── Marine / Boat ────────────────────────────────────────────────────────
  if (n.includes("boat")) {
    return (ALL_ADD_ONS.filter(a => MARINE_ADDON_IDS.includes(a.id)));
  }

  // ── RV ───────────────────────────────────────────────────────────────────
  if (n.includes("rv") || n.includes("motorhome")) {
    return (ALL_ADD_ONS.filter(a => RV_ADDON_IDS.includes(a.id)));
  }

  // ── Heavy Equipment ─────────────────────────────────────────────────────
  // Flat-priced cab interiors get their own add-on tier — grime, biohazard,
  // operator-seat extraction, ozone, fabric protect. No car-detailing
  // add-ons surface in this flow.
  if (isHeavyEquipmentService(serviceName)) {
    return (ALL_ADD_ONS.filter(a => HE_ADDON_IDS.includes(a.id)));
  }

  // ── Semi Truck ───────────────────────────────────────────────────────────
  // Truck-specific exterior + interior tier. Sleeper services additionally
  // surface the sleeper-only add-ons (mattress, fridge). Day-cab services
  // skip those — keeps the picker uncluttered when irrelevant.
  if (isTruckService(serviceName)) {
    const sleeperExtras = isSleeperCabService(serviceName) ? TRUCK_SLEEPER_ADDON_IDS : [];
    const ids = [...TRUCK_ADDON_IDS, ...sleeperExtras];
    return (ALL_ADD_ONS.filter(a => ids.includes(a.id)));
  }

  // ── Vehicle services below — never include marine, RV, truck, or HE add-ons ──

  // ── JULY 2026 LINEUP — Passenger vehicle services ─────────────────────
  // Retired for the new lineup (never surface anywhere below):
  //  • seat_removal_* (built into Ultimate Interior Reset)
  //  • ceramic_3yr (5-Year Gentech Graphene)
  //  • wheel_ceramic, polish_ceramic (legacy)
  //  • window_coat_* (replaced by Premium Ceramic sections)
  //  • uv_interior, odor_bomb, headliner_clean, tar_bug, mech_chem_decon,
  //    salt_recovery_addon, floor_1/2/all, steam_sanitation, trim_dressing
  const RETIRED_IDS = new Set<string>([
    "seat_removal_driver", "seat_removal_passenger", "seat_removal_rear",
    "seat_removal_3rd_row", "seat_removal_all_2row", "seat_removal_all_3row",
    "ceramic_3yr", "wheel_ceramic", "polish_ceramic",
    "window_coat_windshield", "window_coat_front", "window_coat_all",
    "uv_interior", "odor_bomb", "headliner_clean", "tar_bug",
    "mech_chem_decon", "salt_recovery_addon", "floor_1", "floor_2", "floor_all",
    "steam_sanitation", "trim_dressing", "ultimate_interior",
  ]);
  const july2026Filter = (addons: readonly AddonItem[]): readonly AddonItem[] =>
    addons.filter(a => !RETIRED_IDS.has(a.id));

  // Paint correction: add Premium Ceramic sections + full-body bundle.
  if (isPaintCorrectionService(serviceName)) {
    const premiumCeramicIds = ALL_ADD_ONS.filter(a => a.id.startsWith("premium_ceramic_")).map(a => a.id);
    return july2026Filter((
      ALL_ADD_ONS.filter(a => [
        "engine_bay", "headlight_restore", "clay_bar",
        "ceramic_6_10_upgrade",
        ...premiumCeramicIds,
        "gentech_5yr_body", "gentech_5yr_wheels",
        "gentech_5yr_windshield", "gentech_5yr_windows_front", "gentech_5yr_windows_all",
        "gentech_5yr_full",
      ].includes(a.id))
    ));
  }

  // Ultimate Interior Reset (displays as "The Reset — Interior"). Ultimate_ext_addon
  // was retired when The Reset — Full became its own tier — customers wanting
  // interior + exterior now book Reset Full directly, so the +Ext toggle would
  // just be a redundant path to the same place.
  if (n.includes("ultimate") || n.includes("reset")) {
    return stripBakedIn(july2026Filter((
      ALL_ADD_ONS.filter(a => [
        "engine_bay", "headlight_restore", "clay_bar",
        "salt_stain_removal", "ozone_treatment",
        "ceramic_6_10_upgrade",
        "gentech_5yr_body", "gentech_5yr_wheels",
        "gentech_5yr_windshield", "gentech_5yr_windows_front", "gentech_5yr_windows_all",
        "gentech_5yr_full",
      ].includes(a.id))
    )), serviceName);
  }

  // Exterior Detail — the 8 basics on the exterior side + ceramic upgrade + Premium Ceramic.
  // Matches Basic Exterior AND The Refresh — Exterior; stripBakedIn removes
  // whatever's already baked into Refresh Exterior (clay bar, headlight, engine bay).
  if (n.includes("exterior") && !n.includes("full")) {
    const premiumCeramicIds = ALL_ADD_ONS.filter(a => a.id.startsWith("premium_ceramic_")).map(a => a.id);
    return stripBakedIn(july2026Filter((
      ALL_ADD_ONS.filter(a => [
        "engine_bay", "headlight_restore", "clay_bar",
        "ceramic_6_10_upgrade",
        ...premiumCeramicIds,
        "gentech_5yr_body", "gentech_5yr_wheels",
        "gentech_5yr_windshield", "gentech_5yr_windows_front", "gentech_5yr_windows_all",
        "gentech_5yr_full",
      ].includes(a.id))
    )), serviceName);
  }

  // Interior Detail — the 8 basics on the interior side. Matches Basic Interior
  // AND The Refresh — Interior; stripBakedIn removes shampoo/salt/pet-hair
  // when Refresh Interior is picked so they aren't offered as buyable add-ons.
  if (n.includes("interior") && !n.includes("full") && !n.includes("maintenance")) {
    return stripBakedIn(july2026Filter((
      ALL_ADD_ONS.filter(a => [
        "upholstery_shampoo", "salt_stain_removal", "leather_condition",
        "ozone_treatment", "pet_hair",
      ].includes(a.id))
    )), serviceName);
  }

  // Maintenance plans: engine bay only (quick recurring visits)
  if (n.includes("maintenance")) {
    return july2026Filter((ALL_ADD_ONS.filter(a => a.id === "engine_bay")));
  }

  // Full Detail — the full 8 basics + ceramic upgrade + Premium Ceramic.
  // Matches Basic Full, The Refresh — Full, and The Reset — Full; stripBakedIn
  // removes whatever's already included per package.
  const premiumCeramicIds = ALL_ADD_ONS.filter(a => a.id.startsWith("premium_ceramic_")).map(a => a.id);
  return stripBakedIn(july2026Filter((
    ALL_ADD_ONS.filter(a => [
      "engine_bay", "headlight_restore", "clay_bar",
      "upholstery_shampoo", "salt_stain_removal", "leather_condition",
      "ozone_treatment", "pet_hair",
      "ceramic_6_10_upgrade",
      ...premiumCeramicIds,
    ].includes(a.id))
  )), serviceName);
}

/** Removes add-ons that are already baked into the service's package price
 *  so they don't appear in the picker as buyable items. Keyed off
 *  INCLUDED_ADDONS_BY_SERVICE so it stays in sync with the "Included" flag
 *  the picker uses elsewhere. Safe no-op for services with no baked-in list. */
function stripBakedIn(list: readonly AddonItem[], serviceName: string): readonly AddonItem[] {
  const baked = INCLUDED_ADDONS_BY_SERVICE[serviceName];
  if (!baked || baked.length === 0) return list;
  return list.filter(a => !baked.includes(a.id));
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
  "Interior Detail":
    "A thorough professional interior clean — full vacuum, wipe-down and protection of all plastics/leather, floor mats and carpet cleaning, and streak-free interior glass. ⚠️ Heads-up: carpets or seats with heavy dirt or set-in stains will NOT see much improvement without adding Carpet & Upholstery Shampoo on the next step.",
  "Exterior Detail":
    "Full hand wash and dry, wheels/tires cleaned and dressed, plastic trim restoration, exterior glass, and INCLUDED 1–3 month ceramic spray sealant.",
  "Full Detail":
    "Interior + Exterior in one visit — full interior clean plus hand wash, wheels/tires, trim, and INCLUDED 1–3 month ceramic sealant. Best value combo. ⚠️ Heads-up: carpets or seats with heavy dirt or set-in stains will NOT see much improvement without adding Carpet & Upholstery Shampoo on the next step.",
  "Ultimate Interior Reset":
    "The full interior reset. Seats REMOVED for deep steam clean of seats and carpet, every crevice vacuumed, all surfaces disinfected + protected, streak-free glass, mats cleaned and protected, leather conditioned (if applicable), trunk fully included. Note: 100% removal of set-in stains and embedded debris is not guaranteed — but we do everything we can.",
  "Paint Correction — 1 Step":
    "Single-pass machine polish that removes 60–75% of light swirl marks, oxidation, and water spots. Includes hand wash, clay bar decontamination, wheels, tires, and INCLUDED 1–3 month ceramic spray.",
  "Paint Correction — 2 Step":
    "Two-stage compound + finishing polish that removes 85–95% of correctable defects — deeper scratches, heavy swirls, and oxidation. Includes hand wash, clay bar, wheels, tires, and INCLUDED 1–3 month ceramic spray.",
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
    desc: "Sedans, coupes, hatches, wagons, sports cars",
    sizeKey: "price_medium",
  },
  {
    id: "suv",
    label: "Compact SUV / SUV / Small Truck",
    desc: "Tucson, RAV4, CR-V, Escape, Rogue, Wrangler, Tacoma, Ranger",
    sizeKey: "price_large",
  },
  {
    id: "xl",
    label: "3-Row / Full-Size Truck",
    desc: "Tahoe, Suburban, Highlander, Pilot, F-150, Sienna, Sprinter",
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

// Full 4-step tracker — Detail (service pick) → Vehicle → Schedule → Confirm.
// The internal `step` state (1/2/3) covers Vehicle/Schedule/Confirm; the
// Detail step is shown as step 0 when the service picker is rendered
// (i.e. when selectedService is null before the wizard opens).
const STEPS = [
  { num: 0, label: "Detail",   icon: Sparkles },
  { num: 1, label: "Vehicle",  icon: Car },
  { num: 2, label: "Schedule", icon: Calendar },
  { num: 3, label: "Confirm",  icon: User },
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
  /** Total charged (dollars, after all discounts). Set when submitting through
   *  Stripe so the post-return handler can fire the Meta Pixel Purchase event
   *  with the correct value. */
  totalPaid?: number;
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
  // July 2026: passenger-cars-only. Auto-force vehicle category so the
  // customer never sees the boat/RV/truck/HE picker. `initialCategory` prop
  // is still honored so callers that pass a category (e.g. legacy links)
  // don't break, but we default to "vehicle" instead of null.
  const [bookingCategory, setBookingCategory] = useState<"vehicle" | "boat" | "rv" | "truck" | "heavy_equipment" | null>(initialCategory ?? "vehicle");

  // Step 1 — Vehicle
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeSlug | "">("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [boatLength, setBoatLength] = useState<number | "">(20);

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<{ id: string; label: string; price: number }[]>([]);

  // Light Detailing — picked items live here until Continue converts them
  // into fake addon rows so the rest of the flow treats them as line items.
  const [lightDetailItemIds, setLightDetailItemIds] = useState<string[]>([]);

  // Clear Light Detailing item picks when the customer switches to any other
  // service — prevents stale picks from bleeding into an unrelated booking.
  useEffect(() => {
    if (selectedService?.name !== "Light Detailing" && lightDetailItemIds.length > 0) {
      setLightDetailItemIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.name]);

  // Auto-drop clay_bar when the Ultimate + Exterior toggle is on — clay bar is
  // baked into the bundle, so charging for it separately would double-bill.
  useEffect(() => {
    const isUlt = selectedService?.name?.toLowerCase().includes("ultimate");
    const extToggled = selectedAddons.some(a => a.id === "ultimate_ext_addon");
    if (isUlt && extToggled && selectedAddons.some(a => a.id === "clay_bar")) {
      setSelectedAddons(prev => prev.filter(a => a.id !== "clay_bar"));
    }
  }, [selectedAddons, selectedService?.name]);

  // Gentech exclusivity — "All Windows" supersedes windshield + front-3;
  // "Full Package" supersedes every individual gentech section. Auto-drop
  // the redundant picks so the customer never pays twice for the same coating.
  useEffect(() => {
    const ids = new Set(selectedAddons.map(a => a.id));
    const hasAllWindows = ids.has("gentech_5yr_windows_all");
    const hasFullPackage = ids.has("gentech_5yr_full");
    const REDUNDANT_UNDER_ALL_WINDOWS = ["gentech_5yr_windshield", "gentech_5yr_windows_front"];
    const REDUNDANT_UNDER_FULL_PACKAGE = [
      "gentech_5yr_body", "gentech_5yr_wheels",
      "gentech_5yr_windshield", "gentech_5yr_windows_front", "gentech_5yr_windows_all",
    ];
    const toRemove = new Set<string>();
    if (hasAllWindows) REDUNDANT_UNDER_ALL_WINDOWS.forEach(id => { if (ids.has(id)) toRemove.add(id); });
    if (hasFullPackage) REDUNDANT_UNDER_FULL_PACKAGE.forEach(id => { if (ids.has(id)) toRemove.add(id); });
    if (toRemove.size > 0) {
      setSelectedAddons(prev => prev.filter(a => !toRemove.has(a.id)));
    }
  }, [selectedAddons]);

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
        // Shampoo is flat $95 across all sizes (July 2026) — no XL surcharge.
        const base = ALL_ADD_ONS.find(a => a.id === "upholstery_shampoo")?.price ?? 95;
        updated.selectedAddons = updated.selectedAddons.map(a =>
          a.id === "upholstery_shampoo" ? { ...a, price: base } : a
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
    setBookingCategory("vehicle");
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
    ? selectedService.name === "Light Detailing"
      ? computeLightDetailPrice(
          lightDetailItemIds,
          (vehicleSize === "xl" ? "xl" : vehicleSize === "suv" ? "suv" : "sedan"),
        ).finalPrice
      : isFootageService(selectedService.name)
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
  // July 2026 — qualifying add-ons for the basic bundle tier discount.
  // Premium Ceramic sections have their own volume tier (see ceramicSectionPctFor).
  // Ultimate + Ext toggle triggers its own +20% unlock but is not counted here.
  // ALL ceramic products — premium ceramic, 6-10mo spray, Gentech 5-yr — are
  // excluded from both counting toward the tier AND receiving the discount.
  // Reasoning: ceramic products are already flat-margin premium items with
  // product cost baked in; stacking them with other add-ons shouldn't lift
  // the discount tier, and their own price never receives a bundle discount.
  const isPremiumCeramicId = (id: string) => id.startsWith("premium_ceramic_");
  const isGentechId = (id: string) => id.startsWith("gentech_5yr_");
  // Light Detailing item IDs — get stored on selectedAddons for display+booking
  // but must NOT trigger the bundle discount tier (they're already priced à la
  // carte at maintenance rates, not full add-on prices).
  const LIGHT_DETAIL_IDS = new Set(["vacuum", "wipe_down", "floor_mats", "windows", "exterior_rinse", "tire_shine"]);
  const isCeramicOrSpecial = (id: string) =>
    isPremiumCeramicId(id) || isGentechId(id) ||
    id === "ultimate_ext_addon" || id === "ceramic_6_10_upgrade" ||
    LIGHT_DETAIL_IDS.has(id);
  const isSpecialAddonId = isCeramicOrSpecial; // legacy alias
  const qualifyingAddons = selectedAddons.filter(a => a.price > 0 && !isCeramicOrSpecial(a.id));
  const ceramicAddons    = selectedAddons.filter(a => isPremiumCeramicId(a.id));
  // Ultimate + Exterior unlock: when the customer has toggled the
  // "+ Exterior Detail (bundle)" add-on on their Ultimate Interior Reset,
  // every basic add-on gets +20% off on top of the bundle tier.
  const ultimateExtToggled = selectedAddons.some(a => a.id === "ultimate_ext_addon");
  // Legacy alias kept so downstream JSX that still references
  // `hasPremiumAddon` keeps compiling until the JSX cleanup pass.
  const hasPremiumAddon = ultimateExtToggled;
  const bundlePctRaw = bundlePctFor(qualifyingAddons.length);
  const bundlePct = effectiveBundlePctFor(qualifyingAddons.length, ultimateExtToggled);
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
    ["Interior Detail","Exterior Detail","Full Detail","Ultimate Interior Reset"]
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
    // Skip: services that are already at the top of their ladder, or that
    // don't participate in the Basic/Refresh/Reset ladder at all.
    if (n.includes("boat") || n.includes("rv") || n.includes("motorhome") || n.includes("maintenance") || n.includes("paint") || n.includes("correction")) return null;

    // July 2026 v3: 2-tier lineup. Nudge Basic customers up to Reset (DB
    // name "The Refresh — …"). Reset customers are already at the top.
    const currentName = selectedService.name;
    let targetName: string | null = null;
    if (currentName === "Interior Detail")      targetName = "The Refresh — Interior";
    else if (currentName === "Exterior Detail") targetName = "The Refresh — Exterior";
    else if (currentName === "Full Detail")     targetName = "The Refresh — Full";
    else return null;
    const targetService = services.find(s => s.name === targetName);
    if (!targetService) return null;
    // Size-tiered — compare against the customer's actual vehicle size so
    // the upgrade delta is accurate. Falls back to price_small for safety.
    const targetPrice = vehicleSize
      ? getPriceForSize(targetService, vehicleSize as VehicleSizeSlug)
      : (targetService.price_small ?? 0);
    // Honest upgrade delta: only the add-ons ABSORBED by the target tier
    // become free post-upgrade. Premium add-ons that survive still cost the
    // same, so they shouldn't be counted as "savings" from upgrading.
    // Uses INCLUDED_ADDONS_BY_SERVICE so the calc is per-tier (Reset Full
    // absorbs headlight + engine bay in addition to interior add-ons).
    const targetAbsorbed = INCLUDED_ADDONS_BY_SERVICE[targetName] ?? INCLUDED_IN_ULTIMATE_IDS;
    const includedAddonsCost = selectedAddons
      .filter(a => targetAbsorbed.includes(a.id))
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
      setBookingCategory(initialCategory ?? "vehicle");
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
  // Price Summary collapsible (Step 4). Closed initially — customer sees the
  // grand total up top and taps to expand the full breakdown.
  const [priceSummaryExpanded, setPriceSummaryExpanded] = useState(false);
  // Step 1 — which core package card has its includes/excludes drawer open.
  // Only one at a time to keep the list scannable. `null` = all collapsed.
  const [expandedDetailPkg, setExpandedDetailPkg] = useState<string | null>(null);

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
      // July 2026 — passenger-cars-only. Legacy sessionStorage drafts may
      // carry an old boat/rv/truck/heavy_equipment category — coerce those
      // to "vehicle" so the customer never lands on a retired flow.
      if (saved.bookingCategory === "vehicle") setBookingCategory("vehicle");
      else setBookingCategory("vehicle");
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
  // Shampoo is flat $95 across all sizes (July 2026) — no XL surcharge. Kept
  // as a no-op re-sync so any stale price from an older draft gets snapped
  // back to the current flat rate whenever size changes.
  useEffect(() => {
    const base = ALL_ADD_ONS.find(a => a.id === "upholstery_shampoo")?.price ?? 95;
    setSelectedAddons(prev => prev.map(a =>
      a.id === "upholstery_shampoo" ? { ...a, price: base } : a
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
      // Light Detailing — need vehicle info + minimum item count picked.
      if (selectedService?.name === "Light Detailing") {
        return !!(vehicleSize && vehicleYear && vehicleMake && vehicleModel)
          && lightDetailItemIds.length >= LIGHT_DETAIL_MIN_ITEMS;
      }
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
      selectedService &&
      // Date + time are required — without them bookDetailing's to24h()
      // parses an empty string into "NaN:00:00" and Postgres rejects the
      // insert. Block submit at the source instead of crashing on save.
      selectedDate &&
      selectedTime
    );

  const handleNext = () => {
    // Light Detailing — convert selected item ids into fake addon rows so
    // downstream code (price, review, submit) treats them as line items,
    // then jump straight to date/time.
    if (step === 1 && selectedService?.name === "Light Detailing") {
      const sizeKey: "sedan" | "suv" | "xl" =
        vehicleSize === "xl" ? "xl" : vehicleSize === "suv" ? "suv" : "sedan";
      const asAddons = LIGHT_DETAIL_ITEMS
        .filter(item => lightDetailItemIds.includes(item.id))
        .map(item => ({ id: item.id, label: item.label, price: item.prices[sizeKey] }));
      setSelectedAddons(asAddons);
      setStepDirection(1);
      setStep(2);
      return;
    }
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
      // Meta Pixel: Purchase conversion — pay-at-arrival path. Fires once per
      // successful booking so ad optimization targets actual bookers, not
      // just checkout starters.
      trackFbPurchase({
        value: totalAfterDiscount,
        currency: "USD",
        content_name: selectedService.name,
        content_ids: [selectedService.id],
      });
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
        // Snapshotted so the LandingPage Stripe-return handler can fire the
        // Meta Pixel Purchase event with the actual charged amount.
        totalPaid: totalAfterDiscount,
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
                        setBookingCategory("vehicle");
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
              /* ── Step 1: Service List — July 2026 revamp ── */
              <div className="px-5 py-6">
                {/* Header — matches Steps 2-4: "Book Your Detail" title + 4-step tracker.
                    "Detail" step is currently active; the rest sit dimmed until picked. */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-white tracking-tight">Book Your Detail</h2>
                  </div>
                  {/* 4-step tracker — Detail active, others upcoming */}
                  <div className="flex items-start mb-5">
                    {STEPS.map((s, i) => {
                      const isActive = s.num === 0;
                      return (
                        <div key={s.num} className="flex items-start flex-1 min-w-0">
                          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black transition-all duration-300 ${
                                isActive
                                  ? "bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-black shadow-[0_0_18px_rgba(212,175,55,0.45)] ring-2 ring-[#D4AF37]/40 ring-offset-2 ring-offset-zinc-950"
                                  : "bg-transparent border border-white/10 text-zinc-600"
                              }`}
                            >
                              {i + 1}
                            </div>
                            <span
                              className={`text-[9px] font-black uppercase tracking-[0.2em] leading-tight text-center ${
                                isActive ? "text-[#D4AF37]" : "text-zinc-600"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className="h-[2px] flex-1 mx-1.5 mt-[18px] rounded-full bg-white/[0.06]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {bookingCategory === "vehicle" && (() => {
                  const isVehicleService = (s: Service) => {
                    const n = s.name.toLowerCase();
                    return !s.is_subscription
                      && (s as any).is_active !== false
                      && !isBoatService(s.name) && !isRVService(s.name)
                      && !isTruckService(s.name, (s as any).category)
                      && !isHeavyEquipmentService(s.name, (s as any).category)
                      && !n.includes("paint") && !n.includes("correction")
                      // July 2026 — retired services that might still be active
                      // in the DB before the migration runs. Belt + suspenders.
                      && !n.includes("salt season") && !n.includes("salt recovery")
                      && !n.includes("showroom") && !n.includes("gentech")
                      && n !== "ultimate exterior"
                      && n !== "ultimate interior + exterior reset";
                  };
                  const standard = services.filter(s => isVehicleService(s) && !s.name.toLowerCase().includes("ultimate"));
                  const ultimate = services.filter(s => isVehicleService(s) && s.name.toLowerCase().includes("ultimate"));

                  // Categorize non-Ultimate services by foundation so Step 1
                  // can render the tier ladder per foundation. Everything in
                  // `standard` sorts into one of these buckets:
                  //   Interior — Basic Interior Detail, The Refresh — Interior
                  //   Exterior — Basic Exterior Detail, The Refresh — Exterior
                  //   Full     — Basic Full Detail, The Refresh — Full, The Reset — Full
                  // (Ultimate Interior Reset is rendered separately as the
                  // flagship Interior top tier alongside the Interior group.)
                  const foundationOf = (name: string): "interior" | "exterior" | "full" | null => {
                    const n = name.toLowerCase();
                    if (n.includes("full")) return "full";
                    if (n.includes("interior")) return "interior";
                    if (n.includes("exterior")) return "exterior";
                    return null;
                  };
                  // Tier rank within a foundation. July 2026 v3 lineup is
                  // Basic (0) + Reset (1). "Refresh" DB entries are now the
                  // top tier — they display as "Reset" via serviceDisplay.
                  const tierRankOf = (name: string): number => {
                    const n = name.toLowerCase();
                    if (n.includes("reset") || n.includes("ultimate") || n.includes("refresh")) return 1;
                    return 0;
                  };
                  const interiorTier = [
                    ...standard.filter(s => foundationOf(s.name) === "interior"),
                    ...ultimate, // "Ultimate Interior Reset" = top interior tier
                  ].sort((a, b) => tierRankOf(a.name) - tierRankOf(b.name));
                  const exteriorTier = standard
                    .filter(s => foundationOf(s.name) === "exterior")
                    .sort((a, b) => tierRankOf(a.name) - tierRankOf(b.name));
                  const fullTier = standard
                    .filter(s => foundationOf(s.name) === "full")
                    .sort((a, b) => tierRankOf(a.name) - tierRankOf(b.name));

                  // Icon + accent config per service. Keyed by DB name so
                  // it works transparently with the display-mapping layer.
                  const SERVICE_META: Record<string, { icon: React.ElementType; blurb: string; time: string }> = {
                    // Basic tier (entry) — DB name unchanged; getServiceDisplayName renames.
                    "Interior Detail":         { icon: Sofa,     blurb: "Vacuum, wipe-down, glass, floor mats",                          time: "2.5 hrs" },
                    "Exterior Detail":         { icon: Droplets, blurb: "Hand wash, wheels/tires, trim + 1–3mo ceramic",                  time: "1.5 hrs" },
                    "Full Detail":             { icon: Zap,      blurb: "Basic Interior + Exterior · Save $35–$45",                       time: "3 hrs" },
                    // Refresh tier (middle) — top popular add-ons baked in at bundle discount.
                    // "Reset" tier (top). DB names stay "The Refresh — …" so
                    // history/loyalty/etc. keep working; serviceDisplay maps
                    // them to "The Reset — …" for customers.
                    "The Refresh — Interior":  { icon: Crown,    blurb: "Basic + Shampoo + Pet Hair — deep interior clean",             time: "2.5 hrs" },
                    "The Refresh — Exterior":  { icon: Crown,    blurb: "Basic + Clay Bar + Headlight + Engine Bay — deep exterior",     time: "2.5 hrs" },
                    "The Refresh — Full":      { icon: Crown,    blurb: "Full + Shampoo + Pet Hair + Clay Bar + Engine Bay",              time: "4 hrs" },
                    // Retired flagship tier — kept in the map so historical
                    // bookings that reference this name still render a card.
                    "Ultimate Interior Reset": { icon: Crown,    blurb: "Legacy Ultimate — book The Reset — Interior instead",           time: "4–6 hrs" },
                    "The Reset — Full":        { icon: Crown,    blurb: "Legacy — book The Reset — Full (formerly Refresh) instead",     time: "6–8 hrs" },
                  };

                  // What each core package DOES include vs what it does NOT
                  // (customer needs an add-on to get it). Shown in the expandable
                  // details drawer under each package card so customers can
                  // pick with confidence — and the "not included" list doubles
                  // as an add-on discovery aid on the next step.
                  const SERVICE_DETAILS: Record<string, { included: string[]; notIncluded: string[] }> = {
                    // ── BASIC tier ──
                    "Interior Detail": {
                      included: [
                        "Full vacuum of every surface, crack & crevice",
                        "Wipe-down + protection of plastics & leather",
                        "Floor mats & carpet cleaned (no shampoo)",
                        "Interior glass — streak free",
                        "Cabin deodorize",
                      ],
                      notIncluded: [
                        "Deep shampoo of seats / carpet — upgrade to The Reset or add à la carte",
                        "Heavy pet hair extraction — upgrade to The Reset or add à la carte",
                        "Salt stain removal (Salt Removal add-on)",
                        "Smoke / pet odor elimination (Ozone Treatment add-on)",
                        "Leather conditioning (Leather Conditioning add-on)",
                        "Clay bar / paint decontamination (Clay Bar add-on)",
                      ],
                    },
                    "Exterior Detail": {
                      included: [
                        "Full hand wash + foam bath + hand dry",
                        "Wheels, tires & wheel wells cleaned + dressed",
                        "Plastic trim restoration",
                        "Exterior glass cleaned",
                        "1–3 month ceramic spray sealant INCLUDED",
                      ],
                      notIncluded: [
                        "Paint decontamination — upgrade to The Reset or add Clay Bar à la carte",
                        "Headlight restoration — upgrade to The Reset or add à la carte",
                        "Engine bay detail — upgrade to The Reset or add à la carte",
                        "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                      ],
                    },
                    "Full Detail": {
                      included: [
                        "Everything in Basic Interior Detail",
                        "Everything in Basic Exterior Detail",
                        "1–3 month ceramic spray sealant INCLUDED",
                        "Best value combo — save $35–$45 vs. buying separately",
                      ],
                      notIncluded: [
                        "Shampoo / Pet Hair — upgrade to The Reset — Full",
                        "Clay Bar / Engine Bay — upgrade to The Reset — Full",
                        "Salt Removal (Salt Removal add-on)",
                        "Headlight Restoration (Headlight Restoration add-on)",
                        "Leather conditioning (Leather Conditioning add-on)",
                        "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                      ],
                    },
                    // ── RESET tier (DB name "The Refresh — …") ──
                    "The Refresh — Interior": {
                      included: [
                        "Everything in Basic Interior Detail",
                        "Carpet & Upholstery Shampoo (deep steam clean)",
                        "Heavy Pet Hair Extraction",
                        "Bundle savings vs à la carte",
                      ],
                      notIncluded: [
                        "Heavy salt stain removal (Salt Removal add-on)",
                        "Leather conditioning (Leather Conditioning add-on)",
                        "Clay bar / paint decontamination (Clay Bar add-on)",
                        "Smoke / pet odor elimination (Ozone Treatment add-on)",
                      ],
                    },
                    "The Refresh — Exterior": {
                      included: [
                        "Everything in Basic Exterior Detail",
                        "Clay Bar paint decontamination",
                        "Headlight Restoration (pair)",
                        "Engine Bay Detail (degrease + dressing)",
                        "1–3 month ceramic spray sealant INCLUDED",
                        "Bundle savings: ~$65 vs à la carte",
                      ],
                      notIncluded: [
                        "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                        "Paint correction (separate service — swirls / oxidation)",
                      ],
                    },
                    "The Refresh — Full": {
                      included: [
                        "Everything in Basic Full Detail",
                        "Carpet & Upholstery Shampoo + Pet Hair Extraction",
                        "Clay Bar + Engine Bay Detail",
                        "1–3 month ceramic spray sealant INCLUDED",
                        "Bundle savings vs à la carte",
                      ],
                      notIncluded: [
                        "Heavy salt stain removal (Salt Removal add-on)",
                        "Headlight Restoration (Headlight Restoration add-on)",
                        "Leather conditioning (Leather Conditioning add-on)",
                        "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                        "Smoke / pet odor elimination (Ozone Treatment add-on)",
                      ],
                    },
                    // ── RESET tier (Ultimate Interior Reset DB name) ──
                    "Ultimate Interior Reset": {
                      included: [
                        "Everything in The Refresh — Interior",
                        "Front seats REMOVED for deep steam clean",
                        "Leather conditioning (if applicable)",
                        "Clay bar paint decontamination",
                        "Full disinfect + protect all interior surfaces",
                        "Trunk fully included",
                      ],
                      notIncluded: [
                        "Exterior wash / wheels / trim — add + Exterior Detail at checkout, or upgrade to The Reset — Full",
                        "Smoke / pet odor elimination (Ozone Treatment add-on)",
                        "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                      ],
                    },
                    "The Reset — Full": {
                      included: [
                        "Everything in The Reset — Interior (seats REMOVED, shampoo, salt, pet hair, leather, clay bar)",
                        "Full exterior hand wash + wheels + tires + trim",
                        "Headlight Restoration + Engine Bay Detail",
                        "1–3 month ceramic spray sealant INCLUDED",
                        "Best combined-visit value — save $60+ vs à la carte",
                      ],
                      notIncluded: [
                        "Smoke / pet odor elimination (Ozone Treatment add-on)",
                        "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                        "Paint correction (separate service — swirls / oxidation)",
                      ],
                    },
                  };

                  return (
                    <div className="space-y-6">
                      {/* Compact quiz trigger — for customers who don't want to
                          hand-pick a package. Fires the same handoff that our
                          landing-page prefill uses: sets service + vehicle +
                          addons and jumps straight to Step 2 (Date & Time). */}
                      <div className="flex flex-col items-center gap-1.5 pt-1">
                        <BuildForMeQuiz
                          compact
                          services={services}
                          onUseBuild={(args) => {
                            const foundationName = args.preferredServiceName
                              ?? (args.foundation === "interior" ? "Interior Detail"
                                : args.foundation === "exterior" ? "Exterior Detail"
                                : "Full Detail");
                            const svc = services.find(s => s.name === foundationName);
                            if (!svc) return;
                            // Set vehicle info in modal state
                            setVehicleYear(args.vehicle.year);
                            setVehicleMake(args.vehicle.make);
                            setVehicleModel(args.vehicle.model);
                            setVehicleSize(args.vehicle.size);
                            // Build addon rows with size-adjusted prices so
                            // the total matches what the quiz result showed.
                            const preAddons = args.addonIds
                              .map(id => ALL_ADD_ONS.find(a => a.id === id))
                              .filter((a): a is AddonItem => !!a)
                              .map(a => ({
                                id: a.id,
                                label: a.label,
                                price: getEffectiveAddonPrice(a, args.vehicle.size, addonOverrides),
                              }));
                            setSelectedAddons(preAddons);
                            // Pick the foundation service and jump to Date/Time
                            onSelectService(svc);
                            setStepDirection(1);
                            setStep(2);
                          }}
                        />
                        <p className="text-[10px] text-zinc-600">Not sure which package? Answer 4 quick questions.</p>
                      </div>

                      {/* ── Light Detailing — TOP OF PAGE ────────────────────
                          Quick maintenance pathway, sits above the tier grid so
                          returning customers who just need a touch-up can find
                          it immediately without scrolling past every service. */}
                      {(() => {
                        const lightSvc = services.find(s => s.name === "Light Detailing");
                        if (!lightSvc) return null;
                        const sizeKeyLD: "sedan" | "suv" | "xl" =
                          vehicleSize === "xl" ? "xl" : vehicleSize === "suv" ? "suv" : "sedan";
                        return (
                          <button
                            type="button"
                            onClick={() => onSelectService(lightSvc)}
                            className="w-full rounded-xl border border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/60 hover:bg-amber-500/[0.08] transition-all p-3 text-left group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                                <Wand2 size={15} className="text-amber-400" strokeWidth={1.75} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-black text-white leading-tight">Light Detailing</span>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-px rounded">
                                    Maintenance
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-zinc-500 mt-0.5 leading-snug">
                                  Quick touch-up · pick 2+ items · 1 hr
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">From</div>
                                <div className="text-sm font-black text-amber-300 tabular-nums leading-none mt-0.5">
                                  ${computeLightDetailPrice([], sizeKeyLD).finalPrice}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })()}

                      {/* Renders one tier card. Extracted so we can render
                          each foundation section (Interior, Exterior, Full)
                          without duplicating 130 lines of JSX. */}
                      {(() => {
                        const renderTierCard = (service: Service, opts: { emphasize?: boolean } = {}) => {
                                const meta = SERVICE_META[service.name];
                                const details = SERVICE_DETAILS[service.name];
                                const Icon = meta?.icon ?? Sparkles;
                                // "Emphasize" flags the top tier of the foundation (Reset)
                                // or the popular middle tier (Refresh) so the card
                                // gets premium styling instead of the muted Basic look.
                                const isFull = !!opts.emphasize;
                                const displayName = getServiceDisplayName(service.name);
                                const detailsOpen = expandedDetailPkg === service.name;
                                return (
                                  <div
                                    key={service.id}
                                    className={`relative rounded-2xl border overflow-hidden transition-all duration-200 group ${
                                      isFull
                                        ? "border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-900/60 to-zinc-950/70 hover:border-[#D4AF37]/60 hover:shadow-[0_0_24px_rgba(212,175,55,0.10)]"
                                        : "border-white/[0.08] bg-zinc-900/40 hover:border-[#D4AF37]/30 hover:bg-zinc-900/60"
                                    }`}
                                  >
                                    {/* Popular ribbon */}
                                    {isFull && (
                                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-[8px] font-black uppercase tracking-widest">
                                        <Crown size={8} strokeWidth={2.5} />
                                        Popular
                                      </div>
                                    )}
                                    {/* Main select region — compact 2-row card:
                                        Row 1: icon + name + time
                                        Row 2: 3 sizes with prices inline */}
                                    <button
                                      type="button"
                                      onClick={() => onSelectService(service)}
                                      className="w-full text-left active:scale-[0.99] transition-transform"
                                    >
                                      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-1.5">
                                        {/* Row 1: icon + name + time */}
                                        <div className="flex items-center gap-2.5">
                                          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                            isFull
                                              ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 shadow-[0_0_10px_rgba(212,175,55,0.10)]"
                                              : "bg-white/[0.03] border border-white/[0.08] group-hover:bg-white/[0.06]"
                                          }`}>
                                            <Icon size={14} className={isFull ? "text-[#D4AF37]" : "text-zinc-300"} strokeWidth={1.75} />
                                          </div>
                                          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[13.5px] font-black tracking-tight leading-tight ${isFull ? "text-white" : "text-zinc-100 group-hover:text-white"}`}>
                                              {displayName}
                                            </span>
                                            {meta?.time && (
                                              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold uppercase tracking-widest text-zinc-500">
                                                <Calendar size={7} strokeWidth={2.5} />{meta.time}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {/* Row 2: 3 sizes with prices inline */}
                                        <div className="flex items-center justify-between gap-1 pl-[42px]">
                                          <div className={`flex-1 flex items-center gap-0.5 rounded-md px-1.5 py-1 ${isFull ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                                            <span className="text-[8.5px] font-bold uppercase tracking-widest text-zinc-500">Sedan</span>
                                            <span className={`ml-auto text-[12px] font-black tabular-nums leading-none ${isFull ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                                              ${service.price_small}
                                            </span>
                                          </div>
                                          <div className={`flex-1 flex items-center gap-0.5 rounded-md px-1.5 py-1 ${isFull ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                                            <span className="text-[8.5px] font-bold uppercase tracking-widest text-zinc-500">SUV</span>
                                            <span className={`ml-auto text-[12px] font-black tabular-nums leading-none ${isFull ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                                              ${service.price_large}
                                            </span>
                                          </div>
                                          <div className={`flex-1 flex items-center gap-0.5 rounded-md px-1.5 py-1 ${isFull ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                                            <span className="text-[8.5px] font-bold uppercase tracking-widest text-zinc-500">XL</span>
                                            <span className={`ml-auto text-[12px] font-black tabular-nums leading-none ${isFull ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                                              ${service.price_extra_large}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>

                                    {/* What's included / not included — expandable
                                        drawer so customers can pick with full context
                                        without cluttering the card at idle. */}
                                    {details && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedDetailPkg(prev => prev === service.name ? null : service.name)}
                                          aria-expanded={detailsOpen}
                                          className="w-full flex items-center justify-center gap-1.5 border-t border-white/[0.05] py-1.5 text-[9.5px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                                        >
                                          <Info size={11} />
                                          {detailsOpen ? "Hide details" : "See what's included"}
                                          <ChevronDown size={11} className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        <AnimatePresence initial={false}>
                                          {detailsOpen && (
                                            <motion.div
                                              key="details"
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.22, ease: "easeOut" }}
                                              className="overflow-hidden border-t border-white/[0.05] bg-black/25"
                                            >
                                              <div className="px-4 py-3.5 space-y-3">
                                                {/* Included */}
                                                <div>
                                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1.5">
                                                    Included in {displayName}
                                                  </p>
                                                  <ul className="space-y-1">
                                                    {details.included.map((item) => (
                                                      <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-snug">
                                                        <Check size={10} className="text-emerald-400 shrink-0 mt-[3px]" strokeWidth={3} />
                                                        <span>{item}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                                {/* Not included */}
                                                <div className="pt-2.5 border-t border-white/[0.05]">
                                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1.5">
                                                    Not included <span className="text-zinc-500 font-bold">· add-on required</span>
                                                  </p>
                                                  <ul className="space-y-1">
                                                    {details.notIncluded.map((item) => (
                                                      <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-400 leading-snug">
                                                        <XCircle size={10} className="text-amber-500/70 shrink-0 mt-[3px]" strokeWidth={2.5} />
                                                        <span>{item}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                  <p className="text-[10px] text-zinc-500 mt-2 italic leading-snug">
                                                    You'll get a chance to add any of these on the next step.
                                                  </p>
                                                </div>
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </>
                                    )}
                                  </div>
                                );
                        };

                        // ─── FoundationCard ─────────────────────────────
                        // One consolidated card per foundation (Interior /
                        // Interior+Exterior / Exterior) with the 3 tier
                        // buttons side-by-side. Tapping a tier button selects
                        // that specific service. A "See what's in each" toggle
                        // reveals per-tier included/not-included details.
                        const renderFoundationCard = (
                          foundationLabel: string,
                          tiers: Service[],
                          opts: { gold?: boolean } = {},
                        ) => {
                          if (tiers.length === 0) return null;
                          // Icon for foundation — reuse the meta icon from the
                          // highest tier (usually most representative).
                          const topTier = tiers[tiers.length - 1];
                          const FoundationIcon = SERVICE_META[topTier.name]?.icon ?? Sparkles;
                          const gold = !!opts.gold;
                          const detailsOpen = expandedDetailPkg === `foundation:${foundationLabel}`;

                          const tierTone = (svc: Service): "basic" | "refresh" | "reset" => {
                            const n = svc.name.toLowerCase();
                            // July 2026 v3: "Refresh" DB entries are the top
                            // tier now — display as Reset.
                            if (n.includes("reset") || n.includes("ultimate") || n.includes("refresh")) return "reset";
                            return "basic";
                          };
                          const TIER_SHORT: Record<string, string> = {
                            basic:   "Basic",
                            refresh: "Reset",
                            reset:   "Reset",
                          };

                          return (
                            <div className={`relative rounded-2xl border overflow-hidden ${
                              gold
                                ? "border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.05] via-zinc-900/70 to-zinc-950/70 shadow-[0_0_24px_rgba(212,175,55,0.08)]"
                                : "border-white/[0.08] bg-gradient-to-br from-zinc-900/60 to-zinc-950/60"
                            }`}>
                              {/* Top accent line */}
                              <div className={`absolute top-0 inset-x-0 h-[2px] ${
                                gold ? "bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent"
                                : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
                              }`} />

                              {/* Header — centered */}
                              <div className="flex flex-col items-center text-center px-3 pt-4 pb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                                  gold
                                    ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 shadow-[0_0_14px_rgba(212,175,55,0.15)]"
                                    : "bg-white/[0.04] border border-white/[0.08]"
                                }`}>
                                  <FoundationIcon size={17} className={gold ? "text-[#D4AF37]" : "text-zinc-300"} strokeWidth={1.75} />
                                </div>
                                <div className={`text-[15px] font-black tracking-tight leading-tight ${gold ? "text-white" : "text-zinc-100"}`}>
                                  {foundationLabel}
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500 mt-1">
                                  {tiers.length} Tier{tiers.length !== 1 ? "s" : ""} · Tap to book
                                </div>
                              </div>

                              {/* Tier buttons — one per column */}
                              <div className={`grid gap-1.5 px-3 pb-2.5`} style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}>
                                {tiers.map((svc) => {
                                  const tone = tierTone(svc);
                                  const displayName = getServiceDisplayName(svc.name);
                                  const meta = SERVICE_META[svc.name];
                                  const isReset = tone === "reset";
                                  const isRefresh = tone === "refresh";
                                  return (
                                    <button
                                      key={svc.id}
                                      type="button"
                                      onClick={() => onSelectService(svc)}
                                      className={`relative flex flex-col items-center text-center rounded-xl border px-2 py-3 active:scale-[0.98] transition-all group/tier overflow-hidden ${
                                        isReset
                                          ? "border-[#D4AF37]/50 bg-gradient-to-b from-[#D4AF37]/[0.10] to-[#D4AF37]/[0.02] hover:border-[#D4AF37] hover:from-[#D4AF37]/[0.18] hover:shadow-[0_0_16px_rgba(212,175,55,0.15)]"
                                          : isRefresh
                                          ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.08] to-emerald-500/[0.02] hover:border-emerald-500/70 hover:from-emerald-500/[0.14] hover:shadow-[0_0_16px_rgba(52,211,153,0.12)]"
                                          : "border-white/[0.10] bg-gradient-to-b from-white/[0.04] to-transparent hover:border-white/[0.30] hover:from-white/[0.08]"
                                      }`}
                                    >
                                      {/* Top glow accent */}
                                      <div className={`absolute top-0 inset-x-0 h-[2px] ${
                                        isReset ? "bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent"
                                        : isRefresh ? "bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
                                        : "bg-gradient-to-r from-transparent via-white/15 to-transparent"
                                      }`} />

                                      {/* Tier badge */}
                                      <div className={`text-[8.5px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${
                                        isReset ? "text-[#D4AF37]" : isRefresh ? "text-emerald-300" : "text-zinc-500"
                                      }`}>
                                        {TIER_SHORT[tone]}
                                      </div>

                                      {/* Price — hero element, centered */}
                                      <div className={`text-[22px] font-black tabular-nums leading-none tracking-tight ${
                                        isReset ? "text-[#D4AF37]" : isRefresh ? "text-emerald-200" : "text-white"
                                      }`}>
                                        ${svc.price_small}
                                      </div>

                                      {/* Size prices — SUV / XL underneath */}
                                      <div className="text-[8.5px] text-zinc-500 leading-tight mt-1.5 space-y-0.5">
                                        <div className="tabular-nums">SUV <span className="text-zinc-400 font-bold">${svc.price_large}</span></div>
                                        <div className="tabular-nums">XL <span className="text-zinc-400 font-bold">${svc.price_extra_large}</span></div>
                                      </div>

                                      {/* Time badge — bottom pill */}
                                      {meta?.time && (
                                        <div className={`mt-2 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                          isReset ? "bg-[#D4AF37]/15 text-[#D4AF37]/90"
                                          : isRefresh ? "bg-emerald-500/15 text-emerald-300/90"
                                          : "bg-white/[0.05] text-zinc-500"
                                        }`}>
                                          {meta.time}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Toggle for per-tier details */}
                              <button
                                type="button"
                                onClick={() => setExpandedDetailPkg(prev => prev === `foundation:${foundationLabel}` ? null : `foundation:${foundationLabel}`)}
                                className="w-full flex items-center justify-center gap-1.5 border-t border-white/[0.05] py-1.5 text-[9.5px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] hover:bg-white/[0.02] transition-colors"
                              >
                                <Info size={10} />
                                {detailsOpen ? "Hide details" : "See what's in each tier"}
                                <ChevronDown size={10} className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} />
                              </button>
                              <AnimatePresence initial={false}>
                                {detailsOpen && (
                                  <motion.div
                                    key={`details-${foundationLabel}`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: "easeOut" }}
                                    className="overflow-hidden border-t border-white/[0.05] bg-black/25"
                                  >
                                    <div className="px-3 py-3 space-y-3">
                                      {tiers.map((svc) => {
                                        const d = SERVICE_DETAILS[svc.name];
                                        const displayName = getServiceDisplayName(svc.name);
                                        if (!d) return null;
                                        return (
                                          <div key={svc.id} className="rounded-lg border border-white/[0.04] bg-zinc-950/40 p-2.5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-1.5">{displayName}</p>
                                            <ul className="space-y-0.5 mb-1.5">
                                              {d.included.slice(0, 4).map(item => (
                                                <li key={item} className="flex items-start gap-1.5 text-[10.5px] text-zinc-300 leading-snug">
                                                  <Check size={9} className="text-emerald-400 shrink-0 mt-[3px]" strokeWidth={3} />
                                                  <span>{item}</span>
                                                </li>
                                              ))}
                                            </ul>
                                            {d.notIncluded.length > 0 && (
                                              <p className="text-[9.5px] text-zinc-500 italic leading-snug">
                                                <span className="text-amber-500/80 font-bold">Not included:</span>{" "}
                                                {d.notIncluded[0].split(" — ")[0]}
                                                {d.notIncluded.length > 1 && ` + ${d.notIncluded.length - 1} more`}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        };

                        return (
                          <div className="flex flex-col gap-2">
                            {renderFoundationCard("Interior", interiorTier)}
                            {renderFoundationCard("Interior + Exterior", fullTier, { gold: true })}
                            {renderFoundationCard("Exterior", exteriorTier)}
                          </div>
                        );
                      })()}

                      {/* Light Detailing card moved to TOP of Step 1 (see above).
                          The expanded picker (when Light Detailing is the selected
                          service) renders further down in the wizard step 1 branch. */}

                      {/* Legacy Ultimate hero card — removed; Reset — Interior is now
                          rendered inside the Interior section via renderTierCard. */}
                      {false && ultimate.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="h-px flex-1 bg-[#D4AF37]/25" />
                            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">The Ultimate</span>
                            <div className="h-px flex-1 bg-[#D4AF37]/25" />
                          </div>
                          {ultimate.map((service) => {
                            const detailsOpen = expandedDetailPkg === service.name;
                            return (
                            <div
                              key={service.id}
                              className="relative w-full rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.10] via-zinc-900/70 to-zinc-950/70 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/80 hover:shadow-[0_0_36px_rgba(212,175,55,0.18)] group text-left"
                            >
                              {/* Top shimmer bar */}
                              <div className="h-[2px] bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40" />

                              {/* Main select region */}
                              <button
                                type="button"
                                onClick={() => onSelectService(service)}
                                className="w-full text-left active:scale-[0.99] transition-transform"
                              >
                                <div className="p-5">
                                  {/* Header row: icon + title + price */}
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                                        <Crown size={20} className="text-[#D4AF37]" fill="currentColor" strokeWidth={1.5} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 mb-1">
                                          <span className="text-[8px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Flagship</span>
                                        </div>
                                        <div className="text-base font-black text-white tracking-tight leading-tight">
                                          {service.name}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Seats removed · Every crevice reset</div>
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">From</div>
                                      <div className="text-xl font-black text-[#D4AF37] tabular-nums leading-none mt-0.5">${service.price_small}</div>
                                      <div className="text-[8px] font-bold text-zinc-500 mt-0.5">to ${service.price_extra_large}</div>
                                    </div>
                                  </div>

                                  {/* Feature bullets */}
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-3 border-t border-[#D4AF37]/15">
                                    {[
                                      "Seats out — deep steam clean",
                                      "Full shampoo · seats + carpet",
                                      "Every crevice vacuumed",
                                      "Leather conditioned",
                                      "Disinfect + protect surfaces",
                                      "Trunk fully included",
                                    ].map((f) => (
                                      <div key={f} className="flex items-start gap-1.5 text-[10px] text-zinc-400 leading-tight">
                                        <Check size={9} className="text-[#D4AF37] shrink-0 mt-0.5" strokeWidth={3} />
                                        <span>{f}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Bundle hint */}
                                  <div className="mt-3 pt-3 border-t border-[#D4AF37]/15 flex items-center gap-2">
                                    <Zap size={10} className="text-[#D4AF37] shrink-0" fill="currentColor" />
                                    <span className="text-[10px] text-zinc-400 leading-tight">
                                      <span className="text-[#D4AF37] font-bold">Add + Exterior at checkout</span> — save $55 vs. buying separately, unlocks 20% off add-ons
                                    </span>
                                  </div>
                                </div>
                              </button>

                              {/* What's included / not included — full breakdown */}
                              <button
                                type="button"
                                onClick={() => setExpandedDetailPkg(prev => prev === service.name ? null : service.name)}
                                aria-expanded={detailsOpen}
                                className="w-full flex items-center justify-center gap-1.5 border-t border-[#D4AF37]/20 py-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/[0.04] active:bg-[#D4AF37]/[0.08] transition-colors"
                              >
                                <Info size={11} />
                                {detailsOpen ? "Hide details" : "See everything included"}
                                <ChevronDown size={11} className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} />
                              </button>
                              <AnimatePresence initial={false}>
                                {detailsOpen && (
                                  <motion.div
                                    key="ult-details"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: "easeOut" }}
                                    className="overflow-hidden border-t border-[#D4AF37]/20 bg-black/25"
                                  >
                                    <div className="px-5 py-4 space-y-3">
                                      {/* Included — full list */}
                                      <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1.5">
                                          Included in {service.name}
                                        </p>
                                        <ul className="space-y-1">
                                          {[
                                            "Seats REMOVED from vehicle for deep steam clean",
                                            "Full shampoo of seats, carpet & floor mats",
                                            "Steam clean every surface, vacuum every crevice",
                                            "Heavy pet hair extraction",
                                            "Salt stain removal + neutralization",
                                            "Leather conditioning (if applicable)",
                                            "Clay bar paint decontamination",
                                            "Disinfect + protect all interior surfaces",
                                            "Interior glass streak-free (all windows)",
                                            "Rubber / carpet mats cleaned and protected",
                                            "Cabin deodorize",
                                            "Trunk fully included",
                                          ].map((item) => (
                                            <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-300 leading-snug">
                                              <Check size={10} className="text-emerald-400 shrink-0 mt-[3px]" strokeWidth={3} />
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      {/* Not included */}
                                      <div className="pt-2.5 border-t border-[#D4AF37]/15">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1.5">
                                          Not included <span className="text-zinc-500 font-bold">· add-on required</span>
                                        </p>
                                        <ul className="space-y-1">
                                          {[
                                            "Exterior wash, wheels, tires, trim (add + Exterior Detail bundle: $65 sedan / $80 SUV / $95 3-row)",
                                            "Cloudy / yellow headlight restoration (Headlight Restoration add-on)",
                                            "Engine bay degrease + dressing (Engine Bay Detail add-on)",
                                            "Smoke / pet odor elimination (Ozone Treatment add-on)",
                                            "Long-term 5-year Gentech ceramic coating (Premium Ceramic add-on)",
                                          ].map((item) => (
                                            <li key={item} className="flex items-start gap-1.5 text-[11px] text-zinc-400 leading-snug">
                                              <XCircle size={10} className="text-amber-500/70 shrink-0 mt-[3px]" strokeWidth={2.5} />
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                        <p className="text-[10px] text-zinc-500 mt-2 italic leading-snug">
                                          You'll get a chance to add any of these on the next step.
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Paint Correction link — subtle nudge */}
                      <a
                        href="/paint-correction"
                        className="block rounded-xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3 hover:border-[#D4AF37]/30 hover:bg-zinc-900/40 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Gem size={13} className="text-[#D4AF37]/70" fill="currentColor" />
                            <div>
                              <div className="text-xs font-black text-zinc-200 group-hover:text-white leading-tight">Need Paint Correction?</div>
                              <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">1-Step, 2-Step + Premium Ceramic Coating</div>
                            </div>
                          </div>
                          <ChevronRight size={13} className="text-zinc-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </a>
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
              {/* ── HEADER (Steps 2-4) — polished 4-step tracker ────────────────
                  Detail · Vehicle · Schedule · Confirm. Same tracker component
                  is also rendered on the Step 1 "Choose Your Detail" screen so
                  the customer sees a consistent journey top-to-bottom. */}
              <div className="sticky top-0 z-10 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-zinc-800/50 shrink-0 bg-inherit">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {isSubscription ? "Maintenance Club Setup" : "Book Your Detail"}
                  </h2>
                  {step === 1 && selectedService && onClearService && (
                    <button
                      type="button"
                      onClick={() => {
                        discardDraftAndReset();
                        onClearService();
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/[0.1] active:scale-[0.97] transition-all"
                      aria-label="Choose a different service"
                    >
                      <ChevronLeft size={11} strokeWidth={3} />
                      Change
                    </button>
                  )}
                </div>

                {/* Selected-service chip with running total */}
                {selectedService && (() => {
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
                  const runningTotal = totalAfterDiscount > 0 ? totalAfterDiscount : null;
                  const headerPrice = fromBuilder ? buildTotal : (runningTotal ?? computedPrice ?? null);
                  return (
                    <div className="rounded-xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/[0.06] to-transparent px-3 py-2 flex items-center justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]/70">Your Detail</div>
                        <div className="text-xs font-black text-white truncate">{displayName}</div>
                        {selectedAddons.length > 0 && (
                          <div className="text-[9px] text-zinc-500 mt-0.5">
                            {selectedAddons.length} add-on{selectedAddons.length === 1 ? "" : "s"}
                            {bundleDiscount > 0 && <span className="text-violet-400 font-bold"> · −${bundleDiscount}</span>}
                            {ceramicSavings > 0 && <span className="text-cyan-400 font-bold"> · −${ceramicSavings}</span>}
                          </div>
                        )}
                      </div>
                      {headerPrice != null && (
                        <div className="shrink-0 text-right">
                          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Total</div>
                          <div className="text-base font-black text-[#D4AF37] tabular-nums leading-none mt-0.5">
                            ${typeof headerPrice === "number" ? Math.round(headerPrice) : headerPrice}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Polished 4-step tracker — Detail · Vehicle · Schedule · Confirm.
                    "Detail" is always done here (customer picked a service upstream).
                    Hidden only when builder skips the flow. */}
                <div className={`flex items-start ${prefilledAddonIds !== null ? "hidden" : ""}`}>
                  {STEPS.map((s, i) => {
                    // "Detail" (num: 0) is complete once we're in the wizard.
                    const isDone = s.num === 0 || step > s.num;
                    const isActive = step === s.num;
                    return (
                      <div key={s.num} className="flex items-start flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black transition-all duration-300 ${
                              isActive
                                ? "bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-black shadow-[0_0_18px_rgba(212,175,55,0.45)] ring-2 ring-[#D4AF37]/40 ring-offset-2 ring-offset-zinc-950"
                                : isDone
                                  ? "bg-[#D4AF37]/[0.08] border border-[#D4AF37]/60 text-[#D4AF37]"
                                  : "bg-transparent border border-white/10 text-zinc-600"
                            }`}
                          >
                            {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase tracking-[0.2em] leading-tight text-center ${
                              isActive
                                ? "text-[#D4AF37]"
                                : isDone
                                  ? "text-zinc-300"
                                  : "text-zinc-600"
                            }`}
                          >
                            {s.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`h-[2px] flex-1 mx-1.5 mt-[18px] rounded-full transition-all duration-500 ease-in-out ${
                              (STEPS[i + 1] && (STEPS[i + 1].num === 0 || step > STEPS[i + 1].num || step === STEPS[i + 1].num))
                                ? "bg-gradient-to-r from-[#D4AF37]/70 to-[#D4AF37]/40"
                                : isDone
                                  ? "bg-gradient-to-r from-[#D4AF37]/50 to-white/[0.06]"
                                  : "bg-white/[0.06]"
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

                      {/* ── GATE: the rest of Step 2 (Vehicle Size + Add-ons + Package Builder)
                          only surfaces once the customer has filled in year, make, AND model.
                          Prevents them from configuring boosts before we know what car it is. */}
                      {(!vehicleYear.trim() || !vehicleMake.trim() || !vehicleModel.trim()) ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/40 px-5 py-6 text-center">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
                            <Car size={18} className="text-zinc-500" strokeWidth={1.75} />
                          </div>
                          <p className="text-[13px] font-black text-zinc-300 tracking-tight">
                            Enter your vehicle above
                          </p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5 max-w-xs mx-auto">
                            Fill in Year, Make, and Model to unlock pricing, boosts, and add-ons for your ride.
                          </p>
                          {/* Live progress indicator */}
                          <div className="flex items-center justify-center gap-2 mt-4">
                            {[
                              { label: "Year",  ok: !!vehicleYear.trim() },
                              { label: "Make",  ok: !!vehicleMake.trim() },
                              { label: "Model", ok: !!vehicleModel.trim() },
                            ].map((f) => (
                              <div
                                key={f.label}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                                  f.ok
                                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                                    : "border-white/[0.06] bg-white/[0.02] text-zinc-600"
                                }`}
                              >
                                {f.ok ? <Check size={8} strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
                                {f.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                      <>
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

                      {/* Light Detailing — item picker (renders when customer
                          has selected Light Detailing from the service list
                          and picked a vehicle size). Live-totals + minimum-2
                          enforcement live inside the picker component. */}
                      {selectedService?.name === "Light Detailing" && vehicleSize && (() => {
                        const basicInterior = services.find(s => s.name === "Interior Detail");
                        const basicExterior = services.find(s => s.name === "Exterior Detail");
                        const basicFull = services.find(s => s.name === "Full Detail");
                        const sizeKeyLD: "sedan" | "suv" | "xl" =
                          vehicleSize === "xl" ? "xl" : vehicleSize === "suv" ? "suv" : "sedan";
                        const getSizedPrice = (svc: Service | undefined): number | undefined => {
                          if (!svc) return undefined;
                          const key = vehicleSize === "sedan"
                            ? "price_medium"
                            : vehicleSize === "suv"
                              ? "price_large"
                              : "price_extra_large";
                          const raw = (svc as any)[key] ?? (svc as any).price_medium ?? 0;
                          return Number(raw);
                        };
                        return (
                          <div className="rounded-2xl border border-amber-500/60 bg-amber-500/[0.04] p-4">
                            <LightDetailingPicker
                              vehicleSize={sizeKeyLD}
                              selectedItemIds={lightDetailItemIds}
                              onToggleItem={(id) => setLightDetailItemIds(prev =>
                                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                              )}
                              basicInteriorPrice={getSizedPrice(basicInterior)}
                              basicExteriorPrice={getSizedPrice(basicExterior)}
                              basicFullPrice={getSizedPrice(basicFull)}
                              onSwitchToBasic={(f) => {
                                setLightDetailItemIds([]);
                                const svc = f === "interior" ? basicInterior : f === "exterior" ? basicExterior : basicFull;
                                if (svc) onSelectService(svc);
                              }}
                              isFirstTimeCustomer={false}
                            />
                          </div>
                        );
                      })()}

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
                            {/* ── Package Builder header — gamified preview ─────────────────
                                Replaces the plain "Enhance Your Detail" section title with a
                                live snapshot of what the customer is building: base service +
                                add-on count + running total + savings unlocked. Feels more
                                like customising a build than checking boxes off a list. */}
                            {!isMarine && !isRV && (() => {
                              // Use the same totals the checkout flow uses so the running total
                              // in this preview matches the final Total exactly — including
                              // ceramic products being excluded from the bundle discount.
                              const runningTotal = Math.max(0, Math.round(totalAfterDiscount));
                              const savings = Math.max(0, Math.round(bundleDiscount + ceramicSavings));
                              const addonCount = selectedAddons.length;
                              const nextTierAt = addonCount < 2 ? 2 : addonCount < 3 ? 3 : addonCount < 4 ? 4 : addonCount < 5 ? 5 : null;
                              const nextTierPct = nextTierAt === 2 ? 5 : nextTierAt === 3 ? 10 : nextTierAt === 4 ? 12 : nextTierAt === 5 ? 15 : null;
                              return (
                                <div className="mb-4 rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-900/50 to-zinc-950/50 shadow-[0_0_24px_rgba(212,175,55,0.06)]">
                                  {/* Top strip — Building label + count */}
                                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-zinc-950/40">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles size={11} className="text-[#D4AF37]" fill="currentColor" />
                                      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
                                        {isUltimate ? "Building Your Ultimate" : "Building Your Package"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                                      {addonCount} {addonCount === 1 ? "add-on" : "add-ons"}
                                    </span>
                                  </div>
                                  {/* Middle — running total + savings */}
                                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Running Total</span>
                                        {savings > 0 && (
                                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                            − ${savings} saved
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-2xl font-black text-white tabular-nums leading-none mt-1">
                                        ${runningTotal}
                                      </div>
                                    </div>
                                    {/* Next tier chip */}
                                    {nextTierAt != null && nextTierPct != null && (
                                      <div className="shrink-0 text-right">
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Next Unlock</div>
                                        <div className="flex items-center gap-1 justify-end">
                                          <span className="text-[10px] font-bold text-zinc-400">Add {nextTierAt - addonCount} more →</span>
                                          <span className="text-xs font-black text-emerald-300 tabular-nums">{nextTierPct}% off</span>
                                        </div>
                                      </div>
                                    )}
                                    {nextTierAt == null && bundlePct > 0 && (
                                      <div className="shrink-0 text-right">
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-0.5">Max Tier</div>
                                        <div className="text-xs font-black text-emerald-300">15% off each</div>
                                      </div>
                                    )}
                                  </div>
                                  {/* Bottom — tier ladder progress */}
                                  <div className="px-4 pb-3 flex items-center gap-1.5">
                                    {[
                                      { c: 2, pct: 5 },
                                      { c: 3, pct: 10 },
                                      { c: 4, pct: 12 },
                                      { c: 5, pct: 15 },
                                    ].map((t) => {
                                      const reached = addonCount >= t.c;
                                      return (
                                        <div
                                          key={t.c}
                                          className={`flex-1 flex items-center justify-center gap-1 px-1 py-1 rounded-lg border text-[9px] font-black transition-all ${
                                            reached
                                              ? "border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-300"
                                              : "border-white/[0.06] bg-white/[0.02] text-zinc-600"
                                          }`}
                                        >
                                          {reached ? <Check size={8} strokeWidth={3} /> : <span>{t.c}+</span>}
                                          <span>{t.pct}%</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="flex items-center justify-center gap-2 mb-3">
                              <Sparkles size={14} className="text-[#D4AF37]" />
                              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                                {isMarine ? "Marine Specialist Add-ons" : isRV ? "RV Specialist Add-ons" : isUltimate ? "Ultimate Upgrades" : "Pick Your Boosts"}
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
                            {/* ── Ultimate + Exterior unlock callout ─────────────
                                Only surfaces when the customer has toggled the Ultimate + Ext
                                add-on. Announces the +20% off on all basic add-ons + $15 off
                                the ceramic upgrade. The Package Builder header above already
                                covers the basic tier ladder so we don't duplicate it here. */}
                            {ultimateExtToggled && (
                              <div className="rounded-xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/[0.10] via-[#D4AF37]/[0.05] to-transparent mb-3 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                                    <Crown size={11} className="text-[#D4AF37]" fill="currentColor" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-black text-[#F3E5AB] leading-tight">
                                      Ultimate + Exterior bonus unlocked
                                    </div>
                                    <div className="text-[9px] text-zinc-500 leading-tight mt-0.5">
                                      +20% off every basic add-on · Ceramic upgrade drops to $30
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ── July 2026 — Package Studio redesign ─────────────
                                Bento-style icon tile grid replaces the old row list.
                                Split into "Boosts" (the 8 basics + specials) and a
                                collapsible "Premium Ceramic" section for advanced picks. */}
                            {(() => {
                              const ADDON_ICON: Record<string, React.ElementType> = {
                                engine_bay:            Wrench,
                                headlight_restore:     Sun,
                                clay_bar:              Layers,
                                upholstery_shampoo:    Sofa,
                                salt_stain_removal:    Snowflake,
                                leather_condition:     Palette,
                                ozone_treatment:       Wind,
                                pet_hair:              PawPrint,
                                ceramic_6_10_upgrade:  Shield,
                                ultimate_ext_addon:    Zap,
                                premium_ceramic_full_body: Gem,
                              };
                              const isPremiumCeramic = (id: string) => id.startsWith("premium_ceramic_") && id !== "premium_ceramic_full_body";
                              // On the Ultimate Interior Reset flow, the "+ Exterior Detail" toggle
                              // gets pulled out of the regular tile list and rendered as a large
                              // premium hero card at the top. Exterior-side boosts (engine bay,
                              // headlight restore, clay bar, ceramic upgrade) stay hidden until
                              // the customer toggles that card on.
                              const EXTERIOR_BOOST_IDS = new Set(["engine_bay", "headlight_restore", "clay_bar", "ceramic_6_10_upgrade"]);
                              const ultimateExtToggleCard = standAlone.find(a => a.id === "ultimate_ext_addon");
                              const ultimateExtToggleOn = selectedAddons.some(a => a.id === "ultimate_ext_addon");
                              const boosts = standAlone.filter(a => !isPremiumCeramic(a.id) && a.id !== "ultimate_ext_addon" && !a.id.startsWith("gentech_5yr_"));
                              const ceramicSections = standAlone.filter(a => isPremiumCeramic(a.id));
                              // Interior-side always shown. Exterior-side gated by the toggle.
                              const visibleBoosts = isUltimate
                                ? boosts.filter(a => !EXTERIOR_BOOST_IDS.has(a.id) || ultimateExtToggleOn)
                                : boosts;

                              return (
                                <>
                                  {/* Ultimate + Exterior — big premium hero card at the top */}
                                  {isUltimate && ultimateExtToggleCard && (() => {
                                    const addon = ultimateExtToggleCard;
                                    const isSelected = ultimateExtToggleOn;
                                    const price = getEffectiveAddonPrice(addon, vehicleSize as string, addonOverrides);
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => toggleAddon(addon)}
                                        aria-pressed={isSelected}
                                        className={`relative w-full rounded-2xl overflow-hidden text-left transition-all duration-300 active:scale-[0.99] mb-4 group ${
                                          isSelected
                                            ? "border border-[#D4AF37]/70 bg-gradient-to-br from-[#D4AF37]/[0.16] via-[#D4AF37]/[0.06] to-zinc-950/70 shadow-[0_0_32px_rgba(212,175,55,0.20)]"
                                            : "border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-900/60 to-zinc-950/60 hover:border-[#D4AF37]/70 hover:shadow-[0_0_28px_rgba(212,175,55,0.14)]"
                                        }`}
                                      >
                                        {/* Top shimmer bar */}
                                        <div className="h-[2px] bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40" />
                                        <div className="p-4">
                                          {/* Header row: badge + toggle indicator */}
                                          <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40">
                                              <Zap size={9} className="text-[#D4AF37]" fill="currentColor" />
                                              <span className="text-[8px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Bundle Upgrade</span>
                                            </div>
                                            {isSelected ? (
                                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black">
                                                <Check size={9} strokeWidth={3.5} />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Added</span>
                                              </div>
                                            ) : (
                                              <div className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]/70">Tap to add</div>
                                            )}
                                          </div>

                                          {/* Title + price row */}
                                          <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                                                isSelected
                                                  ? "bg-[#D4AF37]/25 border border-[#D4AF37]/60 shadow-[0_0_16px_rgba(212,175,55,0.20)]"
                                                  : "bg-[#D4AF37]/10 border border-[#D4AF37]/30"
                                              }`}>
                                                <Droplets size={20} className="text-[#D4AF37]" strokeWidth={1.75} />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[15px] font-black text-white tracking-tight leading-tight">
                                                  + Exterior Detail
                                                </div>
                                                <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                                                  Full hand wash · Wheels · Trim · Clay bar · 1–3mo ceramic
                                                </div>
                                              </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Add</div>
                                              <div className="text-lg font-black text-[#D4AF37] tabular-nums leading-none mt-0.5">+${price}</div>
                                            </div>
                                          </div>

                                          {/* Value bullets */}
                                          <div className="pt-3 border-t border-[#D4AF37]/20 grid grid-cols-1 gap-1.5">
                                            <div className="flex items-center gap-1.5 text-[10px] leading-tight">
                                              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                                <Check size={7} className="text-emerald-400" strokeWidth={3.5} />
                                              </div>
                                              <span className="text-emerald-300 font-bold">Saves $55</span>
                                              <span className="text-zinc-500">vs. buying Exterior Detail separately</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] leading-tight">
                                              <div className="w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                                                <Sparkles size={7} className="text-[#D4AF37]" strokeWidth={2.5} />
                                              </div>
                                              <span className="text-[#D4AF37] font-bold">Unlocks 20% off</span>
                                              <span className="text-zinc-500">all exterior add-ons below</span>
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })()}

                                  {/* Section divider on Ultimate flow when toggle is on */}
                                  {isUltimate && ultimateExtToggleOn && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-px flex-1 bg-white/[0.06]" />
                                      <span className="text-[8px] font-black uppercase tracking-[0.24em] text-zinc-500">Boost Your Detail</span>
                                      <div className="h-px flex-1 bg-white/[0.06]" />
                                    </div>
                                  )}

                                  {/* Boost tile list — single column, full names visible */}
                                  {visibleBoosts.length > 0 && (
                                    <div className="flex flex-col gap-1.5 mb-3">
                                      {visibleBoosts.map((addon) => {
                                        const isSelected = selectedAddons.some(a => a.id === addon.id);
                                        // Flag add-ons that are baked into the picked package (Refresh
                                        // Interior includes shampoo/salt/pet-hair; Reset includes all
                                        // of those plus leather/clay; Reset — Full also includes headlight
                                        // + engine bay). Prevents double-charging and signals "already
                                        // covered" in the picker.
                                        const isBakedIntoService = isAddonIncludedInService(selectedService?.name, addon.id);
                                        const isIncluded = isBakedIntoService || (isUltimateUpgradeable && INCLUDED_IN_ULTIMATE_IDS.includes(addon.id));
                                        const isSpecial = addon.id === "ultimate_ext_addon" || addon.id === "premium_ceramic_full_body";
                                        // Clay Bar is baked into the Ultimate + Exterior bundle. When the toggle
                                        // is on, mark it "Included" so the customer sees they're getting it
                                        // without charging or double-toggling. Non-clickable in that state.
                                        const isBundleIncluded = isUltimate && ultimateExtToggleOn && addon.id === "clay_bar";
                                        const effectiveIncluded = isIncluded || isBundleIncluded;
                                        const AddonIcon = ADDON_ICON[addon.id] ?? Sparkles;
                                        const base = getEffectiveAddonPrice(addon, vehicleSize as string, addonOverrides);
                                        // Ceramic products (6-10mo spray, Premium Ceramic, Gentech) never receive
                                        // the basic bundle discount — they're flat-priced premium items.
                                        const ceramicShieldsDiscount = isCeramicOrSpecial(addon.id);
                                        const discounted = ceramicShieldsDiscount ? base : addonDiscountedPrice(addon.id, base, bundlePct);
                                        const isDiscounted = isSelected && !isBundleIncluded && !ceramicShieldsDiscount && bundlePct > 0 && discounted < base;
                                        // Predicted price if the customer adds this tile — factors in the
                                        // NEXT tier they'd land on after adding one more qualifying add-on.
                                        // Skips ceramic sections + special add-ons + already-selected items.
                                        const contributesToBundle = !ceramicShieldsDiscount && !isBundleIncluded && !isSelected;
                                        const predictedCount = contributesToBundle ? qualifyingAddons.length + 1 : qualifyingAddons.length;
                                        const predictedPct = effectiveBundlePctFor(predictedCount, ultimateExtToggled);
                                        const predictedPrice = ceramicShieldsDiscount ? base : addonDiscountedPrice(addon.id, base, predictedPct);
                                        const showPrediction = !isSelected && !isBundleIncluded && !ceramicShieldsDiscount && predictedPct > 0 && predictedPrice < base;
                                        return (
                                          <button
                                            key={addon.id}
                                            type="button"
                                            onClick={() => { if (!isBundleIncluded) toggleAddon(addon); }}
                                            aria-pressed={isSelected}
                                            disabled={isBundleIncluded}
                                            title={isBundleIncluded ? "Clay bar is included in the + Exterior Detail bundle" : undefined}
                                            className={`relative rounded-xl px-2.5 py-2 text-left transition-all duration-200 border overflow-hidden group active:scale-[0.98] flex items-center gap-2.5 ${
                                              isBundleIncluded
                                                ? "border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.10] via-[#D4AF37]/[0.04] to-zinc-950/60 cursor-default"
                                                : isSelected
                                                  ? "border-[#D4AF37]/60 bg-gradient-to-br from-[#D4AF37]/[0.14] via-[#D4AF37]/[0.05] to-zinc-950/60 shadow-[0_0_16px_rgba(212,175,55,0.12)]"
                                                  : isSpecial
                                                    ? "border-[#D4AF37]/25 bg-gradient-to-br from-zinc-900/70 to-zinc-950/50 hover:border-[#D4AF37]/45"
                                                    : "border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.15] hover:bg-zinc-900/60"
                                            }`}
                                          >
                                            {/* Icon disc */}
                                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                              isBundleIncluded || isSelected
                                                ? "bg-[#D4AF37]/20 border border-[#D4AF37]/40"
                                                : "bg-white/[0.03] border border-white/[0.06] group-hover:bg-white/[0.05]"
                                            }`}>
                                              <AddonIcon size={14} className={isBundleIncluded || isSelected ? "text-[#D4AF37]" : "text-zinc-400"} strokeWidth={1.75} />
                                            </div>

                                            {/* Label + badge chip */}
                                            <div className="flex-1 min-w-0">
                                              <div className={`text-[12px] font-black leading-tight tracking-tight ${
                                                isBundleIncluded ? "text-white" : isSelected ? "text-white" : "text-zinc-100 group-hover:text-white"
                                              }`}>
                                                {addon.label}
                                              </div>
                                              {(effectiveIncluded || isSpecial) && (
                                                <div className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest text-[#D4AF37]/80 mt-0.5">
                                                  {effectiveIncluded ? <Crown size={7} fill="currentColor" /> : <Sparkles size={7} />}
                                                  {isBundleIncluded ? "Included in bundle" : effectiveIncluded ? "Included in Ultimate" : "Bundle"}
                                                </div>
                                              )}
                                            </div>

                                            {/* Price + selected indicator */}
                                            <div className="shrink-0 flex items-center gap-1.5">
                                              <div className="flex flex-col items-end tabular-nums">
                                                {isBundleIncluded ? (
                                                  <span className="text-sm font-black leading-none text-emerald-300">FREE</span>
                                                ) : (
                                                  <>
                                                    {(isDiscounted || showPrediction) && (
                                                      <span className="text-[8px] font-bold text-zinc-600 line-through leading-none">${base}</span>
                                                    )}
                                                    <span className={`text-sm font-black leading-none ${
                                                      isDiscounted || showPrediction ? "text-emerald-300" : isSelected ? "text-[#D4AF37]" : "text-zinc-200"
                                                    }`}>
                                                      +${isDiscounted ? discounted : showPrediction ? predictedPrice : base}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                              {isBundleIncluded ? (
                                                <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center">
                                                  <Crown size={8} className="text-black" fill="currentColor" />
                                                </div>
                                              ) : isSelected ? (
                                                <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center">
                                                  <Check size={9} className="text-black" strokeWidth={3.5} />
                                                </div>
                                              ) : (
                                                <div className="w-4 h-4 rounded-full border border-white/15 group-hover:border-white/30 transition-colors" />
                                              )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Premium Ceramic — categorised into Glass / Body / Rims */}
                                  {ceramicSections.length > 0 && (() => {
                                    const anyCeramicSelected = selectedAddons.some(a => isPremiumCeramic(a.id));
                                    const ceramicPickedCount = selectedAddons.filter(a => isPremiumCeramic(a.id)).length;
                                    const GLASS_IDS = new Set(["premium_ceramic_windshield", "premium_ceramic_side_rear_glass", "premium_ceramic_full_glass"]);
                                    const RIMS_IDS  = new Set(["premium_ceramic_wheels"]);
                                    const glassOpts = ceramicSections.filter(a => GLASS_IDS.has(a.id));
                                    const rimsOpts  = ceramicSections.filter(a => RIMS_IDS.has(a.id));
                                    const bodyOpts  = ceramicSections.filter(a => !GLASS_IDS.has(a.id) && !RIMS_IDS.has(a.id));

                                    const renderGroup = (title: string, Icon: React.ElementType, opts: typeof ceramicSections) => {
                                      if (opts.length === 0) return null;
                                      const groupPicked = opts.filter(a => selectedAddons.some(s => s.id === a.id)).length;
                                      return (
                                        <div className="mt-3 first:mt-2">
                                          <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                                            <Icon size={10} className="text-[#D4AF37]/80" strokeWidth={2} />
                                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">{title}</span>
                                            {groupPicked > 0 && (
                                              <span className="text-[8px] font-black text-[#D4AF37] tabular-nums">{groupPicked} picked</span>
                                            )}
                                          </div>
                                          <div className={`grid gap-1.5 ${opts.length === 1 ? "grid-cols-1" : opts.length === 2 ? "grid-cols-2" : opts.length <= 3 ? "grid-cols-3" : "grid-cols-4"}`}>
                                            {opts.map((addon) => {
                                              const isSelected = selectedAddons.some(a => a.id === addon.id);
                                              const price = getEffectiveAddonPrice(addon, vehicleSize as string, addonOverrides);
                                              const shortLabel = addon.label.replace("Premium Ceramic — ", "").replace(" (pair)", "");
                                              return (
                                                <button
                                                  key={addon.id}
                                                  type="button"
                                                  onClick={() => toggleAddon(addon)}
                                                  aria-pressed={isSelected}
                                                  className={`relative rounded-lg px-2 py-2 text-center border transition-all active:scale-[0.97] ${
                                                    isSelected
                                                      ? "border-[#D4AF37]/60 bg-gradient-to-b from-[#D4AF37]/20 to-[#D4AF37]/[0.05] shadow-[0_0_8px_rgba(212,175,55,0.12)]"
                                                      : "border-white/[0.06] bg-zinc-900/40 hover:border-[#D4AF37]/30"
                                                  }`}
                                                >
                                                  {isSelected && (
                                                    <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[#D4AF37] flex items-center justify-center">
                                                      <Check size={6} className="text-black" strokeWidth={3.5} />
                                                    </div>
                                                  )}
                                                  <div className={`text-[9px] font-black uppercase tracking-wider ${
                                                    isSelected ? "text-[#D4AF37]" : "text-zinc-300"
                                                  }`}>
                                                    {shortLabel}
                                                  </div>
                                                  <div className={`text-[11px] font-black mt-0.5 tabular-nums leading-none ${
                                                    isSelected ? "text-white" : "text-zinc-400"
                                                  }`}>
                                                    +${price}
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    };

                                    return (
                                      <details className="group rounded-xl border border-[#D4AF37]/20 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 overflow-hidden mt-2" open={anyCeramicSelected}>
                                        <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer list-none hover:bg-white/[0.02] transition-colors">
                                          <div className="flex items-center gap-2">
                                            <Gem size={12} className="text-[#D4AF37]" fill="currentColor" />
                                            <div className="text-[12px] font-black text-white leading-tight">Premium Ceramic</div>
                                            <span className="text-[9px] text-zinc-500 leading-tight">· 2-yr, Glass · Body · Rims</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {ceramicPickedCount > 0 && (
                                              <span className="text-[9px] font-black text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-1.5 py-0.5 tabular-nums">
                                                {ceramicPickedCount}
                                              </span>
                                            )}
                                            <ChevronRight size={12} className="text-zinc-500 group-open:rotate-90 transition-transform" />
                                          </div>
                                        </summary>
                                        <div className="px-3 pb-3 pt-1 border-t border-white/[0.05]">
                                          {renderGroup("Glass", Droplets, glassOpts)}
                                          {renderGroup("Body", Car, bodyOpts)}
                                          {renderGroup("Rims", Layers, rimsOpts)}
                                          <p className="text-[8px] text-zinc-500 text-center mt-3 leading-tight">
                                            Volume: 2→5% · 3→10% · 4→15% · 5+→20% off each
                                          </p>
                                        </div>
                                      </details>
                                    );
                                  })()}

                                  {/* ── 5-Year Gentech Graphene — flagship expandable premium card ──
                                      Categorised sections (Windows / Body / Wheels) + Full Package
                                      bundle. Redundant picks auto-disable + darken. */}
                                  {(() => {
                                    const gentechIds = ["gentech_5yr_body", "gentech_5yr_wheels", "gentech_5yr_windshield", "gentech_5yr_windows_front", "gentech_5yr_windows_all", "gentech_5yr_full"];
                                    const gentechAddons = standAlone.filter(a => gentechIds.includes(a.id));
                                    if (gentechAddons.length === 0) return null;
                                    const bodyOpt = gentechAddons.find(a => a.id === "gentech_5yr_body");
                                    const wheelsOpt = gentechAddons.find(a => a.id === "gentech_5yr_wheels");
                                    const windshieldOpt = gentechAddons.find(a => a.id === "gentech_5yr_windshield");
                                    const frontWindowsOpt = gentechAddons.find(a => a.id === "gentech_5yr_windows_front");
                                    const allWindowsOpt = gentechAddons.find(a => a.id === "gentech_5yr_windows_all");
                                    const fullBundleOpt = gentechAddons.find(a => a.id === "gentech_5yr_full");
                                    const windowOpts = [windshieldOpt, frontWindowsOpt, allWindowsOpt].filter(Boolean) as typeof gentechAddons;

                                    // Selection state
                                    const anyGentechSelected = selectedAddons.some(a => gentechIds.includes(a.id));
                                    const gentechCount = selectedAddons.filter(a => gentechIds.includes(a.id)).length;
                                    const fullPackageSelected = selectedAddons.some(a => a.id === "gentech_5yr_full");
                                    const allWindowsSelected = selectedAddons.some(a => a.id === "gentech_5yr_windows_all");

                                    // Compute the "supersede" state for each addon.
                                    const isSupersededByFull = (id: string) =>
                                      fullPackageSelected && id !== "gentech_5yr_full";
                                    const isSupersededByAllWindows = (id: string) =>
                                      allWindowsSelected && (id === "gentech_5yr_windshield" || id === "gentech_5yr_windows_front");

                                    const renderSectionButton = (addon: typeof gentechAddons[number]) => {
                                      const isSelected = selectedAddons.some(a => a.id === addon.id);
                                      const price = getEffectiveAddonPrice(addon, vehicleSize as string, addonOverrides);
                                      const shortLabel = addon.label.replace("5-Yr Gentech — ", "").replace("Full Package (Body + Wheels + All Glass)", "Full Package");
                                      const superseded = isSupersededByFull(addon.id) || isSupersededByAllWindows(addon.id);
                                      const supersedeSource = isSupersededByFull(addon.id) ? "Full Package" : "All Windows";
                                      return (
                                        <button
                                          key={addon.id}
                                          type="button"
                                          onClick={() => { if (!superseded) toggleAddon(addon); }}
                                          aria-pressed={isSelected}
                                          disabled={superseded}
                                          title={superseded ? `Already included in ${supersedeSource}` : undefined}
                                          className={`relative rounded-xl px-2 py-2 text-center border transition-all active:scale-[0.97] overflow-hidden ${
                                            superseded
                                              ? "border-white/[0.04] bg-zinc-950/50 opacity-40 cursor-not-allowed"
                                              : isSelected
                                                ? "border-[#D4AF37]/70 bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/[0.06] shadow-[0_0_10px_rgba(212,175,55,0.18)]"
                                                : "border-white/[0.06] bg-zinc-900/40 hover:border-[#D4AF37]/40 hover:bg-zinc-900/60"
                                          }`}
                                        >
                                          {superseded && (
                                            <div className="absolute top-1 right-1">
                                              <Lock size={9} className="text-zinc-600" strokeWidth={2} />
                                            </div>
                                          )}
                                          {isSelected && !superseded && (
                                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                                              <Check size={7} className="text-black" strokeWidth={3.5} />
                                            </div>
                                          )}
                                          <div className={`text-[9px] font-black uppercase tracking-wider leading-tight ${
                                            superseded ? "text-zinc-600" : isSelected ? "text-[#D4AF37]" : "text-zinc-200"
                                          }`}>
                                            {shortLabel}
                                          </div>
                                          <div className={`text-[11px] font-black mt-1 tabular-nums leading-none ${
                                            superseded ? "text-zinc-700 line-through" : isSelected ? "text-white" : "text-zinc-400"
                                          }`}>
                                            +${price}
                                          </div>
                                          {superseded && (
                                            <div className="text-[7px] font-bold uppercase tracking-widest text-zinc-600 mt-1 leading-tight">
                                              Included
                                            </div>
                                          )}
                                        </button>
                                      );
                                    };

                                    return (
                                      <details className="group relative rounded-2xl overflow-hidden mt-4 border border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.10] via-zinc-900/70 to-zinc-950/80 shadow-[0_0_36px_rgba(212,175,55,0.15)]" open={anyGentechSelected}>
                                        {/* Ambient glow layer */}
                                        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-60"
                                          style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(212,175,55,0.14) 0%, transparent 55%)" }} />
                                        {/* Top shimmer accent */}
                                        <div className="relative h-[3px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent">
                                          <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#F0D060] to-[#D4AF37]/0 blur-sm opacity-60" />
                                        </div>

                                        <summary className="relative flex items-center justify-between gap-2 px-4 py-3.5 cursor-pointer list-none hover:bg-[#D4AF37]/[0.04] transition-colors">
                                          <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
                                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/10 border border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.22)]">
                                                <Gem size={19} className="text-[#D4AF37]" fill="currentColor" strokeWidth={1.5} />
                                              </div>
                                              {/* Subtle pulse ring */}
                                              <div aria-hidden className="absolute inset-0 rounded-2xl border border-[#D4AF37]/40 animate-pulse" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/30 to-[#D4AF37]/15 border border-[#D4AF37]/60 mb-1">
                                                <Crown size={8} className="text-[#D4AF37]" fill="currentColor" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.22em] text-[#F3E5AB]">Flagship · 5-Year Warranty</span>
                                              </div>
                                              <div className="text-[14px] font-black text-white leading-tight tracking-tight">Gentech Graphene Ceramic</div>
                                              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">5-year application · Pick your sections</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {anyGentechSelected && (
                                              <span className="text-[9px] font-black text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-full px-2 py-0.5 tabular-nums">
                                                {gentechCount} picked
                                              </span>
                                            )}
                                            <ChevronRight size={15} className="text-[#D4AF37]/70 group-open:rotate-90 transition-transform" />
                                          </div>
                                        </summary>

                                        <div className="relative px-4 pb-4 pt-2 border-t border-[#D4AF37]/25 space-y-3.5">
                                          {/* Windows */}
                                          {windowOpts.length > 0 && (
                                            <div>
                                              <div className="flex items-center justify-between gap-1.5 mb-2 px-0.5">
                                                <div className="flex items-center gap-1.5">
                                                  <Droplets size={11} className="text-[#D4AF37]/90" strokeWidth={2} />
                                                  <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">Windows</span>
                                                </div>
                                                <span className="text-[8px] text-zinc-600 italic">pick one</span>
                                              </div>
                                              <div className="grid grid-cols-3 gap-2">
                                                {windowOpts.map(o => renderSectionButton(o))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Body */}
                                          {bodyOpt && (
                                            <div>
                                              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                                                <Car size={11} className="text-[#D4AF37]/90" strokeWidth={2} />
                                                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">Body</span>
                                              </div>
                                              {renderSectionButton(bodyOpt)}
                                            </div>
                                          )}

                                          {/* Wheels + Calipers */}
                                          {wheelsOpt && (
                                            <div>
                                              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                                                <Layers size={11} className="text-[#D4AF37]/90" strokeWidth={2} />
                                                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">Wheels + Calipers</span>
                                              </div>
                                              {renderSectionButton(wheelsOpt)}
                                            </div>
                                          )}

                                          {/* Full Package Bundle — headline treatment */}
                                          {fullBundleOpt && (() => {
                                            const isSelected = selectedAddons.some(a => a.id === fullBundleOpt.id);
                                            const price = getEffectiveAddonPrice(fullBundleOpt, vehicleSize as string, addonOverrides);
                                            // Calculate what customer would pay if they picked everything separately
                                            const bodyPrice = bodyOpt ? getEffectiveAddonPrice(bodyOpt, vehicleSize as string, addonOverrides) : 0;
                                            const wheelsPrice = wheelsOpt ? getEffectiveAddonPrice(wheelsOpt, vehicleSize as string, addonOverrides) : 0;
                                            const allWindowsPrice = allWindowsOpt ? getEffectiveAddonPrice(allWindowsOpt, vehicleSize as string, addonOverrides) : 0;
                                            const separateTotal = bodyPrice + wheelsPrice + allWindowsPrice;
                                            const savings = Math.max(0, separateTotal - price);
                                            return (
                                              <div className="mt-1 pt-3.5 border-t border-[#D4AF37]/30">
                                                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                                                  <Sparkles size={11} className="text-[#D4AF37]" fill="currentColor" />
                                                  <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Best Value · Complete Package</span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => toggleAddon(fullBundleOpt)}
                                                  aria-pressed={isSelected}
                                                  className={`relative w-full rounded-xl overflow-hidden text-left transition-all active:scale-[0.98] border ${
                                                    isSelected
                                                      ? "border-[#D4AF37]/80 bg-gradient-to-r from-[#D4AF37]/[0.24] via-[#D4AF37]/[0.10] to-[#D4AF37]/[0.05] shadow-[0_0_20px_rgba(212,175,55,0.28)]"
                                                      : "border-[#D4AF37]/50 bg-gradient-to-r from-[#D4AF37]/[0.08] via-[#D4AF37]/[0.03] to-transparent hover:border-[#D4AF37]/80 hover:shadow-[0_0_18px_rgba(212,175,55,0.15)]"
                                                  }`}
                                                >
                                                  <div className="p-3.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                          <Crown size={11} className="text-[#D4AF37]" fill="currentColor" />
                                                          <div className="text-[13px] font-black text-white tracking-tight leading-tight">Full Package · Everything Coated</div>
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 leading-snug">
                                                          Every body panel · Wheels + calipers · All glass
                                                        </div>
                                                        {savings > 0 && (
                                                          <div className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40">
                                                            <Check size={7} className="text-emerald-400" strokeWidth={3.5} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Save ${savings}</span>
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div className="shrink-0 text-right">
                                                        {savings > 0 && (
                                                          <div className="text-[9px] font-bold text-zinc-600 line-through tabular-nums leading-none">
                                                            ${separateTotal}
                                                          </div>
                                                        )}
                                                        <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Add</div>
                                                        <div className="text-lg font-black text-[#D4AF37] tabular-nums leading-none mt-0.5">+${price}</div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </details>
                                    );
                                  })()}
                                </>
                              );
                            })()}

                            <div className="space-y-2 hidden">
                              {/* Legacy list retained but hidden — kept in place so
                                  downstream JSX (seat removal / ceramic / floors / windows)
                                  keeps compiling. All retired lists render empty via
                                  getAddonsForService's July 2026 filter. */}
                              {standAlone.map(() => null)}

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

                      {/* ── Ultimate Upsell — sleek single-line card ── */}
                      <AnimatePresence>
                        {ultimateNudge && (
                          <motion.div
                            key="ultimate-nudge"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="relative overflow-hidden rounded-xl border border-[#D4AF37]/35 bg-gradient-to-r from-[#D4AF37]/[0.08] via-[#D4AF37]/[0.04] to-transparent"
                          >
                            {/* Left gold accent bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[#D4AF37] to-transparent" />

                            <div className="flex items-center gap-2.5 pl-3 pr-2.5 py-2">
                              {/* Icon */}
                              <div className="shrink-0 w-7 h-7 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                                <Crown size={12} className="text-[#D4AF37]" fill="currentColor" />
                              </div>

                              {/* Copy — dynamic per target tier so Basic Full
                                  customers see "Reset — Full" instead of the
                                  interior-only "Ultimate" label. */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-black text-white leading-tight">
                                    Upgrade to {getServiceDisplayName(ultimateNudge.targetName)}
                                  </span>
                                  {ultimateNudge.delta < 0 ? (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                                      Save ${Math.abs(ultimateNudge.delta)}
                                    </span>
                                  ) : ultimateNudge.delta === 0 ? (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                                      Same Price
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-1.5 py-0.5">
                                      +${ultimateNudge.delta}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-zinc-500 leading-tight mt-0.5 truncate">
                                  {ultimateNudge.targetName === "The Reset — Full"
                                    ? "Seats out · full interior + exterior reset in one visit"
                                    : "Seats out · deep shampoo · every crevice reset"}
                                </p>
                              </div>

                              {/* CTA + dismiss */}
                              <div className="shrink-0 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={handleSwitchToUltimate}
                                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hover:opacity-95 shadow-[0_2px_10px_rgba(212,175,55,0.25)]"
                                >
                                  Switch
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUltimateNudgeDismissed(true)}
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.06] transition-all"
                                  aria-label="Dismiss"
                                >
                                  <X size={10} />
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
                      <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.04] via-zinc-900/60 to-zinc-950/70 shadow-[0_0_24px_rgba(212,175,55,0.08)] overflow-hidden">
                        {/* Collapsed header — total is always visible.
                            Tap anywhere to expand the full breakdown. */}
                        <button
                          type="button"
                          onClick={() => setPriceSummaryExpanded(v => !v)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-[#D4AF37]/[0.03] transition-colors"
                          aria-expanded={priceSummaryExpanded}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]/70 mb-1">Grand Total</div>
                            {showDualPrice && computedPrice !== null ? (
                              <>
                                <div className="text-2xl font-black text-white tabular-nums leading-none">
                                  ${totalAfterDiscount.toFixed(2)}
                                  <span className="text-[10px] font-bold text-zinc-500 ml-1.5 uppercase tracking-wider">card</span>
                                </div>
                                <div className="text-sm font-black text-[#D4AF37] tabular-nums mt-1.5">
                                  ${cashTotal.toFixed(2)}
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]/80 ml-1.5">
                                    cash · save ${(totalAfterDiscount - cashTotal).toFixed(0)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="text-2xl font-black text-white tabular-nums leading-none">
                                {computedPrice !== null ? `$${totalAfterDiscount.toFixed(2)}` : "—"}
                              </div>
                            )}
                            {(bundleDiscount > 0 || ceramicSavings > 0 || loyaltyDiscountAmount > 0 || couponDiscount > 0 || multiVehicleDiscount > 0) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(bundleDiscount + ceramicSavings) > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/[0.10] border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                                    <Check size={7} strokeWidth={3.5} />
                                    Saved ${(bundleDiscount + ceramicSavings).toFixed(0)}
                                  </span>
                                )}
                                {loyaltyDiscountAmount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/[0.10] border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                                    <Crown size={7} fill="currentColor" />
                                    Loyalty {loyaltyDiscountPct}%
                                  </span>
                                )}
                                {couponDiscount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/[0.10] border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                                    <Tag size={7} strokeWidth={3.5} />
                                    Coupon
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                              priceSummaryExpanded
                                ? "bg-[#D4AF37]/15 border-[#D4AF37]/50"
                                : "bg-white/[0.03] border-white/[0.08]"
                            }`}>
                              <ChevronRight size={16} className={`transition-transform ${priceSummaryExpanded ? "rotate-90 text-[#D4AF37]" : "text-zinc-400"}`} strokeWidth={2.5} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              {priceSummaryExpanded ? "Hide" : "Breakdown"}
                            </span>
                          </div>
                        </button>

                        {/* Expandable breakdown — full line-item receipt */}
                        {priceSummaryExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-[#D4AF37]/20">
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
                        {/* Total row inside the expanded breakdown */}
                        <div className="flex justify-between items-center pt-4 mt-3 border-t border-[#D4AF37]/20 min-w-0">
                          <span className="font-black text-zinc-200 tracking-tight">Total</span>
                          <span className="text-xl font-black text-[#D4AF37] tabular-nums">
                            {computedPrice !== null ? `$${totalAfterDiscount.toFixed(2)}` : "—"}
                          </span>
                        </div>
                        {computedPrice !== null && totalAfterDiscount > 0 && (
                          <p className="text-[10px] text-[#D4AF37]/70 mt-2 text-right">
                            Counts toward your loyalty tier
                          </p>
                        )}
                        </div>
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

                      {/* ── Missing-info explainer ── Shows when payment buttons are
                          disabled so customer knows exactly what to fix. Common cause
                          is page refresh clearing the time slot. Each row is a
                          jump-back button. */}
                      {!canConfirm() && !isSubmitting && !isStripeLoading && (() => {
                        const missing: { key: string; label: string; jumpTo: 1 | 2 | 3 }[] = [];
                        if (!selectedService)          missing.push({ key: "svc",  label: "Service not selected",           jumpTo: 1 });
                        if (!selectedDate)             missing.push({ key: "date", label: "Appointment date not selected",   jumpTo: 2 });
                        if (!selectedTime)             missing.push({ key: "time", label: "Appointment time not selected",   jumpTo: 2 });
                        if (!serviceAddress.trim())    missing.push({ key: "addr", label: "Service address not entered",     jumpTo: 3 });
                        if (!name.trim())              missing.push({ key: "name", label: "Full name not entered",           jumpTo: 3 });
                        if (!phone.trim())             missing.push({ key: "phon", label: "Phone number not entered",        jumpTo: 3 });
                        if (missing.length === 0) return null;
                        // Special-case the most common "page refreshed" cause:
                        // the time slot state resets. Time is the ONLY thing missing
                        // and the rest is filled → likely the refresh case.
                        const timeOnly = missing.length === 1 && missing[0].key === "time";
                        return (
                          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent overflow-hidden">
                            <div className="flex items-start gap-2.5 px-4 py-3 border-b border-amber-500/20">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                                <AlertCircle size={15} className="text-amber-400" strokeWidth={2} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-black text-amber-100 leading-tight tracking-tight">
                                  {timeOnly ? "Time slot needs re-selection" : `${missing.length} thing${missing.length === 1 ? "" : "s"} left before you can book`}
                                </div>
                                <div className="text-[10px] text-amber-200/70 leading-tight mt-0.5">
                                  {timeOnly
                                    ? "Looks like the page refreshed — please pick your time again to continue."
                                    : "Payment buttons unlock once every item below is filled in."}
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-2 space-y-1">
                              {missing.map((m) => (
                                <button
                                  key={m.key}
                                  type="button"
                                  onClick={() => {
                                    setStepDirection(-1);
                                    setStep(m.jumpTo);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-amber-500/[0.06] transition-colors group"
                                >
                                  <div className="w-4 h-4 rounded-full border border-amber-500/50 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                                  </div>
                                  <div className="flex-1 text-[11px] font-bold text-amber-100/90 group-hover:text-amber-100">
                                    {m.label}
                                  </div>
                                  <div className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest text-amber-400/70 group-hover:text-amber-400 shrink-0">
                                    Fix
                                    <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

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
