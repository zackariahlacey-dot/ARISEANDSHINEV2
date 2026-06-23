"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, ShieldCheck, BadgeCheck, Phone, ArrowRight,
  Droplets, Wrench, Truck, Container, Building2, ChevronRight,
  AlertTriangle, X, MapPin, Clock, Wind, Zap, Gem, Check,
} from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { DraftBooking } from "./BookingModal";
import { recoverStripeBooking } from "@/app/actions/recoverStripeBooking";
import { getDurationMins } from "@/lib/availability";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: false, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(
  () => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })),
  { ssr: false }
);

const sv = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const vp = { once: true, margin: "-80px" };

const carouselScrollClass =
  "overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

// ── Truck services — DB name is the source of truth for booking. ─────────────
type TruckTier = "exterior" | "interior" | "complete";

type TruckServiceStatic = {
  dbName: string;
  displayName: string;
  tier: TruckTier;
  price: number;
  badge: string | null;
  popular: boolean;
  flagship?: boolean;
  tagline: string;
  features: readonly string[];
  duration: string;
  icon: typeof Droplets;
};

const TRUCK_SERVICES_STATIC: TruckServiceStatic[] = [
  // ── Exterior tier ──────────────────────────────────────────────
  {
    dbName: "Truck Yard Wash",
    displayName: "Truck Yard Wash",
    tier: "exterior",
    price: 99,
    badge: "Quickest",
    popular: false,
    tagline: "Between-load fast turn — get the dirt off and get rolling.",
    duration: "~45 min",
    icon: Droplets,
    features: [
      "Two-bucket soap, rinse, and dry",
      "Full wheels & wheel-well rinse",
      "Bug + brake-dust knockdown",
      "Cab glass spot-clean",
      "No interior, no polishing",
    ],
  },
  {
    dbName: "Truck Exterior Refresh — Day Cab",
    displayName: "Exterior Refresh — Day Cab",
    tier: "exterior",
    price: 149,
    badge: "Most Popular",
    popular: true,
    tagline: "Full day-cab wash with chrome, wheels, and tank polish.",
    duration: "~1.5 hr",
    icon: Truck,
    features: [
      "Full hand wash, soap, rinse, dry",
      "Detailed wheels, wheel wells, tires dressed",
      "Aluminum tank & step polish",
      "Chrome stack + bumper polish",
      "Bug splatter and brake dust removed",
      "Cab glass inside-out",
    ],
  },
  {
    dbName: "Truck Exterior Refresh — Sleeper",
    displayName: "Exterior Refresh — Sleeper",
    tier: "exterior",
    price: 199,
    badge: null,
    popular: false,
    tagline: "Full sleeper wash plus chrome, tank polish, and sleeper roof.",
    duration: "~2 hr",
    icon: Truck,
    features: [
      "Everything in Day Cab Exterior Refresh",
      "Sleeper-roof rinse and wipe",
      "Sleeper side panels and fairings detailed",
      "Sleeper trim, vents, and chrome polished",
      "Mud flap & rear-trailer-junction rinse",
    ],
  },
  {
    dbName: "Premium Exterior Detail — Day Cab",
    displayName: "Premium Exterior — Day Cab",
    tier: "exterior",
    price: 299,
    badge: "Premium",
    popular: false,
    tagline: "Decon wash, clay, hand wax/sealant, and full polish.",
    duration: "~3 hr",
    icon: Gem,
    features: [
      "Iron-fallout decon wash + clay-bar where applicable",
      "Hand-applied wax or 6-month spray sealant",
      "Full chrome and aluminum polish (tanks, stacks, steps)",
      "Headlight restoration option",
      "Detailed wheel face + barrel cleaning",
      "Tire dressing + trim refresh",
    ],
  },
  {
    dbName: "Premium Exterior Detail — Sleeper",
    displayName: "Premium Exterior — Sleeper",
    tier: "exterior",
    price: 379,
    badge: "Premium",
    popular: false,
    tagline: "Sleeper-cab decon, hand wax, all chrome and fairings polished.",
    duration: "~4 hr",
    icon: Gem,
    features: [
      "Everything in Premium Exterior Day Cab",
      "Sleeper roof, fairings, and exhaust polished",
      "All side panels clayed and sealed",
      "Cab + sleeper chrome detailed",
      "Mud flaps cleaned, trim restored",
    ],
  },
  // ── Interior tier ──────────────────────────────────────────────
  {
    dbName: "Day Cab Interior Reset",
    displayName: "Day Cab Interior Reset",
    tier: "interior",
    price: 199,
    badge: null,
    popular: false,
    tagline: "Office reset — vacuum, every surface treated, glass clarity.",
    duration: "~2.5 hr",
    icon: Sparkles,
    features: [
      "Full vacuum — floors, seats, headliner edges",
      "Every surface wiped — dash, console, gauges, switches",
      "Steering wheel + door panels deep-cleaned",
      "Floor mats steam shampooed",
      "Glass inside-out streak free",
      "Cabin deodorize + UV protect on vinyl",
    ],
  },
  {
    dbName: "Sleeper Cab Interior Reset",
    displayName: "Sleeper Cab Interior Reset",
    tier: "interior",
    price: 299,
    badge: "Owner-Operator",
    popular: false,
    tagline: "Full cab + sleeper — bunk, fridge, storage, upholstery.",
    duration: "~4 hr",
    icon: Sparkles,
    features: [
      "Everything in Day Cab Interior Reset",
      "Bunk area deep-cleaned + bedding-zone deodorize",
      "Storage cabinets, drawers, and overhead detail",
      "Fridge wipe-down (inside + outside)",
      "Upholstery treatment + cabin sanitize",
      "Sleeper window clarity + curtain wipe",
    ],
  },
  // ── Complete tier (flagship) ───────────────────────────────────
  {
    dbName: "Day Cab Complete",
    displayName: "Day Cab Complete",
    tier: "complete",
    price: 449,
    badge: "Best Value",
    popular: false,
    flagship: true,
    tagline: "Premium Exterior + Interior Reset — bundled and discounted.",
    duration: "~5.5 hr",
    icon: Sparkles,
    features: [
      "Everything in Premium Exterior — Day Cab",
      "Everything in Day Cab Interior Reset",
      "Save $49 vs booking separately",
      "Best-value package for owner-operators",
      "One full day on-site — drive away polished",
    ],
  },
  {
    dbName: "Sleeper Cab Complete",
    displayName: "Sleeper Cab Complete",
    tier: "complete",
    price: 649,
    badge: "Flagship",
    popular: false,
    flagship: true,
    tagline: "Premium Sleeper Exterior + Sleeper Interior Reset — the works.",
    duration: "Full day",
    icon: Gem,
    features: [
      "Everything in Premium Exterior — Sleeper",
      "Everything in Sleeper Cab Interior Reset",
      "Save $29 vs booking separately",
      "Whole-day on-site reservation",
      "Showroom-ready rig — cab and sleeper",
    ],
  },
];

