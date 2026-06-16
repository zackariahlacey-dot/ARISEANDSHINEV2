"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  useAdminBookings,
  useUpdateBookingStatus,
  useSendOnMyWay,
  useHandleNoShow,
  useRescheduleBooking,
  useServices,
  useDeleteBooking,
  useOperatingHours,
  useBlockedDates,
  useToggleBlockedDate,
  useUpdateOperatingHours,
} from "@/hooks/use-admin-data";
import {
  adminQuickBookAction,
  getBookedSlotsAction,
  blockPersonalTimeAction,
  deletePersonalBlockAction,
  updateBookingDetailsAction,
  blockRestOfDayAction,
  updateBookingDurationAction,
} from "@/app/actions/adminActions";
import { sendStripePaymentLink, getPaymentLinkUrl, markPaymentLinkSent } from "@/app/actions/sendStripePaymentLink";
import { markBookingPaidCash } from "@/app/actions/markBookingPaidCash";
import { BookingVehiclesPanel } from "@/components/admin/BookingVehiclesPanel";
import { cashPriceFor } from "@/lib/cashPricing";
import { useQuery } from "@tanstack/react-query";
import { getSqueezeRequests, updateSqueezeStatus, deleteSqueezeRequest, type SqueezeRequest } from "@/app/actions/squeezeActions";
import { useToast } from "@/components/admin/Toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";
import { SubNav, SCHEDULE_SUBNAV } from "@/components/admin/SubNav";
import { PhotoReviewPanel } from "@/components/admin/PhotoReviewPanel";
import { listContractors, type ContractorSummary } from "@/app/actions/contractorAdminActions";
import { manuallyAssignBooking } from "@/app/actions/autoAssignBooking";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, MapPin,
  Phone, MessageSquare, Navigation, Check, CheckCircle2, X, Trash2,
  RotateCcw, Loader2, Car, DollarSign, Lock, Zap, Send,
  Copy, Pencil, StickyNote, Mail, AlertCircle, ClipboardCheck,
  UserPlus, AlertTriangle,
} from "lucide-react";
import {
  format, startOfMonth, getDay, getDaysInMonth,
  addMonths, subMonths, isSameDay, isToday, isBefore, startOfDay, parseISO,
} from "date-fns";
import { AddressAutocomplete } from "@/components/landing/AddressAutocomplete";
import { cn } from "@/lib/utils";
import {
  checkSlotConflict, getDurationMins, timeToMins, minsToDisplay, to12h, to24h,
  getAvailableSlots,
} from "@/lib/availability";

// ── Field helpers ───────────────────────────────────────────────────────────
function bName(b: any): string {
  return b.customer_name ?? ([b.profiles?.first_name, b.profiles?.last_name].filter(Boolean).join(" ") || "Unknown");
}
function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return p;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}
function bPhone(b: any): string | null { return b.customer_phone ?? b.profiles?.phone ?? null; }
function bEmail(b: any): string | null { return b.customer_email ?? b.profiles?.email ?? null; }
function bService(b: any): string {
  const raw = b.service_name ?? b.services?.name ?? "Detail";
  const lower = raw.toLowerCase();
  // Builder bookings (Interior/Exterior/Full Detail) display as "Custom Package".
  // Admin still sees the underlying service name in the Pricing Breakdown.
  if (lower === "interior detail") return "Custom Package (Interior)";
  if (lower === "exterior detail") return "Custom Package (Exterior)";
  if (lower === "full detail") return "Custom Package (Full)";
  return raw;
}
function bAddress(b: any): string | null {
  if (b.service_address) return b.service_address;
  const m = b.notes?.match(/📍 Service Location:\s*(.+)/);
  return m ? m[1].trim() : null;
}
function bVehicle(b: any): string {
  return [b.vehicle_year ?? b.vehicles?.year, b.vehicle_make ?? b.vehicles?.make, b.vehicle_model ?? b.vehicles?.model]
    .filter(Boolean).join(" ");
}
function formatTime(t: string): string {
  if (!t) return "";
  return to12h(t.slice(0, 5));
}

// ── Payment type helper ─────────────────────────────────────────────────────
function payType(b: any): "paid" | "cash" | "unknown" {
  if (b.payment_method === "pay_now") return "paid";
  if (b.payment_method === "pay_at_arrival") return "cash";
  const n = (b.notes ?? "").toLowerCase();
  if (n.includes("stripe") || n.includes("paid online")) return "paid";
  if (n.includes("pay at arrival") || n.includes("admin quick book") || n.includes("admin-created")) return "cash";
  return "unknown";
}

// ── Day-view default hours (used for quick-book slot range) ─────────────────
// Customer-facing operating hours come from `operating_hours`. The TIMELINE
// extends wider (5 AM – 11 PM) so admin can book early/late jobs that don't
// fit the public window.
const DAY_START_HOUR = 7;
const DAY_END_HOUR   = 20;
const TIMELINE_DAY_START_HOUR = 5;
const TIMELINE_DAY_END_HOUR   = 23;

// ── Shared add-on data (mirrors BookingModal) ──────────────────────────────
const ADMIN_ADDONS = [
  // Vehicle — standard
  { id: "engine_bay",        label: "Engine Bay Detail",                     price: 50  },
  { id: "headlight_restore", label: "Headlight Restoration",                 price: 60  },
  { id: "odor_bomb",         label: "Strong Odor Elimination",               price: 75  },
  { id: "upholstery_shampoo",label: "Carpet & Upholstery Shampoo",           price: 75  },
  { id: "uv_interior",       label: "UV Protection & Interior Restoration",  price: 35  },
  { id: "leather_condition", label: "Leather Conditioning",                  price: 45  },
  { id: "clay_bar",          label: "Clay Bar Treatment",                    price: 50  },
  { id: "pet_hair",          label: "Heavy Pet Hair Removal",                price: 50  },
  { id: "tar_bug",           label: "Tar, Bug & Sap Removal",               price: 35  },
  // Build Your Package add-ons
  { id: "headliner_clean",   label: "Headliner Cleaning",                    price: 40  },
  { id: "salt_stain_removal",label: "Salt Stain Removal & Prevention",       price: 50  },
  { id: "steam_sanitation",  label: "Steam Sanitation (free at 3+ addons)",  price: 45  },
  { id: "seat_removal",      label: "Seat Removal — Deepest Clean",          price: 125 },
  { id: "trim_dressing",     label: "Rubber, Plastics & Vinyl Dressing",     price: 30  },
  { id: "mech_chem_decon",   label: "Mechanical & Chemical Decontamination", price: 85  },
  { id: "salt_recovery_addon", label: "Salt Recovery — Undercarriage Add-on", price: 85  },
  { id: "floor_1",           label: "Floorboard Shampoo – 1 Section",       price: 30  },
  { id: "floor_2",           label: "Floorboard Shampoo – 2 Sections",      price: 45  },
  { id: "floor_all",         label: "Floorboard Shampoo – All",             price: 60  },
  // Vehicle — ultimate upgrades
  { id: "polish_ceramic",    label: "1-Step Polish + 2-Year Ceramic",       price: 350 },
  { id: "ozone_treatment",   label: "Ozone Odor Elimination",               price: 75  },
  // 2-Year Graphene Window Coating (flat-priced, 3-tier)
  { id: "window_coat_windshield", label: "2-Year Graphene Window — Windshield",       price: 100 },
  { id: "window_coat_front",      label: "2-Year Graphene Window — Front 3 Windows",  price: 150 },
  { id: "window_coat_all",        label: "2-Year Graphene Window — All Windows",      price: 250 },
  // 2-Year Pro Ceramic Sealant (size-tier priced; defaults to small tier)
  { id: "ceramic_3yr",            label: "2-Year Pro Ceramic Sealant",                price: 250 },
  // Wheel & Caliper Ceramic Coating (flat price)
  { id: "wheel_ceramic",          label: "Wheel & Caliper Ceramic Coating",           price: 125 },
  // Ultimate Interior add-on (flat — adds 3 hrs)
  { id: "ultimate_interior",      label: "Ultimate Interior Add-on (+3 hrs)",         price: 175 },
  // Marine
  { id: "marine_isinglass",  label: "Isinglass & Vinyl Windows",            price: 100 },
  { id: "marine_engine_bay", label: "Marine Engine Bay",                    price: 150 },
  // RV
  { id: "rv_awning",         label: "Awning Deep Clean",                    price: 60  },
  { id: "rv_slide_seal",     label: "Slide-Out Seal Conditioning",          price: 50  },
  { id: "rv_roof_coat",      label: "Rubber Roof Sealant Coat",             price: 80  },
  { id: "rv_generator",      label: "Generator Bay Detail",                 price: 75  },
  { id: "rv_step",           label: "Entry Step & Threshold",               price: 30  },
];
const VEHICLE_ADDON_IDS  = ["engine_bay","headlight_restore","odor_bomb","upholstery_shampoo","uv_interior","leather_condition","clay_bar","pet_hair","tar_bug","floor_1","floor_2","floor_all"];
/** Build Your Package interior add-ons — surfaced for Interior + Full bookings */
const BUILDER_INTERIOR_IDS = ["upholstery_shampoo","pet_hair","leather_condition","uv_interior","odor_bomb","steam_sanitation","headliner_clean","salt_stain_removal","seat_removal"];
/** Build Your Package exterior add-ons — surfaced for Exterior + Full bookings */
const BUILDER_EXTERIOR_IDS = ["clay_bar","mech_chem_decon","headlight_restore","trim_dressing","salt_recovery_addon","wheel_ceramic","ceramic_3yr"];
const BOAT_ADDON_IDS     = ["marine_isinglass","marine_engine_bay"];
const RV_ADDON_IDS       = ["rv_awning","rv_slide_seal","rv_roof_coat","rv_generator","rv_step"];
const WINDOW_COATING_ADDON_IDS = ["window_coat_windshield","window_coat_front","window_coat_all"];

/** 2-Year Graphene Window Coating — flat pricing across all sizes (must match BookingModal). */
const WINDOW_COAT_WINDSHIELD_PRICE = 100;
const WINDOW_COAT_FRONT_PRICE      = 150;
const WINDOW_COAT_ALL_PRICE        = 250;

/** 2-Year Pro Ceramic Sealant — size-tier pricing (must match BookingModal). */
const CERAMIC_3YR_PRICES_ADMIN: Record<string, number> = {
  sedan: 300, suv: 350, xl: 400,
};

function getAdminAddonPrice(id: string, vehicleSize: string): number {
  const a = ADMIN_ADDONS.find(x => x.id === id);
  if (!a) return 0;
  if (id === "window_coat_windshield") return WINDOW_COAT_WINDSHIELD_PRICE;
  if (id === "window_coat_front")      return WINDOW_COAT_FRONT_PRICE;
  if (id === "window_coat_all")        return WINDOW_COAT_ALL_PRICE;
  if (id === "ceramic_3yr")            return CERAMIC_3YR_PRICES_ADMIN[vehicleSize] ?? a.price;
  if (id === "upholstery_shampoo" && vehicleSize === "xl") return a.price + 20;
  return a.price;
}

const VEHICLE_SIZES_ADMIN = [
  { value: "sedan", label: "Sedan / Coupe",      key: "price_medium"      },
  { value: "suv",   label: "SUV / Truck",        key: "price_large"       },
  { value: "xl",    label: "3-Row / Work Van",   key: "price_extra_large" },
];

const FOOTAGE_RATES: Record<string, number> = {
  "Boat Interior":               15,
  "Boat Exterior":               20,
  "Boat Full Detail":            32,
  "Boat Showroom Package":       55,
  "RV Exterior Refresh":         18,
  "RV Living Space Reset":       28,
  "RV Ultimate Transformation":  50,
  "RV Oxidation Restoration":    40,
};
const FOOTAGE_MIN: Record<string, number> = {
  "Boat Interior": 15, "Boat Exterior": 15, "Boat Full Detail": 15, "Boat Showroom Package": 15,
  "RV Exterior Refresh": 20, "RV Living Space Reset": 20, "RV Ultimate Transformation": 20, "RV Oxidation Restoration": 20,
};
const BOAT_DISPLAY: Record<string, { name: string; sub: string }> = {
  "Boat Interior":         { name: "Boat Interior",         sub: "$15/ft · 15 ft min" },
  "Boat Exterior":         { name: "Boat Exterior",         sub: "$20/ft · 15 ft min" },
  "Boat Full Detail":      { name: "Boat Full Detail",      sub: "$32/ft · 15 ft min" },
  "Boat Showroom Package": { name: "Marine Showroom Polish", sub: "$55/ft · 15 ft min" },
};
const RV_DISPLAY: Record<string, { name: string; sub: string }> = {
  "RV Exterior Refresh":       { name: "RV Exterior Refresh",       sub: "$18/ft · 20 ft min" },
  "RV Living Space Reset":     { name: "RV Living Space Reset",     sub: "$28/ft · 20 ft min" },
  "RV Ultimate Transformation":{ name: "RV Ultimate Transformation",sub: "$50/ft · 20 ft min" },
  "RV Oxidation Restoration":  { name: "RV Oxidation Restoration",  sub: "$35–45/ft · 20 ft min" },
};

type Pathway = "vehicle" | "boat" | "rv";

/** Prefill when opening quick-book from Admin → Clients (profile + garage) */
export type ClientPrefillForBooking = {
  profileId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vehicles: { id: string; year: number | null; make: string; model: string; size: string }[];
  pathwayHint?: Pathway;
};

function dbSizeToSlug(size: string | null | undefined): string {
  const s = (size || "").toLowerCase();
  // Legacy "small" / "compact" values fold into sedan (compact is gone).
  if (s === "small" || s === "compact" || s === "medium" || s === "sedan") return "sedan";
  if (s === "large" || s === "suv") return "suv";
  if (s === "extra_large" || s === "xl" || s === "xl_truck" || s === "large_suv") return "xl";
  return "sedan";
}

