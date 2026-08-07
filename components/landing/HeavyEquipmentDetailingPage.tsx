"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, ShieldCheck, BadgeCheck, Phone, ArrowRight,
  Tractor, Building2, ChevronRight,
  AlertTriangle, X, MapPin, Clock, Wind, Zap, Check,
} from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { DraftBooking } from "./BookingModal";
import { recoverStripeBooking } from "@/app/actions/recoverStripeBooking";

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

// ── Equipment we serve ───────────────────────────────────────────────────────
const EQUIPMENT_TYPES = [
  { name: "Excavators",      desc: "Cabs with all-day operator wear",        icon: "🚜" },
  { name: "Dozers",          desc: "Tracked machines, heavy dust loads",     icon: "🛻" },
  { name: "Wheel Loaders",   desc: "Quarry, sand & salt operators",          icon: "⚙️" },
  { name: "Skid Steers",     desc: "Tight cabs, big-impact resets",           icon: "🚛" },
  { name: "Tractors",        desc: "Ag + landscape — feet of mud in",         icon: "🌾" },
  { name: "Log Trucks",      desc: "Logger cabs — sap, sawdust, grease",      icon: "🪓" },
  { name: "Dump Trucks",     desc: "Off-highway and on-highway",              icon: "🚚" },
  { name: "Backhoes",        desc: "Municipal + contractor pools",            icon: "🏗️" },
  { name: "Telehandlers",    desc: "Boom & forklift cabs",                    icon: "📦" },
];

// ── Heavy equipment services — DB names match Supabase migration ─────────────
type HEServiceStatic = {
  dbName: string;
  displayName: string;
  badge: string | null;
  popular: boolean;
  flagship?: boolean;
  tagline: string;
  features: readonly string[];
  priceLabel: string;
  priceSuffix: string;
  duration: string;
  icon: typeof Sparkles;
};

const HE_SERVICES_STATIC: HEServiceStatic[] = [
  {
    dbName: "Equipment Cab Reset",
    displayName: "Equipment Cab Reset",
    badge: "Most Popular",
    popular: true,
    flagship: true,
    tagline: "Full single-cab interior reset — operator comfort + resale value.",
    duration: "~2 hr",
    icon: Sparkles,
    priceLabel: "175",
    priceSuffix: "From",
    features: [
      "Full vacuum — floor, seats, controls, every crevice",
      "Dash, switch panels, gauges, and steering wheel detailed",
      "Glass clarity — inside and out",
      "Floor mats steam shampooed + cab carpet treated",
      "Seat fabric/vinyl conditioned and protected",
      "Cabin deodorize + UV finish",
      "Photos before + after on request",
    ],
  },
  {
    dbName: "Equipment Hourly Service",
    displayName: "Equipment Hourly Service",
    badge: "Best for unknowns",
    popular: false,
    flagship: false,
    tagline: "Scope-flex pricing — biohazard, extreme grime, fleet days.",
    duration: "2 hr min",
    icon: Clock,
    priceLabel: "95",
    priceSuffix: "$",
    features: [
      "$95/hr, 2-hour minimum",
      "Best when scope is hard to predict ahead of time",
      "Multi-cab fleet days at your yard",
      "Biohazard / bodily fluid cleanup",
      "Extreme contamination (manure, hydraulic fluid, mud)",
      "You see the clock from start to finish",
      "Mileage included within Chittenden County",
    ],
  },
];

// ── Heavy equipment add-ons ──────────────────────────────────────────────────
const HE_ADDONS = [
  { icon: AlertTriangle, label: "Heavy-grime / mud surcharge",      price: "from $49", desc: "Pre-treat and extraction for trucks coming straight off the job." },
  { icon: Sparkles,      label: "Seat shampoo",                      price: "$39",      desc: "Extraction shampoo on cloth operator seat." },
  { icon: Sparkles,      label: "Floor shampoo",                     price: "$39",      desc: "Hot-water extraction on the cab carpet." },
  { icon: Wind,          label: "Odor / ozone treatment",            price: "$79",      desc: "30-minute ozone — kills smoke, mildew, sweat odor at the source." },
  { icon: AlertTriangle, label: "Biohazard / bodily fluid removal",  price: "from $99", desc: "Spill, blood, vomit — sanitized, sealed, ozone-treated." },
  { icon: ShieldCheck,   label: "Fabric / leather protection",       price: "$49",      desc: "UV + stain guard on operator seat and upholstery." },
] as const;