// ── Add-ons (informational only — call to add to booking for now) ────────────
const TRUCK_EXTERIOR_ADDONS = [
  { icon: Sparkles, label: "Aluminum tank / stack / wheel polish", price: "from $99", desc: "Restore mirror finish on tanks, stacks, and wheel faces." },
  { icon: Wrench,   label: "Engine-bay degrease & steam",          price: "$99",      desc: "Full degreasing of the engine compartment, hoses protected." },
  { icon: Droplets, label: "Wax / sealant upgrade",                price: "from $99", desc: "Move from 6-month spray sealant to a hand-applied paste wax or ceramic-grade sealant." },
  { icon: Container,label: "Trailer washout",                       price: "from $80", desc: "Dry van or reefer washout between loads — no food/biohazard contamination." },
  { icon: Wind,     label: "Bug & tar pre-treat",                   price: "$39",      desc: "Heavy bug, tar, and rail-dust pre-treatment before main wash." },
] as const;

const TRUCK_INTERIOR_ADDONS = [
  { icon: Sparkles, label: "Seat shampoo",                         price: "$39",      desc: "Extraction shampoo on cloth driver/passenger seat." },
  { icon: Sparkles, label: "Carpet / floor shampoo",               price: "$39",      desc: "Hot-water extraction on the cab carpet." },
  { icon: Sparkles, label: "Headliner deep clean",                 price: "$49",      desc: "Spot extraction + odor neutralize on a stained headliner." },
  { icon: ShieldCheck, label: "Fabric / leather protection",        price: "$49",      desc: "UV + stain guard on seats and upholstery." },
  { icon: Wind,     label: "Odor / ozone treatment",                price: "$79",      desc: "30-minute ozone treatment — kills smoke, biological, and grease odor at the source." },
  { icon: AlertTriangle, label: "Biohazard / bodily fluid removal", price: "from $99", desc: "Spill, blood, vomit — sanitized, sealed, and ozone-treated." },
  { icon: Star,     label: "Sleeper-only: Mattress deep clean",     price: "$49",      desc: "Mattress vacuum + extraction + UV sanitize." },
  { icon: Building2,label: "Sleeper-only: Fridge / cabinet clean",  price: "from $49", desc: "Deep-clean fridge interior and storage cabinets." },
] as const;

