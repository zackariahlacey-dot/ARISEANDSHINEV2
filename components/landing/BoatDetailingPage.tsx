"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, CheckCircle, Star, ShieldCheck,
  BadgeCheck, Phone, ArrowRight, Anchor, Waves,
  Droplets, Leaf, AlertTriangle, Calculator, ChevronRight,
  Minus, Plus, Zap, FlaskConical, Eye, Wrench, Snowflake,
} from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { DraftBooking } from "./BookingModal";

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

const BOAT_MIN_FEET = 15;

// ── Waterline Up packages — DB name is used for booking, displayName for UI ──
const BOAT_SERVICES_STATIC = [
  {
    dbName: "Boat Interior Detail",   // matches Supabase service name
    displayName: "Marine Express",
    ratePerFoot: 20,
    badge: null as string | null,
    tagline: "Maintenance detail — keep the shine between deep cleans.",
    icon: Zap,
    features: [
      "Full decontamination wash & rinse",
      "Window & windscreen clarity treatment",
      "Cockpit vacuum & full wipe-down",
      "UV-protectant applied to all vinyl surfaces",
      "Metal brightening & chrome polish",
      "Quick-dry marine spray wax",
    ],
    accent: "text-[#D4AF37]",
    border: "border-[#D4AF37]/20",
    bg: "bg-[#D4AF37]/[0.03]",
    popular: false,
  },
  {
    dbName: "Boat Exterior Detail",
    displayName: "The Deep Reset",
    ratePerFoot: 30,
    badge: "Most Popular" as string | null,
    tagline: "Our flagship full deep clean — inside and out.",
    icon: Droplets,
    features: [
      "Full steam sanitation of all surfaces",
      "Hot water extraction (deep shampoo)",
      "Mold & mildew removal treatment",
      "Hull, waterline & transom scrub",
      "Light oxidation removal",
      "Premium marine paste wax applied",
    ],
    accent: "text-[#D4AF37]",
    border: "border-[#D4AF37]/40",
    bg: "bg-[#D4AF37]/[0.05]",
    popular: true,
  },
  {
    dbName: "Full Boat Detail",
    displayName: "Showroom Restoration",
    ratePerFoot: 55,
    badge: "Best for VT Winters" as string | null,
    tagline: "Total restoration — everything in Deep Reset plus machine polish.",
    icon: Sparkles,
    features: [
      "Everything in The Deep Reset",
      "1-Step Machine Polish (heavy oxidation removal)",
      "Full gel coat gloss restoration",
      "Bilge area detail & deodorize",
      "Wire brush hardware & fittings",
      "Ceramic-grade marine sealant applied",
    ],
    accent: "text-[#F3E5AB]",
    border: "border-[#D4AF37]/30",
    bg: "bg-[#D4AF37]/[0.04]",
    popular: false,
  },
] as const;

// ── Marine Specialist Add-ons ─────────────────────────────────────────────────
const MARINE_ADDONS = [
  {
    icon: Waves,
    label: "Pontoon Tube Polish",
    price: "$20 / ft",
    isPerFoot: true,
    desc: "Aluminum oxide and oxidation removed from every tube. Restores mirror-like shine.",
  },
  {
    icon: FlaskConical,
    label: "Hull Acid Wash",
    price: "$10 / ft",
    isPerFoot: true,
    desc: "Removes zebra mussel scars, algae staining, and heavy waterline deposits.",
  },
  {
    icon: Eye,
    label: "Isinglass & Vinyl Window Clarity",
    price: "$100",
    isPerFoot: false,
    desc: "Scratch removal, haze elimination, and UV sealant on all isinglass & enclosure windows.",
  },
  {
    icon: Wrench,
    label: "Engine Bay Deep Clean",
    price: "$150",
    isPerFoot: false,
    desc: "Full degreasing and detailing of the engine compartment, bilge included.",
  },
] as const;

