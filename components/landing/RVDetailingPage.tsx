"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, Phone, ArrowRight, Truck,
  Droplets, Calculator, ChevronRight,
  Minus, Plus, Layers, AlertTriangle, X,
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

const RV_MIN_FEET = 20;

const RV_SERVICES_STATIC = [
  {
    dbName: "RV Interior",
    displayName: "RV Interior",
    ratePerFoot: 15,
    badge: null as string | null,
    tagline: "Full interior deep clean — living quarters, kitchen, bath & more.",
    icon: Droplets,
    features: [
      "Full vacuum of all flooring & carpet",
      "Upholstery, dinette & cushion clean",
      "Kitchen & bathroom deep clean",
      "Dashboard, panels & overhead wipe-down",
      "Odor treatment & deodorize",
      "No buffing or polishing",
    ],
    accent: "text-[#D4AF37]",
    border: "border-[#D4AF37]/20",
    bg: "bg-[#D4AF37]/[0.03]",
    popular: false,
  },
  {
    dbName: "RV Exterior",
    displayName: "RV Exterior",
    ratePerFoot: 12,
    badge: "Most Popular" as string | null,
    tagline: "Full exterior wash, clay bar & wax. No buffing or polishing.",
    icon: Sparkles,
    features: [
      "Full hand wash roof to skirt",
      "Clay bar treatment",
      "Wax or polymer sealant",
      "Slides, wheels & awning track",
      "No buffing or polishing",
    ],
    accent: "text-[#D4AF37]",
    border: "border-[#D4AF37]/40",
    bg: "bg-[#D4AF37]/[0.05]",
    popular: true,
  },
  {
    dbName: "RV Full Detail",
    displayName: "RV Full Detail",
    ratePerFoot: 25,
    badge: "Best Value" as string | null,
    tagline: "Complete interior + exterior. No buffing or polishing.",
    icon: Layers,
    features: [
      "Full interior + exterior package",
      "Slides, storage bays & roof vents",
      "Windows in & out",
      "No buffing or polishing",
    ],
    accent: "text-[#D4AF37]",
    border: "border-[#D4AF37]/30",
    bg: "bg-[#D4AF37]/[0.04]",
    popular: false,
  },
  {
    dbName: "RV Showroom 1-Step",
    displayName: "RV Showroom 1-Step",
    ratePerFoot: 25,
    badge: null as string | null,
    tagline: "Exterior + single-stage machine polish for improved gloss & clarity.",
    icon: Sparkles,
    features: [
      "Full hand wash & clay bar",
      "1-step machine polish (paint enhancement)",
      "Improved gloss & paint clarity",
      "Wax or polymer sealant topcoat",
      "Includes machine polishing",
    ],
    accent: "text-[#D4AF37]",
    border: "border-[#D4AF37]/35",
    bg: "bg-[#D4AF37]/[0.04]",
    popular: false,
  },
  {
    dbName: "RV Showroom 2-Step",
    displayName: "RV Showroom 2-Step",
    ratePerFoot: 40,
    badge: "Premium" as string | null,
    tagline: "Exterior + two-stage machine polish — maximum gloss & paint correction.",
    icon: Sparkles,
    features: [
      "Full hand wash & clay bar",
      "Stage 1: cut & paint correction",
      "Stage 2: finish polish for maximum gloss",
      "Ceramic or carnauba wax topcoat",
      "Includes 2-step machine polishing",
    ],
    accent: "text-[#F3E5AB]",
    border: "border-[#D4AF37]/50",
    bg: "bg-[#D4AF37]/[0.06]",
    popular: false,
  },
] as const;