// ── Carousel indicator (dots + next-card hint) ───────────────────────────────
// Mobile-only horizontal scroll affordance for the service-card carousels.
// Tracks which card is centered in the viewport and renders dots + the
// next card's label so users know more cards are off-screen to the right.
//
// Uses IntersectionObserver (rooted on the scroll container) AS THE PRIMARY
// signal — IO fires reliably during touch + snap scrolling on mobile, where
// a raw `scroll` listener can be debounced by the browser. A rAF-batched
// scroll listener is layered on top so the dot tracks mid-swipe too.
function useCarouselIndex(scrollRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;

    // Re-query each cycle: cards mount async after Suspense
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-card]"));
    if (!cards.length) return;

    // Center-distance fallback used by both the rAF scroll loop and IO callback
    const ratios = new Map<Element, number>();
    cards.forEach((c) => ratios.set(c, 0));

    const computeFromRatios = () => {
      let best = 0;
      let bestRatio = -1;
      cards.forEach((c, i) => {
        const r = ratios.get(c) ?? 0;
        if (r > bestRatio) { bestRatio = r; best = i; }
      });
      setIdx(best);
    };

    const computeFromCenter = () => {
      const containerCenter = el.getBoundingClientRect().left + el.clientWidth / 2;
      let nearest = 0;
      let nearestDist = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - containerCenter);
        if (dist < nearestDist) { nearest = i; nearestDist = dist; }
      });
      setIdx(nearest);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        computeFromRatios();
      },
      { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    cards.forEach((c) => io.observe(c));

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; computeFromCenter(); });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // Initial paint — pick whatever is currently centered
    computeFromCenter();

    return () => {
      io.disconnect();
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollRef, count]);
  return idx;
}

