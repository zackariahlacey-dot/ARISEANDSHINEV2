"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles, Crown, Star, Gem,
  CheckCircle, AlertTriangle, ChevronDown, Car,
  ArrowLeft, MapPin, ChevronRight, Phone,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import { SiteHeader } from "./SiteHeader";
import { getServiceDisplayName } from "@/lib/serviceDisplay";
import { ServiceComparisonTable } from "./ServiceComparisonTable";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(
  () => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })),
  { ssr: false }
);

// ─── Static data ───────────────────────────────────────────────────────────────

const ULTIMATE_CARDS = [
  {
    name: "Ultimate Interior Reset",
    tagline: "Seats removed. Every crevice reset.",
    priceNormal: 325, priceLarge: 395,
    badge: { label: "Flagship Service", icon: "gem" as const },
    features: [
      "Seats REMOVED from vehicle for deep steam clean",
      "Full shampoo of seats, carpet, and mats",
      "Steam clean every surface, vacuum every crack",
      "Disinfect and protect all interior surfaces",
      "Interior glass streak-free (all windows)",
      "Rubber/carpet mats cleaned and protected",
      "Leather conditioning (if applicable)",
      "Trunk fully included",
      "Add + Exterior Detail at checkout for a bundle price",
    ],
    isFlagship: true,
  },
] as const;

const EXTERIOR_ITEMS = [
  "Full handwash and foam bath",
  "Deep clean wheel wells, rims, and tires",
  "Included: 1–3 Month Ceramic Spray Sealant",
];
const INTERIOR_ITEMS = [
  "Full wipe down & vacuum of every surface, crack, and crevice",
  "Clean and protect plastics and leathers",
  "Floor mats & carpet cleaning (shampoo not included — heavy dirt or set-in stains will NOT lift without adding Carpet & Upholstery Shampoo)",
  "Interior glass cleaned and protected",
];
const MAINTENANCE_ITEMS = [
  "Everything in standard detail",
  "Priority scheduling",
  "Premium ceramic-grade protectants",
  "Fixed monthly dates",
];
const SERVICE_INCLUSIONS: Record<string, string[]> = {
  "Exterior Detail": EXTERIOR_ITEMS,
  "Interior Detail": INTERIOR_ITEMS,
  "Full Detail": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS],
  "Interior Monthly Maintenance": [...INTERIOR_ITEMS, ...MAINTENANCE_ITEMS],
  "Full Detail Monthly Maintenance": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS, ...MAINTENANCE_ITEMS],
};

