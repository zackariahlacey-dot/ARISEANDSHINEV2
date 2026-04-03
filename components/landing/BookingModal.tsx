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
  HelpCircle,
  Crown,
  Sparkles,
  Gem,
  Layers,
  Waves,
} from "lucide-react";
import type { Service } from "@/app/page";
import {
  bookDetailing,
  type BookingResult,
  type VehicleSizeSlug,
} from "@/app/actions/bookDetailing";
import {
  validateCoupon,
  type CouponResult,
} from "@/app/actions/validateCoupon";
import { getBookingsForDate, type BookingOnDate } from "@/app/actions/getBookingsForDate";
import { detectVehicleSize } from "@/lib/detectVehicleSize";
import {
  filterMakesByQuery,
  filterModelsByQuery,
  sizeTierToSlug,
} from "@/lib/vehicleDatabase";
import { getAuthProfile } from "@/app/actions/getAuthProfile";
import { getProfilePointsByPhone } from "@/app/actions/getProfilePointsByPhone";
import { getAuthReferralStatus } from "@/app/actions/getAuthReferralStatus";
import { getAvailability, type OperatingHour } from "@/app/actions/getAvailability";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SERVICE_DURATIONS } from "@/lib/constants";

/** 10 reward points = $1 discount. Max total points redeemable is 1000 ($100). */
const POINTS_PER_DOLLAR = 10;
const MAX_REDEEMABLE_POINTS = 1000;
/** Interior Monthly Maintenance = $75, Full Detail Monthly Maintenance = $100 */
function getMaintenanceSetupFee(serviceName: string): number {
  return serviceName.toLowerCase().includes("full") ? 100 : 75;
}

const ALL_ADD_ONS = [
  { id: "engine_bay", label: "Engine Bay Detail",                    price: 50, desc: "Deep clean and degrease the engine bay" },
  { id: "floor_1",   label: "Floorboard Shampoo – 1 Section",       price: 30, desc: "Deep shampoo for one section of floorboards" },
  { id: "floor_2",   label: "Floorboard Shampoo – 2 Sections",      price: 45, desc: "Deep shampoo for two sections of floorboards" },
  { id: "floor_all", label: "Floorboard Shampoo – All Sections",     price: 60, desc: "Full deep shampoo for all floorboard sections" },
  { id: "clay_bar",  label: "Clay Bar Treatment",                    price: 40, desc: "Remove embedded contaminants for a glass-smooth finish" },
] as const;

type AddonItem = typeof ALL_ADD_ONS[number];

const FLOOR_ADDON_IDS = ["floor_1", "floor_2", "floor_all"];

/**
 * Returns add-ons relevant to a given service.
 * Hides options that are redundant (already included) or irrelevant (wrong scope).
 */
function getAddonsForService(serviceName: string): readonly AddonItem[] {
  const n = serviceName.toLowerCase();

  // Footage-based services (boat/RV): no car-specific add-ons
  if (n.includes("boat") || n.includes("rv") || n.includes("motorhome")) return [];

  // Paint correction: exterior-only work; clay bar already part of the process
  if (n.includes("paint") || n.includes("single-stage") || n.includes("two-stage")) {
    return ALL_ADD_ONS.filter(a => a.id === "engine_bay");
  }

  // Ultimate Showroom: clay bar & decontamination already included; has full interior
  if (n.includes("ultimate showroom")) {
    return ALL_ADD_ONS.filter(a => a.id === "engine_bay" || FLOOR_ADDON_IDS.includes(a.id));
  }

  // Exterior Detail: no floorboard shampoo (exterior only)
  if (n.includes("exterior") && !n.includes("full")) {
    return ALL_ADD_ONS.filter(a => a.id === "engine_bay" || a.id === "clay_bar");
  }

  // Interior Detail (standalone, not maintenance): no clay bar (exterior treatment)
  if (n.includes("interior") && !n.includes("full") && !n.includes("maintenance") && !n.includes("ultimate")) {
    return ALL_ADD_ONS.filter(a => a.id !== "clay_bar");
  }

  // Maintenance plans: engine bay + floor shampoo (quick recurring visits)
  if (n.includes("maintenance")) {
    return ALL_ADD_ONS.filter(a => a.id === "engine_bay" || FLOOR_ADDON_IDS.includes(a.id));
  }

  // Ultimate Interior Reset, Full Detail, default → all add-ons
  return ALL_ADD_ONS;
}

/**
 * Returns a note when a feature the customer might add is already included in the service.
 */