// ── Touch-friendly Price Calculator ──────────────────────────────────────────
function PriceCalculator({ onBook }: { onBook: () => void }) {
  const [feet, setFeet] = useState<number>(28);
  const clamp = (v: number) => Math.min(60, Math.max(RV_MIN_FEET, v));
  const adjust = (d: number) => setFeet((f) => clamp(f + d));
  const calc = (rate: number) => Math.round(rate * Math.max(feet, RV_MIN_FEET));

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] p-5 md:p-7">
      <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left gap-2 mb-5">
        <div className="flex items-center justify-center gap-2">
          <Calculator size={16} className="text-[#D4AF37] shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Price Calculator</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Min {RV_MIN_FEET}ft</span>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 text-center sm:text-left">
          RV Length
        </label>
        <div className="flex items-center justify-center gap-3 max-w-md mx-auto sm:max-w-none sm:mx-0">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={feet <= RV_MIN_FEET}
            className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Decrease length"
          >
            <Minus size={16} />
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              min={RV_MIN_FEET}
              max={60}
              value={feet}
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setFeet(clamp(v)); }}
              className="w-full text-center bg-zinc-950/60 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 text-white rounded-xl px-4 py-3 outline-none text-2xl font-black tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">ft</span>
          </div>
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={feet >= 60}
            className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Increase length"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div
        className={`flex md:grid md:grid-cols-3 gap-3 mb-5 ${carouselScrollClass} pb-2 -mx-1 px-1 md:mx-0 md:px-0 md:overflow-visible`}
      >
        {RV_SERVICES_STATIC.map((svc) => (
          <div
            key={svc.dbName}
            className={`snap-center shrink-0 w-[min(82vw,280px)] md:w-auto rounded-xl border p-4 text-center ${svc.popular ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]" : "border-white/[0.07] bg-zinc-900/40"}`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 leading-tight">{svc.displayName}</p>
            <p className={`text-xl font-black tabular-nums ${svc.popular ? "text-[#D4AF37]" : "text-white"}`}>
              ${calc(svc.ratePerFoot).toLocaleString()}
            </p>
            <p className="text-[9px] text-zinc-600 mt-0.5">${svc.ratePerFoot}/ft</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 text-center md:hidden -mt-2 mb-4">Swipe for packages</p>

      <button
        onClick={onBook}
        className="btn-primary-gold-shimmer w-full py-3.5 rounded-xl font-bold text-sm bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 overflow-hidden flex items-center justify-center"
      >
        <span className="relative z-[1] flex items-center gap-2">
          Book at This Length <ChevronRight size={14} />
        </span>
      </button>
      <p className="text-[10px] text-zinc-600 mt-3 text-center">Price confirmed before work starts</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function RVDetailingPage({ services }: { services: Service[] }) {
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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (searchParams.get("book") === "1") setBookingOpen(true);
  }, [searchParams]);

  // Handle Stripe return + post-signup restore
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
          pointsEarned: 0,
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
        // Cancelled or returning after signup — restore the booking form
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

  const displayServices = RV_SERVICES_STATIC.map((s) => ({
    ...s,
    dbService: services.find((db) => db.name === s.dbName) ?? null,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Grain overlay */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.10) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <Truck size={10} className="shrink-0" />Mobile RV · Vermont
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}
          >
            Mobile RV Detailing<br />Vermont
          </h1>

          <p className="text-sm md:text-base text-zinc-400 mb-5 max-w-lg mx-auto">
            Per-foot pricing statewide — we come to you.
          </p>

          <p className="text-sm font-bold text-[#D4AF37] mb-8 px-2">
            RV Interior $15/ft · RV Exterior $12/ft · Full Detail $25/ft · Showroom from $25/ft
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide w-full sm:w-auto min-w-[220px] bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden text-base"
            >
              <span className="relative z-[1]">Book Your RV Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center justify-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm min-h-[44px]">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>
        </div>
      </section>

      {/* ── Price Calculator ──────────────────────────────────────────────── */}
      <section className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <PriceCalculator onBook={() => openBooking()} />
        </div>
      </section>

      {/* ── Booking Section ───────────────────────────────────────────────── */}
      <div ref={bookingRef} className="px-4 sm:px-6 lg:px-8 py-4 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          {/* Restore toast */}
          {showRestoreToast && (
            <div className="mb-4 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-sm text-[#D4AF37]">
              <span className="text-lg shrink-0">🚐</span>
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
            />
          )}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Simple Process</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">How It Works</h2>
            <p className="text-zinc-500 mt-2 text-sm">No drop-off, no hassle — we come to your rig wherever it lives.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Book Online",
                desc: "Pick your package, enter your RV's length for an instant price, choose a date. Pay online or at arrival — no commitment until you're ready.",
                icon: "📅",
              },
              {
                step: "02",
                title: "We Come to You",
                desc: "We arrive at your campground, storage facility, or driveway with everything we need. No hookups required — we're fully self-contained.",
                icon: "🚐",
              },
              {
                step: "03",
                title: "Hit the Road Clean",
                desc: "Walk back to an RV that looks and smells like new. We text you when we're done, and we stand behind the result.",
                icon: "✨",
              },
            ].map(({ step, title, desc, icon }) => (
              <div
                key={step}
                className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 text-center"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/60 mb-1">{step}</p>
                <p className="text-sm font-bold text-white mb-2">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-white/[0.05] bg-zinc-900/40 px-5 py-4 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong className="text-zinc-300">Not sure which package you need?</strong> Give us a call at{" "}
              <a href="tel:8025855563" className="text-[#D4AF37] hover:underline">802-585-5563</a> and
              we'll help you pick the right service for your rig and budget.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Service Packages ─────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Packages</h2>
            <p className="text-zinc-500 mt-2 text-sm">Min {RV_MIN_FEET}ft length · prices scale per foot</p>
          </div>

          <p className="text-center text-[11px] text-zinc-600 mb-4 md:hidden">Swipe to compare packages</p>
          <div
            className={`flex md:grid md:grid-cols-3 gap-4 ${carouselScrollClass} pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:pb-0`}
          >
            {displayServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.dbName}
                  className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 md:hover:-translate-y-1 snap-center shrink-0 w-[min(88vw,380px)] md:w-auto md:min-w-0 md:snap-none md:shrink ${svc.border} ${svc.bg} ${svc.popular ? "shadow-[0_0_40px_rgba(212,175,55,0.08)]" : ""}`}
                >
                  {svc.popular && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />}

                  <div className="p-5 sm:p-6 flex flex-col flex-1 text-center md:text-left items-center md:items-stretch">
                    {/* Badge row */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3 min-h-[22px] w-full">
                      {svc.popular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                          <Star size={9} fill="currentColor" />Most Popular
                        </span>
                      )}
                      {svc.badge && !svc.popular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F3E5AB] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">
                          <Sparkles size={9} />
                          {svc.badge}
                        </span>
                      )}
                    </div>

                    {/* Icon + name */}
                    <div className="flex flex-col md:flex-row items-center gap-2 mb-1.5">
                      <Icon size={22} className={svc.accent} />
                      <h3 className="text-lg font-black text-white tracking-tight">{svc.displayName}</h3>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-4 max-w-xs md:max-w-none mx-auto md:mx-0">{svc.tagline}</p>

                    {/* Price badge */}
                    <div className={`w-full rounded-xl mb-5 py-3 text-center border ${svc.popular ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className={`text-3xl font-black tabular-nums ${svc.popular ? "text-[#D4AF37]" : "text-white"}`}>
                        ${svc.ratePerFoot}<span className="text-lg font-bold text-zinc-500">/ft</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 px-1">
                        Min {RV_MIN_FEET}ft · ${svc.ratePerFoot * RV_MIN_FEET} minimum
                      </div>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2.5 flex-1 mb-5 w-full">
                      {svc.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-3 text-sm text-zinc-300 leading-snug max-w-[min(100%,19rem)] mx-auto md:mx-0 md:max-w-none"
                        >
                          <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                            <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                          </span>
                          <span className="text-left">{f}</span>
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

      {/* Single-line disclaimers */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6 max-w-2xl mx-auto">
        <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
          Heavy mold/odor may add $75–$150. Rigs over 45ft may need a surcharge —{" "}
          <a href="tel:8025855563" className="text-[#D4AF37]/80 hover:text-[#D4AF37]">call</a> first. Final price confirmed before we start.
        </p>
      </div>

      {/* Other services */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <Link href="/detailing" className="group flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 text-sm font-semibold">
            Auto Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/boat-detailing" className="group flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 text-sm font-semibold">
            Boat Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 text-xs text-zinc-600 text-center sm:text-left">
          <span>© 2025 Arise And Shine VT · Vermont</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</Link>
        </div>
      </footer>

      {/* ── Sticky mobile Book Now bar ──────────────────────────────────── */}
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
                <Truck size={16} />Book Your RV Detail
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