const FAQ = [
  { q: "Do you come to my location?", a: "Yes — we're 100% mobile. We come to your home, office, or anywhere in Vermont. No shop visit needed." },
  { q: "How long does a detail take?", a: "Basic Interior takes about 2.5 hours, Basic Exterior 1.5 hours, and Basic Full (Interior + Exterior) about 3 hours. The Reset — Interior runs 2.5 hours, The Reset — Exterior 2.5 hours, and The Reset — Full about 4 hours. Light Detailing is scheduled for 1 hour (up to 90 minutes if you pick everything)." },
  { q: "What products do you use?", a: "We use professional-grade, eco-friendly products including pH-neutral soaps, ceramic-grade protectants, and premium interior dressings — safe for all surfaces." },
  { q: "What's the cancellation policy?", a: "Cancellations must be made at least 24 hours in advance. Same-day cancellations may incur a $50 fee. We'll never charge you if we reschedule due to weather." },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const viewport = { once: true, margin: "-80px" };

// ─── Main Component ────────────────────────────────────────────────────────────

const DETAILING_ORDER = ["Interior Detail", "Full Detail", "Exterior Detail"];
type BookingContext = "standard" | "ultimate" | "club" | null;

export function ServicesPage({ services }: { services: Service[] }) {
  const detailingServices = useMemo(() =>
    services
      .filter((s) => !s.is_subscription && DETAILING_ORDER.includes(s.name))
      .sort((a, b) => DETAILING_ORDER.indexOf(a.name) - DETAILING_ORDER.indexOf(b.name)),
    [services]
  );

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bookingCtx, setBookingCtx] = useState<BookingContext>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [authLoyaltyDiscountPct] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const openBooking = useCallback((ctx: BookingContext, service?: Service) => {
    setSelectedService(service ?? null);
    setBookingCtx(ctx);
    setTimeout(() => {
      document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const handleBookingSuccess = useCallback((data: SuccessModalData) => {
    setBookingCtx(null);
    setSuccessData(data);
    setShowSuccess(true);
    router.refresh();
  }, [router]);

  const NAV_SECTIONS = [
    { label: "Auto Detailing", id: "auto-detailing" },
    { label: "Ultimate Packages", id: "ultimate-packages" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Grain overlay */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader onBookNow={() => openBooking("standard")} />

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(212,175,55,0.12) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-[#D4AF37] text-xs font-semibold uppercase tracking-widest mb-8 transition-colors">
            <ArrowLeft size={12} />Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <MapPin size={10} className="shrink-0" />Proudly Serving All of Vermont
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5" style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            All Our Services
          </h1>
          <p className="text-base md:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-8">
            Every service is performed mobile — at your home, office, or anywhere in Vermont.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
            {["Transparent Pricing", "Easy Online Booking", "100% Mobile"].map((t) => (
              <span key={t} className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section nav ── */}
      <nav aria-label="Page sections" className="sticky top-[60px] z-40 bg-zinc-950/90 backdrop-blur-md border-b border-white/[0.05] hidden md:block">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 h-11 text-[11px] font-bold uppercase tracking-widest overflow-x-auto">
          {NAV_SECTIONS.map(({ label, id }, i) => (
            <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-zinc-500 hover:text-[#D4AF37] transition-colors whitespace-nowrap"
            >
              {i > 0 && <ChevronRight size={10} className="text-zinc-700 shrink-0" />}
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── 1. Auto Detailing ── */}
      <motion.section id="auto-detailing" initial="hidden" whileInView="visible" viewport={viewport} variants={sectionVariants}
        className="py-16 md:py-24 px-4 sm:px-6 lg:px-8"
      >
        <div className="w-full max-w-7xl mx-auto">
          <SectionHeader eyebrow="Auto Detailing" title="Interior, Exterior & Interior + Exterior" subtitle="Our core mobile detailing packages — Interior, Exterior, and Interior + Exterior — delivered anywhere in Vermont." />
          {detailingServices.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <Car size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Services coming soon — check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 md:mt-14">
              {detailingServices.map((service) => (
                <ServiceCard key={service.id} service={service} onBook={() => openBooking("standard", service)} />
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* ── 2. Service Comparison Table (moved here from homepage) ── */}
      <section id="service-comparison" className="border-t border-white/[0.06] pt-4">
        <ServiceComparisonTable />
      </section>

      {/* ── 3. Ultimate Packages (RETIRED July 2026 v3) ──
          Kept behind {false} — the underlying Ultimate Interior Reset service
          is deactivated. Reset — Interior is now the top tier and lives in
          the main service comparison table above. */}
      {false && (
      <motion.section id="ultimate-packages" initial="hidden" whileInView="visible" viewport={viewport} variants={sectionVariants}
        className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="w-full max-w-7xl mx-auto">
          <SectionHeader eyebrow="Premium Collection" title="Ultimate Packages" subtitle="Our most comprehensive packages — engineered for vehicles that deserve nothing less than perfection." />
          <div className="grid grid-cols-1 gap-6 mt-10 md:mt-14 max-w-xl mx-auto">
            {ULTIMATE_CARDS.map((card) => (
              <UltimateServiceCard key={card.name} {...card} onBook={() => openBooking("ultimate")} />
            ))}
          </div>
          <div className="mt-6 flex items-start gap-2.5 max-w-2xl mx-auto text-center justify-center">
            <AlertTriangle size={13} className="text-amber-500/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              <span className="font-bold text-zinc-500">Heavy Soil / Biohazard:</span>{" "}
              Vehicles with extreme mold, biohazards, or excessive pet hair may incur a $50–$100 surcharge.
            </p>
          </div>
        </div>
      </motion.section>
      )}

      {/* ── Booking Section ── */}
      <div id="booking-section" className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="w-full max-w-3xl mx-auto">
          {mounted && bookingCtx && (
            <BookingSection
              isVisible={true}
              onClose={() => setBookingCtx(null)}
              selectedService={selectedService}
              services={services}
              onSelectService={setSelectedService}
              onBookingSuccess={handleBookingSuccess}
              initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
              initialDraft={null}
              onDraftRestored={() => {}}
            />
          )}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">Ready to Book?</h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">We come to you — anywhere in Vermont. Choose a service above or call us to talk through what your vehicle needs.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => openBooking("standard")} className="btn-primary-gold-shimmer px-10 py-4 rounded-xl font-bold tracking-wide bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Book Your Detail</span>
            </button>
            <a href="#" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={15} />Call 
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine Detailing · Mobile Detailing · Vermont</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1">
            <ArrowLeft size={11} />Back to Home
          </Link>
        </div>
      </footer>

      <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); setSuccessData(null); }} data={successData} />
    </div>
  );
}

// ─── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-2">
      <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">{eyebrow}</p>
      <h2 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 2px 16px rgba(212,175,55,0.2))" }}>
        {title}
      </h2>
      {subtitle && <p className="text-sm md:text-base text-zinc-500 mt-4 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({ service, onBook }: { service: Service; onBook: () => void }) {
  const isPopular = service.name === "Full Detail";
  const inclusions = SERVICE_INCLUSIONS[service.name] ?? [];
  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${isPopular ? "border border-[#D4AF37]/45 shadow-[0_0_40px_rgba(212,175,55,0.1)] bg-zinc-900/70 hover:shadow-[0_16px_50px_rgba(212,175,55,0.15)]" : "border border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"}`}>
      {isPopular && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />}
      <div className="p-7 flex flex-col flex-1">
        <div className="mb-6">
          {isPopular && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <Crown size={11} className="text-[#D4AF37]" strokeWidth={2} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Most Popular</span>
            </div>
          )}
          <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{getServiceDisplayName(service.name)}</h3>
          {service.description && <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{service.description}</p>}
        </div>
        <div className={`flex rounded-xl mb-7 overflow-hidden border ${isPopular ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
          <div className="flex-1 py-4 text-center bg-white/[0.02]">
            <div className="text-2xl font-black text-white tabular-nums">${service.price_small}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Normal</div>
          </div>
          <div className="w-px bg-white/[0.06]" />
          <div className={`flex-1 py-4 text-center ${isPopular ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
            <div className={`text-2xl font-black tabular-nums ${isPopular ? "text-[#D4AF37]" : "text-zinc-200"}`}>${service.price_large}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Large / 3-Row</div>
          </div>
        </div>
        {inclusions.length > 0 && (
          <div className="mb-7 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-3">What&apos;s Included</p>
            <ul className="space-y-2.5">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                  <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {inclusions.length === 0 && <div className="flex-1" />}
        <button onClick={onBook} className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${isPopular ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)]" : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"}`}>
          Book This Service <Sparkles size={13} className="shrink-0" />
        </button>
        <p className="text-center text-[11px] text-zinc-600 mt-3">
          <Sparkles size={9} className="inline mr-1" />Counts toward your loyalty tier
        </p>
      </div>
    </div>
  );
}

// ─── Ultimate Service Card ─────────────────────────────────────────────────────

function UltimateServiceCard({ name, tagline, priceNormal, priceLarge, badge, features, onBook, isFlagship }: {
  name: string; tagline: string; priceNormal: number; priceLarge: number;
  badge: { label: string; icon: "star" | "gem" };
  features: readonly string[]; onBook: () => void; isFlagship: boolean;
}) {
  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${isFlagship ? "border border-[#D4AF37]/60 shadow-[0_0_50px_rgba(212,175,55,0.2)] bg-zinc-900/70 hover:shadow-[0_16px_60px_rgba(212,175,55,0.3)]" : "border border-white/[0.08] bg-zinc-900/50 hover:border-[#D4AF37]/30"}`}>
      <div className={`h-[2px] w-full shrink-0 ${isFlagship ? "bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40" : "bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"}`} />
      {isFlagship && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%)" }} />}
      <div className="p-7 flex flex-col flex-1 relative">
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2.5">
            {badge.icon === "gem" ? <Gem size={11} className="text-[#D4AF37]" strokeWidth={2} /> : <Star size={11} className="text-[#D4AF37]" strokeWidth={2} fill="currentColor" />}
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">{badge.label}</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{name}</h3>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{tagline}</p>
        </div>
        <div className={`rounded-xl mb-7 overflow-hidden border ${isFlagship ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
          {priceNormal === priceLarge ? (
            <div className={`py-4 text-center ${isFlagship ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
              <div className={`text-3xl font-black tabular-nums ${isFlagship ? "text-[#D4AF37]" : "text-white"}`}>${priceNormal}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Flat Rate — All Vehicle Sizes</div>
            </div>
          ) : (
            <div className="flex">
              <div className="flex-1 py-4 text-center bg-white/[0.02]">
                <div className="text-2xl font-black text-white tabular-nums">${priceNormal}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Normal</div>
              </div>
              <div className="w-px bg-white/[0.06]" />
              <div className={`flex-1 py-4 text-center ${isFlagship ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                <div className={`text-2xl font-black tabular-nums ${isFlagship ? "text-[#D4AF37]" : "text-zinc-200"}`}>${priceLarge}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Large / 3-Row</div>
              </div>
            </div>
          )}
        </div>
        <div className="mb-7 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-3">What&apos;s Included</p>
          <ul className="space-y-2.5">
            {features.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onBook} className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${isFlagship ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)]" : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"}`}>
          Book This Service <Sparkles size={13} className="shrink-0" />
        </button>
        <p className="text-center text-[11px] text-zinc-600 mt-3">
          <Sparkles size={9} className="inline mr-1" />
          Counts toward your loyalty tier
        </p>
      </div>
    </div>
  );
}

// ─── Maintenance Card ──────────────────────────────────────────────────────────

function MaintenanceCard({ plan, onBook }: { plan: Service; onBook: () => void }) {
  const [open, setOpen] = useState(false);
  const isFull = plan.name.toLowerCase().includes("full");
  const inclusions = SERVICE_INCLUSIONS[plan.name] ?? [];
  return (
    <div className="relative group h-full">
      <div className="absolute -inset-0.5 bg-gradient-to-b from-[#D4AF37]/20 to-transparent rounded-[1.5rem] blur opacity-50 group-hover:opacity-100 transition duration-500" />
      <div className="relative h-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/5 mb-4">
          {isFull ? <Crown className="text-[#D4AF37]" size={22} /> : <Car className="text-[#D4AF37]" size={22} />}
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-4">Limited Spots</div>
        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{plan.name}</h3>
        <p className="text-zinc-500 text-xs leading-relaxed mb-6 max-w-xs">{plan.description}</p>
        <div className="mb-2">
          <span className="text-5xl font-black text-white">${plan.price_small}</span>
          <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs ml-1">/ mo</span>
        </div>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-8">+${isFull ? 100 : 75} Initial Setup Fee</p>
        <ul className="space-y-3 mb-8 w-full max-w-xs">
          {["Priority Scheduling", "Fixed Monthly Dates", "Premium Protectants Included"].map((f) => (
            <li key={f} className="flex items-center justify-center gap-2 text-xs text-zinc-300">
              <CheckCircle size={13} className="text-[#D4AF37] shrink-0" />{f}
            </li>
          ))}
        </ul>
        {inclusions.length > 0 && (
          <details open={open} className="mb-8 w-full">
            <summary className="list-none flex items-center justify-center gap-3 border-t border-white/5 pt-4 cursor-pointer text-xs font-bold text-zinc-500 hover:text-[#D4AF37] transition-colors"
              onClick={(e) => { e.preventDefault(); setOpen((p) => !p); }}>
              Full Inclusions
              <ChevronDown size={13} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </summary>
            <ul className="mt-4 space-y-2 max-w-xs mx-auto">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[11px] text-zinc-400 text-left">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </details>
        )}
        <button type="button" onClick={onBook}
          className="btn-primary-gold-shimmer mt-auto w-full py-4 rounded-xl bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] font-black hover:text-black hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-500 overflow-hidden active:scale-[0.98]">
          <span className="relative z-[1]">Join The Club</span>
        </button>
      </div>
    </div>
  );
}