function getIncludedNote(serviceName: string): string | null {
  const n = serviceName.toLowerCase();
  if (n.includes("paint") || n.includes("single-stage") || n.includes("two-stage") || n.includes("ultimate showroom")) {
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

/**
 * Returns a display label for the service category.
 */
function getServiceCategory(service: Service): { label: string; color: string } {
  const n = service.name.toLowerCase();
  if (service.is_subscription) return { label: "Maintenance Club",          color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  if (n.includes("ultimate"))   return { label: "Ultimate Series",           color: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20" };
  if (n.includes("paint") || n.includes("correction") || n.includes("single-stage") || n.includes("two-stage"))
                                return { label: "Paint Correction",           color: "text-violet-400 bg-violet-500/10 border-violet-500/20" };
  if (n.includes("boat"))       return { label: "Marine Detailing",          color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  if (n.includes("rv") || n.includes("motorhome"))
                                return { label: "RV Detailing",              color: "text-green-400 bg-green-500/10 border-green-500/20" };
  return                               { label: "One-Time Detailing",         color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" };
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Per-foot rates for footage-based services (boat / RV) */
const FOOTAGE_RATE: Record<string, number> = {
  // Boats — 15 ft minimum
  "Boat Interior Detail": 18,
  "Boat Exterior Detail": 20,
  "Full Boat Detail":     32,
  // RVs — 20 ft minimum
  "RV Interior Detail":   20,
  "RV Exterior Detail":   22,
  "RV Full Detail":       38,
};
/** Minimum footage per service */
const FOOTAGE_MIN_FEET: Record<string, number> = {
  "Boat Interior Detail": 15,
  "Boat Exterior Detail": 15,
  "Full Boat Detail":     15,
  "RV Interior Detail":   20,
  "RV Exterior Detail":   20,
  "RV Full Detail":       20,
};
// backward-compat aliases used in a few inline JSX references
const BOAT_RATE = FOOTAGE_RATE;
const BOAT_MIN_FEET = 15;

const VEHICLE_SIZES: {
  id: VehicleSizeSlug;
  label: string;
  desc: string;
  sizeKey: "price_small" | "price_medium" | "price_large" | "price_extra_large";
}[] = [
  {
    id: "compact",
    label: "Small / Medium",
    desc: "Sedans, Coupes, Small SUVs (No 3rd Row)",
    sizeKey: "price_small",
  },
  {
    id: "suv",
    label: "Large / 3-Row / Van",
    desc: "3-Row SUVs, Vans, Large Trucks",
    sizeKey: "price_large",
  },
];

const WORKDAY_START = "1:00 PM";
const WORKDAY_END = "6:30 PM";
const SLOT_INTERVAL_MIN = 30;

// Fallback slots when no operating_hours (1:00 PM–6:00 PM, 30-min increments)
function buildFallbackSlots(): { time: string; period: string }[] {
  const slots: { time: string; period: string }[] = [];
  for (let h = 13; h <= 18; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m === 30) break;
      const displayH = h > 12 ? h - 12 : h;
      const period = h < 15 ? "Afternoon" : "Late Afternoon";
      slots.push({
        time: `${displayH}:${m === 0 ? "00" : "30"} PM`,
        period,
      });
    }
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
  const entry = VEHICLE_SIZES.find((v) => v.id === sizeId);
  if (!entry) return service.price_small;
  return service[entry.sizeKey];
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
  const service = SERVICE_DURATIONS[serviceName];
  if (!service) return 120;
  return service[vehicleSize] ?? 120;
}

/** Slots that fit before closing and do not overlap existing bookings */
async function getAvailableSlots(
  serviceName: string,
  vehicleSize: VehicleSizeSlug,
  existingBookings: BookingOnDate[] | null,
  allSlots: { time: string; period: string }[],
  closingMinutes: number = 1080 // Default to 6:00 PM if not provided
): Promise<{ time: string; period: string }[]> {
  const duration = getDurationForService(serviceName, vehicleSize);
  
  const bookedBlocks = await Promise.all((existingBookings ?? []).map(async (b) => {
    const start = await timeToMinutes(b.booking_time);
    return { start, end: start + 180 };
  }));

  const results = await Promise.all(allSlots.map(async (slot) => {
    const start = await timeToMinutes(slot.time);
    const end = start + duration;
    if (end > closingMinutes) return null;
    const overlaps = bookedBlocks.some(
      (b) => start < b.end && end > b.start
    );
    if (overlaps) return null;
    return slot;
  }));

  return results.filter((s): s is { time: string; period: string } => s !== null);
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

function MakeAutocomplete({
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

function ModelAutocomplete({
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
  serviceName: string;
  pointsEarned: number;
  firstName: string;
  /** Phone for success modal to fetch latest points from Supabase (guests) */
  phone?: string;
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
}

const DRAFT_STORAGE_KEY = "draftBooking";

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
  /** Initial reward points (e.g. from auth) for display until phone-based balance is fetched */
  initialRewardPoints?: number | null;
  /** Restore form from this draft (e.g. after Stripe cancel); applied once when visible */
  initialDraft?: DraftBooking | null;
  /** Called after draft has been applied so parent can clear initialDraft */
  onDraftRestored?: () => void;
}

export function BookingSection({
  isVisible,
  onClose,
  selectedService,
  services,
  onSelectService,
  onClearService,
  onBookingSuccess,
  initialRewardPoints = null,
  initialDraft = null,
  onDraftRestored,
}: BookingSectionProps) {
  const router = useRouter();
  const bookingRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  /** 1 = forward (Next), -1 = back; used for step slide direction */
  const [stepDirection, setStepDirection] = useState(1);
  /** True when a service was pre-selected from a card — shows the confirm-then-continue screen. */
  const [showServiceConfirm, setShowServiceConfirm] = useState(false);

  // Step 1 — Vehicle
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeSlug | "">("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [boatLength, setBoatLength] = useState<number | "">(20);

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<{ id: string; label: string; price: number }[]>([]);

  const toggleAddon = (addon: AddonItem) => {
    setSelectedAddons(prev => {
      const isSelected = prev.some(a => a.id === addon.id);
      if (isSelected) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        // Floorboard shampoo tiers are mutually exclusive
        let filtered = prev;
        if (FLOOR_ADDON_IDS.includes(addon.id)) {
          filtered = prev.filter(a => !FLOOR_ADDON_IDS.includes(a.id));
        }
        return [...filtered, { id: addon.id, label: addon.label, price: addon.price }];
      }
    });
  };

  // Step 2 — Date & Time
  const [todayStr, setTodayStr] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
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

  // Loyalty: reward points (from initial prop or fetched by phone on step 3)
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState(0);

  // Referral welcome discount — fetched once when modal opens for auth users
  const [referralEligible, setReferralEligible] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

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
    const phoneNumber = value.replace(/[^\d]/g, "");
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
  const referralDiscountAmount = referralEligible
    ? Math.round(servicePrice * 0.1 * 100) / 100
    : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountPercentage != null
      ? Math.round(servicePrice * (appliedCoupon.discountPercentage / 100) * 100) / 100
      : Math.min(appliedCoupon.discountAmount ?? 0, servicePrice)
    : 0;
  const totalWithTravel =
    servicePrice - referralDiscountAmount - couponDiscount + setupFee + travelFee + addonsTotal;
  const availablePoints = rewardPoints ?? 0;
  
  // 10 points = $1. Max redeemable is 1000 pts ($100).
  const redeemablePoints = Math.min(MAX_REDEEMABLE_POINTS, availablePoints);
  const pointsToRedeem = Math.min(Math.max(0, pointsToRedeemInput), redeemablePoints);
  const pointsDiscountAmount = pointsToRedeem / POINTS_PER_DOLLAR;
  const totalAfterDiscount = Math.max(0, totalWithTravel - pointsDiscountAmount);

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

  // Use initial reward points when modal opens; fetch by phone when on step 3 and phone entered
  useEffect(() => {
    if (!isVisible) return;
    setRewardPoints(initialRewardPoints ?? null);
  }, [isVisible, initialRewardPoints]);

  useEffect(() => {
    if (!isVisible || step !== 3 || !phone || phone.replace(/\D/g, "").length < 10) return;
    const t = setTimeout(() => {
      getProfilePointsByPhone(phone).then((data) => {
        setRewardPoints(data.reward_points);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isVisible, step, phone]);

  // Clamp points-to-redeem input when redeemable limit drops (e.g. service/travel change)
  useEffect(() => {
    if (pointsToRedeemInput > redeemablePoints) {
      setPointsToRedeemInput(redeemablePoints);
    }
  }, [redeemablePoints]);

  // Fetch referral eligibility once when the modal opens
  useEffect(() => {
    if (!isVisible) return;
    getAuthReferralStatus().then(({ eligible, authUserId: uid }) => {
      setReferralEligible(eligible);
      setAuthUserId(uid);
    });
  }, [isVisible]);

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

  // Clear add-ons that are no longer valid when the service changes
  useEffect(() => {
    if (!selectedService) return;
    const available = getAddonsForService(selectedService.name);
    const availableIds = available.map(a => a.id) as string[];
    setSelectedAddons(prev => prev.filter(a => availableIds.includes(a.id)));
  }, [selectedService?.id]);

  // Reset form state each time the booking section is opened (inline section — no body scroll lock)
  useEffect(() => {
    if (isVisible) {
      setShowServiceConfirm(!!selectedService);
      setStep(1);
      setVehicleSize("");
      setVehicleYear("");
      setVehicleMake("");
      setVehicleModel("");
      setBoatLength(20);
      setSelectedAddons([]);
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
      setRewardPoints(null);
      setPointsToRedeemInput(0);
      setReferralEligible(false);
      setAuthUserId(null);
      setCouponCode("");
      setIsCouponLoading(false);
      setCouponError(null);
      setAppliedCoupon(null);
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
    setPointsToRedeemInput(initialDraft.pointsToRedeemInput);
    setStep(3);
    setStepDirection(1);
    appliedDraftRef.current = true;
    onDraftRestored?.();
  }, [isVisible, initialDraft, services, onSelectService, onDraftRestored]);

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
  useEffect(() => {
    if (!selectedDate) {
      setExistingBookingsForDate(null);
      setSelectedTime("");
      return;
    }
    setSelectedTime("");
    setSlotsLoading(true);
    getBookingsForDate(selectedDate)
      .then(setExistingBookingsForDate)
      .finally(() => setSlotsLoading(false));
  }, [selectedDate]);

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
      return row?.isClosed ?? false;
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

  useEffect(() => {
    async function updateAvailable() {
      if (selectedService && selectedDate) {
        const slots = await getAvailableSlots(
          selectedService.name,
          vehicleSize || "compact",
          existingBookingsForDate,
          slotsForSelectedDate,
          closingMinutesForSelectedDate
        );
        setAvailableSlots(slots);
      } else {
        setAvailableSlots([]);
      }
    }
    updateAvailable();
  }, [selectedService, selectedDate, vehicleSize, existingBookingsForDate, slotsForSelectedDate, closingMinutesForSelectedDate]);

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
          vehicleSize || "compact",
          existingBookingsForDate,
          slotsForSelectedDate,
          closingMinutesForSelectedDate
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
      return !!(vehicleSize && vehicleYear && vehicleMake && vehicleModel);
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
  const buildPayload = () => ({
    serviceId: selectedService!.id,
    serviceName: selectedService!.name,
    totalPrice: totalAfterDiscount,
    vehicleSize: (selectedService && isFootageService(selectedService.name) ? "compact" : vehicleSize) as VehicleSizeSlug,
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
    ...(travelFee > 0 && { travelFee }),
    ...(setupFee > 0 && { setupFee }),
    ...(pointsToRedeem > 0 && { pointsToRedeem }),
    ...(referralEligible && { isApplyingReferralDiscount: true }),
    ...(authUserId && { authUserId }),
    ...(appliedCoupon && {
      couponId: appliedCoupon.couponId,
      couponDiscount,
    }),
  });

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
      const earned = Math.floor(totalAfterDiscount);
      onClose();
      router.refresh();
      onBookingSuccess?.({
        confirmationId: result.bookingId.slice(0, 8).toUpperCase(),
        date: selectedDate,
        serviceName: selectedService.name,
        pointsEarned: earned,
        firstName: name.trim().split(/\s+/)[0] ?? "there",
        phone: phone.trim() || undefined,
      });
    }
  };

  // ── Save draft and redirect to sign up (keeps booking state for after auth) ─
  const handleCreateAccountClick = () => {
    if (!selectedService || (!isFootageService(selectedService.name) && !vehicleSize)) return;
    const draft: DraftBooking = {
      serviceId: selectedService.id,
      vehicleSize: (isFootageService(selectedService.name) ? "compact" : vehicleSize) as VehicleSizeSlug,
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
      pointsToRedeemInput,
    };
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
    const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/?restore_booking=1` : "/?restore_booking=1";
    window.location.href = `/auth/login?signup=true&redirect=${encodeURIComponent(returnUrl)}`;
  };

  // ── Pay Now via Stripe ───────────────────────────────────────────────────
  const handlePayNow = async () => {
    if (!selectedService || (!isFootageService(selectedService.name) && !vehicleSize) || !canConfirm()) return;
    setIsStripeLoading(true);
    setStripeError(null);
    setBookingResult(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const draft: DraftBooking = {
        serviceId: selectedService.id,
        vehicleSize: (isFootageService(selectedService.name) ? "compact" : vehicleSize) as VehicleSizeSlug,
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
        pointsToRedeemInput,
      };
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
      const result = await bookDetailing({
        ...buildPayload(),
        paymentMethod: "pay_now",
        successUrl: origin,
        cancelUrl: origin,
      });
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
        const earned = Math.floor(totalAfterDiscount);
        onClose();
        router.refresh();
        onBookingSuccess?.({
          confirmationId: result.bookingId.slice(0, 8).toUpperCase(),
          date: selectedDate,
          serviceName: selectedService.name,
          pointsEarned: earned,
          firstName: name.trim().split(/\s+/)[0] ?? "there",
          phone: phone.trim() || undefined,
        });
      }
    } catch (err) {
      setIsStripeLoading(false);
      setStripeError(err instanceof Error ? err.message : "Something went wrong.");
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
  const vehicleSizeLabel =
    VEHICLE_SIZES.find((v) => v.id === vehicleSize)?.label ?? vehicleSize;
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
          className="overflow-visible w-full min-h-fit h-auto scroll-mt-[100px] box-border"
        >
          <div
            className="relative w-full min-h-fit h-auto flex flex-col justify-start overflow-visible box-border pb-10
              bg-zinc-950/80 backdrop-blur-xl border border-[#d4af37]/30
              rounded-b-xl shadow-lg"
          >
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
                <div className="px-6 py-8 flex flex-col gap-6">
                  {/* Category badge */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>

                  {/* Service name + price */}
                  <div>
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {selectedService.name}
                    </h2>
                    <p className="text-[#D4AF37] font-bold mt-1.5 text-base">
                      {isFootageService(selectedService.name) ? (
                        <>
                          ${FOOTAGE_RATE[selectedService.name] ?? selectedService.price_small}
                          <span className="text-zinc-500 font-normal text-xs ml-1">
                            / foot — enter your {isRVService(selectedService.name) ? "RV" : "boat"} length to calculate
                          </span>
                        </>
                      ) : (
                        <>
                          ${selectedService.price_small}
                          {selectedService.price_large !== selectedService.price_small && (
                            <> – ${selectedService.price_large}</>
                          )}
                          <span className="text-zinc-500 font-normal text-xs ml-1">/ depending on vehicle size</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Description */}
                  {selectedService.description && (
                    <p className="text-sm text-zinc-400 leading-relaxed -mt-2">
                      {selectedService.description}
                    </p>
                  )}

                  {/* Included note */}
                  {includedNote && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                      <p className="text-xs text-emerald-300/80 leading-relaxed">{includedNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowServiceConfirm(false);
                      }}
                      className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black text-sm tracking-wide hover:bg-amber-400 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      Continue to Booking
                      <ChevronRight size={16} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowServiceConfirm(false);
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
            /* ── Choose Your Service (when opened via Book Now / Schedule Now) ── */
            <div className="px-6 py-6">
              <h2 className="text-xl font-black text-white">
                Choose Your Service
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5 mb-6">
                Select a package to continue — price varies by vehicle size
              </p>

              <div className="space-y-8">
                {/* 1. One-Time Detailing */}
                {(() => {
                  const oneTime = services.filter(s =>
                    !s.is_subscription &&
                    !s.name.toLowerCase().includes("ultimate") &&
                    !s.name.toLowerCase().includes("paint") &&
                    !s.name.toLowerCase().includes("correction") &&
                    !s.name.toLowerCase().includes("boat")
                  );
                  if (!oneTime.length) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-[#D4AF37]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">One-Time Detailing</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {oneTime.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-[#252525] text-left transition-all duration-150 text-zinc-400 hover:border-[#D4AF37]/40 hover:text-zinc-200 hover:bg-white/[0.02] active:scale-[0.99] group"
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
                  );
                })()}

                {/* 2. Ultimate Series */}
                {(() => {
                  const ultimate = services.filter(s =>
                    !s.is_subscription && s.name.toLowerCase().includes("ultimate")
                  );
                  if (!ultimate.length) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Gem size={14} className="text-[#D4AF37]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ultimate Series</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ultimate.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] text-left transition-all duration-150 text-zinc-400 hover:border-[#D4AF37]/50 hover:text-zinc-200 hover:bg-[#D4AF37]/[0.06] active:scale-[0.99] group"
                          >
                            <div className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[11px] text-[#D4AF37] font-bold mt-0.5">
                              ${service.price_small} – ${service.price_large}
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

                {/* 3. Marine Detailing */}
                {(() => {
                  const marine = services.filter(s =>
                    !s.is_subscription && s.name.toLowerCase().includes("boat")
                  );
                  if (!marine.length) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Waves size={14} className="text-blue-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Marine Detailing</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {marine.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-blue-500/15 bg-blue-500/[0.02] text-left transition-all duration-150 text-zinc-400 hover:border-blue-500/30 hover:text-zinc-200 hover:bg-blue-500/[0.04] active:scale-[0.99] group"
                          >
                            <div className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[11px] text-blue-400/80 font-medium mt-0.5">
                              ${BOAT_RATE[service.name] ?? service.price_small}/ft
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

                {/* 4. RV Detailing */}
                {(() => {
                  const rv = services.filter(s =>
                    !s.is_subscription && isRVService(s.name)
                  );
                  if (!rv.length) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers size={14} className="text-green-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">RV Detailing</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rv.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-green-500/15 bg-green-500/[0.02] text-left transition-all duration-150 text-zinc-400 hover:border-green-500/30 hover:text-zinc-200 hover:bg-green-500/[0.04] active:scale-[0.99] group"
                          >
                            <div className="font-bold text-sm text-white group-hover:text-green-400 transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[11px] text-green-400/80 font-medium mt-0.5">
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

                {/* 5. Monthly Maintenance Plans */}
                {(() => {
                  const subs = services.filter(s => s.is_subscription);
                  if (!subs.length) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Crown size={14} className="text-[#D4AF37]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Maintenance Club</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subs.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onSelectService(service)}
                            className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] text-left transition-all duration-150 text-zinc-400 hover:border-[#D4AF37]/40 hover:text-zinc-200 hover:bg-amber-500/[0.04] active:scale-[0.99] group"
                          >
                            <div className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">
                              {service.name}
                            </div>
                            <div className="text-[11px] text-[#D4AF37] font-bold mt-0.5 uppercase tracking-tighter">
                              ${service.price_small} / Month
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              +${getMaintenanceSetupFee(service.name)} Initial Setup Fee
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={onClose}
                className="mt-8 w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2 border-t border-white/5 pt-6"
              >
                Cancel
              </button>
            </div>
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
                    {selectedService.name}
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
                        const accentColor = isRV ? "text-green-400" : "text-blue-400";
                        const borderColor = isRV ? "border-green-500/15 bg-green-500/5" : "border-blue-500/15 bg-blue-500/5";
                        const textColor   = isRV ? "text-green-300/80" : "text-blue-300/80";
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

                            {/* Footage input */}
                            <div>
                              <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                                {isRV ? "RV Length (feet)" : "Boat Length (feet)"}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={minFt}
                                  max={maxFt}
                                  value={boatLength}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBoatLength(val === "" ? "" : Math.max(1, parseInt(val, 10) || 1));
                                  }}
                                  placeholder={`e.g. ${minFt + 5}`}
                                  className="w-full text-center bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-4 outline-none transition-all placeholder:text-zinc-600 text-2xl font-black tabular-nums"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium pointer-events-none">ft</span>
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
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                            Year
                          </label>
                          <input
                            type="text"
                            value={vehicleYear}
                            onChange={(e) => setVehicleYear(e.target.value)}
                            placeholder="2022"
                            maxLength={4}
                            className="w-full min-h-[44px] bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
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
                          <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
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

                      {/* Vehicle Size — always-interactive; auto-selects on model pick, can override */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                            Vehicle Size
                          </label>
                          {autoDetected && vehicleSize && (
                            <span className="inline-flex items-center gap-1 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest">
                              <Zap size={8} className="fill-[#D4AF37]" /> Auto-detected
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {VEHICLE_SIZES.map((size) => {
                            const isSelected = vehicleSize === size.id;
                            return (
                              <button
                                key={size.id}
                                type="button"
                                onClick={() => {
                                  setVehicleSize(size.id);
                                  setAutoDetected(false);
                                }}
                                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] ${
                                  isSelected
                                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/60 shadow-[0_0_18px_rgba(212,175,55,0.12)]"
                                    : "bg-zinc-950/40 border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02]"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm font-bold ${isSelected ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                                    {size.label}
                                  </span>
                                  {isSelected && <Check size={14} className="text-[#D4AF37]" strokeWidth={3} />}
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-snug">{size.desc}</p>
                                {selectedService && (
                                  <p className={`text-sm font-black mt-2 ${isSelected ? "text-white" : "text-zinc-400"}`}>
                                    ${selectedService[size.sizeKey]}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {!vehicleSize && vehicleMake.trim() && vehicleModel.trim() && (
                          <p className="text-[11px] text-zinc-500 mt-2.5 text-center">
                            Vehicle not found in our database — please select your size above
                          </p>
                        )}
                      </div>

                      {/* Enhance Your Detail (Smart per-service Add-ons) */}
                      {(() => {
                        const available = getAddonsForService(selectedService?.name ?? "");
                        const standAlone = available.filter(a => !FLOOR_ADDON_IDS.includes(a.id));
                        const floorOpts  = available.filter(a => FLOOR_ADDON_IDS.includes(a.id));
                        const note       = getIncludedNote(selectedService?.name ?? "");
                        return (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles size={14} className="text-[#D4AF37]" />
                              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                                Enhance Your Detail
                              </label>
                            </div>

                            {note && (
                              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 mb-3">
                                <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={2.5} />
                                <p className="text-[11px] text-emerald-300/80 leading-relaxed">{note}</p>
                              </div>
                            )}

                            <div className="space-y-2.5">
                              {/* Standalone add-ons (non-floor) */}
                              {standAlone.map((addon) => {
                                const isSelected = selectedAddons.some(a => a.id === addon.id);
                                return (
                                  <button
                                    key={addon.id}
                                    type="button"
                                    onClick={() => toggleAddon(addon)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 group flex items-center justify-between gap-4 ${
                                      isSelected
                                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                        : "bg-zinc-950/40 border-white/5 hover:border-white/20"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${isSelected ? "text-[#D4AF37]" : "text-zinc-200 group-hover:text-white"}`}>
                                          {addon.label}
                                        </span>
                                        {isSelected && <Check size={14} className="text-[#D4AF37]" strokeWidth={3} />}
                                      </div>
                                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                                        {addon.desc}
                                      </p>
                                    </div>
                                    <div className={`shrink-0 font-black text-sm tabular-nums ${isSelected ? "text-white" : "text-[#D4AF37]"}`}>
                                      +${addon.price}
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
                                  <div className={`px-4 py-3 border-b border-white/[0.06] ${
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
                    <div className="w-full max-w-[calc(100vw-40px)] min-w-0 overflow-x-auto">
                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                        Select a Date
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
                        }}
                        min={todayStr}
                        className={`w-full text-center max-w-full min-h-[44px] box-border bg-zinc-950/50 border rounded-xl px-4 py-3 outline-none transition-all [color-scheme:dark] text-[16px] md:text-sm ${
                          weekendDateError
                            ? "border-amber-500/60 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                            : "border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50"
                        } text-white`}
                      />
                      <p className="text-zinc-500 text-xs mt-1.5">
                        Dates are based on our current schedule. Blocked and closed days cannot be selected.
                      </p>
                      {weekendDateError && (
                        <p className="text-amber-400 text-sm mt-1.5 font-medium" role="alert">
                          {weekendDateError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block tracking-wider uppercase text-xs font-semibold text-zinc-400 mb-2">
                        Select a Time
                      </label>
                      {!selectedDate ? (
                        <p className="text-sm text-zinc-500 py-2">
                          Pick a date above to see available times.
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
                          Select a service (from the service card) to see available times.
                        </p>
                      ) : displaySlots.length === 0 ? (
                        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-4 text-sm text-amber-200">
                          No available times on this date. Please select another day.
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

                    {/* Booking summary — receipt-style card */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
                        Booking Details
                      </div>
                      <div className="space-y-2.5 text-sm">
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
                        <ReceiptRow label="Location" value={serviceAddress || "—"} />
                        {selectedAddons.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-1.5">
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.15em]">Applied Add-ons</span>
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
                    </div>

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
                            {referralDiscountAmount > 0 && (
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                                <span className="flex items-center gap-1.5">
                                  🎉 Referral Welcome Discount
                                  <span className="text-[10px] text-emerald-500/80 font-normal">(10% off)</span>
                                </span>
                                <span className="font-semibold">−${referralDiscountAmount.toFixed(2)}</span>
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
                            {authUserId && rewardPoints != null && availablePoints > 0 && redeemablePoints > 0 && (
                              <div className="pt-3 space-y-2">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                  Redeem Reward Points
                                </label>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min={0}
                                    max={redeemablePoints}
                                    step={10}
                                    value={pointsToRedeemInput}
                                    onChange={(e) => setPointsToRedeemInput(Number(e.target.value))}
                                    className="flex-1 h-2 rounded-full appearance-none bg-zinc-800 accent-[#D4AF37]"
                                  />
                                  <span className="text-sm font-semibold text-[#D4AF37] tabular-nums w-16 text-right">
                                    {pointsToRedeemInput} pts
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500">
                                  You have {availablePoints} points. 10 pts = $1 off. You can redeem up to {redeemablePoints} points (${redeemablePoints / POINTS_PER_DOLLAR} off).
                                </p>
                              </div>
                            )}
                            {!authUserId && selectedService && vehicleSize && (
                              <div className="pt-3">
                                <div className="rounded-xl p-5 bg-black/60 backdrop-blur-md border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.08)]">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
                                      <h4 className="text-base font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                                        Loyalty Club
                                      </h4>
                                    </div>
                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                      Create an account right now to earn points on today&apos;s detail! Plus, get an instant 100-Point Welcome Bonus.
                                    </p>
                                    <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                                      <li>Earn 1 pt for every $1 spent</li>
                                      <li>10 points = $1 off anything</li>
                                      <li>Redeem up to $100 per booking</li>
                                    </ul>
                                    <button
                                      type="button"
                                      onClick={handleCreateAccountClick}
                                      className="mt-2 w-full py-3 rounded-xl text-sm font-bold bg-[#D4AF37] text-zinc-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:shadow-[0_0_24px_rgba(212,175,55,0.45)] transition-all duration-200"
                                    >
                                      Create Account & Claim Points
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {pointsToRedeem > 0 && (
                              <>
                                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center pt-2 min-w-0">
                                  <span className="text-zinc-400">Base price</span>
                                  <span className="font-semibold text-white">${totalWithTravel.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-amber-400/90 min-w-0">
                                  <span>Points applied</span>
                                  <span className="font-semibold">−${pointsDiscountAmount.toFixed(2)}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center pt-4 mt-3 border-t border-[#2a2a2a] min-w-0">
                            <span className="font-bold text-zinc-300">
                              {pointsToRedeem > 0 ? "Final total" : "Total Due Today"}
                            </span>
                            <span className="text-xl font-black text-white tabular-nums">
                              {computedPrice !== null ? `$${totalAfterDiscount.toFixed(2)}` : "—"}
                            </span>
                          </div>
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
                          {referralDiscountAmount > 0 && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-emerald-400 min-w-0">
                              <span className="flex items-center gap-1.5">
                                🎉 Referral Welcome Discount
                                <span className="text-[10px] text-emerald-500/80 font-normal">(10% off)</span>
                              </span>
                              <span className="font-semibold">−${referralDiscountAmount.toFixed(2)}</span>
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
                          {authUserId && rewardPoints != null && availablePoints > 0 && redeemablePoints > 0 && (
                            <div className="pt-3 space-y-2">
                              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                Redeem Reward Points
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={redeemablePoints}
                                  step={10}
                                  value={pointsToRedeemInput}
                                  onChange={(e) => setPointsToRedeemInput(Number(e.target.value))}
                                  className="flex-1 h-2 rounded-full appearance-none bg-zinc-800 accent-[#D4AF37]"
                                />
                                <span className="text-sm font-semibold text-[#D4AF37] tabular-nums w-16 text-right">
                                  {pointsToRedeemInput} pts
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500">
                                You have {availablePoints} points. 10 pts = $1 off. You can redeem up to {redeemablePoints} points (${redeemablePoints / POINTS_PER_DOLLAR} off).
                              </p>
                            </div>
                          )}
                          {!authUserId && selectedService && vehicleSize && (
                            <div className="pt-3">
                              <div className="rounded-xl p-5 bg-black/60 backdrop-blur-md border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.08)]">
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
                                    <h4 className="text-base font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                                      Loyalty Club
                                    </h4>
                                  </div>
                                  <p className="text-sm text-zinc-300 leading-relaxed">
                                    Create an account right now to earn points on today&apos;s detail! Plus, get an instant 100-Point Welcome Bonus.
                                  </p>
                                  <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                                    <li>Earn 1 pt for every $1 spent</li>
                                    <li>10 points = $1 off anything</li>
                                    <li>Redeem up to $100 per booking</li>
                                  </ul>
                                  <button
                                    type="button"
                                    onClick={handleCreateAccountClick}
                                    className="mt-2 w-full py-3 rounded-xl text-sm font-bold bg-[#D4AF37] text-zinc-950 hover:bg-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:shadow-[0_0_24px_rgba(212,175,55,0.45)] transition-all duration-200"
                                  >
                                    Create Account & Claim Points
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {pointsToRedeem > 0 && (
                            <>
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center pt-2 min-w-0">
                                <span className="text-zinc-400">Base price</span>
                                <span className="font-semibold text-white">${totalWithTravel.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-amber-400/90 min-w-0">
                                <span>Points applied</span>
                                <span className="font-semibold">−${pointsDiscountAmount.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center pt-4 mt-3 border-t border-[#2a2a2a] min-w-0">
                          <span className="font-bold text-zinc-300">
                            {pointsToRedeem > 0 ? "Final total" : "Total"}
                          </span>
                          <span className="text-xl font-black text-white tabular-nums">
                            {computedPrice !== null
                              ? `$${totalAfterDiscount.toFixed(2)}`
                              : "—"}
                          </span>
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