function CarouselNav({
  scrollRef, items, activeIdx,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  items: { name: string }[];
  activeIdx: number;
}) {
  if (items.length <= 1) return null;
  const next = activeIdx < items.length - 1 ? items[activeIdx + 1] : null;
  const scrollToIdx = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-carousel-card]");
    const card = cards[i];
    if (!card) return;
    const target = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };
  return (
    <div className="md:hidden flex items-center justify-center gap-3 mt-4 px-4">
      <div className="flex items-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to card ${i + 1}`}
            onClick={() => scrollToIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIdx
                ? "w-6 bg-[#D4AF37]"
                : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
      {next && (
        <button
          type="button"
          onClick={() => scrollToIdx(activeIdx + 1)}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-[#D4AF37] transition-colors min-w-0 max-w-[55vw]"
        >
          <span className="shrink-0">Next:</span>
          <span className="text-[#D4AF37]/80 font-semibold truncate">{next.name}</span>
          <ChevronRight size={11} className="shrink-0" />
        </button>
      )}
    </div>
  );
}

// ── Section helpers ──────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle, accent }: {
  eyebrow: string; title: string; subtitle?: string; accent?: boolean;
}) {
  return (
    <div className="text-center mb-8">
      <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-2 ${accent ? "text-[#D4AF37]" : "text-[#D4AF37]/70"}`}>{eyebrow}</p>
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{title}</h2>
      {subtitle && <p className="text-zinc-500 mt-2 text-sm max-w-xl mx-auto leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function ServiceCard({
  svc,
  onBook,
}: {
  svc: TruckServiceStatic & { dbService: Service | null };
  onBook: () => void;
}) {
  const Icon = svc.icon;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 md:hover:-translate-y-1 ${
        svc.flagship
          ? "border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-950 to-zinc-950 shadow-[0_0_40px_rgba(212,175,55,0.10)]"
          : svc.popular
            ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] shadow-[0_0_40px_rgba(212,175,55,0.08)]"
            : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/30"
      }`}
    >
      {svc.flagship && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />}
      {svc.popular && !svc.flagship && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />}

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Badge row */}
        <div className="flex items-center gap-2 mb-3 min-h-[20px]">
          {svc.popular && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
              <Star size={9} fill="currentColor" />Most Popular
            </span>
          )}
          {svc.flagship && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-black bg-gradient-to-r from-[#D4AF37] to-[#F0D060] px-2 py-0.5 rounded-full">
              <Gem size={9} />Best Value
            </span>
          )}
          {svc.badge && !svc.popular && !svc.flagship && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F3E5AB] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">
              <BadgeCheck size={9} />{svc.badge}
            </span>
          )}
        </div>

        {/* Name + icon */}
        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={20} className="text-[#D4AF37]" />
          <h3 className="text-lg font-black text-white tracking-tight leading-tight">{svc.displayName}</h3>
        </div>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">{svc.tagline}</p>

        {/* Price + duration */}
        <div className={`w-full rounded-xl mb-5 py-3.5 px-4 flex items-end justify-between gap-3 border ${svc.flagship || svc.popular ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">From</span>
            <span className={`text-3xl font-black tabular-nums leading-none ${svc.flagship || svc.popular ? "text-[#D4AF37]" : "text-white"}`}>
              ${svc.price}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <Clock size={11} className="text-[#D4AF37]/70" />
            <span className="tabular-nums">{svc.duration}</span>
          </div>
        </div>

        {/* Feature list */}
        <ul className="space-y-2.5 flex-1 mb-5">
          {svc.features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
              <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                <Check size={8} className="text-[#D4AF37]" strokeWidth={3.5} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Book button */}
        <button
          onClick={onBook}
          className={`w-full py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] min-h-[52px] ${
            svc.flagship || svc.popular
              ? "btn-primary-gold-shimmer bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden"
              : "bg-zinc-950 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
          }`}
        >
          <span className="relative z-[1] flex items-center gap-2">
            Book {svc.displayName} <ChevronRight size={14} className="shrink-0" />
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function TruckDetailingPage({ services }: { services: Service[] }) {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [initialDraft, setInitialDraft] = useState<DraftBooking | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [stripeVerifying, setStripeVerifying] = useState(false);
  const [stripeRecoveryError, setStripeRecoveryError] = useState<string | null>(null);
  const bookingRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const exteriorScrollRef = useRef<HTMLDivElement>(null);
  const interiorScrollRef = useRef<HTMLDivElement>(null);
  const completeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (searchParams.get("book") === "1") setBookingOpen(true);
  }, [searchParams]);

  // Stripe return / post-signup draft restore — mirrors BoatDetailingPage.
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const stripeParam = searchParams.get("stripe");
    const stripeCancelled = stripeParam === "cancelled";
    const stripeSuccess = stripeParam === "success";
    const restoreBooking = searchParams.get("restore_booking") === "1";
    if (!stripeCancelled && !stripeSuccess && !restoreBooking) return;
    const raw = sessionStorage.getItem("draftBooking");
    window.history.replaceState(null, "", window.location.pathname);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as DraftBooking;
      sessionStorage.removeItem("draftBooking");
      if (stripeSuccess) {
        const sessionId = searchParams.get("session_id");
        const service = services.find((s) => s.id === draft.serviceId);
        const firstName = draft.name?.trim().split(/\s+/)[0] ?? "there";
        const fallbackData: SuccessModalData = {
          confirmationId: "",
          date: draft.selectedDate ?? "",
          time: draft.selectedTime || undefined,
          serviceName: service?.name ?? "Detailing Service",
          firstName,
          serviceAddress: draft.serviceAddress || undefined,
          phone: draft.phone,
        };
        if (sessionId) {
          setStripeVerifying(true);
          recoverStripeBooking(sessionId)
            .then((result) => {
              setStripeVerifying(false);
              if (result.status === "error") {
                setStripeRecoveryError("Your payment was received but we had trouble confirming your booking. Please contact us and we'll sort it out right away.");
                return;
              }
              if (result.status === "overbooked") {
                setStripeRecoveryError("Your payment went through but the time slot was just taken by someone else. We'll contact you to reschedule or issue a full refund.");
                return;
              }
              setSuccessData({
                ...fallbackData,
                date: "bookingDate" in result ? result.bookingDate : fallbackData.date,
                time: "bookingTime" in result ? result.bookingTime : fallbackData.time,
                serviceName: "serviceName" in result ? result.serviceName : fallbackData.serviceName,
              });
              setShowSuccess(true);
            })
            .catch(() => {
              setStripeVerifying(false);
              setSuccessData(fallbackData);
              setShowSuccess(true);
            });
        } else {
          setSuccessData(fallbackData);
          setShowSuccess(true);
        }
      } else {
        const matchedService = services.find((s) => s.id === draft.serviceId);
        if (matchedService) setSelectedService(matchedService);
        setInitialDraft(draft);
        setBookingOpen(true);
        setShowRestoreToast(true);
        setTimeout(() => {
          bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch {
      // invalid draft
    }
  }, [mounted, searchParams, services]);

  useEffect(() => {
    if (!showRestoreToast) return;
    const t = setTimeout(() => setShowRestoreToast(false), 5000);
    return () => clearTimeout(t);
  }, [showRestoreToast]);

  useEffect(() => {
    const onScroll = () => {
      setScrolledPastHero((heroRef.current?.getBoundingClientRect().bottom ?? 0) < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openBooking = useCallback((svc?: Service) => {
    if (svc) setSelectedService(svc);
    setBookingOpen(true);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const closeBooking = useCallback(() => {
    setBookingOpen(false);
    setSelectedService(null);
  }, []);

  // Match display services to DB services for booking
  const displayServices = TRUCK_SERVICES_STATIC.map((s) => {
    const dbService = services.find((db) => db.name === s.dbName) ?? null;
    // Surface the real duration from constants for trustworthy timing copy.
    const liveMins = getDurationMins(s.dbName, "sedan");
    const displayDuration = liveMins
      ? liveMins >= 480
        ? "Full day"
        : liveMins >= 60
          ? `~${(liveMins / 60).toFixed(liveMins % 60 === 0 ? 0 : 1)} hr`
          : `~${liveMins} min`
      : s.duration;
    return { ...s, dbService, duration: displayDuration };
  });

  const exteriorServices = displayServices.filter((s) => s.tier === "exterior");
  const interiorServices = displayServices.filter((s) => s.tier === "interior");
  const completeServices = displayServices.filter((s) => s.tier === "complete");

  const exteriorActiveIdx = useCarouselIndex(exteriorScrollRef, exteriorServices.length);
  const interiorActiveIdx = useCarouselIndex(interiorScrollRef, interiorServices.length);
  const completeActiveIdx = useCarouselIndex(completeScrollRef, completeServices.length);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-36 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.10) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <Container size={10} className="shrink-0" />Owner-Operator · Fleet · On-Site
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Mobile Semi Truck<br />Detailing Vermont
          </h1>

          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-3 max-w-2xl mx-auto">
            Between-load yard washes to full sleeper-cab detail — we come to your yard, terminal, or truck stop with everything self-contained. Built for Vermont owner-operators and fleet managers who care how their rigs look on the road.
          </p>

          <p className="text-sm font-bold text-[#D4AF37] mb-6 px-2 leading-relaxed text-center">
            Yard Wash $99 · Full Exterior from $149 · Complete Bundle from $449
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide w-full sm:w-auto min-w-[220px] bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden text-base"
            >
              <span className="relative z-[1]">Book Your Truck Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-items-center justify-center gap-x-4 gap-y-3 text-xs text-zinc-500 max-w-md mx-auto sm:max-w-none">
            {[
              { icon: Star,        label: "5★ Rated" },
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Container,   label: "Class 8 Ready" },
              { icon: Building2,   label: "Fleet Pricing" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center justify-center gap-1.5 text-center">
                <Icon size={13} className="text-[#D4AF37] shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Booking Section ───────────────────────────────────────────── */}
      <div ref={bookingRef} className="px-4 sm:px-6 lg:px-8 py-4 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          {showRestoreToast && (
            <div className="mb-4 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#D4AF37]">
              <span className="text-lg shrink-0">🚛</span>
              <span className="flex-1">Your booking details have been restored — pick up right where you left off.</span>
              <button type="button" onClick={() => setShowRestoreToast(false)} className="sm:ml-auto text-[#D4AF37]/60 hover:text-[#D4AF37] px-2 py-1">✕</button>
            </div>
          )}
          {mounted && (
            <BookingSection
              isVisible={bookingOpen}
              onClose={closeBooking}
              selectedService={selectedService}
              services={services}
              onSelectService={setSelectedService}
              onClearService={() => setSelectedService(null)}
              onBookingSuccess={(data) => {
                closeBooking();
                setSuccessData(data);
                setShowSuccess(true);
              }}
              initialDraft={initialDraft}
              onDraftRestored={() => setInitialDraft(null)}
              initialCategory="truck"
            />
          )}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Simple Process</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">How It Works</h2>
            <p className="text-zinc-500 mt-2 text-sm">From booking to a polished rig — here&apos;s what to expect.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Pick a Package", desc: "Choose a yard wash, exterior, interior, or complete bundle. Flat-rate pricing per cab type — no surprises.", icon: "📅" },
              { step: "02", title: "We Come to You",  desc: "Your yard, the terminal, a truck stop, or the home driveway — we arrive fully self-contained (water, power, equipment).", icon: "🚛" },
              { step: "03", title: "Back on the Road",desc: "Walk through the rig with us, we collect, you roll. Text + email confirmation start to finish.", icon: "✨" },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 text-center">
                <div className="text-3xl mb-3">{icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/60 mb-1">{step}</p>
                <p className="text-sm font-bold text-white mb-2">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.05] bg-zinc-900/40 px-5 py-4 flex items-start gap-3">
            <Zap size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong className="text-zinc-300">Fully self-contained.</strong> Generator, water tank, hot-water extraction, and all chemistry on board — no need to provide a hookup at your yard or terminal.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Exterior Services ─────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Exterior"
            title="Exterior Wash &amp; Detail"
            subtitle="From a $99 between-load yard wash to a full Premium Exterior on a sleeper — every package is a real on-truck stop, fully self-contained."
            accent
          />
          <div
            ref={exteriorScrollRef}
            className={`flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 ${carouselScrollClass} pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0`}
          >
            {exteriorServices.map((svc) => (
              <div key={svc.dbName} data-carousel-card className="snap-center shrink-0 w-[min(88vw,380px)] md:w-auto md:min-w-0 md:snap-none md:shrink">
                <ServiceCard svc={svc} onBook={() => openBooking(svc.dbService ?? undefined)} />
              </div>
            ))}
          </div>
          <CarouselNav
            scrollRef={exteriorScrollRef}
            items={exteriorServices.map((s) => ({ name: s.displayName }))}
            activeIdx={exteriorActiveIdx}
          />
        </div>
      </motion.section>

      {/* ── Interior Services ─────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Interior"
            title="Interior Reset"
            subtitle="Your cab is your office. We pull everything out, vacuum every crevice, hot-water extract the mats, and put the rig back together the way you want to find it tomorrow morning."
            accent
          />
          <div
            ref={interiorScrollRef}
            className={`flex md:grid md:grid-cols-2 gap-4 ${carouselScrollClass} pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0`}
          >
            {interiorServices.map((svc) => (
              <div key={svc.dbName} data-carousel-card className="snap-center shrink-0 w-[min(88vw,380px)] md:w-auto md:min-w-0 md:snap-none md:shrink">
                <ServiceCard svc={svc} onBook={() => openBooking(svc.dbService ?? undefined)} />
              </div>
            ))}
          </div>
          <CarouselNav
            scrollRef={interiorScrollRef}
            items={interiorServices.map((s) => ({ name: s.displayName }))}
            activeIdx={interiorActiveIdx}
          />
        </div>
      </motion.section>

      {/* ── Complete Bundles ──────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-[#D4AF37]/15"
      >
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Best Value"
            title="Complete Bundles — Interior + Exterior"
            subtitle="Most owner-operators book a Complete twice a year — once before peak season, once before the rig goes back to spec. Save vs booking separately."
            accent
          />
          <div
            ref={completeScrollRef}
            className={`flex md:grid md:grid-cols-2 gap-4 ${carouselScrollClass} pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0`}
          >
            {completeServices.map((svc) => (
              <div key={svc.dbName} data-carousel-card className="snap-center shrink-0 w-[min(88vw,380px)] md:w-auto md:min-w-0 md:snap-none md:shrink">
                <ServiceCard svc={svc} onBook={() => openBooking(svc.dbService ?? undefined)} />
              </div>
            ))}
          </div>
          <CarouselNav
            scrollRef={completeScrollRef}
            items={completeServices.map((s) => ({ name: s.displayName }))}
            activeIdx={completeActiveIdx}
          />
        </div>
      </motion.section>

      {/* ── Add-ons ───────────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            eyebrow="Custom Touches"
            title="Add-ons"
            subtitle="Stack any of these onto your exterior or interior booking — call or note them at checkout and we'll confirm at arrival."
          />
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-3 flex items-center gap-2">
                <Droplets size={11} />Exterior Add-ons
              </p>
              <div className="space-y-2">
                {TRUCK_EXTERIOR_ADDONS.map((addon) => {
                  const Icon = addon.icon;
                  return (
                    <div key={addon.label} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#D4AF37]/10 bg-zinc-900/40 hover:border-[#D4AF37]/30 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-[#D4AF37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-bold text-[13px] text-white leading-tight">{addon.label}</h4>
                          <span className="text-[13px] font-black text-[#D4AF37] tabular-nums whitespace-nowrap">{addon.price}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{addon.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-3 flex items-center gap-2">
                <Sparkles size={11} />Interior Add-ons
              </p>
              <div className="space-y-2">
                {TRUCK_INTERIOR_ADDONS.map((addon) => {
                  const Icon = addon.icon;
                  return (
                    <div key={addon.label} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#D4AF37]/10 bg-zinc-900/40 hover:border-[#D4AF37]/30 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-[#D4AF37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-bold text-[13px] text-white leading-tight">{addon.label}</h4>
                          <span className="text-[13px] font-black text-[#D4AF37] tabular-nums whitespace-nowrap">{addon.price}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{addon.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-zinc-600 mt-6">
            All add-ons confirmed at arrival. Anything not listed? Call <a href="tel:8025855563" className="text-[#D4AF37] hover:underline">802-585-5563</a> and we&apos;ll quote.
          </p>
        </div>
      </motion.section>

      {/* ── Fleet & Recurring CTA ─────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border-2 border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-950 to-zinc-950 overflow-hidden">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-[#D4AF37]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Fleet &amp; Recurring</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">10–20% off scheduled accounts</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                Weekly, bi-weekly, or monthly schedules get a recurring discount and priority booking. Custom quotes for multi-unit fleets and municipal garages — DPW, school district buses, contractor pools.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/fleet"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black font-black text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(212,175,55,0.35)]"
                >
                  Build Fleet Quote
                  <ChevronRight size={14} strokeWidth={3} />
                </Link>
                <a
                  href="tel:8025855563"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.1] text-white text-sm font-bold hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
                >
                  <Phone size={14} />
                  Call 802-585-5563
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Service Area ──────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">
              <MapPin size={11} /> Mobile · Statewide
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Free travel within Chittenden County</h2>
            <p className="text-zinc-500 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
              Burlington, Williston, South Burlington — no travel fee, ever. Beyond that, $1/mile past 7.5 miles of driving distance from our Williston base. We&apos;re routinely up to Stowe, down to Charlotte, and into Stratton on coordinated fleet days.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { name: "Chittenden County", cities: "Burlington · Williston · South Burlington" },
              { name: "Champlain Valley",  cities: "Shelburne · Charlotte · Hinesburg" },
              { name: "Stowe / Lamoille",  cities: "Stowe · Morrisville · Hyde Park" },
              { name: "Central Vermont",   cities: "Barre · Montpelier · Berlin" },
              { name: "I-89 Corridor",     cities: "Richmond · Waterbury · Northfield" },
              { name: "I-91 Corridor",     cities: "St. Johnsbury · Hardwick · Lyndon" },
              { name: "Logging Country",   cities: "NEK · Newport · Island Pond" },
              { name: "Southern VT",       cities: "Rutland · Manchester · Bennington" },
            ].map((w) => (
              <div key={w.name} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 hover:border-[#D4AF37]/30 transition-colors">
                <p className="text-sm font-bold text-white leading-tight">{w.name}</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{w.cities}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-3xl mx-auto">
          <SectionHeader eyebrow="Questions" title="Frequently Asked" subtitle="Owner-operator and fleet manager questions answered." />
          <div className="space-y-3">
            {[
              { q: "Do you come to my truck stop / yard / terminal?",
                a: "Yes — we're 100% mobile and fully self-contained (water, generator, all equipment). We work at home driveways, fleet yards, terminals, truck stops, and quarry/job sites across Vermont." },
              { q: "Can you handle a sleeper cab?",
                a: "Absolutely. Sleeper-cab service includes the bunk area deep clean, storage compartments, fridge wipe, mattress option, and full cab reset. Owner-operators are about 60% of our truck business." },
              { q: "What about extreme grime — dump trucks, mixers, log trucks?",
                a: "We handle them. For trucks with heavy off-road contamination, mud, or biohazard cleanup, we'll add a grime surcharge from $49 or move to our hourly rate ($95/hr, 2-hour minimum) so scope is unambiguous." },
              { q: "Do you offer fleet pricing?",
                a: "Yes — 10–20% off scheduled weekly/bi-weekly/monthly accounts. Custom quotes for multi-unit fleets, municipal garages, and contractor pools. Use the Fleet Quote Calculator or call." },
              { q: "How long does a sleeper-cab complete take?",
                a: "About 6–9 hours depending on condition. We can typically handle 1 sleeper Complete per day or 2–3 day-cab Completes back-to-back. Multi-day fleet visits are scheduled in advance." },
              { q: "Do you do trailer washouts?",
                a: "Yes — dry-van and reefer washouts between loads start at $80. Reefers with food residue, dairy spills, or chemical exposure are quoted separately." },
            ].map(({ q, a }) => (
              <details key={q} className="rounded-xl border border-white/[0.06] bg-zinc-900/50 overflow-hidden group">
                <summary className="cursor-pointer px-4 py-4 flex items-start justify-between gap-3 hover:bg-zinc-900 transition-colors list-none">
                  <span className="text-sm font-bold text-zinc-100 leading-snug pr-3">{q}</span>
                  <ChevronRight size={14} className="text-zinc-500 shrink-0 mt-1 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-4 pb-4 pt-0 text-sm text-zinc-400 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">Ready to get on the schedule?</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Single rig or full fleet — pick a package above and book in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden w-full sm:w-auto text-base"
            >
              <span className="relative z-[1]">Book Your Truck Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />802-585-5563
            </a>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/heavy-equipment-detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold min-h-[44px]">
              Heavy Equipment <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/fleet" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold min-h-[44px]">
              Fleet Quote <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 text-xs text-zinc-600 text-center sm:text-left">
          <span>© 2026 Arise And Shine Detailing · Mobile Semi Truck Detailing · Vermont</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</Link>
        </div>
      </footer>

      {/* Sticky mobile Book Now bar */}
      <AnimatePresence>
        {scrolledPastHero && !bookingOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-0 inset-x-0 z-40 md:hidden px-4 pb-5 pt-3 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent"
          >
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer w-full h-14 rounded-xl font-bold text-base bg-zinc-900/90 border border-[#D4AF37]/60 text-[#D4AF37] hover:text-black active:scale-[0.98] transition-all duration-300 overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.2)]"
            >
              <span className="relative z-[1] flex items-center justify-center gap-2">
                <Container size={16} />Book Your Truck Detail
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => { setShowSuccess(false); setSuccessData(null); }}
        data={successData}
      />

      {stripeVerifying && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
            <p className="text-white font-semibold text-lg">Confirming your booking…</p>
            <p className="text-zinc-400 text-sm">Just a moment while we verify your payment.</p>
          </div>
        </div>
      )}

      {stripeRecoveryError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4">
          <div className="rounded-2xl border border-red-500/30 bg-zinc-900/95 backdrop-blur-sm p-4 shadow-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-100 mb-1">Payment received — booking needs attention</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{stripeRecoveryError}</p>
              <a href="tel:8025855563" className="inline-block mt-2 text-xs font-bold text-[#D4AF37] hover:underline">Call or text us →</a>
            </div>
            <button type="button" onClick={() => setStripeRecoveryError(null)} className="text-zinc-600 hover:text-zinc-300 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
