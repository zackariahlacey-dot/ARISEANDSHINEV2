"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle,
  Star,
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
import {
  calculateLifetimeTier,
  getMaxRedeemPoints,
} from "@/lib/calculateLifetimeTier";
import { getAuthReferralStatus } from "@/app/actions/getAuthReferralStatus";
import { AddressAutocomplete } from "./AddressAutocomplete";

const POINTS_PER_DOLLAR = 10; // 10 points = $1 off
const MAINTENANCE_SETUP_FEE = 100;

// ─── Constants ──────────────────────────────────────────────────────────────

const VEHICLE_SIZES: {
  id: VehicleSizeSlug;
  label: string;
  desc: string;
  sizeKey: "price_small" | "price_medium" | "price_large" | "price_extra_large";
}[] = [
  {
    id: "compact",
    label: "Compact / Hatchback",
    desc: "Mini, Subcompact",
    sizeKey: "price_small",
  },
  {
    id: "sedan",
    label: "Sedan / Coupe",
    desc: "Standard 2–4 door car",
    sizeKey: "price_medium",
  },
  {
    id: "suv",
    label: "SUV / Crossover / Truck",
    desc: "Mid-size, Full-size, Pickups",
    sizeKey: "price_large",
  },
  {
    id: "xl",
    label: "Van / Minivan / 3-Row",
    desc: "Large capacity vehicles",
    sizeKey: "price_extra_large",
  },
];

// Service time + 30 min travel/buffer (minutes)
const SERVICE_DURATIONS: Record<string, number> = {
  "Interior Detail": 180,
  "Exterior Detail": 120,
  "Full Detail": 210,
  "Monthly Maintenance Plan": 120,
};

const WORKDAY_START = "8:00 AM";
const WORKDAY_END = "6:00 PM"; // closing — slot start + duration must not exceed this
const SLOT_INTERVAL_MIN = 30;

// All possible slot labels 8:00 AM–5:00 PM in 30-min increments (period for UI)
function buildAllSlots(): { time: string; period: string }[] {
  const slots: { time: string; period: string }[] = [];
  for (let h = 8; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      const isPM = h >= 12;
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period =
        h < 12 ? "Morning" : h < 15 ? "Afternoon" : "Late Afternoon";
      slots.push({
        time: `${displayH}:${m === 0 ? "00" : "30"} ${isPM ? "PM" : "AM"}`,
        period,
      });
    }
  }
  return slots;
}
const ALL_SLOTS = buildAllSlots();

const STEPS = [
  { num: 1, label: "Vehicle", icon: Car },
  { num: 2, label: "Schedule", icon: Calendar },
  { num: 3, label: "Confirm", icon: User },
];

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

const WORKDAY_END_MIN = timeToMinutes("6:00 PM"); // 1080

function getDurationForService(serviceName: string): number {
  return SERVICE_DURATIONS[serviceName] ?? 120;
}

/** Slots that fit before closing and do not overlap existing bookings */
function getAvailableSlots(
  serviceName: string,
  existingBookings: BookingOnDate[] | null,
  allSlots: { time: string; period: string }[]
): { time: string; period: string }[] {
  const duration = getDurationForService(serviceName);
  const bookedBlocks = (existingBookings ?? []).map((b) => {
    const start = timeToMinutes(b.booking_time);
    const dur = getDurationForService(b.service_name ?? "");
    return { start, end: start + dur };
  });

  return allSlots.filter((slot) => {
    const start = timeToMinutes(slot.time);
    const end = start + duration;
    if (end > WORKDAY_END_MIN) return false;
    const overlaps = bookedBlocks.some(
      (b) => start < b.end && end > b.start
    );
    return !overlaps;
  });
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
        className="w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
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
        className="w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: Service | null;
  services: Service[];
  onSelectService: (service: Service) => void;
  /** Initial reward points (e.g. from auth) for display until phone-based balance is fetched */
  initialRewardPoints?: number | null;
  /** Initial lifetime points for tier (max redeem cap: 500 for Silver/Gold/Platinum, 1000 for Member/Bronze) */
  initialLifetimePoints?: number | null;
}