const LAKES = [
  "Lake Champlain", "Lake Memphremagog", "Lake Willoughby",
  "Lake Bomoseen", "Lake St. Catherine", "Lake Fairlee",
  "Lake Morey", "Caspian Lake",
];

// ── Touch-friendly Price Calculator ──────────────────────────────────────────
function PriceCalculator({ onBook }: { onBook: () => void }) {
  const [feet, setFeet] = useState<number>(22);
  const clamp = (v: number) => Math.min(80, Math.max(BOAT_MIN_FEET, v));
  const adjust = (d: number) => setFeet((f) => clamp(f + d));
  const calc = (rate: number) => Math.round(rate * Math.max(feet, BOAT_MIN_FEET));

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] p-5 md:p-7">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-[#D4AF37] shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Price Calculator</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Min {BOAT_MIN_FEET}ft</span>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Boat Length
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={feet <= BOAT_MIN_FEET}
            className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Decrease length"
          >
            <Minus size={16} />
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              min={BOAT_MIN_FEET}
              max={80}
              value={feet}
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setFeet(clamp(v)); }}
              className="w-full text-center bg-zinc-950/60 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 text-white rounded-xl px-4 py-3 outline-none text-2xl font-black tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">ft</span>
          </div>
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={feet >= 80}
            className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Increase length"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {BOAT_SERVICES_STATIC.map((svc) => (
          <div
            key={svc.dbName}
            className={`rounded-xl border p-3 text-center ${svc.popular ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]" : "border-white/[0.07] bg-zinc-900/40"}`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 leading-tight">{svc.displayName}</p>
            <p className={`text-xl font-black tabular-nums ${svc.popular ? "text-[#D4AF37]" : "text-white"}`}>
              ${calc(svc.ratePerFoot).toLocaleString()}
            </p>
            <p className="text-[9px] text-zinc-600 mt-0.5">${svc.ratePerFoot}/ft</p>
          </div>
        ))}
      </div>

      <button
        onClick={onBook}
        className="btn-primary-gold-shimmer w-full py-3.5 rounded-xl font-bold text-sm bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 overflow-hidden flex items-center justify-center"
      >
        <span className="relative z-[1] flex items-center gap-2">
          Book at This Length <ChevronRight size={14} />
        </span>
      </button>
      <p className="text-[10px] text-zinc-600 mt-3 text-center">
        Final price confirmed on-site after inspection
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function BoatDetailingPage({ services }: { services: Service[] }) {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [initialDraft, setInitialDraft] = useState<DraftBooking | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (searchParams.get("book") === "1") setBookingOpen(true);
  }, [searchParams]);

  // Restore booking draft when returning from a cancelled Stripe checkout
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const stripe = searchParams.get("stripe");
    if (stripe !== "cancelled" && stripe !== "success") return;
    const raw = sessionStorage.getItem("draftBooking");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as DraftBooking;
      sessionStorage.removeItem("draftBooking");
      const matchedService = services.find((s) => s.id === draft.serviceId);
      if (matchedService) setSelectedService(matchedService);
      setInitialDraft(draft);
      setBookingOpen(true);
      setShowRestoreToast(true);
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => {
        bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
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
  const displayServices = BOAT_SERVICES_STATIC.map((s) => ({
    ...s,
    dbService: services.find((db) => db.name === s.dbName) ?? null,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.10) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <Anchor size={10} className="shrink-0" />Waterline Up · Dockside Specialist
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Mobile Boat<br />Detailing Vermont
          </h1>

          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-3 max-w-2xl mx-auto">
            We come to your marina, driveway, or storage yard — anywhere in Vermont. Per-foot dockside pricing with no trailering required.
          </p>

          {/* Rates */}
          <p className="text-sm font-bold text-[#D4AF37] mb-6">
            Marine Express $20/ft · Deep Reset $30/ft · Showroom Restoration $55/ft
          </p>

          {/* Waterline Up disclaimer */}
          <div className="inline-flex items-start gap-2.5 text-left bg-zinc-900/60 border border-[#D4AF37]/20 rounded-2xl px-4 py-3 mb-8 max-w-xl mx-auto">
            <Anchor size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="text-[12px] text-zinc-400 leading-relaxed">
              <span className="font-bold text-zinc-200">Mobile Dockside Service:</span>{" "}
              We specialize in detailing from the waterline up. No haul-out or lift required.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide w-full sm:w-auto min-w-[220px] bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden text-base"
            >
              <span className="relative z-[1]">Book Your Boat Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-y-3 text-xs text-zinc-500">
            {[
              { icon: Star, label: "5★ Rated" },
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Leaf, label: "100% Lake-Safe" },
              { icon: BadgeCheck, label: "Gelcoat Safe" },
            ].map(({ icon: Icon, label }, i, arr) => (
              <span key={label} className="flex items-center">
                <span className="flex items-center gap-1">
                  <Icon size={13} className="text-[#D4AF37]" />{label}
                </span>
                {i < arr.length - 1 && (
                  <span className="mx-16 text-zinc-700">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Price Calculator ──────────────────────────────────────────── */}
      <section className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <PriceCalculator onBook={() => openBooking()} />
        </div>
      </section>

      {/* ── Booking Section ───────────────────────────────────────────── */}
      <div ref={bookingRef} className="px-4 sm:px-6 lg:px-8 py-4 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          {/* Restore toast */}
          {showRestoreToast && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#D4AF37]">
              <span className="text-lg">⚓</span>
              <span>Your booking details have been restored — pick up right where you left off.</span>
              <button onClick={() => setShowRestoreToast(false)} className="ml-auto text-[#D4AF37]/60 hover:text-[#D4AF37]">✕</button>
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
            />
          )}
        </div>
      </div>

      {/* ── Waterline Up Packages ─────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Waterline Up Packages</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Dockside Detailing Tiers</h2>
            <p className="text-zinc-500 mt-3 max-w-xl mx-auto text-sm">
              Every service performed at your dock, marina, or driveway. No trailering. No lift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.dbName} className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${svc.border} ${svc.bg} ${svc.popular ? "shadow-[0_0_40px_rgba(212,175,55,0.08)]" : ""}`}>
                  {svc.popular && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />}

                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[22px]">
                      {svc.popular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                          <Star size={9} fill="currentColor" />Most Popular
                        </span>
                      )}
                      {svc.badge && !svc.popular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F3E5AB] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">
                          <Snowflake size={9} />
                          {svc.badge}
                        </span>
                      )}
                    </div>

                    {/* Icon + name */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon size={18} className={svc.accent} />
                      <h3 className="text-lg font-black text-white tracking-tight">{svc.displayName}</h3>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-4">{svc.tagline}</p>

                    {/* Price badge */}
                    <div className={`rounded-xl mb-5 py-3 text-center border ${svc.popular ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className={`text-3xl font-black tabular-nums ${svc.popular ? "text-[#D4AF37]" : "text-white"}`}>
                        ${svc.ratePerFoot}<span className="text-lg font-bold text-zinc-500">/ft</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                        Min {BOAT_MIN_FEET}ft · ${svc.ratePerFoot * BOAT_MIN_FEET} minimum
                      </div>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2 flex-1 mb-5">
                      {svc.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                          <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                            <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => openBooking(svc.dbService ?? undefined)}
                      className={`w-full py-4 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] min-h-[52px] ${
                        svc.popular
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
            })}
          </div>
        </div>
      </motion.section>

      {/* ── Marine Specialist Add-ons ─────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Upsells</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Marine Specialist Add-ons</h2>
            <p className="text-zinc-500 mt-2 text-sm">
              Add any of these when booking — mention them in the notes field or call to confirm.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MARINE_ADDONS.map((addon) => {
              const Icon = addon.icon;
              return (
                <div
                  key={addon.label}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-[#D4AF37]/15 bg-zinc-900/50 hover:border-[#D4AF37]/30 hover:bg-zinc-900/80 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-[#D4AF37]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="font-bold text-sm text-white">{addon.label}</h3>
                      <span className="text-sm font-black text-[#D4AF37] tabular-nums whitespace-nowrap">{addon.price}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{addon.desc}</p>
                    {addon.isPerFoot && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 bg-zinc-800/60 border border-white/5 px-2 py-0.5 rounded-full">
                        Per foot — based on boat length
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-zinc-600 mt-5">
            All add-ons confirmed on-site. Per-foot pricing based on measured boat length.
          </p>
        </div>
      </motion.section>

      {/* ── Vermont Lakes ─────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">We Serve Vermont&apos;s Lakes</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-5">Marinas & Lake Communities We Reach</h2>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {LAKES.map((lake) => (
              <span key={lake} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/[0.05] text-[#D4AF37]/80 text-xs font-semibold">
                <Waves size={10} />{lake}
              </span>
            ))}
          </div>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Don&apos;t see your lake?{" "}
            <a href="tel:8025855563" className="text-[#D4AF37] hover:text-[#F3E5AB] transition-colors">Call us</a>{" "}
            — we cover all of Vermont and service remote boat storage yards by request.
          </p>
        </div>
      </motion.section>

      {/* ── Why Choose Us ────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-black text-white">Why Vermont Boaters Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { title: "True Dockside Service", desc: "Marina, driveway, or storage yard — fully self-contained rig. No haul-out. No lift. No trailering." },
              { title: "Per-Foot Transparent Pricing", desc: "Enter your boat length and know your price upfront. No surprise fees after arrival." },
              { title: "100% Lake-Safe Chemicals", desc: "All products are biodegradable and compliant with Vermont environmental standards. Safe for runoff near any VT waterway." },
              { title: "Vermont UV & Winter Ready", desc: "Our sealants and ceramic treatments protect against Vermont's harsh UV summers and freeze-thaw winters." },
              { title: "Fully Insured & Certified", desc: "Full marine liability coverage on every job. Your boat is protected from start to finish." },
              { title: "5★ Local Reputation", desc: "Locally owned and operated in Vermont. We treat your boat like we own it — because our reputation depends on it." },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-2xl border border-[#D4AF37]/10 bg-zinc-900/40 p-5 hover:border-[#D4AF37]/25 transition-colors">
                <CheckCircle size={18} className="text-[#D4AF37] mb-3" />
                <h3 className="font-bold text-sm text-white mb-1.5">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Notices ───────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pb-4 max-w-2xl mx-auto space-y-3">
        <div className="flex items-start gap-2.5 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.03] px-4 py-3">
          <AlertTriangle size={14} className="text-[#D4AF37]/60 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            <span className="font-bold text-zinc-400">Severe Mold / Bilge Odor:</span>{" "}
            Boats with heavy mold, mildew, or persistent odor may require a $75–$150 remediation surcharge. We always confirm before starting.
          </p>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.03] px-4 py-3">
          <Leaf size={14} className="text-[#D4AF37]/60 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            <span className="font-bold text-zinc-400">Eco Commitment:</span>{" "}
            We use only biodegradable, phosphate-free marine soaps and sealants compliant with Vermont Department of Environmental Conservation standards.
          </p>
        </div>
      </div>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">Ready for the Waterline Up Treatment?</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Calculate your price above, pick your package, and book in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden w-full sm:w-auto text-base"
            >
              <span className="relative z-[1]">Book Your Boat Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />802-585-5563
            </a>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold min-h-[44px]">
              Auto Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/rv-detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold min-h-[44px]">
              RV Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine VT · Waterline Up Marine Detailing · Vermont</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</Link>
        </div>
      </footer>

      {/* ── Sticky mobile Book Now bar ─────────────────────────────────── */}
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
                <Anchor size={16} />Book Your Boat Detail
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
    </div>
  );
}