export function NewBookingForm({
  defaultDate,
  services,
  onSuccess,
  onCancel,
  clientPrefill,
  onDirtyChange,
}: {
  defaultDate: string;
  services: any[];
  onSuccess: () => void;
  onCancel: () => void;
  /** When set, step 1 contact fields are filled; vehicle pathway can pick a saved car */
  clientPrefill?: ClientPrefillForBooking | null;
  /** Bubbles up "has the user entered anything" so the parent can guard close */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Step 0 — pathway
  const [pathway, setPathway] = useState<Pathway | null>(null);
  // 4 logical steps after pathway is chosen: client → service → addons → time
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — Client
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [email,   setEmail]   = useState("");
  const [address, setAddress] = useState("");

  // Step 2 — Service details (varies by pathway)
  const [vehicleYear,  setVehicleYear]  = useState("");
  const [vehicleMake,  setVehicleMake]  = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleSize,  setVehicleSize]  = useState("sedan");
  const [serviceId,    setServiceId]    = useState("");
  const [footage,      setFootage]      = useState<number | "">("");
  const [priceOverride,setPriceOverride]= useState("");
  // Duration override (in minutes) — when set, used as total_duration_mins
  // on the booking insert so the slot reflects the admin-chosen length.
  const [durationOverride, setDurationOverride] = useState("");

  // Step 3 — Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Multi-vehicle (vehicle pathway only). Flat tier: $25 ≤ $500 subtotal,
  // $40 otherwise. Only kicks in with 2+ vehicles.
  const ADMIN_MULTI_VEHICLE_SERVICES = [
    "Interior Detail", "Exterior Detail", "Full Detail",
    "Ultimate Interior Reset", "Ultimate Interior + Exterior Reset",
  ];
  const getAdminMultiVehicleDiscount = (subtotal: number, vehicleCount: number): number => {
    if (vehicleCount < 2) return 0;
    return subtotal <= 500 ? 25 : 40;
  };
  type AdminAddlVehicle = {
    vehicleYear: string; vehicleMake: string; vehicleModel: string;
    vehicleSize: string; serviceId: string; serviceName: string; servicePrice: number;
    selectedAddons: string[];
  };
  const [additionalVehicles, setAdditionalVehicles] = useState<AdminAddlVehicle[]>([]);
  const addAdminVehicle = () =>
    setAdditionalVehicles(prev => [...prev, { vehicleYear: "", vehicleMake: "", vehicleModel: "", vehicleSize: "sedan", serviceId: "", serviceName: "", servicePrice: 0, selectedAddons: [] }]);
  const removeAdminVehicle = (i: number) =>
    setAdditionalVehicles(prev => prev.filter((_, idx) => idx !== i));
  const updateAdminVehicle = (i: number, patch: Partial<AdminAddlVehicle>) =>
    setAdditionalVehicles(prev => prev.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  const toggleAdminVehicleAddon = (i: number, addonId: string) =>
    setAdditionalVehicles(prev => prev.map((v, idx) => {
      if (idx !== i) return v;
      const has = v.selectedAddons.includes(addonId);
      return { ...v, selectedAddons: has ? v.selectedAddons.filter(x => x !== addonId) : [...v.selectedAddons, addonId] };
    }));

  // Step 4 — Time
  const [bookingDate,   setBookingDate]   = useState(defaultDate);
  const [bookingTime,   setBookingTime]   = useState("");
  const [notes,         setNotes]         = useState("");
  const [bookedSlots,   setBookedSlots]   = useState<any[]>([]);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [operatingHours,setOperatingHours]= useState<any>(null);
  const [showOverlapConfirm, setShowOverlapConfirm] = useState(false);
  const [slotPeek, setSlotPeek] = useState<any | null>(null);  // booked-slot detail popup

  /** When set, reuse this vehicles row instead of inserting a new one (vehicle pathway only) */
  const [existingVehicleId, setExistingVehicleId] = useState<string | null>(null);

  // Tell the parent whenever the user has put anything meaningful into the
  // form — used to confirm before closing/discarding the booking.
  useEffect(() => {
    if (!onDirtyChange) return;
    const prefilled = !!clientPrefill;
    const contactChanged = prefilled
      ? false
      : !!(name || phone || email || address);
    const dirty = !!(
      pathway !== null ||
      step > 1 ||
      contactChanged ||
      vehicleYear || vehicleMake || vehicleModel ||
      serviceId || footage !== "" || priceOverride || durationOverride ||
      selectedAddons.length > 0 ||
      additionalVehicles.length > 0 ||
      bookingTime || notes
    );
    onDirtyChange(dirty);
  }, [
    onDirtyChange, clientPrefill,
    pathway, step,
    name, phone, email, address,
    vehicleYear, vehicleMake, vehicleModel,
    serviceId, footage, priceOverride, durationOverride,
    selectedAddons, additionalVehicles,
    bookingTime, notes,
  ]);

  useEffect(() => {
    if (!clientPrefill) return;
    setName(clientPrefill.name);
    setPhone(clientPrefill.phone);
    setEmail(clientPrefill.email);
    setAddress(clientPrefill.address);
    setExistingVehicleId(null);
    if (clientPrefill.pathwayHint) setPathway(clientPrefill.pathwayHint);
  }, [clientPrefill]);

  // Derived
  const vehicleServices = useMemo(() =>
    services.filter((s: any) => {
      const n = s.name.toLowerCase();
      return !n.includes("boat") && !n.includes("rv") && !n.includes("motorhome") && !n.includes("maintenance");
    }), [services]);
  const boatServices = useMemo(() => services.filter((s: any) => s.name.toLowerCase().includes("boat")), [services]);
  const rvServices   = useMemo(() => services.filter((s: any) => { const n = s.name.toLowerCase(); return n.includes("rv") || n.includes("motorhome"); }), [services]);

  const selectedService = services.find((s: any) => s.id === serviceId);
  const supportsAdminMultiVehicle = ADMIN_MULTI_VEHICLE_SERVICES.includes(selectedService?.name ?? "");

  // Resolves the add-on list for a given vehicle-pathway service name —
  // used for both the primary service and each additional vehicle in
  // multi-vehicle bookings.
  const vehicleAddonsForServiceName = (name: string) => {
    const n = (name ?? "").toLowerCase();
    const isInteriorOnly = n.includes("interior") && !n.includes("exterior") && !n.includes("full");
    const isMaintenance  = n.includes("maintenance");
    const windowIds = (!isInteriorOnly && !isMaintenance) ? WINDOW_COATING_ADDON_IDS : [];
    if (n.includes("paint") || n.includes("correction")) return ADMIN_ADDONS.filter(a => ["engine_bay","ceramic_3yr","wheel_ceramic","ultimate_interior", ...windowIds].includes(a.id));
    if (n.includes("ultimate")) {
      const includesExterior = n.includes("exterior");
      const ultimateIds = ["engine_bay","polish_ceramic","headlight_restore","ozone_treatment", ...windowIds];
      if (includesExterior) { ultimateIds.push("ceramic_3yr"); ultimateIds.push("wheel_ceramic"); }
      return ADMIN_ADDONS.filter(a => ultimateIds.includes(a.id));
    }
    if (n === "exterior detail") return ADMIN_ADDONS.filter(a => [...BUILDER_EXTERIOR_IDS, ...windowIds].includes(a.id));
    if (n === "interior detail") return ADMIN_ADDONS.filter(a => BUILDER_INTERIOR_IDS.includes(a.id));
    if (n === "full detail")     return ADMIN_ADDONS.filter(a => [...BUILDER_INTERIOR_IDS, ...BUILDER_EXTERIOR_IDS, ...windowIds].includes(a.id));
    if (n.includes("exterior") && !n.includes("full"))   return ADMIN_ADDONS.filter(a => [...VEHICLE_ADDON_IDS, ...windowIds].includes(a.id));
    if (n.includes("interior") && !n.includes("full"))   return ADMIN_ADDONS.filter(a => VEHICLE_ADDON_IDS.includes(a.id));
    return ADMIN_ADDONS.filter(a => [...VEHICLE_ADDON_IDS, ...BUILDER_INTERIOR_IDS, ...BUILDER_EXTERIOR_IDS, ...windowIds].includes(a.id));
  };

  const availableAddons = useMemo(() => {
    if (!pathway) return [];
    if (pathway === "boat") return ADMIN_ADDONS.filter(a => BOAT_ADDON_IDS.includes(a.id));
    if (pathway === "rv")   return ADMIN_ADDONS.filter(a => RV_ADDON_IDS.includes(a.id));
    return vehicleAddonsForServiceName(selectedService?.name ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway, selectedService]);

  // Base price (before addons)
  const basePrice = useMemo(() => {
    if (!selectedService) return 0;
    if (pathway === "boat" || pathway === "rv") {
      const ft = Number(footage) || 0;
      const minFt = FOOTAGE_MIN[selectedService.name] ?? 15;
      const rate = FOOTAGE_RATES[selectedService.name] ?? 20;
      return Math.max(minFt, ft) * rate;
    }
    const sizeEntry = VEHICLE_SIZES_ADMIN.find(s => s.value === vehicleSize);
    const key = sizeEntry?.key ?? "price_medium";
    return Number(selectedService[key] ?? selectedService.price_medium ?? selectedService.price_small ?? 0);
  }, [selectedService, pathway, footage, vehicleSize]);

  const addonTotal  = selectedAddons.reduce((sum, id) => sum + getAdminAddonPrice(id, vehicleSize), 0);
  const additionalVehiclesTotal = additionalVehicles.reduce((sum, v) => {
    const avAddonSum = v.selectedAddons.reduce((s, id) => s + getAdminAddonPrice(id, v.vehicleSize), 0);
    return sum + v.servicePrice + avAddonSum;
  }, 0);
  const adminVehiclesSubtotal = basePrice + addonTotal + additionalVehiclesTotal;
  const adminMultiVehicleDiscount = getAdminMultiVehicleDiscount(adminVehiclesSubtotal, 1 + additionalVehicles.length);
  const totalPrice  = priceOverride !== "" ? Number(priceOverride) : Math.max(0, adminVehiclesSubtotal - adminMultiVehicleDiscount);

  useEffect(() => {
    if (step !== 4 || !bookingDate) return;
    setSlotsLoading(true);
    Promise.all([
      getBookedSlotsAction(bookingDate),
      import("@/app/actions/adminActions").then(m => m.getOperatingHours()),
    ]).then(([slots, opH]) => {
      setBookedSlots(slots);
      const oh = opH?.find((h: any) => h.day_of_week === new Date(bookingDate + "T12:00:00").getDay());
      setOperatingHours(oh ?? null);
      setSlotsLoading(false);
    });
  }, [step, bookingDate]);

  const availableSlots = useMemo(() => {
    const svcName = selectedService?.name ?? "";
    const size    = vehicleSize;
    const dayStart = operatingHours?.start_time ? timeToMins(operatingHours.start_time) : DAY_START_HOUR * 60;
    const dayEnd   = operatingHours?.end_time   ? timeToMins(operatingHours.end_time)   : DAY_END_HOUR   * 60;
    return getAvailableSlots(bookedSlots, svcName, size, dayStart, dayEnd);
  }, [bookedSlots, selectedService, vehicleSize, operatingHours]);

  function toggleAddon(id: string) {
    setSelectedAddons(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id);
      // Window-coating tiers are mutually exclusive (windshield vs all glass)
      const filtered = WINDOW_COATING_ADDON_IDS.includes(id)
        ? prev.filter(a => !WINDOW_COATING_ADDON_IDS.includes(a))
        : prev;
      return [...filtered, id];
    });
  }

  function hasTimeOverlap(): boolean {
    if (!bookingTime) return false;
    const selMins = timeToMins(bookingTime);
    const selDur  = getDurationMins(selectedService?.name ?? "", vehicleSize);
    return checkSlotConflict(
      bookedSlots.map(b => ({
        booking_time: b.booking_time,
        service_name: b.service_name,
        vehicle_size: b.vehicle_size,
        status: "confirmed",
        total_duration_mins: b.duration_mins,
      })),
      selMins,
      selDur
    );
  }

  async function handleSubmit(allowOverlap = false) {
    if (!name || !phone || !serviceId || !bookingDate || !bookingTime) {
      toast("Fill in all required fields", "error"); return;
    }
    // If there's a conflict and we haven't confirmed override yet, show the dialog
    if (!allowOverlap && hasTimeOverlap()) {
      setShowOverlapConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const addonNote = selectedAddons.length
        ? `\nAdd-ons: ${selectedAddons.map(id => ADMIN_ADDONS.find(a => a.id === id)?.label).filter(Boolean).join(", ")}`
        : "";
      const footageNote = (pathway === "boat" || pathway === "rv") && footage ? `\n${pathway === "boat" ? "Boat" : "RV"} length: ${footage} ft` : "";
      const addlVehicleNote = additionalVehicles.length
        ? `\nAdditional vehicles (${additionalVehicles.length}): ${additionalVehicles.map((v, i) =>
            `${i + 2}. ${v.vehicleYear} ${v.vehicleMake} ${v.vehicleModel} — ${v.serviceName} ($${v.servicePrice})`
          ).join("; ")}${adminMultiVehicleDiscount > 0 ? `\n🚗 Multi-vehicle discount (${1 + additionalVehicles.length} vehicles): $${adminMultiVehicleDiscount.toFixed(2)} off` : ""}`
        : "";
      const durationMins = durationOverride ? parseInt(durationOverride, 10) : undefined;
      const res = await adminQuickBookAction({
        name, phone, email, address,
        vehicleYear, vehicleMake, vehicleModel,
        vehicleSize: pathway === "boat" ? `${footage || ""}ft` : vehicleSize,
        serviceId, serviceName: selectedService?.name ?? "",
        bookingDate, bookingTime: to12h(bookingTime),
        totalPrice,
        allowOverlap,
        ...(durationMins && durationMins > 0 ? { durationOverrideMins: durationMins } : {}),
        notes: [notes, footageNote, addonNote, addlVehicleNote].filter(Boolean).join(""),
        ...(clientPrefill?.profileId ? { preferredProfileId: clientPrefill.profileId } : {}),
        ...(pathway === "vehicle" && existingVehicleId ? { existingVehicleId } : {}),
        ...(additionalVehicles.length > 0 ? {
          additionalVehicles: additionalVehicles.map(v => ({
            vehicleSize: v.vehicleSize,
            vehicleYear: v.vehicleYear,
            vehicleMake: v.vehicleMake,
            vehicleModel: v.vehicleModel,
            serviceId: v.serviceId,
            serviceName: v.serviceName,
            servicePrice: v.servicePrice,
            selectedAddons: v.selectedAddons.map(id => {
              const a = ADMIN_ADDONS.find(x => x.id === id);
              return {
                id,
                label: a?.label ?? id,
                price: getAdminAddonPrice(id, v.vehicleSize),
              };
            }),
          })),
        } : {}),
      });
      if (res.success) { toast("Booking created! 🎉"); onSuccess(); }
      else toast(res.error ?? "Error", "error");
    } catch (e: any) { toast(e.message ?? "Error", "error"); }
    setLoading(false);
  }

  // ── Pathway selection ──────────────────────────────────────────────────────
  if (!pathway) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-black">New Booking</h2>
          <p className="text-xs text-zinc-500 mt-1">Choose a service type to get started</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: "vehicle" as Pathway, emoji: "🚗", label: "Vehicle Detailing", sub: "Cars, trucks, SUVs, vans" },
            { id: "boat"    as Pathway, emoji: "⛵", label: "Boat Detailing",     sub: "Dockside — Waterline Up" },
            { id: "rv"      as Pathway, emoji: "🚐", label: "RV Detailing",       sub: "Motorhomes & travel trailers" },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => { setPathway(p.id); setStep(1); setServiceId(""); setSelectedAddons([]); setExistingVehicleId(null); }}
              className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-2xl px-4 py-4 transition-all active:scale-[0.98]"
            >
              <span className="text-3xl">{p.emoji}</span>
              <div className="text-left">
                <p className="text-sm font-black">{p.label}</p>
                <p className="text-xs text-zinc-500">{p.sub}</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-zinc-700" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const pathwayLabel = pathway === "vehicle" ? "🚗 Vehicle" : pathway === "boat" ? "⛵ Boat" : "🚐 RV";
  const stepLabels   = ["Client", "Service", "Add-ons", "Time"];
  const totalSteps   = 4;

  return (
    <div className="space-y-5">
      {/* Header with pathway badge + back */}
      <div className="flex items-center gap-2">
        <button onClick={() => setPathway(null)} className="p-1.5 rounded-lg bg-white/[0.05] text-zinc-400 active:scale-90 transition-all">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-black text-amber-400">{pathwayLabel}</span>
        <div className="flex-1 flex items-center gap-1 justify-end">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={cn("h-1 rounded-full transition-all",
              i < step ? "bg-amber-500" : "bg-white/[0.08]",
              i === step - 1 ? "w-6" : "w-3"
            )} />
          ))}
          <span className="text-[10px] text-zinc-600 ml-1">{step}/{totalSteps}</span>
        </div>
      </div>

      {/* ── Step 1: Client ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Client Info</p>
          <FieldLabel>Name *</FieldLabel>
          <Input value={name} onChange={setName} placeholder="John Smith" />
          <FieldLabel>Phone *</FieldLabel>
          <Input value={phone} onChange={setPhone} placeholder="802-555-0123" type="tel" />
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={setEmail} placeholder="john@email.com" type="email" />
          <FieldLabel>Service Address</FieldLabel>
          <AddressAutocomplete value={address} onChange={setAddress} />
          <NavBtn disabled={!name || !phone} onNext={() => setStep(2)} />
        </div>
      )}

      {/* ── Step 2: Service ───────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* VEHICLE pathway */}
          {pathway === "vehicle" && (
            <>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Vehicle & Service</p>
              {clientPrefill && clientPrefill.vehicles.length > 0 && (
                <div className="space-y-2">
                  <FieldLabel>Saved vehicle</FieldLabel>
                  <div className="space-y-2">
                    {clientPrefill.vehicles.map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setExistingVehicleId(v.id);
                          setVehicleYear(v.year != null ? String(v.year) : "");
                          setVehicleMake(v.make || "");
                          setVehicleModel(v.model || "");
                          setVehicleSize(dbSizeToSlug(v.size));
                        }}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center justify-between gap-2",
                          existingVehicleId === v.id
                            ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                            : "border-white/[0.07] text-zinc-300 bg-white/[0.02]"
                        )}
                      >
                        <span className="text-sm font-bold truncate">
                          {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
                        </span>
                        <span className="text-[10px] text-zinc-600 shrink-0 capitalize">{(v.size || "").replace(/_/g, " ")}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setExistingVehicleId(null);
                        setVehicleYear("");
                        setVehicleMake("");
                        setVehicleModel("");
                        setVehicleSize("sedan");
                        setServiceId("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-3 rounded-xl border border-dashed transition-all text-sm font-bold",
                        existingVehicleId === null
                          ? "border-amber-500/50 bg-amber-500/5 text-amber-400"
                          : "border-white/[0.1] text-zinc-500"
                      )}
                    >
                      + Add a different vehicle (enter below)
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div><FieldLabel>Year</FieldLabel><Input value={vehicleYear} onChange={setVehicleYear} placeholder="2022" /></div>
                <div><FieldLabel>Make</FieldLabel><Input value={vehicleMake} onChange={setVehicleMake} placeholder="Toyota" /></div>
                <div><FieldLabel>Model</FieldLabel><Input value={vehicleModel} onChange={setVehicleModel} placeholder="Camry" /></div>
              </div>
              {/* Vehicle size — only show manual picker if not using a saved vehicle */}
              {existingVehicleId ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Size</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-xl capitalize">
                    {VEHICLE_SIZES_ADMIN.find(s => s.value === vehicleSize)?.label ?? vehicleSize}
                  </span>
                  <span className="text-[10px] text-zinc-600">auto-filled from saved vehicle</span>
                </div>
              ) : (
                <>
                  <FieldLabel>Vehicle Size</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {VEHICLE_SIZES_ADMIN.map(s => (
                      <button key={s.value} onClick={() => setVehicleSize(s.value)}
                        className={cn("py-2.5 rounded-xl border text-xs font-black transition-all",
                          vehicleSize === s.value ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-400"
                        )}
                      >{s.label}</button>
                    ))}
                  </div>
                </>
              )}
              <FieldLabel>Service *</FieldLabel>
              <div className="space-y-2">
                {vehicleServices.map((svc: any) => {
                  const sizeEntry = VEHICLE_SIZES_ADMIN.find(s => s.value === vehicleSize);
                  const priceKey = sizeEntry?.key ?? "price_medium";
                  const displayPrice = svc[priceKey] ?? svc.price_medium ?? svc.price_small ?? 0;
                  return (
                    <button key={svc.id} onClick={() => setServiceId(svc.id)}
                      className={cn("w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center justify-between",
                        serviceId === svc.id ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "border-white/[0.07] text-zinc-300 bg-white/[0.02]"
                      )}>
                      <span className="text-sm font-bold">{svc.name}</span>
                      <span className="text-sm font-black shrink-0">${displayPrice}</span>
                    </button>
                  );
                })}
              </div>
              <FieldLabel>Price Override (optional)</FieldLabel>
              <Input value={priceOverride} onChange={setPriceOverride} placeholder={`Auto: $${basePrice}`} type="number" />

              <FieldLabel>Duration Override — minutes (optional)</FieldLabel>
              <Input
                value={durationOverride}
                onChange={setDurationOverride}
                placeholder={`Auto: ${getDurationMins(selectedService?.name ?? "", vehicleSize)} min`}
                type="number"
              />

              {/* Multi-vehicle section */}
              {supportsAdminMultiVehicle && (
                <div className="pt-2 space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <span className="text-emerald-400 text-xs font-bold">💰 Save $25/$40</span>
                    <span className="text-xs text-zinc-400">flat tier discount when 2+ vehicles · ≤ $500 = $25, &gt; $500 = $40</span>
                  </div>
                  {additionalVehicles.map((av, idx) => {
                    const multiVehicleServices = vehicleServices.filter((s: any) =>
                      ADMIN_MULTI_VEHICLE_SERVICES.includes(s.name)
                    );
                    return (
                      <div key={idx} className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-400">Vehicle {idx + 2}</span>
                          <button onClick={() => removeAdminVehicle(idx)} className="text-zinc-600 hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input value={av.vehicleYear} onChange={e => updateAdminVehicle(idx, { vehicleYear: e.target.value })} placeholder="Year"
                            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                          <input value={av.vehicleMake} onChange={e => updateAdminVehicle(idx, { vehicleMake: e.target.value })} placeholder="Make"
                            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                          <input value={av.vehicleModel} onChange={e => updateAdminVehicle(idx, { vehicleModel: e.target.value })} placeholder="Model"
                            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {VEHICLE_SIZES_ADMIN.map(s => (
                            <button key={s.value} onClick={() => {
                              const svcForAv = vehicleServices.find((svc: any) => svc.id === av.serviceId);
                              const newPrice = svcForAv ? Number(svcForAv[s.key] ?? svcForAv.price_small ?? 0) : 0;
                              updateAdminVehicle(idx, { vehicleSize: s.value, servicePrice: newPrice });
                            }}
                              className={cn("py-2 rounded-xl border text-xs font-black transition-all",
                                av.vehicleSize === s.value ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-400"
                              )}>{s.label}</button>
                          ))}
                        </div>
                        <div className="space-y-1">
                          {multiVehicleServices.map((svc: any) => {
                            const sizeEntry = VEHICLE_SIZES_ADMIN.find(s => s.value === av.vehicleSize) ?? VEHICLE_SIZES_ADMIN[1];
                            const price = Number(svc[sizeEntry.key] ?? svc.price_small ?? 0);
                            return (
                              <button key={svc.id} onClick={() => updateAdminVehicle(idx, { serviceId: svc.id, serviceName: svc.name, servicePrice: price })}
                                className={cn("w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between text-xs",
                                  av.serviceId === svc.id ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "border-white/[0.07] text-zinc-400"
                                )}>
                                <span className="font-bold">{svc.name}</span>
                                <span className="font-black">${price}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Per-vehicle add-on chips — only show once a service is chosen */}
                        {av.serviceId && av.serviceName && (() => {
                          const avAddons = vehicleAddonsForServiceName(av.serviceName);
                          if (avAddons.length === 0) return null;
                          return (
                            <div className="pt-2 mt-1 border-t border-white/[0.04]">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Add-ons</p>
                              <div className="flex flex-wrap gap-1.5">
                                {avAddons.map((a: any) => {
                                  const selected = av.selectedAddons.includes(a.id);
                                  const p = getAdminAddonPrice(a.id, av.vehicleSize);
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      onClick={() => toggleAdminVehicleAddon(idx, a.id)}
                                      className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all",
                                        selected
                                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                                          : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-amber-500/30"
                                      )}
                                    >
                                      <span>{a.label}</span>
                                      <span className="tabular-nums text-amber-400/80">${p}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  <button onClick={addAdminVehicle}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/5 transition-all">
                    <Plus size={13} /> Add Another Vehicle — Save $25/$40
                  </button>
                  {adminMultiVehicleDiscount > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 mt-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
                      <span>🚗 Multi-vehicle discount ({1 + additionalVehicles.length} vehicles)</span>
                      <span className="tabular-nums">−${adminMultiVehicleDiscount}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* BOAT pathway */}
          {pathway === "boat" && (
            <>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Boat Details</p>
              <FieldLabel>Boat Make / Model</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input value={vehicleMake} onChange={setVehicleMake} placeholder="Sea Ray" />
                <Input value={vehicleModel} onChange={setVehicleModel} placeholder="Sundancer 280" />
              </div>
              <FieldLabel>Boat Length (ft) * — min 15 ft</FieldLabel>
              <input
                type="number" min={15} value={footage}
                onChange={e => setFootage(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 24"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
              <FieldLabel>Package *</FieldLabel>
              <div className="space-y-2">
                {boatServices.map((svc: any) => {
                  const disp  = BOAT_DISPLAY[svc.name] ?? { name: svc.name, sub: "" };
                  const ft    = Math.max(Number(footage) || 0, FOOTAGE_MIN[svc.name] ?? 15);
                  const price = ft * (FOOTAGE_RATES[svc.name] ?? 20);
                  return (
                    <button key={svc.id} onClick={() => setServiceId(svc.id)}
                      className={cn("w-full text-left px-3 py-3 rounded-xl border transition-all",
                        serviceId === svc.id ? "bg-amber-500/10 border-amber-500/50" : "border-white/[0.07] bg-white/[0.02]"
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn("text-sm font-black", serviceId === svc.id ? "text-amber-400" : "text-zinc-200")}>{disp.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{disp.sub}</p>
                        </div>
                        <p className="text-sm font-black text-amber-400 shrink-0">{footage ? `$${price}` : "—"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <FieldLabel>Price Override (optional)</FieldLabel>
              <Input value={priceOverride} onChange={setPriceOverride} placeholder={`Auto: $${basePrice}`} type="number" />
            </>
          )}

          {/* RV pathway */}
          {pathway === "rv" && (
            <>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">RV Details</p>
              <FieldLabel>RV Make / Model</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <Input value={vehicleMake} onChange={setVehicleMake} placeholder="Winnebago" />
                <Input value={vehicleModel} onChange={setVehicleModel} placeholder="Vista 27N" />
              </div>
              <FieldLabel>RV Length (ft) * — min 20 ft</FieldLabel>
              <input
                type="number" min={20} value={footage}
                onChange={e => setFootage(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 35"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
              <FieldLabel>Package *</FieldLabel>
              <div className="space-y-2">
                {rvServices.map((svc: any) => {
                  const disp  = RV_DISPLAY[svc.name] ?? { name: svc.name, sub: "" };
                  const ft    = Math.max(Number(footage) || 0, FOOTAGE_MIN[svc.name] ?? 20);
                  const price = ft * (FOOTAGE_RATES[svc.name] ?? 20);
                  return (
                    <button key={svc.id} onClick={() => setServiceId(svc.id)}
                      className={cn("w-full text-left px-3 py-3 rounded-xl border transition-all",
                        serviceId === svc.id ? "bg-amber-500/10 border-amber-500/50" : "border-white/[0.07] bg-white/[0.02]"
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn("text-sm font-black", serviceId === svc.id ? "text-amber-400" : "text-zinc-200")}>{disp.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{disp.sub}</p>
                        </div>
                        <p className="text-sm font-black text-amber-400 shrink-0">{footage ? `$${price}` : "—"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <FieldLabel>Price Override (optional)</FieldLabel>
              <Input value={priceOverride} onChange={setPriceOverride} placeholder={`Auto: $${basePrice}`} type="number" />
            </>
          )}

          <NavBtn
            onBack={() => setStep(1)}
            disabled={
              !serviceId ||
              ((pathway === "boat" || pathway === "rv") && !footage) ||
              (pathway === "vehicle" &&
                !existingVehicleId &&
                (!vehicleYear?.trim() || !vehicleMake?.trim() || !vehicleModel?.trim()))
            }
            onNext={() => setStep(3)}
          />
        </div>
      )}

      {/* ── Step 3: Add-ons ───────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Add-ons</p>
          {availableAddons.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No add-ons available for this service.</p>
          ) : (
            <div className="space-y-2">
              {availableAddons.map(addon => {
                const selected = selectedAddons.includes(addon.id);
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    className={cn("w-full flex items-center justify-between px-3 py-3.5 rounded-xl border transition-all",
                      selected ? "bg-amber-500/10 border-amber-500/50" : "border-white/[0.07] bg-white/[0.02]"
                    )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                        selected ? "bg-amber-500 border-amber-500" : "border-white/20"
                      )}>
                        {selected && <Check size={11} className="text-black" />}
                      </div>
                      <span className={cn("text-sm font-bold", selected ? "text-amber-400" : "text-zinc-300")}>{addon.label}</span>
                    </div>
                    <span className="text-sm font-black text-zinc-400">+${getAdminAddonPrice(addon.id, vehicleSize)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Running total */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1">
            <SummaryRow label="Base service" value={`$${basePrice}`} />
            {selectedAddons.map(id => {
              const a = ADMIN_ADDONS.find(x => x.id === id);
              return a ? <SummaryRow key={id} label={a.label} value={`+$${getAdminAddonPrice(id, vehicleSize)}`} /> : null;
            })}
            {priceOverride !== "" && <SummaryRow label="Override" value={`$${priceOverride}`} />}
            <div className="border-t border-white/[0.06] pt-1 mt-1 flex justify-between text-sm font-black">
              <span className="text-zinc-400">Total</span>
              <span className="text-amber-400">${totalPrice}</span>
            </div>
          </div>

          <NavBtn onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}

      {/* ── Step 4: Time ──────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Date & Time</p>

          {/* Date picker */}
          <FieldLabel>Date</FieldLabel>
          <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />

          {/* Day timeline — every 30 min, booked slots shown with client name */}
          <FieldLabel>Schedule</FieldLabel>
          {slotsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
          ) : (() => {
            // Wider timeline (5 AM – 11 PM) so admin can book before/after public hours
            const TIMELINE_START = TIMELINE_DAY_START_HOUR * 60;
            const TIMELINE_END   = TIMELINE_DAY_END_HOUR   * 60;

            // Convert booked slots to { startMins, endMins, customer, service, full }
            const bookedRanges = bookedSlots.map(b => {
              const startMins = timeToMins(b.booking_time);
              return {
                startMins,
                endMins: startMins + b.duration_mins,
                customer: b.customer_name ?? "Client",
                service:  b.service_name  ?? "Service",
                duration: b.duration_mins,
                full:     b,  // raw row so the peek popup can read vehicle/address/phone
              };
            });

            // Build slot rows
            const rows: { mins: number; label: string; booking: typeof bookedRanges[0] | null }[] = [];
            for (let m = TIMELINE_START; m < TIMELINE_END; m += 30) {
              const h   = Math.floor(m / 60);
              const min = m % 60;
              const hh  = String(h).padStart(2, "0");
              const mm  = min === 0 ? "00" : "30";
              const label = to12h(`${hh}:${mm}`);
              // Find booking that covers this slot
              const booking = bookedRanges.find(b => m >= b.startMins && m < b.endMins) ?? null;
              rows.push({ mins: m, label, booking });
            }

            const selectedMins = bookingTime ? timeToMins(bookingTime) : -1;

            return (
              <div className="rounded-xl border border-white/[0.07] overflow-hidden divide-y divide-white/[0.04]">
                {rows.map(({ mins, label, booking }) => {
                  const hh  = String(Math.floor(mins / 60)).padStart(2, "0");
                  const mm  = mins % 60 === 0 ? "00" : "30";
                  const slotVal = `${hh}:${mm}`;
                  const isSelected      = selectedMins === mins;
                  const isHourMark      = mins % 60 === 0;
                  const isStartOfBooked = bookedRanges.some(b => b.startMins === mins);

                  return (
                    <button
                      key={slotVal}
                      type="button"
                      onClick={() => {
                        // Tapping a booked row → peek the client's details first.
                        // The "Book here anyway" button inside the popup is what
                        // actually selects the time and triggers the overlap flow.
                        if (booking && !isSelected) {
                          setSlotPeek({ ...booking, slotVal });
                          return;
                        }
                        setBookingTime(slotVal);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 transition-all text-left",
                        isHourMark ? "py-2.5" : "py-1.5",
                        isSelected
                          ? "bg-amber-500/20 border-l-2 border-l-amber-400"
                          : booking
                            ? "bg-red-500/[0.06] hover:bg-red-500/[0.12]"
                            : "bg-transparent hover:bg-white/[0.03]"
                      )}
                    >
                      {/* Time label */}
                      <span className={cn(
                        "w-16 shrink-0 tabular-nums",
                        isHourMark ? "text-xs font-black" : "text-[10px] font-medium",
                        isSelected ? "text-amber-300" : booking ? "text-red-400/70" : "text-zinc-500"
                      )}>
                        {isHourMark ? label : `  ${label}`}
                      </span>

                      {/* Slot content */}
                      <div className="flex-1 min-w-0">
                        {isSelected && !booking && (
                          <span className="text-xs font-black text-amber-300">← Selected</span>
                        )}
                        {isSelected && booking && (
                          <span className="text-xs font-black text-amber-300">← Selected (overlap!)</span>
                        )}
                        {!isSelected && isStartOfBooked && booking && (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            <span className="text-xs font-bold text-red-300 truncate">{booking.customer}</span>
                            <span className="text-[10px] text-zinc-500 truncate hidden sm:block">
                              {booking.service} · {booking.duration >= 60 ? `${booking.duration / 60}h` : `${booking.duration}m`}
                            </span>
                          </div>
                        )}
                        {!isSelected && booking && !isStartOfBooked && (
                          <span className="text-[10px] text-red-500/50 pl-3">↕ {booking.customer}</span>
                        )}
                      </div>

                      {/* Free indicator */}
                      {!booking && !isSelected && (
                        <span className="text-[10px] text-zinc-700 shrink-0">open</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Manual time override — any time outside the grid */}
          <div>
            <FieldLabel>Custom time (any hour)</FieldLabel>
            <input
              type="time"
              value={bookingTime}
              onChange={e => setBookingTime(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
            {bookingTime && (
              <p className="text-xs text-amber-400 mt-1 font-semibold">
                Selected: {to12h(bookingTime)}
                {bookedSlots.some(b => {
                  const bStart = timeToMins(b.booking_time);
                  const bEnd   = bStart + b.duration_mins;
                  const sel    = timeToMins(bookingTime);
                  return sel >= bStart && sel < bEnd;
                }) && " — ⚠️ overlaps existing booking"}
              </p>
            )}
          </div>

          <FieldLabel>Notes</FieldLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Special instructions, gate code, dock slip…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none" />

          {/* Summary */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1 text-xs">
            <SummaryRow label="Client"   value={name} />
            <SummaryRow label="Service"  value={selectedService?.name ?? ""} />
            {(pathway === "boat" || pathway === "rv") && footage !== "" &&
              <SummaryRow label="Length" value={`${footage} ft`} />}
            {selectedAddons.length > 0 &&
              <SummaryRow label="Add-ons" value={`${selectedAddons.length} selected`} />}
            <SummaryRow label="Date"     value={bookingDate} />
            <SummaryRow label="Time"     value={bookingTime ? to12h(bookingTime) : "—"} />
            {!email && (
              <div className="flex items-start gap-2 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2.5 mt-1">
                <span className="text-amber-500 text-[10px] mt-0.5">⚠</span>
                <p className="text-[10px] text-amber-400 leading-relaxed">No email — you won&apos;t be able to send a payment link or confirmation. Consider adding one on Step 1.</p>
              </div>
            )}
            <div className="border-t border-white/[0.06] pt-1 mt-1 flex justify-between font-black">
              <span className="text-zinc-500">Total</span>
              <span className="text-amber-400">${totalPrice}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="flex-1 py-3.5 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black">Back</button>
            <button onClick={() => handleSubmit(false)} disabled={loading || !bookingTime}
              className="flex-grow py-3.5 rounded-xl bg-amber-500 text-black text-sm font-black active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Zap size={15} /> Book It</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Booked-slot peek popup ──────────────────────────────────────── */}
      {slotPeek && (() => {
        const b = slotPeek.full ?? {};
        const startMins = slotPeek.startMins as number;
        const endMins   = slotPeek.endMins as number;
        const vehicle = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");
        const tel = (b.customer_phone ?? "").replace(/\D/g, "");
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSlotPeek(null)}>
            <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Booked slot</p>
                  <h3 className="text-lg font-black truncate">{slotPeek.customer ?? "Client"}</h3>
                  <p className="text-xs text-amber-400 font-bold">{minsToDisplay(startMins)} – {minsToDisplay(endMins)}</p>
                </div>
                <button type="button" onClick={() => setSlotPeek(null)} className="w-8 h-8 rounded-lg bg-white/[0.04] text-zinc-500 hover:text-white flex items-center justify-center shrink-0">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                {slotPeek.service && (
                  <div className="flex items-center gap-2 text-zinc-300"><span className="text-zinc-600 w-12 shrink-0">Service</span><span className="truncate">{slotPeek.service}</span></div>
                )}
                {vehicle && (
                  <div className="flex items-center gap-2 text-zinc-300"><Car size={11} className="text-zinc-600 shrink-0" /><span className="truncate">{vehicle}</span></div>
                )}
                {b.service_address && (
                  <div className="flex items-center gap-2 text-zinc-300"><MapPin size={11} className="text-zinc-600 shrink-0" /><span className="truncate">{b.service_address}</span></div>
                )}
                {b.customer_phone && (
                  <div className="flex items-center gap-2 text-zinc-300"><Phone size={11} className="text-zinc-600 shrink-0" /><span>{fmtPhone(b.customer_phone)}</span></div>
                )}
                {Number(b.total_price ?? 0) > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                    <span className="text-zinc-500">Total</span>
                    <span className="text-amber-400 font-black tabular-nums">${Number(b.total_price).toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                {tel && (
                  <>
                    <a href={`tel:${tel}`} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-200 text-[10px] font-black uppercase tracking-wider">
                      <Phone size={11} /> Call
                    </a>
                    <a href={`sms:${tel}`} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-200 text-[10px] font-black uppercase tracking-wider">
                      <MessageSquare size={11} /> Text
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setBookingTime(slotPeek.slotVal); setSlotPeek(null); }}
                  className="flex-1 py-2 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-400 text-[10px] font-black uppercase tracking-wider"
                >
                  Book Here Anyway
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Overlap override confirmation modal ─────────────────────────── */}
      {showOverlapConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-white text-sm">Time Conflict — Override?</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                  This slot overlaps an existing booking at <span className="text-amber-300 font-bold">{to12h(bookingTime)}</span>. You can force-book it anyway — both appointments will run at the same time.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOverlapConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-zinc-400 text-sm font-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowOverlapConfirm(false); handleSubmit(true); }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-black"
              >
                Force Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Personal Block form ─────────────────────────────────────────────────────
function PersonalBlockForm({
  defaultDate,
  onSuccess,
  onCancel,
}: { defaultDate: string; onSuccess: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [date, setDate]         = useState(defaultDate);
  const [startTime, setStart]   = useState("12:00");
  const [durationMins, setDur]  = useState(60);
  const [label, setLabel]       = useState("Personal Time");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await blockPersonalTimeAction({
        date,
        startTime: startTime + ":00",
        durationMins,
        label,
      });
      if (res.success) { toast("Time blocked!"); onSuccess(); }
      else toast(res.error ?? "Error", "error");
    } catch (e: any) { toast(e.message, "error"); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-amber-500" />
        <h2 className="text-lg font-black">Block Personal Time</h2>
      </div>
      <p className="text-xs text-zinc-500">Blocks the calendar so clients can't book this slot. Only visible to you.</p>
      <div className="space-y-3">
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
        <FieldLabel>Start Time</FieldLabel>
        <input type="time" value={startTime} onChange={e => setStart(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
        <FieldLabel>Duration</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {[30, 60, 90, 120].map(d => (
            <button key={d} onClick={() => setDur(d)}
              className={cn("py-2 rounded-xl border text-xs font-black transition-all",
                durationMins === d ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-400"
              )}>{d >= 60 ? `${d/60}h` : `${d}m`}</button>
          ))}
        </div>
        <FieldLabel>Label (optional)</FieldLabel>
        <Input value={label} onChange={setLabel} placeholder="Lunch, Errand, Personal…" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black uppercase tracking-wider">Cancel</button>
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <><Lock size={14} /> Block</>}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { data: bookings, isLoading, refetch } = useAdminBookings();
  const { data: services } = useServices();
  const { data: blockedDates } = useBlockedDates();
  const { data: opHoursAll } = useOperatingHours();
  const updateStatus  = useUpdateBookingStatus();
  const sendOmw       = useSendOnMyWay();
  const handleNoShow  = useHandleNoShow();
  const reschedule    = useRescheduleBooking();
  const deleteBooking   = useDeleteBooking();
  const updateOpHours   = useUpdateOperatingHours();
  const { toast }       = useToast();

  const [viewMode, setViewMode]   = useState<"month" | "day">("month");
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [activeBooking, setActiveBooking]   = useState<any>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingDirty, setNewBookingDirty] = useState(false);

  const handleCloseNewBooking = useCallback(() => {
    if (newBookingDirty && !confirm("Discard this booking? Any details you've entered will be lost.")) return;
    setShowNewBooking(false);
    setNewBookingDirty(false);
    setActiveSqueeze(null);
    setSqueezePrefill(null);
  }, [newBookingDirty]);
  const [showBlockTime, setShowBlockTime]   = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [sendingLink, setSendingLink]       = useState(false);
  const [payChannelPick, setPayChannelPick] = useState(false);
  // Detail modal sub-states
  const [editPriceMode, setEditPriceMode]   = useState(false);
  const [editPriceVal,  setEditPriceVal]    = useState("");
  const [editNotesMode, setEditNotesMode]   = useState(false);
  const [editNotesVal,  setEditNotesVal]    = useState("");
  const [editDurMode,   setEditDurMode]     = useState(false);
  const [editDurVal,    setEditDurVal]      = useState(0);
  const [savingDetails, setSavingDetails]   = useState(false);
  const [copied, setCopied]                 = useState<string | null>(null);
  const [blockingDay,   setBlockingDay]     = useState(false);
  const [editHoursMode, setEditHoursMode]   = useState(false);
  const [editHoursOpen, setEditHoursOpen]   = useState(true);
  const [editHoursStart,setEditHoursStart]  = useState("07:00");
  const [editHoursEnd,  setEditHoursEnd]    = useState("19:00");
  const [savingHours,   setSavingHours]     = useState(false);

  // ── Squeeze Me In ────────────────────────────────────────────────────────
  const [activeSqueeze,  setActiveSqueeze]  = useState<SqueezeRequest | null>(null);
  const [squeezePrefill, setSqueezePrefill] = useState<ClientPrefillForBooking | null>(null);
  const { data: squeezeData = [], refetch: refetchSqueeze } = useQuery({
    queryKey: ["squeeze"],
    queryFn:  () => getSqueezeRequests(),
    refetchInterval: 60000,
  });

  // ── Contractor roster (for avatars on booking cards + reassign UI) ──────
  const { data: contractorRoster = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn:  () => listContractors(),
    staleTime: 60000,
  });
  const contractorsById = useMemo(() => {
    const m = new Map<string, ContractorSummary>();
    for (const c of contractorRoster as ContractorSummary[]) m.set(c.id, c);
    return m;
  }, [contractorRoster]);
  const pendingSqueezes = (squeezeData as SqueezeRequest[]).filter(
    r => r.status === "pending" || r.status === "contacted"
  );

  // On mount: read ?date= param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const d = p.get("date");
    const n = p.get("new");
    if (d) { setSelectedDay(parseISO(d + "T12:00:00")); setViewMode("day"); }
    if (n) setShowNewBooking(true);
  }, []);

  // Close hours edit when navigating to a different day
  useEffect(() => { setEditHoursMode(false); }, [selectedDay]);

  const getBookingsForDate = useCallback((date: Date) => {
    if (!bookings) return [];
    const ds = format(date, "yyyy-MM-dd");
    return bookings.filter((b: any) => b.booking_date === ds && b.status !== "cancelled");
  }, [bookings]);

  const dayBookings = useMemo(() => {
    const ds = format(selectedDay, "yyyy-MM-dd");
    return (bookings ?? [])
      .filter((b: any) => b.booking_date === ds && b.status !== "cancelled")
      .sort((a: any, b: any) => (a.booking_time ?? "").localeCompare(b.booking_time ?? ""));
  }, [bookings, selectedDay]);

  const isBlockedDate = useCallback((date: Date) => {
    const ds = format(date, "yyyy-MM-dd");
    return (blockedDates ?? []).some((b: any) => b.blocked_date === ds);
  }, [blockedDates]);

  // Actions
  async function handleComplete(b: any) {
    try { await updateStatus.mutateAsync({ id: b.id, status: "completed" }); toast("Job complete! 🎉"); setActiveBooking(null); refetch(); }
    catch { toast("Error", "error"); }
  }
  async function handleCancelBooking(b: any) {
    if (!confirm("Cancel this booking?")) return;
    try { await updateStatus.mutateAsync({ id: b.id, status: "cancelled" }); toast("Cancelled"); setActiveBooking(null); refetch(); }
    catch { toast("Error", "error"); }
  }
  async function handleDeleteBooking(b: any) {
    if (!confirm("Permanently delete?")) return;
    try {
      if (b.service_name === "Personal Block") {
        await deletePersonalBlockAction(b.id);
      } else {
        await deleteBooking.mutateAsync(b.id);
      }
      toast("Deleted"); setActiveBooking(null); refetch();
    } catch { toast("Error", "error"); }
  }
  async function handleNoShowClick(b: any) {
    try { await handleNoShow.mutateAsync(b.id); toast("Marked no-show"); setActiveBooking(null); refetch(); }
    catch { toast("Error", "error"); }
  }
  async function handleReschedule() {
    if (!activeBooking || !rescheduleDate || !rescheduleTime) return;
    try {
      await reschedule.mutateAsync({ id: activeBooking.id, date: rescheduleDate, time: rescheduleTime });
      toast("Rescheduled!"); setShowReschedule(false); setActiveBooking(null); refetch();
    } catch { toast("Error", "error"); }
  }
  async function handleStripeLink(b: any) {
    const email = bEmail(b);
    if (!email) { toast("No email on file", "error"); return; }
    setSendingLink(true);
    try {
      const r = await sendStripePaymentLink(b.id, {
        serviceName:   b.service_name  ?? "Detailing Service",
        totalPrice:    Number(b.total_price),
        vehicleYear:   b.vehicle_year  ?? undefined,
        vehicleMake:   b.vehicle_make  ?? undefined,
        vehicleModel:  b.vehicle_model ?? undefined,
        vehicleSize:   b.vehicle_size  ?? undefined,
        bookingDate:   b.booking_date  ?? "",
        bookingTime:   b.booking_time  ?? "",
        customerEmail: email,
      });
      if ("url" in r) {
        toast("Payment link emailed ✅");
        setActiveBooking((prev: any) => prev ? { ...prev, payment_link_sent_at: new Date().toISOString() } : prev);
        refetch();
      } else {
        toast(r.error ?? "Failed", "error");
      }
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
    setSendingLink(false);
  }
  async function handleOmw(b: any) {
    const addr = bAddress(b);
    if (addr) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
    try { await sendOmw.mutateAsync(b.id); toast("On My Way sent!"); }
    catch { toast("Failed", "error"); }
  }
  async function handleMarkPaidCash(b: any) {
    if (!confirm(`Mark this booking as PAID IN CASH for $${Number(b.total_price ?? 0).toFixed(0)}? This will move it to Complete.`)) return;
    setSendingLink(true);
    try {
      const r = await markBookingPaidCash(b.id);
      if (r.ok) {
        toast("Marked paid (cash) ✅");
        setActiveBooking({ ...b, status: "completed", payment_source: "cash" });
        refetch();
      } else {
        toast(r.error ?? "Failed", "error");
      }
    } catch (e: any) {
      toast(e?.message ?? "Failed", "error");
    } finally {
      setSendingLink(false);
    }
  }
  async function handleTextPayLink(b: any) {
    const phone = bPhone(b);
    if (!phone) { toast("No phone on file", "error"); return; }
    if (!Number(b.total_price) || Number(b.total_price) <= 0) { toast("Invalid price", "error"); return; }
    try {
      const url = await getPaymentLinkUrl(b.id);
      const firstName = bName(b).split(" ")[0] || "there";
      const total = Number(b.total_price).toFixed(2);
      const body =
        `Hi ${firstName}, thanks again from Arise & Shine VT! ` +
        `Here's your secure payment link for $${total}` +
        (b.service_name ? ` (${b.service_name})` : "") + `:\n\n${url}`;
      const cleanPhone = phone.replace(/\D/g, "");
      // iOS prefers `&body=`, Android uses `?body=` — `?&body=` works on both.
      const smsUrl = `sms:${cleanPhone}?&body=${encodeURIComponent(body)}`;
      window.location.href = smsUrl;
      // Optimistic stamp; the server action is fire-and-forget since we
      // can't be 100% sure the user actually sent the SMS once iOS opens.
      markPaymentLinkSent(b.id).catch(() => undefined);
      setActiveBooking((prev: any) => prev ? { ...prev, payment_link_sent_at: new Date().toISOString() } : prev);
      refetch();
    } catch (e: any) { toast(e?.message ?? "Failed to build link", "error"); }
  }
  function handleSaveContact(b: any) {
    const fullName = bName(b);
    const phone = bPhone(b);
    const email = bEmail(b);
    const addr  = bAddress(b);

    const parts = fullName.trim().split(/\s+/);
    const firstRaw = parts[0] ?? fullName;
    const lastRaw  = parts.slice(1).join(" ");
    // Suffix " (client)" so the entry is identifiable on the iPhone contact list.
    const first = `${firstRaw} (client)`;
    const fn    = lastRaw ? `${firstRaw} ${lastRaw} (client)` : `${firstRaw} (client)`;

    const vEsc = (s: string) => s.replace(/[\\;,\n]/g, m => "\\" + (m === "\n" ? "n" : m));
    const cleanPhone = phone ? phone.replace(/[^\d+]/g, "") : "";

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${vEsc(lastRaw)};${vEsc(first)};;;`,
      `FN:${vEsc(fn)}`,
      "ORG:Arise & Shine VT — Client",
    ];
    if (cleanPhone) lines.push(`TEL;TYPE=CELL:${cleanPhone}`);
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${vEsc(email)}`);
    if (addr) lines.push(`ADR;TYPE=HOME:;;${vEsc(addr)};;;;`);
    if (b.notes) lines.push(`NOTE:${vEsc(`Booking notes: ${b.notes}`)}`);
    lines.push("END:VCARD");

    const vcard = lines.join("\r\n");

    // Trigger download on iPhone Safari — tapping the .vcf opens the contact-add sheet.
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fullName.replace(/[^a-z0-9]+/gi, "_")}_client.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Contact card ready — open to save");
  }
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }
  async function handleSavePrice() {
    if (!activeBooking || editPriceVal === "") return;
    const newPrice = Number(editPriceVal);
    if (isNaN(newPrice) || newPrice < 0) {
      toast("Price must be a non-negative number", "error");
      return;
    }
    setSavingDetails(true);
    try {
      const oldPrice = Number(activeBooking.total_price);
      await updateBookingDetailsAction(
        activeBooking.id,
        { total_price: newPrice },
        oldPrice !== newPrice ? { oldPrice } : undefined,
      );
      setActiveBooking({ ...activeBooking, total_price: newPrice });
      setEditPriceMode(false);
      toast(oldPrice !== newPrice ? "Price updated — customer notified!" : "Price saved!");
      refetch();
    } catch (e: any) { toast(e?.message ?? "Failed to save", "error"); }
    setSavingDetails(false);
  }
  async function handleSaveNotes() {
    if (!activeBooking) return;
    setSavingDetails(true);
    try {
      await updateBookingDetailsAction(activeBooking.id, { notes: editNotesVal });
      setActiveBooking({ ...activeBooking, notes: editNotesVal });
      setEditNotesMode(false);
      toast("Notes saved!");
      refetch();
    } catch (e: any) { toast(e?.message ?? "Failed to save", "error"); }
    setSavingDetails(false);
  }

  async function handleSaveDuration() {
    if (!activeBooking || editDurVal <= 0) return;
    setSavingDetails(true);
    try {
      const res = await updateBookingDurationAction(activeBooking.id, editDurVal);
      if (res.success) {
        setActiveBooking({ ...activeBooking, duration_override: editDurVal });
        setEditDurMode(false);
        toast("Duration updated!");
        refetch();
      } else {
        toast(res.error ?? "Failed", "error");
      }
    } catch { toast("Failed to save", "error"); }
    setSavingDetails(false);
  }

  async function handleBlockRestOfDay() {
    setBlockingDay(true);
    try {
      const res = await blockRestOfDayAction(format(selectedDay, "yyyy-MM-dd"));
      if (res.success) {
        toast(`Blocked ${res.blockedFrom} – ${res.blockedTo}`);
        refetch();
      } else {
        toast(res.error ?? "Failed", "error");
      }
    } catch { toast("Failed", "error"); }
    setBlockingDay(false);
  }

  /** Returns the operating-hours row that actually applies to a given date.
   *  Prefers a month-specific seasonal row over the null-month default. */
  function getOpHoursForDay(date: Date): any | null {
    const dow   = date.getDay();
    const month = date.getMonth() + 1; // 1-12
    const all   = opHoursAll ?? [];
    const seasonal = all.find((h: any) => h.day_of_week === dow && h.month === month);
    const fallback = all.find((h: any) => h.day_of_week === dow && h.month == null);
    return seasonal ?? fallback ?? null;
  }

  function openHoursEdit() {
    const dayOp = getOpHoursForDay(selectedDay);
    setEditHoursOpen(dayOp?.is_open ?? true);
    setEditHoursStart(dayOp?.start_time ? dayOp.start_time.slice(0, 5) : "07:00");
    setEditHoursEnd(dayOp?.end_time ? dayOp.end_time.slice(0, 5) : "19:00");
    setEditHoursMode(true);
  }

  async function handleSaveHours() {
    setSavingHours(true);
    const dayOp = getOpHoursForDay(selectedDay);
    try {
      await updateOpHours.mutateAsync([{
        ...(dayOp ?? {}),
        day_of_week: selectedDay.getDay(),
        is_open: editHoursOpen,
        start_time: editHoursOpen ? editHoursStart + ":00" : (dayOp?.start_time ?? "07:00:00"),
        end_time:   editHoursOpen ? editHoursEnd   + ":00" : (dayOp?.end_time   ?? "19:00:00"),
      }]);
      setEditHoursMode(false);
      toast("Hours updated!");
    } catch { toast("Failed to save hours", "error"); }
    setSavingHours(false);
  }

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  function MonthView() {
    const firstDay    = startOfMonth(monthDate);
    const totalDays   = getDaysInMonth(monthDate);
    const startOffset = (getDay(firstDay) + 6) % 7; // Mon = 0
    const cells       = Array.from({ length: startOffset + totalDays }, (_, i) =>
      i < startOffset ? null : new Date(monthDate.getFullYear(), monthDate.getMonth(), i - startOffset + 1)
    );
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    function getDayStatus(day: Date): "full" | "partial" | "open" {
      const ds = format(day, "yyyy-MM-dd");
      const dayBks = (bookings ?? []).filter((b: any) => b.booking_date === ds && b.status !== "cancelled" && b.status !== "no-show");
      const realBks = dayBks.filter((b: any) => b.service_name !== "Personal Block");
      if (realBks.length === 0 && !dayBks.some((b: any) => b.service_name === "Personal Block")) return "open";
      const dayOp = getOpHoursForDay(day);
      const dayStart = dayOp?.start_time ? timeToMins(dayOp.start_time) : DAY_START_HOUR * 60;
      const dayEnd   = dayOp?.end_time   ? timeToMins(dayOp.end_time)   : DAY_END_HOUR   * 60;
      const slots = getAvailableSlots(dayBks.map((b: any) => ({ ...b, service_name: b.service_name ?? null })), "Exterior Detail", "sedan", dayStart, dayEnd, 60);
      return slots.length === 0 ? "full" : "partial";
    }

    return (
      <div className="space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setMonthDate(subMonths(monthDate, 1))}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-all active:scale-90">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-black">{format(monthDate, "MMMM yyyy")}</h2>
          <button onClick={() => setMonthDate(addMonths(monthDate, 1))}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-all active:scale-90">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-600 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-px">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-px">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="aspect-square" />;
                const isT    = isToday(day);
                const isSel  = isSameDay(day, selectedDay);
                const isPast = !isT && isBefore(day, startOfDay(new Date()));
                const dayBks = getBookingsForDate(day).filter(b => b.service_name !== "Personal Block");
                const hasBlk = getBookingsForDate(day).some(b => b.service_name === "Personal Block");
                const isBlocked = isBlockedDate(day);
                const status = !isBlocked ? getDayStatus(day) : null;
                const isFull = status === "full";

                return (
                  <button
                    key={di}
                    onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all active:scale-90 relative text-xs font-bold",
                      isPast     ? "opacity-40 hover:opacity-60 hover:bg-white/[0.02]" :
                      isBlocked  ? "bg-red-500/10 text-red-400" :
                      isFull     ? "bg-amber-500/15 text-amber-300" :
                      isSel      ? "bg-amber-500 text-black" :
                      isT        ? "bg-amber-500/20 text-amber-400" :
                                   "text-zinc-400 hover:bg-white/[0.04]"
                    )}
                  >
                    <span className={cn(
                      isPast ? "text-zinc-500" :
                      isSel  ? "text-black" : ""
                    )}>{day.getDate()}</span>
                    {isFull && !isSel ? (
                      <span className={cn(
                        "text-[7px] font-black uppercase tracking-widest leading-none",
                        isPast ? "text-zinc-600" : "text-amber-500/80"
                      )}>full</span>
                    ) : (
                      <div className="flex gap-0.5">
                        {dayBks.slice(0, 3).map((bk, i) => {
                          const pt = payType(bk);
                          return (
                            <span key={i} className={cn(
                              "w-1 h-1 rounded-full",
                              isSel  ? "bg-black/40" :
                              isPast ? "bg-zinc-600" :
                              pt === "paid" ? "bg-sky-400" :
                              pt === "cash" ? "bg-emerald-400" :
                                             "bg-amber-400"
                            )} />
                          );
                        })}
                        {hasBlk && <span className={cn("w-1 h-1 rounded-full", isSel ? "bg-black/40" : isPast ? "bg-zinc-700" : "bg-zinc-500")} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 pt-1 border-t border-white/[0.04] flex-wrap">
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Cash
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Paid
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />Full
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />Blocked
          </div>
        </div>

        {/* ── Squeeze Me In Requests ─────────────────────────────────────── */}
        {pendingSqueezes.length > 0 && (
          <div className="mt-4 space-y-2 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={11} className="text-[#D4AF37]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Squeeze Me In
              </span>
              <span className="ml-auto text-[8px] font-black text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-1.5 py-0.5 rounded-full">
                {pendingSqueezes.length} waiting
              </span>
            </div>

            {pendingSqueezes.map((sq) => {
              const urgencyConfig: Record<string, { label: string; cls: string }> = {
                today:     { label: "Today",     cls: "text-red-400 bg-red-500/10 border-red-500/20"       },
                tomorrow:  { label: "Tomorrow",  cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
                this_week: { label: "This Week", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20"  },
                soon:      { label: "Flexible",  cls: "text-zinc-500 bg-zinc-800/60 border-zinc-700/30"     },
              };
              const urg = urgencyConfig[sq.urgency] ?? urgencyConfig.soon;

              const sqPathway: "vehicle" | "boat" | "rv" | undefined =
                sq.service_type === "boat" ? "boat" :
                sq.service_type === "rv"   ? "rv"   :
                "vehicle";

              return (
                <div
                  key={sq.id}
                  className="rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] p-3 space-y-2"
                >
                  {/* Name + urgency */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white leading-tight truncate">{sq.name}</p>
                      <a href={`tel:${sq.phone}`} className="text-[10px] text-zinc-500 font-mono hover:text-[#D4AF37] transition-colors">
                        {fmtPhone(sq.phone)}
                      </a>
                    </div>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0", urg.cls)}>
                      {urg.label}
                    </span>
                  </div>

                  {/* Service + vehicle */}
                  {(sq.specific_service || sq.vehicle_info) && (
                    <div className="space-y-0.5">
                      {sq.specific_service && (
                        <p className="text-[10px] text-zinc-400 font-semibold">{sq.specific_service}</p>
                      )}
                      {sq.vehicle_info && (
                        <p className="text-[10px] text-zinc-600">{sq.vehicle_info}</p>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  {sq.service_address && (
                    <p className="text-[10px] text-zinc-600 flex items-start gap-1 leading-relaxed">
                      <MapPin size={9} className="text-zinc-700 mt-0.5 shrink-0" />
                      {sq.service_address}
                    </p>
                  )}

                  {/* Availability */}
                  <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 italic">
                    &ldquo;{sq.available_dates}&rdquo;
                  </p>

                  {/* Primary action row */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setSqueezePrefill({
                          profileId:   "",
                          name:        sq.name,
                          phone:       sq.phone,
                          email:       sq.email ?? "",
                          address:     sq.service_address ?? "",
                          vehicles:    [],
                          pathwayHint: sqPathway,
                        });
                        setActiveSqueeze(sq);
                        setShowNewBooking(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#D4AF37] text-zinc-950 text-[10px] font-black uppercase tracking-widest hover:bg-[#e6c84a] active:scale-95 transition-all"
                    >
                      <Zap size={11} /> Schedule
                    </button>
                    {sq.phone && (
                      <a
                        href={`sms:${(sq.phone ?? "").replace(/\D/g, "")}`}
                        title="Text"
                        className="flex items-center justify-center w-9 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.09] transition-all active:scale-95"
                      >
                        <MessageSquare size={13} />
                      </a>
                    )}
                    {sq.email && (
                      <a
                        href={`mailto:${sq.email}`}
                        title="Email"
                        className="flex items-center justify-center w-9 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.09] transition-all active:scale-95"
                      >
                        <Mail size={13} />
                      </a>
                    )}
                  </div>

                  {/* Secondary status row */}
                  <div className="flex gap-1.5">
                    {sq.status === "pending" && (
                      <button
                        onClick={async () => {
                          await updateSqueezeStatus(sq.id, "contacted");
                          refetchSqueeze();
                          toast("Marked contacted");
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95"
                      >
                        <MessageSquare size={9} /> Contacted
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        await updateSqueezeStatus(sq.id, "dismissed");
                        refetchSqueeze();
                        toast("Dismissed");
                      }}
                      title="Dismiss (keeps record)"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-all active:scale-95"
                    >
                      <X size={9} /> Dismiss
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Permanently delete this squeeze request from ${sq.name}? This can't be undone.`)) return;
                        const r = await deleteSqueezeRequest(sq.id);
                        if (r.success) { refetchSqueeze(); toast("Request deleted"); }
                        else toast(r.error ?? "Delete failed", "error");
                      }}
                      title="Permanently delete"
                      className="flex items-center justify-center w-9 py-1.5 rounded-md bg-red-500/[0.06] border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all active:scale-95"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── DAY VIEW ──────────────────────────────────────────────────────────────
  function DayView() {
    function timeRange(b: any): string {
      const startMins = timeToMins((b.booking_time ?? "00:00").slice(0, 5));
      const dur = b.duration_override ?? getDurationMins(b.service_name ?? "", b.vehicle_size ?? "sedan");
      const endMins   = startMins + dur;
      return `${minsToDisplay(startMins)} – ${minsToDisplay(endMins)}`;
    }

    return (
      <div className="space-y-3">
        {/* Day navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const prev = new Date(selectedDay);
              prev.setDate(prev.getDate() - 1);
              setSelectedDay(prev);
            }}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-all active:scale-90"
          >
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setViewMode("month")} className="text-sm font-black flex items-center gap-1.5">
            <Calendar size={14} className="text-amber-500" />
            {isToday(selectedDay) ? "Today — " : ""}
            {format(selectedDay, "EEE, MMM d")}
          </button>
          <button
            onClick={() => {
              const next = new Date(selectedDay);
              next.setDate(next.getDate() + 1);
              setSelectedDay(next);
            }}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-all active:scale-90"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Operating hours for this day */}
        {(() => {
          const dayOp = getOpHoursForDay(selectedDay);
          const isOpen = dayOp?.is_open ?? true;
          const startLabel = dayOp?.start_time ? to12h(dayOp.start_time.slice(0, 5)) : "7:00 AM";
          const endLabel   = dayOp?.end_time   ? to12h(dayOp.end_time.slice(0, 5))   : "7:00 PM";

          return editHoursMode ? (
            <div className="bg-white/[0.03] border border-amber-500/20 rounded-xl p-3 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Edit Hours</p>

              {/* Open / Closed toggle */}
              <div className="flex gap-2">
                <button onClick={() => setEditHoursOpen(true)}
                  className={cn("flex-1 py-2 rounded-xl border text-xs font-black transition-all",
                    editHoursOpen ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "border-white/[0.08] text-zinc-500")}>
                  Open
                </button>
                <button onClick={() => setEditHoursOpen(false)}
                  className={cn("flex-1 py-2 rounded-xl border text-xs font-black transition-all",
                    !editHoursOpen ? "bg-red-500/15 border-red-500/40 text-red-400" : "border-white/[0.08] text-zinc-500")}>
                  Closed
                </button>
              </div>

              {editHoursOpen && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">From</p>
                    <input type="time" value={editHoursStart} onChange={e => setEditHoursStart(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">To</p>
                    <input type="time" value={editHoursEnd} onChange={e => setEditHoursEnd(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setEditHoursMode(false)}
                  className="flex-1 py-2 rounded-xl border border-white/[0.08] text-zinc-500 text-xs font-black">Cancel</button>
                <button onClick={handleSaveHours} disabled={savingHours}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-black text-xs font-black flex items-center justify-center gap-1 disabled:opacity-50">
                  {savingHours ? <Loader2 size={11} className="animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", isOpen ? "bg-emerald-500" : "bg-red-500")} />
                <span className="text-xs font-bold text-zinc-400">
                  {isOpen ? `${startLabel} – ${endLabel}` : "Closed"}
                </span>
              </div>
              <button onClick={openHoursEdit}
                className="flex items-center gap-1 text-[10px] font-black text-zinc-600 hover:text-amber-400 transition-all uppercase tracking-wider">
                <Pencil size={10} /> Edit
              </button>
            </div>
          );
        })()}

        {/* Block rest of day */}
        <button
          onClick={handleBlockRestOfDay}
          disabled={blockingDay}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-black uppercase tracking-wider hover:bg-white/[0.03] active:scale-95 transition-all disabled:opacity-50"
        >
          {blockingDay ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
          Block Remaining Day
        </button>

        {/* Booking cards */}
        {dayBookings.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-sm">
            No bookings on this day.
            <br />
            <button
              onClick={() => setShowNewBooking(true)}
              className="mt-3 text-amber-500 text-xs font-black uppercase tracking-wider hover:underline"
            >+ Add a booking</button>
          </div>
        ) : (
          <div className="space-y-2">
            {dayBookings.map((b: any) => {
              const isBlk = b.service_name === "Personal Block";
              const Tag = isBlk ? "div" : "button";
              const pt = payType(b);
              const payStripe = pt === "cash" ? "bg-emerald-500" : pt === "paid" ? "bg-sky-500" : "bg-amber-500";
              const payBorder = pt === "cash" ? "border-emerald-500/20" : pt === "paid" ? "border-sky-500/20" : "border-white/[0.06]";
              const payBg    = pt === "cash" ? "bg-emerald-500/[0.04]" : pt === "paid" ? "bg-sky-500/[0.04]" : "bg-white/[0.02]";
              const payHover = pt === "cash" ? "hover:bg-emerald-500/[0.07]" : pt === "paid" ? "hover:bg-sky-500/[0.07]" : "hover:bg-white/[0.04]";
              const payTime  = pt === "cash" ? "text-emerald-400" : pt === "paid" ? "text-sky-400" : "text-amber-500";
              return (
                <Tag
                  key={b.id}
                  {...(!isBlk && {
                    onClick: () => { setActiveBooking(b); setEditPriceMode(false); setEditPriceVal(String(b.total_price ?? "")); setEditNotesMode(false); setEditNotesVal(b.notes ?? ""); setEditDurMode(false); setEditDurVal(b.duration_override ?? getDurationMins(b.service_name ?? "", b.vehicle_size ?? "sedan")); },
                  })}
                  className={cn(
                    "w-full text-left rounded-xl overflow-hidden flex items-stretch transition-all border",
                    isBlk ? `opacity-70 bg-white/[0.02] border-white/[0.06]` : `${payBg} ${payBorder} ${payHover} active:scale-[0.98]`
                  )}
                >
                  {/* Payment stripe */}
                  <div className={cn("w-1 shrink-0", isBlk ? "bg-zinc-600" : payStripe)} />

                  <div className="flex-1 min-w-0 px-3 py-3">
                    {isBlk ? (
                      <div className="flex items-center gap-2">
                        <Lock size={12} className="text-zinc-500 shrink-0" />
                        <span className="text-sm font-bold text-zinc-400">{b.notes ?? "Personal Block"}</span>
                        <span className="text-xs text-zinc-600 ml-auto">{timeRange(b)}</span>
                        <button
                          onClick={() => { if (confirm("Remove block?")) handleDeleteBooking(b); }}
                          className="ml-2 text-zinc-600 hover:text-red-400 shrink-0"
                        ><X size={13} /></button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Time range */}
                          <p className={cn("text-xs font-black mb-0.5", payTime)}>{timeRange(b)}</p>
                          {/* Client name */}
                          <p className="text-sm font-bold text-white truncate">{bName(b)}</p>
                          {/* Service */}
                          <p className="text-xs text-zinc-500 truncate">{bService(b)}</p>
                          {/* Vehicle */}
                          {bVehicle(b) && (
                            <p className="text-xs text-zinc-600 truncate mt-0.5">{bVehicle(b)}</p>
                          )}
                          {/* Multi-vehicle + add-ons summary badges */}
                          {(() => {
                            const addlCount = Array.isArray(b.additional_vehicles_json) ? b.additional_vehicles_json.length : 0;
                            const vehicleCount = 1 + addlCount;
                            const primaryAddons = Array.isArray(b.addons_json) ? b.addons_json.length : 0;
                            const addlAddons = Array.isArray(b.additional_vehicles_json)
                              ? b.additional_vehicles_json.reduce((s: number, av: any) => s + (Array.isArray(av?.selectedAddons) ? av.selectedAddons.length : 0), 0)
                              : 0;
                            const totalAddons = primaryAddons + addlAddons;
                            if (vehicleCount === 1 && totalAddons === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {vehicleCount > 1 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                    {vehicleCount} vehicles
                                  </span>
                                )}
                                {totalAddons > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                                    +{totalAddons} add-on{totalAddons === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-base font-black text-white">${Number(b.total_price).toFixed(0)}</p>
                          {payType(b) === "cash" ? (
                            <span className="inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Cash</span>
                          ) : payType(b) === "paid" ? (
                            <span className="inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">Paid</span>
                          ) : null}
                          <StatusBadge status={b.status} />
                          {/* Assignee avatar / unassigned chip */}
                          {(() => {
                            const c = b.assigned_to ? contractorsById.get(b.assigned_to as string) : null;
                            if (!c) {
                              return (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                  Unassigned
                                </span>
                              );
                            }
                            const initials = `${(c.firstName[0] ?? "").toUpperCase()}${(c.lastName[0] ?? "").toUpperCase()}`;
                            return (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-400"
                                title={`${c.firstName} ${c.lastName}`.trim()}
                              >
                                {initials || "·"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isBlk && (
                    <div className="flex items-center pr-3 text-zinc-700">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </Tag>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600 mb-1">Schedule</p>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black">Calendar</h1>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
            <button onClick={() => setViewMode("month")}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                viewMode === "month" ? "bg-amber-500 text-black" : "text-zinc-500")}>Month</button>
            <button onClick={() => setViewMode("day")}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                viewMode === "day" ? "bg-amber-500 text-black" : "text-zinc-500")}>Day</button>
          </div>
        </div>
        <SubNav items={SCHEDULE_SUBNAV.map(item =>
          item.href === "/admin/squeeze" ? { ...item, count: pendingSqueezes.length } : item
        )} />
      </div>

      {/* ── Calendar ────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
        ) : viewMode === "month" ? (
          MonthView()
        ) : (
          DayView()
        )}
      </div>

      {/* ── FAB buttons ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-24 right-4 md:bottom-6 flex flex-col gap-3 z-50">
        <button
          onClick={() => setShowBlockTime(true)}
          className="w-12 h-12 rounded-full bg-zinc-700 border border-zinc-600 shadow-xl flex items-center justify-center text-zinc-300 hover:bg-zinc-600 active:scale-90 transition-all"
          title="Block personal time"
        >
          <Lock size={18} />
        </button>
        <button
          onClick={() => setShowNewBooking(true)}
          className="w-14 h-14 rounded-full bg-amber-500 shadow-xl shadow-amber-500/20 flex items-center justify-center text-black hover:bg-amber-400 active:scale-90 transition-all"
          title="Add booking"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* ── New Booking Modal ───────────────────────────────────────────── */}
      <Modal open={showNewBooking} onClose={handleCloseNewBooking}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-black">New Booking</h2>
          {activeSqueeze && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">
              <Zap size={9} /> Squeeze
            </span>
          )}
        </div>
        {activeSqueeze && (
          <div className="mb-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3 space-y-1.5">
            <div className="text-[11px] text-zinc-400 leading-relaxed">
              <span className="font-bold text-[#D4AF37]">{activeSqueeze.name}</span>
              {activeSqueeze.specific_service && (
                <span className="text-zinc-400"> · {activeSqueeze.specific_service}</span>
              )}
              {activeSqueeze.vehicle_info && (
                <span className="text-zinc-600"> ({activeSqueeze.vehicle_info})</span>
              )}
            </div>
            {activeSqueeze.service_address && (
              <p className="text-[10px] text-zinc-600 flex items-center gap-1">
                <MapPin size={9} className="text-zinc-700" />
                {activeSqueeze.service_address}
              </p>
            )}
            <p className="text-[10px] text-zinc-500 italic">
              &ldquo;{activeSqueeze.available_dates}&rdquo;
            </p>
          </div>
        )}
        <NewBookingForm
          defaultDate={format(selectedDay, "yyyy-MM-dd")}
          services={services ?? []}
          clientPrefill={squeezePrefill}
          onDirtyChange={setNewBookingDirty}
          onSuccess={async () => {
            if (activeSqueeze) {
              await updateSqueezeStatus(activeSqueeze.id, "booked");
              refetchSqueeze();
              setActiveSqueeze(null);
              setSqueezePrefill(null);
            }
            setShowNewBooking(false);
            setNewBookingDirty(false);
            refetch();
          }}
          onCancel={() => handleCloseNewBooking()}
        />
      </Modal>

      {/* ── Block Time Modal ────────────────────────────────────────────── */}
      <Modal open={showBlockTime} onClose={() => setShowBlockTime(false)}>
        <PersonalBlockForm
          defaultDate={format(selectedDay, "yyyy-MM-dd")}
          onSuccess={() => { setShowBlockTime(false); refetch(); }}
          onCancel={() => setShowBlockTime(false)}
        />
      </Modal>

      {/* ── Booking Detail / Action Sheet ────────────────────────────────── */}
      <Modal open={!!activeBooking && !showReschedule} onClose={() => { setActiveBooking(null); setEditPriceMode(false); setEditNotesMode(false); setEditDurMode(false); setPayChannelPick(false); }}>
        {activeBooking && (() => {
          const phone   = bPhone(activeBooking);
          const email   = bEmail(activeBooking);
          const addr    = bAddress(activeBooking);
          const vehicle = bVehicle(activeBooking);
          const service = bService(activeBooking);
          const rawTime  = (activeBooking.booking_time ?? "00:00").slice(0, 5);
          // booking_time may be stored as "HH:MM:SS" (24h) or "h:mm AM/PM" (12h) depending on how it was created
          const startMins = /^\d{1,2}:\d{2}$/.test(rawTime)
            ? timeToMins(rawTime)
            : timeToMins(to24h(activeBooking.booking_time ?? "09:00"));
          const dur = activeBooking.duration_override ?? getDurationMins(activeBooking.service_name ?? "", activeBooking.vehicle_size ?? "sedan");
          const timeRangeStr = `${minsToDisplay(startMins)} – ${minsToDisplay(startMins + dur)}`;
          // Safely parse the booking date
          let formattedDate = activeBooking.booking_date ?? "";
          try { formattedDate = format(parseISO(activeBooking.booking_date + "T12:00:00"), "EEEE, MMMM d, yyyy"); } catch {}

          const pt = payType(activeBooking);
          const barColor   = pt === "cash" ? "bg-emerald-500"      : pt === "paid" ? "bg-sky-500"      : "bg-amber-500";
          const timeColor  = pt === "cash" ? "text-emerald-400"    : pt === "paid" ? "text-sky-400"    : "text-amber-400";
          const priceColor = pt === "cash" ? "text-emerald-400"    : pt === "paid" ? "text-sky-400"    : "text-amber-400";
          const inputBorder= pt === "cash" ? "border-emerald-500/50": pt === "paid" ? "border-sky-500/50": "border-amber-500/50";
          const inputText  = pt === "cash" ? "text-emerald-400"    : pt === "paid" ? "text-sky-400"    : "text-amber-400";
          const saveBg     = pt === "cash" ? "bg-emerald-500"      : pt === "paid" ? "bg-sky-500"      : "bg-amber-500";
          const hoverEdit  = pt === "cash" ? "hover:text-emerald-400": pt === "paid" ? "hover:text-sky-400": "hover:text-amber-400";

          return (
            <div className="space-y-5">

              {/* ── Hero card ────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                {/* Payment accent top bar */}
                <div className={`h-1 ${barColor} w-full`} />
                <div className="p-4">
                  {/* Time + date + duration edit */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {editDurMode ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          {[30,60,90,120,150,180,210,240,270,300,330,360,390,420,450,480].map(m => (
                            <button key={m} onClick={() => setEditDurVal(m)}
                              className={cn("px-2 py-1 rounded-lg border text-[10px] font-black transition-all",
                                editDurVal === m ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-500")}>
                              {m < 60 ? `${m}m` : m % 60 === 0 ? `${m/60}h` : `${Math.floor(m/60)}h${m%60}`}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setEditDurMode(false)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
                        <button onClick={handleSaveDuration} disabled={savingDetails}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-black flex items-center gap-1">
                          {savingDetails ? <Loader2 size={10} className="animate-spin" /> : "Save"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${timeColor}`}>{timeRangeStr}</span>
                        <button onClick={() => setEditDurMode(true)}
                          className={`w-5 h-5 flex items-center justify-center rounded-md bg-white/[0.04] text-zinc-600 ${hoverEdit} transition-all`}
                          title="Edit duration">
                          <Pencil size={10} />
                        </button>
                        <span className="text-zinc-700">·</span>
                        <span className="text-xs text-zinc-500">{formattedDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Name + price row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-black leading-tight tracking-tight">{bName(activeBooking)}</h2>
                      {/* Vehicle + service intentionally omitted here — see Vehicles & Pricing panel below */}
                    </div>

                    {/* Price + edit */}
                    <div className="shrink-0 text-right">
                      {editPriceMode ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-zinc-400 text-xl font-black">$</span>
                            <input
                              type="number"
                              value={editPriceVal}
                              onChange={e => setEditPriceVal(e.target.value)}
                              className={`w-24 bg-white/[0.06] border ${inputBorder} rounded-xl px-2 py-1.5 text-xl font-black ${inputText} text-right focus:outline-none`}
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => setEditPriceMode(false)}
                              className="flex-1 py-2 rounded-xl border border-white/[0.08] text-zinc-500 text-xs font-black">✕</button>
                            <button onClick={handleSavePrice} disabled={savingDetails}
                              className={`flex-1 py-2 rounded-xl ${saveBg} text-black text-xs font-black flex items-center justify-center gap-1`}>
                              {savingDetails ? <Loader2 size={11} className="animate-spin" /> : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const cardTotal = Number(activeBooking.total_price ?? 0);
                            const stripeId = (activeBooking as any).stripe_checkout_session_id as string | null;
                            const isStripe = !!stripeId;
                            const showCash = !isStripe && cardTotal > 0;
                            const cashTotal = showCash ? cashPriceFor(cardTotal) : null;
                            const savings = cashTotal != null ? cardTotal - cashTotal : 0;
                            return (
                              <>
                                <p className={`text-3xl font-black ${priceColor}`}>${cardTotal.toFixed(0)}</p>
                                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mt-0.5">card · stored</p>
                                {showCash && cashTotal != null && savings > 0 && (
                                  <p className="text-xs font-bold text-emerald-400 mt-1 tabular-nums">
                                    ${cashTotal.toFixed(0)} <span className="text-[9px] uppercase tracking-wider">cash · save ${savings.toFixed(0)}</span>
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <StatusBadge status={activeBooking.status} />
                            <button
                              onClick={() => { setEditPriceMode(true); setEditPriceVal(String(activeBooking.total_price ?? "")); }}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] text-zinc-500 ${hoverEdit} active:scale-90 transition-all`}
                              title="Edit price"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Payment quick-actions (top of card) ────────────────────── */}
              {activeBooking.status !== "cancelled" && (() => {
                const isPaid     = !!activeBooking.paid_at;
                const linkSent   = !!activeBooking.payment_link_sent_at;
                const paySource  = (activeBooking.payment_source as string | null) ?? "";

                if (isPaid) {
                  return (
                    <div className="flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-sm uppercase tracking-wider py-3.5 rounded-xl">
                      <Check size={16} /> Client Paid{paySource ? ` · ${paySource === "cash" ? "Cash" : paySource === "stripe" ? "Stripe" : paySource}` : ""}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-2">
                    {payChannelPick ? (
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={async () => { await handleStripeLink(activeBooking); setPayChannelPick(false); }}
                          disabled={sendingLink}
                          className="flex items-center justify-center gap-1 bg-sky-500/15 border border-sky-500/35 text-sky-400 font-black text-[11px] uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                        >
                          {sendingLink ? <Loader2 size={13} className="animate-spin" /> : <><Mail size={13} /> Email</>}
                        </button>
                        <button
                          onClick={() => { handleTextPayLink(activeBooking); setPayChannelPick(false); }}
                          disabled={sendingLink}
                          className="flex items-center justify-center gap-1 bg-amber-500/15 border border-amber-500/35 text-amber-400 font-black text-[11px] uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                        >
                          <MessageSquare size={13} /> Text
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPayChannelPick(true)}
                        disabled={sendingLink}
                        className={cn(
                          "flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50 border",
                          linkSent
                            ? "bg-sky-500/[0.06] border-sky-500/25 text-sky-300"
                            : "bg-sky-500/15 border-sky-500/35 text-sky-400"
                        )}
                      >
                        {linkSent ? <><CheckCircle2 size={14} /> Payment Sent · Resend</> : <><Send size={14} /> Send Payment Link</>}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkPaidCash(activeBooking)}
                      disabled={sendingLink}
                      className="flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      <DollarSign size={14} /> Mark Paid (Cash)
                    </button>
                  </div>
                );
              })()}

              {/* ── Vehicles & Add-ons (editable, multi-vehicle) ──────────── */}
              <BookingVehiclesPanel
                bookingId={activeBooking.id}
                onChange={() => refetch()}
              />

              {/* ── Contractor assignment ───────────────────────────────── */}
              {!activeBooking.service_name?.includes("Personal Block") && (
                <AssignmentBlock
                  booking={activeBooking}
                  contractors={contractorRoster as ContractorSummary[]}
                  onChange={() => refetch()}
                />
              )}

              {/* ── Photo Review (only when contractor has marked complete) ── */}
              {activeBooking?.job_completed_at && (
                <PhotoReviewPanel bookingId={activeBooking.id} />
              )}

              {/* ── Pricing Breakdown ───────────────────────────────────── */}
              {(() => {
                const b: any = activeBooking;
                // Parse various discount/fee lines out of the notes blob since
                // they aren't stored as separate columns yet.
                const notesStr = (b.notes ?? "") as string;
                const matchAmount = (re: RegExp): number | null => {
                  const m = notesStr.match(re);
                  return m ? Number(m[1]) : null;
                };
                const matchText = (re: RegExp): string | null => {
                  const m = notesStr.match(re);
                  return m ? m[1] : null;
                };
                const travelFee     = matchAmount(/🚗 Travel Fee:\s*\$(\d+(?:\.\d+)?)/);
                const setupFee      = matchAmount(/🧹 One-time Setup & Reset:\s*\$(\d+(?:\.\d+)?)/);
                const pointsAmt     = matchAmount(/🎁 Redeemed \d+ pts for \$(\d+(?:\.\d+)?)/);
                const promoCode     = matchText(/🏷️ Promo code\s+(\S+)\s+applied/);
                const promoAmt      = matchAmount(/🏷️ Promo code[^$]+\$(\d+(?:\.\d+)?)\s+off/);
                const giftCode      = matchText(/🎁 Gift card \(([^)]+)\)/);
                const giftAmt       = matchAmount(/🎁 Gift card[^$]+\$(\d+(?:\.\d+)?)\s+off/);
                const loyaltyPct    = matchAmount(/⭐ Loyalty discount \((\d+)%/);
                const loyaltyAmt    = matchAmount(/⭐ Loyalty discount[^$]+\$(\d+(?:\.\d+)?)\s+off/);
                const bundleAddons  = matchAmount(/🎁 Bundle discount \((\d+) add-ons\)/);
                const bundleAmt     = matchAmount(/🎁 Bundle discount[^$]+\$(\d+(?:\.\d+)?)\s+off/);
                const multiCount    = matchAmount(/🚗 Multi-vehicle discount \((\d+) vehicles\)/);
                const multiAmt      = matchAmount(/🚗 Multi-vehicle discount[^$]+\$(\d+(?:\.\d+)?)\s+off/);
                // Coupon from joined coupons table (admin client fetched it)
                const couponObj     = Array.isArray(b.coupons) ? b.coupons[0] : b.coupons;
                const couponCode    = promoCode ?? couponObj?.code ?? null;
                // Service base — looked up from joined services table
                const svcObj        = Array.isArray(b.services) ? b.services[0] : b.services;
                const sizeKey       = ({ small: "price_small", medium: "price_medium", large: "price_large", extra_large: "price_extra_large" } as const)[(b.vehicle_size ?? "medium") as "small"|"medium"|"large"|"extra_large"] ?? "price_medium";
                const servicePrice  = svcObj ? Number(svcObj[sizeKey] ?? svcObj.price_small ?? 0) : 0;
                // Addons
                const primaryAddons: any[] = Array.isArray(b.addons_json) ? b.addons_json : [];
                const primaryAddonsTotal = primaryAddons.reduce((s, a) => s + Number(a.price ?? 0), 0);
                const addls: any[] = Array.isArray(b.additional_vehicles_json) ? b.additional_vehicles_json : [];
                const addlVehiclesTotal = addls.reduce((s, av) => {
                  const sp = Number(av.servicePrice ?? av.sp ?? 0);
                  const addonSum = (Array.isArray(av.selectedAddons) ? av.selectedAddons : []).reduce((s2: number, a: any) => s2 + Number(a.price ?? 0), 0);
                  return s + sp + addonSum;
                }, 0);
                // Membership credit
                const memberCreditCents = Number(b.membership_credit_applied_cents ?? 0);
                const memberCredit = memberCreditCents / 100;
                // Computed subtotal
                const subtotal = servicePrice + primaryAddonsTotal + addlVehiclesTotal + (travelFee ?? 0) + (setupFee ?? 0);
                const knownDiscounts = (promoAmt ?? 0) + (giftAmt ?? 0) + (pointsAmt ?? 0) + (loyaltyAmt ?? 0) + (bundleAmt ?? 0) + (multiAmt ?? 0) + memberCredit;
                const totalPrice = Number(b.total_price ?? 0);
                // Implied additional discount (cash discount or admin price edit)
                const impliedExtra = Math.max(0, Math.round((subtotal - knownDiscounts - totalPrice) * 100) / 100);

                if (servicePrice === 0 && subtotal === 0) return null; // Boat/RV footage-priced or missing data

                const Row = ({ label, amount, negative, dim, accent }: { label: string; amount: string; negative?: boolean; dim?: boolean; accent?: string }) => (
                  <div className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className={dim ? "text-zinc-600" : "text-zinc-400"}>{label}</span>
                    <span className={`tabular-nums font-bold ${accent ?? (negative ? "text-emerald-400" : "text-zinc-200")}`}>
                      {negative ? "−" : ""}{amount}
                    </span>
                  </div>
                );

                return (
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Pricing Breakdown</span>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                      {servicePrice > 0 && (
                        <Row label={`${svcObj?.name ?? "Service"} (${b.vehicle_size ?? "—"})`} amount={`$${servicePrice.toFixed(2)}`} />
                      )}
                      {primaryAddons.map((a: any, i: number) => (
                        <Row key={`pa-${i}`} label={`+ ${a.label ?? a.id}`} amount={`$${Number(a.price ?? 0).toFixed(2)}`} dim />
                      ))}
                      {addls.length > 0 && (
                        <Row label={`Additional vehicle${addls.length === 1 ? "" : "s"} subtotal (${addls.length})`} amount={`$${addlVehiclesTotal.toFixed(2)}`} />
                      )}
                      {travelFee != null && travelFee > 0 && (
                        <Row label="Travel fee" amount={`$${travelFee.toFixed(2)}`} />
                      )}
                      {setupFee != null && setupFee > 0 && (
                        <Row label="One-time setup fee" amount={`$${setupFee.toFixed(2)}`} />
                      )}
                      {loyaltyAmt != null && loyaltyAmt > 0 && (
                        <Row label={`⭐ Loyalty (${loyaltyPct ?? "?"}% off)`} amount={`$${loyaltyAmt.toFixed(2)}`} negative />
                      )}
                      {bundleAmt != null && bundleAmt > 0 && (
                        <Row label={`🎁 Bundle (${bundleAddons ?? "?"} add-ons stacked)`} amount={`$${bundleAmt.toFixed(2)}`} negative accent="text-violet-400" />
                      )}
                      {multiAmt != null && multiAmt > 0 && (
                        <Row label={`🚗 Multi-vehicle (${multiCount ?? "?"} vehicles)`} amount={`$${multiAmt.toFixed(2)}`} negative accent="text-emerald-400" />
                      )}
                      {promoAmt != null && promoAmt > 0 && (
                        <Row label={`🏷️ Promo${couponCode ? ` ${couponCode}` : ""}`} amount={`$${promoAmt.toFixed(2)}`} negative />
                      )}
                      {!promoAmt && couponObj && (
                        <Row label={`🏷️ Coupon ${couponObj.code}${couponObj.discount_percentage ? ` (${couponObj.discount_percentage}% off)` : couponObj.discount_amount ? ` ($${couponObj.discount_amount} off)` : ""}`} amount="—" dim />
                      )}
                      {giftAmt != null && giftAmt > 0 && (
                        <Row label={`🎁 Gift card${giftCode ? ` ${giftCode}` : ""}`} amount={`$${giftAmt.toFixed(2)}`} negative />
                      )}
                      {pointsAmt != null && pointsAmt > 0 && (
                        <Row label="🎁 Points redeemed" amount={`$${pointsAmt.toFixed(2)}`} negative />
                      )}
                      {memberCredit > 0 && (
                        <Row label="👑 Membership credit" amount={`$${memberCredit.toFixed(2)}`} negative accent="text-[#D4AF37]" />
                      )}
                      {impliedExtra > 0.01 && loyaltyAmt == null && (
                        <Row label="Other adjustment (cash discount / admin edit)" amount={`$${impliedExtra.toFixed(2)}`} negative dim />
                      )}
                    </div>
                    <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                      <span className="text-xs font-bold text-zinc-300">Card total (stored)</span>
                      <span className="text-base font-black text-white tabular-nums">${totalPrice.toFixed(2)}</span>
                    </div>
                    {/* Cash alternative — what to collect if paid in cash */}
                    {(() => {
                      const stripeId = (b as any).stripe_checkout_session_id as string | null;
                      const isStripe = !!stripeId;
                      if (isStripe || totalPrice <= 0) return null;
                      const cashTotal = cashPriceFor(totalPrice);
                      if (cashTotal >= totalPrice) return null;
                      return (
                        <div className="px-4 py-2.5 border-t border-emerald-500/20 bg-emerald-500/[0.04] flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300">If paid in cash, collect</span>
                          <span className="text-sm font-black text-emerald-400 tabular-nums">
                            ${cashTotal.toFixed(2)} <span className="text-[10px] uppercase tracking-wider opacity-70">save ${(totalPrice - cashTotal).toFixed(0)}</span>
                          </span>
                        </div>
                      );
                    })()}
                    {/* Math-mismatch warning intentionally removed — the
                        booking_vehicles panel above is now the source of
                        truth for line items; this view is informational only. */}
                  </div>
                );
              })()}

              {/* ── Contact rows ─────────────────────────────────────────── */}
              {(phone || email || addr) && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
                  {phone && (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Phone size={15} className="text-zinc-600 shrink-0" />
                      <span className="text-sm text-zinc-200 flex-1 truncate">{phone}</span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => copyToClipboard(phone, "phone")}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-500 active:scale-90 transition-all">
                          {copied === "phone" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a href={`tel:${phone}`}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 active:scale-90 transition-all">
                          <Phone size={14} />
                        </a>
                        <a href={`sms:${phone}`}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 active:scale-90 transition-all">
                          <MessageSquare size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Mail size={15} className="text-zinc-600 shrink-0" />
                      <span className="text-sm text-zinc-200 flex-1 truncate">{email}</span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => copyToClipboard(email, "email")}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-500 active:scale-90 transition-all">
                          {copied === "email" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a href={`mailto:${email}`}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 active:scale-90 transition-all">
                          <Mail size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                  {addr && (
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      <MapPin size={15} className="text-zinc-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-200 flex-1 leading-snug">{addr}</span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => copyToClipboard(addr, "addr")}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-500 active:scale-90 transition-all">
                          {copied === "addr" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <a href={`https://maps.apple.com/?q=${encodeURIComponent(addr)}`} target="_blank"
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 active:scale-90 transition-all">
                          <Navigation size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Action buttons ───────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-2.5">
                {addr && (
                  <BigActionBtn
                    icon={<Navigation size={18} />}
                    label="Directions"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank")}
                  />
                )}
                {phone && (
                  <BigActionBtn icon={<Phone size={18} />} label="Call Client"
                    onClick={() => window.open(`tel:${phone}`, "_self")} />
                )}
                {phone && (
                  <BigActionBtn icon={<MessageSquare size={18} />} label="Text Client"
                    onClick={() => window.open(`sms:${phone}`, "_self")} />
                )}
                <BigActionBtn
                  icon={<Send size={18} />}
                  label="On My Way"
                  onClick={() => handleOmw(activeBooking)}
                />
                <BigActionBtn
                  icon={<UserPlus size={18} />}
                  label="Save Contact"
                  onClick={() => handleSaveContact(activeBooking)}
                />
                <BigActionBtn
                  icon={<RotateCcw size={18} />}
                  label="Reschedule"
                  onClick={() => { setRescheduleDate(activeBooking.booking_date); setRescheduleTime(activeBooking.booking_time?.slice(0,5) ?? "09:00"); setShowReschedule(true); }}
                />
              </div>

              {/* ── Notes ────────────────────────────────────────────────── */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notes</p>
                  {!editNotesMode && (
                    <button
                      onClick={() => { setEditNotesMode(true); setEditNotesVal(activeBooking.notes ?? ""); }}
                      className="flex items-center gap-1.5 text-xs font-black text-amber-400 active:opacity-60 transition-all"
                    >
                      <Pencil size={12} /> {activeBooking.notes ? "Edit" : "Add Note"}
                    </button>
                  )}
                </div>
                {editNotesMode ? (
                  <div className="p-4 space-y-3">
                    <textarea
                      value={editNotesVal}
                      onChange={e => setEditNotesVal(e.target.value)}
                      rows={4}
                      placeholder="Job notes, special instructions, upsell ideas…"
                      className="w-full bg-white/[0.04] border border-amber-500/30 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditNotesMode(false)}
                        className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black">
                        Cancel
                      </button>
                      <button onClick={handleSaveNotes} disabled={savingDetails}
                        className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                        {savingDetails ? <Loader2 size={15} className="animate-spin" /> : <><StickyNote size={15} /> Save</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-4 min-h-[56px]">
                    {activeBooking.notes
                      ? <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{activeBooking.notes}</p>
                      : <p className="text-sm text-zinc-600 italic">No notes — tap Add Note above.</p>
                    }
                  </div>
                )}
              </div>

              {/* ── Job Status ───────────────────────────────────────────── */}
              {/* Per-vehicle "Mark Done" + cash/Stripe auto-complete handle this now;
                  No-Show kept as a small standalone since it's its own outcome. */}
              {activeBooking.status === "confirmed" && (
                <button onClick={() => handleNoShowClick(activeBooking)}
                  className="w-full flex items-center justify-center gap-2 bg-white/[0.04] text-orange-400 border border-orange-500/25 font-black text-sm uppercase tracking-wide py-3 rounded-2xl active:scale-95 transition-all">
                  <AlertCircle size={16} /> Mark No-Show
                </button>
              )}

              {/* ── Danger zone ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-2.5">
                {activeBooking.status !== "cancelled" && (
                  <button onClick={() => handleCancelBooking(activeBooking)}
                    className="flex items-center justify-center gap-2 bg-white/[0.03] text-red-400 border border-red-500/20 font-black text-sm uppercase tracking-wide py-4 rounded-2xl active:scale-95 transition-all">
                    <X size={15} /> Cancel
                  </button>
                )}
                <button onClick={() => handleDeleteBooking(activeBooking)}
                  className={cn(
                    "flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/25 font-black text-sm uppercase tracking-wide py-4 rounded-2xl active:scale-95 transition-all",
                    activeBooking.status === "cancelled" ? "col-span-2" : ""
                  )}>
                  <Trash2 size={15} /> Delete
                </button>
              </div>

              {/* ── Dismiss ──────────────────────────────────────────────── */}
              <button
                onClick={() => { setActiveBooking(null); setEditPriceMode(false); setEditNotesMode(false); setPayChannelPick(false); }}
                className="w-full py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 font-black text-sm tracking-wide active:scale-[0.98] transition-all"
              >
                Close
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* ── Reschedule Modal ─────────────────────────────────────────────── */}
      <Modal open={showReschedule} onClose={() => setShowReschedule(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-black">Reschedule</h2>
          <div>
            <FieldLabel>New Date</FieldLabel>
            <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <FieldLabel>New Time</FieldLabel>
            <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReschedule(false)} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black uppercase tracking-wider">Back</button>
            <button onClick={handleReschedule} disabled={reschedule.isPending} className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 flex items-center justify-center gap-2">
              {reschedule.isPending ? <Loader2 className="animate-spin" size={16} /> : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Shared UI helpers ───────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{children}</p>;
}
function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
    />
  );
}
function NavBtn({ onBack, onNext, disabled }: { onBack?: () => void; onNext?: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2 pt-1">
      {onBack && <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black uppercase tracking-wider">Back</button>}
      {onNext && <button onClick={onNext} disabled={disabled} className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">Next</button>}
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-zinc-600">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
function ActionBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-zinc-200 text-xs font-black uppercase tracking-wider py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
    >{icon} {label}</button>
  );
}
function BigActionBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.07] text-zinc-200 rounded-2xl py-4 px-3 font-black text-xs uppercase tracking-wide active:scale-95 transition-all disabled:opacity-40 min-h-[72px]"
    >
      <span className="text-amber-400">{icon}</span>
      {label}
    </button>
  );
}
function DetailRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-300 text-sm">
      <span className="text-zinc-600 shrink-0">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function AssignmentBlock({
  booking,
  contractors,
  onChange,
}: {
  booking: any;
  contractors: ContractorSummary[];
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const assignedId = booking.assigned_to as string | null;
  const current = assignedId ? contractors.find(c => c.id === assignedId) : null;
  const eligible = contractors.filter(c => c.employmentStatus === "active" && c.fullyOnboarded);

  const handleAssign = async (contractorId: string | null) => {
    setBusy(true);
    const r = await manuallyAssignBooking(booking.id, contractorId);
    setBusy(false);
    if (!r.ok) { toast(r.error ?? "Failed"); return; }
    toast(contractorId ? "Assigned" : "Unassigned");
    setOpen(false);
    onChange();
  };

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Assigned contractor</span>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-[10px] font-bold text-amber-400 uppercase tracking-wider"
        >
          {open ? "Cancel" : current ? "Reassign" : "Assign"}
        </button>
      </div>
      <div className="px-4 py-3">
        {current ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[11px] font-black text-amber-400">
              {(current.firstName[0] ?? "").toUpperCase()}{(current.lastName[0] ?? "").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-100 truncate">{current.firstName} {current.lastName}</p>
              <p className="text-[10px] text-zinc-500">Tier {current.commissionTier} · {current.commissionPct}%</p>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-rose-400 font-bold">Unassigned</p>
        )}

        {open && (
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {eligible.length === 0 ? (
              <p className="text-[11px] text-zinc-600 text-center py-3">No active onboarded contractors yet.</p>
            ) : (
              eligible.map(c => (
                <button
                  key={c.id}
                  disabled={busy || c.id === assignedId}
                  onClick={() => handleAssign(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-xl border transition-all text-left",
                    c.id === assignedId
                      ? "border-amber-500/40 bg-amber-500/[0.08] opacity-50 cursor-not-allowed"
                      : "border-white/[0.06] hover:border-amber-500/30 hover:bg-amber-500/[0.04]"
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/[0.04] flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                    {(c.firstName[0] ?? "").toUpperCase()}{(c.lastName[0] ?? "").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-zinc-200 truncate">{c.firstName} {c.lastName}</p>
                    <p className="text-[10px] text-zinc-500">T{c.commissionTier} · {c.commissionPct}% · {c.dailyJobCap}/day cap</p>
                  </div>
                  {c.id === assignedId && <Check size={11} className="text-amber-400 shrink-0" />}
                </button>
              ))
            )}
            {assignedId && (
              <button
                disabled={busy}
                onClick={() => handleAssign(null)}
                className="w-full mt-1 py-2 rounded-xl border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/[0.06]"
              >
                Clear assignment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