export function BookingModal({
  isOpen,
  onClose,
  selectedService,
  services,
  onSelectService,
  initialRewardPoints = null,
  initialLifetimePoints = null,
}: BookingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — Vehicle
  const [vehicleSize, setVehicleSize] = useState<VehicleSizeSlug | "">("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  // Step 2 — Date & Time
  const [todayStr, setTodayStr] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [existingBookingsForDate, setExistingBookingsForDate] = useState<
    BookingOnDate[] | null
  >(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

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

  // Loyalty: reward points and lifetime (from initial prop or fetched by phone on step 3)
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [lifetimePoints, setLifetimePoints] = useState<number>(0);
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
  const computedPrice =
    selectedService && vehicleSize
      ? getPriceForSize(selectedService, vehicleSize)
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
  const isMonthlyPlan = selectedService?.name === "Monthly Maintenance Plan";
  const setupFee = isMonthlyPlan ? MAINTENANCE_SETUP_FEE : 0;
  const servicePrice = computedPrice ?? selectedService?.price_small ?? 0;
  const referralDiscountAmount = referralEligible
    ? Math.round(servicePrice * 0.1 * 100) / 100
    : 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountPercentage != null
      ? Math.round(servicePrice * (appliedCoupon.discountPercentage / 100) * 100) / 100
      : Math.min(appliedCoupon.discountAmount ?? 0, servicePrice)
    : 0;
  const totalWithTravel =
    servicePrice - referralDiscountAmount - couponDiscount + setupFee + travelFee;
  const availablePoints = rewardPoints ?? 0;
  const tier = calculateLifetimeTier(lifetimePoints).tier;
  const maxRedeemByTier = getMaxRedeemPoints(tier);
  const maxRedeemablePoints = Math.min(
    availablePoints,
    maxRedeemByTier,
    Math.floor(totalWithTravel * POINTS_PER_DOLLAR)
  );
  const pointsToRedeem = Math.min(pointsToRedeemInput, maxRedeemablePoints);
  const rewardsDiscount = pointsToRedeem / POINTS_PER_DOLLAR;
  const totalAfterDiscount = Math.max(0, totalWithTravel - rewardsDiscount);

  // Initialise today string client-side (avoids Next.js Cache Components error)
  useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
  }, []);

  // Use initial reward and lifetime points when modal opens; fetch by phone when on step 3 and phone entered
  useEffect(() => {
    if (!isOpen) return;
    setRewardPoints(initialRewardPoints ?? null);
    setLifetimePoints(initialLifetimePoints ?? 0);
  }, [isOpen, initialRewardPoints, initialLifetimePoints]);

  useEffect(() => {
    if (!isOpen || step !== 3 || !phone || phone.replace(/\D/g, "").length < 10) return;
    const t = setTimeout(() => {
      getProfilePointsByPhone(phone).then((data) => {
        setRewardPoints(data.reward_points);
        setLifetimePoints(data.lifetime_points);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, step, phone]);

  // Clamp points-to-redeem input when max redeemable drops (e.g. service/travel change)
  useEffect(() => {
    if (pointsToRedeemInput > maxRedeemablePoints) {
      setPointsToRedeemInput(maxRedeemablePoints);
    }
  }, [maxRedeemablePoints]);

  // Fetch referral eligibility once when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    getAuthReferralStatus().then(({ eligible, authUserId: uid }) => {
      setReferralEligible(eligible);
      setAuthUserId(uid);
    });
  }, [isOpen]);

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

  // Lock body scroll while open; reset form state each time modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setVehicleSize("");
      setVehicleYear("");
      setVehicleMake("");
      setVehicleModel("");
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
      setLifetimePoints(0);
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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

  // ── Available slots for selected date + service (no double-book, end-by 6 PM) ─
  const availableSlots =
    selectedService && selectedDate
      ? getAvailableSlots(
          selectedService.name,
          existingBookingsForDate,
          ALL_SLOTS
        )
      : [];

  // Remove past times for today so they don't render at all (pass full slot so regex can read .time or .label)
  const displaySlots = selectedDate
    ? availableSlots.filter((slot) => !isTimeSlotPassed(slot, selectedDate))
    : availableSlots;

  // Clear selected time if it's no longer available (e.g. after date or bookings change)
  useEffect(() => {
    if (!selectedTime) return;
    const available = getAvailableSlots(
      selectedService?.name ?? "",
      existingBookingsForDate,
      ALL_SLOTS
    );
    if (available.length > 0 && !available.some((s) => s.time === selectedTime)) {
      setSelectedTime("");
    }
  }, [selectedDate, existingBookingsForDate, selectedService?.name, selectedTime]);

  // Auto-deselect if the chosen time has passed (e.g. user had a time, then switched calendar to today)
  useEffect(() => {
    if (selectedTime && selectedDate && isTimeSlotPassed(selectedTime, selectedDate)) {
      setSelectedTime("");
    }
  }, [selectedDate, selectedTime]);

  // ── Navigation guards ────────────────────────────────────────────────────
  const canGoNext = (): boolean => {
    if (step === 1)
      return !!(vehicleSize && vehicleYear && vehicleMake && vehicleModel);
    if (step === 2) return !!(selectedDate && selectedTime);
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
    if (step < 3) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  // ── Submit helpers ───────────────────────────────────────────────────────
  const buildPayload = () => ({
    serviceId: selectedService!.id,
    serviceName: selectedService!.name,
    totalPrice: totalAfterDiscount,
    vehicleSize: vehicleSize as VehicleSizeSlug,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    bookingDate: selectedDate,
    bookingTime: selectedTime,
    serviceAddress,
    name,
    phone,
    email,
    notes,
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
    if (!selectedService || !vehicleSize || !canConfirm()) return;
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
  };

  // ── Pay Now via Stripe ───────────────────────────────────────────────────
  const handlePayNow = async () => {
    if (!selectedService || !vehicleSize || !canConfirm()) return;
    setIsStripeLoading(true);
    setStripeError(null);
    setBookingResult(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
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
              className="flex-1 bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-sm font-mono tracking-wider uppercase disabled:opacity-50"
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
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isSubmittingAny ? onClose : undefined}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-4">
        <div
          className={`relative w-[95%] md:max-w-2xl max-h-[90vh] bg-zinc-900/70 backdrop-blur-xl border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] rounded-3xl transition-all duration-300 flex flex-col overflow-hidden ${
            isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-3"
          }`}
        >
          {/* Close */}
          {!isSubmittingAny && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors z-10"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          )}

          {/* ── SUCCESS SCREEN ─────────────────────────────────────────── */}
          {isSuccess ? (
            authUserId ? (
              /* Logged-in: VIP success with Redeem button */
              (() => {
                const pointsEarned = Math.floor(totalAfterDiscount);
                const logoUrl = "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";
                return (
                  <div className="px-6 py-10 flex flex-col items-center overflow-y-auto overscroll-contain modal-scroll">
                    <div className="bg-zinc-900/60 backdrop-blur-xl border border-[#D4AF37]/30 shadow-[0_0_50px_rgba(212,175,55,0.1)] rounded-3xl p-8 text-center flex flex-col items-center max-w-md mx-auto relative overflow-hidden">
                      <img src={logoUrl} alt="Arise And Shine VT" className="w-[150px] h-auto mx-auto mb-4 object-contain" width={150} height={150} />
                      <CheckCircle
                        className="w-16 h-16 text-[#D4AF37] mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                        strokeWidth={2}
                      />
                      <h2 className="text-3xl font-bold text-white mb-2">
                        Booking Confirmed
                      </h2>
                      <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-2">
                        Thanks, {name.split(" ")[0]}! Your{" "}
                        <span className="text-white font-semibold">{selectedService?.name}</span> is booked for{" "}
                        <span className="text-white font-semibold">{selectedDate}</span>. We&apos;ll text you at{" "}
                        <span className="text-white font-semibold">{phone}</span>.
                      </p>
                      <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/50 text-[#D4AF37] px-6 py-3 rounded-full font-semibold text-lg my-6 flex items-center gap-2 justify-center">
                        <Star className="w-5 h-5 fill-[#D4AF37]" />
                        +{pointsEarned} Points Earned
                      </div>
                      <button
                        onClick={handleRedeem}
                        disabled={isRedeeming}
                        className={
                          isRedeeming
                            ? "w-full bg-[#D4AF37] text-zinc-950 py-4 rounded-xl font-bold text-lg scale-95 opacity-90 transition-all duration-500 flex justify-center items-center gap-2"
                            : "w-full bg-zinc-900 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-all duration-300 py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                        }
                      >
                        {isRedeeming ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Unlocking Rewards…
                          </>
                        ) : (
                          "Redeem Rewards"
                        )}
                      </button>
                      <p className="mt-4 text-xs text-zinc-500">
                        Ref #{confirmationId}
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Guest: standard success + sign-up CTA */
              <div className="px-6 py-12 flex flex-col items-center text-center gap-3 overflow-y-auto overscroll-contain modal-scroll">
                <img
                  src="https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png"
                  alt="Arise And Shine VT"
                  className="w-[150px] h-auto mx-auto mb-4 object-contain"
                  width={150}
                  height={150}
                />
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-2 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                  <Check size={26} className="text-black" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Booking Confirmed!
                </h3>
                <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
                  Thanks, {name.split(" ")[0]}! Your{" "}
                  <span className="text-white font-semibold">
                    {selectedService?.name}
                  </span>{" "}
                  is booked for{" "}
                  <span className="text-white font-semibold">{selectedDate}</span>
                  . We&apos;ll text you a reminder to{" "}
                  <span className="text-white font-semibold">{phone}</span>.
                </p>
                <div className="mt-1 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-zinc-500 font-mono">
                  Ref #{confirmationId}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                  <span>🎁</span>
                  <span>
                    {computedPrice} reward points added to your account
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Sign up to track and redeem your points next time.
                </p>
                <p className="text-xs text-zinc-500">
                  Need to reach us? Call{" "}
                  <a href="tel:802-585-5563" className="font-semibold text-white hover:text-zinc-300 transition-colors">
                    802-585-5563
                  </a>
                  {" "}or email{" "}
                  <a href="mailto:contact@ariseandshinevt.com" className="font-semibold text-white hover:text-zinc-300 transition-colors">
                    contact@ariseandshinevt.com
                  </a>
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 bg-white text-black font-bold px-10 py-3 rounded-xl text-sm hover:bg-zinc-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            )
          ) : isSubmittingAny ? (
            /* ── Step-by-step progress loader (during confirm) ── */
            <div className="px-6 py-10 overflow-y-auto overscroll-contain modal-scroll">
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
          ) : !selectedService && services.length > 0 ? (
            /* ── Choose Your Service (when opened via Book Now / Schedule Now) ── */
            <div className="px-6 py-6 overflow-y-auto overscroll-contain modal-scroll">
              <h2 className="text-lg font-bold text-white">
                Choose Your Service
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5 mb-5">
                Select a package to continue — price varies by vehicle size
              </p>
              <div className="grid grid-cols-2 gap-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onSelectService(service)}
                    className="p-3.5 rounded-xl border border-[#252525] text-left transition-all duration-150 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 hover:bg-white/[0.025] active:scale-[0.99]"
                  >
                    <div className="font-semibold text-sm text-white">
                      {service.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      From ${service.price_small} (Small)
                    </div>
                    {service.description && (
                      <div className="text-[11px] text-zinc-600 mt-1 line-clamp-2">
                        {service.description}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-end">
                      <ChevronRight size={14} className="text-zinc-600" />
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="mt-5 w-full flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
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
              <div className="sticky top-0 z-10 px-4 sm:px-6 pt-6 pb-5 border-b border-white/10 shrink-0 bg-[#09090b]">
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
                            className={`h-px flex-1 mx-2 mb-5 transition-all duration-500 ${
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
              <div className="px-4 sm:px-6 py-5 pb-8 flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scroll flex flex-col justify-start">
                {/* Step 1: Vehicle Info — Year/Make/Model first, then size cards (auto-detect from make/model) */}
                {step === 1 && (
                  <div className="space-y-6">
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
                          className="w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
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

                    {/* Vehicle Size — auto-selected from make/model when matched; user can override by clicking a card */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                          Vehicle Size
                        </label>
                        {autoDetected && vehicleSize && (
                          <span className="inline-flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/50 text-[#D4AF37] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.1)] animate-pulse">
                            <Zap size={10} className="fill-[#D4AF37]" />
                            Auto-detected
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {VEHICLE_SIZES.map((size) => {
                          const isSelected = vehicleSize === size.id;
                          return (
                            <button
                              key={size.id}
                              onClick={() => {
                                setVehicleSize(size.id);
                                setAutoDetected(false);
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all duration-300 group ${
                                isSelected
                                  ? "bg-zinc-900/80 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.15)] scale-[1.02]"
                                  : "bg-zinc-950/40 border border-white/5 hover:border-[#D4AF37]/30"
                              }`}
                            >
                              <div className="text-white font-semibold text-sm">
                                {size.label}
                              </div>
                              <div className="text-zinc-500 text-xs mt-0.5">
                                {size.desc}
                              </div>
                              {selectedService && (
                                <div className="text-[#D4AF37] font-bold mt-2">
                                  ${selectedService[size.sizeKey]}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Date & Time — slots filtered by existing bookings + service duration */}
                {step === 2 && (
                  <div className="space-y-6">
                    {isSubscription && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 mb-2">
                        <h3 className="text-sm font-bold text-amber-200/90 mb-1">
                          Schedule Your Initial Deep Clean
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Pick the date for your mandatory $100 reset detail. Your monthly maintenance schedule will be locked in after this.
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
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={todayStr}
                        className="w-full max-w-full box-border bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all [color-scheme:dark] text-[16px] md:text-sm"
                      />
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
                              className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
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
                  </div>
                )}

                {/* Step 3: Contact & Confirm */}
                {step === 3 && (
                  <div className="pt-8 space-y-5">
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
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400">Initial Deep Clean & Setup Fee</span>
                              <span className="font-semibold text-white">$100.00</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400">First Month (Based on Vehicle Size)</span>
                              <span className="font-semibold text-white">${(servicePrice ?? 0).toFixed(2)}</span>
                            </div>
                            {referralDiscountAmount > 0 && (
                              <div className="flex justify-between items-center text-emerald-400">
                                <span className="flex items-center gap-1.5">
                                  🎉 Referral Welcome Discount
                                  <span className="text-[10px] text-emerald-500/80 font-normal">(10% off)</span>
                                </span>
                                <span className="font-semibold">−${referralDiscountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            {couponDiscount > 0 && (
                              <div className="flex justify-between items-center text-emerald-400">
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
                              <div className="flex justify-between items-center text-zinc-500 text-xs">
                                <span>Travel Fee (if applicable)</span>
                                <span>Checking…</span>
                              </div>
                            )}
                            {!travelFeeLoading && (
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Travel Fee</span>
                                <span className="font-semibold text-white">
                                  {travelFee === 0 ? "FREE" : `$${travelFee.toFixed(2)}`}
                                </span>
                              </div>
                            )}
                            {renderCouponUI()}
                            {rewardPoints != null && availablePoints > 0 && maxRedeemablePoints > 0 && (
                              <div className="pt-3 space-y-2">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                  Use Points (Max {maxRedeemByTier}) — 10 pts = $1 off
                                </label>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min={0}
                                    max={maxRedeemablePoints}
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
                                  Available: {availablePoints} pts · up to ${(maxRedeemablePoints / POINTS_PER_DOLLAR).toFixed(2)} off
                                </p>
                              </div>
                            )}
                            {rewardsDiscount > 0 && (
                              <div className="flex justify-between items-center text-amber-400/90">
                                <span>Rewards Discount</span>
                                <span className="font-semibold">−${rewardsDiscount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-4 mt-3 border-t border-[#2a2a2a]">
                            <span className="font-bold text-zinc-300">
                              {pointsToRedeem > 0 ? "New Total" : "Total Due Today"}
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
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">
                              {selectedService?.name ?? "—"}
                            </span>
                            <span className="font-semibold text-white">
                              ${(servicePrice ?? 0).toFixed(2)}
                            </span>
                          </div>
                          {referralDiscountAmount > 0 && (
                            <div className="flex justify-between items-center text-emerald-400">
                              <span className="flex items-center gap-1.5">
                                🎉 Referral Welcome Discount
                                <span className="text-[10px] text-emerald-500/80 font-normal">(10% off)</span>
                              </span>
                              <span className="font-semibold">−${referralDiscountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {couponDiscount > 0 && (
                            <div className="flex justify-between items-center text-emerald-400">
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
                            <div className="flex justify-between items-center text-zinc-500 text-xs">
                              <span>Travel Fee</span>
                              <span>Checking…</span>
                            </div>
                          )}
                          {!travelFeeLoading && (
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400">Travel Fee</span>
                              <span className="font-semibold text-white">
                                {travelFee === 0 ? "FREE" : `$${travelFee.toFixed(2)}`}
                              </span>
                            </div>
                          )}
                          {isMonthlyPlan && (
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400">
                                Initial Setup & Reset Fee
                              </span>
                              <span className="font-semibold text-white">
                                $100.00
                              </span>
                            </div>
                          )}
                          {renderCouponUI()}
                          {rewardPoints != null && availablePoints > 0 && maxRedeemablePoints > 0 && (
                            <div className="pt-3 space-y-2">
                              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                Use Points (Max {maxRedeemByTier}) — 10 pts = $1 off
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={maxRedeemablePoints}
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
                                Available: {availablePoints} pts · up to ${(maxRedeemablePoints / POINTS_PER_DOLLAR).toFixed(2)} off
                              </p>
                            </div>
                          )}
                          {rewardsDiscount > 0 && (
                            <div className="flex justify-between items-center text-amber-400/90">
                              <span>Rewards Discount</span>
                              <span className="font-semibold">−${rewardsDiscount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-4 mt-3 border-t border-[#2a2a2a]">
                          <span className="font-bold text-zinc-300">
                            {pointsToRedeem > 0 ? "New Total" : "Total"}
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
                            className="w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm"
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
                          className="w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-[16px] md:text-sm resize-none"
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

                      <div className="relative">
                        <span className="absolute -top-2.5 left-4 bg-[#D4AF37] text-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider z-10">
                          Most Popular
                        </span>
                        <button
                          onClick={handlePayNow}
                          disabled={!canConfirm() || isSubmitting || isStripeLoading}
                          className={`relative w-full rounded-xl p-4 flex items-center justify-between text-left transition-all duration-300 active:scale-[0.99] group ${
                            isStripeLoading
                              ? "bg-zinc-900/90 border border-[#D4AF37] btn-loading"
                              : canConfirm() && !isSubmitting
                                ? "bg-zinc-900/90 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                                : "bg-zinc-900/50 border border-white/10 text-zinc-500 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                              <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-inherit">
                                {isStripeLoading ? "Processing…" : isSubscription ? `Subscribe via Stripe — $${totalAfterDiscount.toFixed(2)}` : `Pay Now — $${totalAfterDiscount.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                Secure card checkout · Instant confirmation
                              </div>
                            </div>
                          </div>
                          {!isStripeLoading && (
                            <ChevronRight className="w-5 h-5 shrink-0 opacity-80" />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={handlePayAtArrival}
                        disabled={!canConfirm() || isSubmitting || isStripeLoading}
                        className={`w-full rounded-xl p-4 flex items-center justify-between text-left transition-all duration-300 active:scale-[0.99] ${
                          isSubmitting
                            ? "bg-zinc-950/50 border border-white/10 btn-loading"
                            : canConfirm() && !isStripeLoading
                              ? "bg-zinc-950/50 border border-white/10 text-zinc-300 hover:border-white/30 hover:text-white"
                              : "bg-zinc-950/30 border border-white/5 text-zinc-500 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <HandCoins className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-inherit">
                              {isSubmitting ? "Processing…" : isSubscription ? "Subscribe & Pay at Arrival" : "Book & Pay at Arrival"}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              We&apos;ll confirm via text · Pay cash or card on the day
                            </div>
                          </div>
                        </div>
                        {!isSubmitting && (
                          <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
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
                  </div>
                )}
              </div>

              {/* ── FOOTER / NAVIGATION (Steps 1 & 2 only) ───────────────── */}
              {step < 3 && (
                <div className="px-5 sm:px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
                  <button
                    onClick={step === 1 ? onClose : handleBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                  >
                    <ChevronLeft size={15} />
                    {step === 1 ? "Cancel" : "Back"}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className={`flex items-center gap-1.5 font-bold px-8 py-3 rounded-xl text-sm transition-all duration-300 ${
                      canGoNext()
                        ? "bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed border border-white/10"
                    }`}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
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
    <div className="flex justify-between items-start gap-4">
      <span className="text-zinc-500 text-sm shrink-0">{label}</span>
      <span className="text-white font-semibold text-right text-sm">{value}</span>
    </div>
  );
}