// ── Carousel indicator (dots + next-card hint) ───────────────────────────────
// Tracks which card is centered via IntersectionObserver (primary) and a
// rAF-batched scroll listener (so the dot keeps up mid-swipe).
function useCarouselIndex(scrollRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-card]"));
    if (!cards.length) return;

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

function HEServiceCard({
  svc,
  onBook,
}: {
  svc: HEServiceStatic & { dbService: Service | null };
  onBook: () => void;
}) {
  const Icon = svc.icon;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 md:hover:-translate-y-1 ${
        svc.flagship
          ? "border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-950 to-zinc-950 shadow-[0_0_40px_rgba(212,175,55,0.10)]"
          : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/30"
      }`}
    >
      {svc.flagship && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />}

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 min-h-[20px]">
          {svc.popular && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
              <Star size={9} fill="currentColor" />Most Popular
            </span>
          )}
          {!svc.popular && svc.badge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 bg-zinc-800/80 border border-white/[0.07] px-2 py-0.5 rounded-full">
              <BadgeCheck size={9} />{svc.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={20} className="text-[#D4AF37]" />
          <h3 className="text-lg font-black text-white tracking-tight leading-tight">{svc.displayName}</h3>
        </div>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">{svc.tagline}</p>

        <div className={`w-full rounded-xl mb-5 py-3.5 px-4 flex items-end justify-between gap-3 border ${svc.flagship ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{svc.priceSuffix}</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black tabular-nums leading-none ${svc.flagship ? "text-[#D4AF37]" : "text-white"}`}>
                {svc.priceSuffix === "$" ? `$${svc.priceLabel}` : `$${svc.priceLabel}`}
              </span>
              {svc.priceSuffix === "$" && <span className="text-sm font-bold text-zinc-500">/hr</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <Clock size={11} className="text-[#D4AF37]/70" />
            <span className="tabular-nums">{svc.duration}</span>
          </div>
        </div>

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

        <button
          onClick={onBook}
          className={`w-full py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] min-h-[52px] ${
            svc.flagship
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
export function HeavyEquipmentDetailingPage({ services }: { services: Service[] }) {
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
  const servicesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (searchParams.get("book") === "1") setBookingOpen(true);
  }, [searchParams]);

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

  const displayServices = HE_SERVICES_STATIC.map((s) => ({
    ...s,
    dbService: services.find((db) => db.name === s.dbName) ?? null,
  }));

  const servicesActiveIdx = useCarouselIndex(servicesScrollRef, displayServices.length);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-36 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.10) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <Tractor size={10} className="shrink-0" />Job Site &amp; Yard Service
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Heavy Equipment<br />Cab Detailing
          </h1>

          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-3 max-w-2xl mx-auto">
            Excavators, dozers, loaders, skid steers, tractors, log trucks, dump trucks. We come to your job site or yard with everything self-contained. Operator comfort and machine resale value — your cab is your office.
          </p>

          <p className="text-sm font-bold text-[#D4AF37] mb-6 px-2 leading-relaxed text-center">
            Cab Reset from $175 · Hourly $95/hr (2 hr min)
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide w-full sm:w-auto min-w-[220px] bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden text-base"
            >
              <span className="relative z-[1]">Schedule a Yard Visit</span>
            </button>
            <a href="#" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />Call 
            </a>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-items-center justify-center gap-x-4 gap-y-3 text-xs text-zinc-500 max-w-md mx-auto sm:max-w-none">
            {[
              { icon: Star,        label: "5★ Rated" },
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Tractor,     label: "On-Site Crew" },
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

      {/* ── Equipment Types ──────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]/80 mb-4 text-center">Equipment We Detail</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-2.5">
            {EQUIPMENT_TYPES.map((t) => (
              <div key={t.name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 hover:border-[#D4AF37]/30 transition-colors">
                <span className="text-xl shrink-0">{t.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{t.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug truncate">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Booking Section ───────────────────────────────────────────── */}
      <div ref={bookingRef} className="px-4 sm:px-6 lg:px-8 py-4 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          {showRestoreToast && (
            <div className="mb-4 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#D4AF37]">
              <span className="text-lg shrink-0">🚜</span>
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
              initialCategory="heavy_equipment"
            />
          )}
        </div>
      </div>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Simple Process</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">How It Works</h2>
            <p className="text-zinc-500 mt-2 text-sm">From booking to a reset cab — here&apos;s what to expect.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Pick a Package", desc: "Flat-rate Cab Reset for known scope. Hourly for biohazard, extreme grime, or fleet days where time is the variable.", icon: "📅" },
              { step: "02", title: "We Come to You", desc: "Your yard, the quarry, the job site — fully self-contained (generator, water, hot extraction, chemistry). No hookup needed.", icon: "🚜" },
              { step: "03", title: "Back to Work",   desc: "Walk through with us, your operator climbs in to a reset office. Photos before + after on request.", icon: "✨" },
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
              <strong className="text-zinc-300">Operator comfort = uptime.</strong> A reset cab matters for operator focus, allergen control, and machine resale. We&apos;re booked by contractors, loggers, and municipal DPW yards weekly.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Pricing / Service Cards ───────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            eyebrow="Two ways to book"
            title="Standard scope, or scope-flex hourly"
            subtitle="Most operators book the flat-rate Cab Reset. Hourly is the right call for biohazard, extreme contamination, multi-cab fleet days, or jobs where scope is hard to predict."
            accent
          />
          <div
            ref={servicesScrollRef}
            className={`flex md:grid md:grid-cols-2 gap-4 ${carouselScrollClass} pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0`}
          >
            {displayServices.map((svc) => (
              <div key={svc.dbName} data-carousel-card className="snap-center shrink-0 w-[min(88vw,420px)] md:w-auto md:min-w-0 md:snap-none md:shrink">
                <HEServiceCard svc={svc} onBook={() => openBooking(svc.dbService ?? undefined)} />
              </div>
            ))}
          </div>
          <CarouselNav
            scrollRef={servicesScrollRef}
            items={displayServices.map((s) => ({ name: s.displayName }))}
            activeIdx={servicesActiveIdx}
          />
        </div>
      </motion.section>

      {/* ── Add-ons ───────────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            eyebrow="Custom Touches"
            title="Add-ons"
            subtitle="Stack any of these onto your booking — call or note them at checkout and we'll confirm on-site."
          />
          <div className="grid sm:grid-cols-2 gap-3">
            {HE_ADDONS.map((addon) => {
              const Icon = addon.icon;
              return (
                <div key={addon.label} className="flex items-start gap-3 p-4 rounded-xl border border-[#D4AF37]/10 bg-zinc-900/40 hover:border-[#D4AF37]/30 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#D4AF37]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h4 className="font-bold text-sm text-white leading-tight">{addon.label}</h4>
                      <span className="text-sm font-black text-[#D4AF37] tabular-nums whitespace-nowrap">{addon.price}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{addon.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-4 flex items-start gap-3">
            <AlertTriangle size={14} className="text-amber-400/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Equipment running through harsh contaminants — diesel spills, hydraulic fluid, manure, biohazard — may shift the booking to hourly so scope is unambiguous. We&apos;ll always confirm with you on-site before changing the quote.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Fleet & Municipal CTA ─────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border-2 border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-950 to-zinc-950 overflow-hidden">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-[#D4AF37]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Fleet &amp; Municipal</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Multi-unit fleet days available</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                Contractor pools, DPW garages, school district maintenance, logging operations. We&apos;ll spend a half-day or full-day at your yard doing 4–8 cabs back-to-back. Custom quote on inquiry — 10–20% off scheduled recurring accounts.
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
                  href="#"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.1] text-white text-sm font-bold hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
                >
                  <Phone size={14} />
                  Call 
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
              <MapPin size={11} /> Statewide On-Site
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Free travel within Chittenden County</h2>
            <p className="text-zinc-500 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
              Burlington, Williston, South Burlington — free regardless of job site. Beyond that, $1/mile past 7.5 miles of driving distance from our Williston base. Quarry runs to Barre, contractor yards in Stowe / Charlotte / Hinesburg, and logging operations in the Northeast Kingdom are all on our weekly route.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { name: "Chittenden County", cities: "Burlington · Williston · S Burlington" },
              { name: "Quarry Country",    cities: "Barre · Graniteville · Berlin" },
              { name: "Champlain Valley",  cities: "Shelburne · Charlotte · Hinesburg" },
              { name: "Stowe / Lamoille",  cities: "Stowe · Morrisville · Hyde Park" },
              { name: "Mad River / I-89",  cities: "Waitsfield · Waterbury · Richmond" },
              { name: "Logging / NEK",     cities: "Newport · Island Pond · Hardwick" },
              { name: "Upper Valley",      cities: "Norwich · Hartford · Quechee" },
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
          <SectionHeader eyebrow="Questions" title="Frequently Asked" subtitle="Operator, owner, and fleet manager questions answered." />
          <div className="space-y-3">
            {[
              { q: "Do you come to my quarry, yard, or job site?",
                a: "Yes — we're 100% mobile and fully self-contained. Generator, water tank, hot-water extraction, all chemistry on board. We work at quarries, contractor yards, municipal DPW lots, logging landings, and job sites across Vermont." },
              { q: "What if my cab has biohazard or extreme contamination?",
                a: "We handle it. For biohazard cleanup, hydraulic-fluid spills, manure, or extreme grime, we'll move the booking to hourly ($95/hr, 2-hour minimum) so scope is unambiguous. We confirm on-site before changing the quote." },
              { q: "How long does a Cab Reset take?",
                a: "Most single cabs run about 2 hours. Large/complex cabs (telehandlers, big excavators with sleeper bunks) can run 3+. We schedule realistically and won't rush a job to fit a window." },
              { q: "Can you handle a fleet day at our yard?",
                a: "Yes — half-day and full-day fleet visits for 4–8 cabs are common. We schedule them in advance, often combined with truck details on the same day. 10–20% off recurring accounts." },
              { q: "Do you do exterior wash on equipment too?",
                a: "Cab interior is our specialty for heavy equipment. For exterior wash, pressure washing, or de-mudding, we'll quote case-by-case or recommend a partner — heavy-equipment exterior often needs a wash bay, not a mobile setup." },
              { q: "Can I get photos before and after?",
                a: "Yes — just ask at booking. We'll send photo + video receipts to your phone the day of the job." },
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
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">Schedule a yard visit</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Single machine or full fleet day — we&apos;ll come to you. Book a flat-rate Cab Reset above, or call for an hourly fleet day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden w-full sm:w-auto text-base"
            >
              <span className="relative z-[1]">Book a Cab Reset</span>
            </button>
            <a href="#" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />
            </a>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/truck-detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold min-h-[44px]">
              Semi Truck Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/fleet" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold min-h-[44px]">
              Fleet Quote <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 text-xs text-zinc-600 text-center sm:text-left">
          <span>© 2026 Arise And Shine Detailing · Heavy Equipment Cab Detailing · Vermont</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</Link>
        </div>
      </footer>

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
                <Tractor size={16} />Book a Cab Reset
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
              <a href="#" className="inline-block mt-2 text-xs font-bold text-[#D4AF37] hover:underline">Call or text us →</a>
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
