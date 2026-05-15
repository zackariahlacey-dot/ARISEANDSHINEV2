"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, Layers, ShieldCheck, AlertTriangle,
  CheckCircle, ArrowRight, Phone, Clock, Plus, Sofa, Gem,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import { SiteHeader } from "./SiteHeader";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(() => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })), { ssr: false });

// Paint Correction (Ultimate Exterior + 1-Step / 2-Step) — synced with DB & lib/constants.ts
const PAINT_CORRECTION_SIZES = [
  { id: "compact" as const, label: "Small Car",          desc: "Compacts, sedans, coupes" },
  { id: "sedan"   as const, label: "Mid Size",           desc: "Mid sedans, 2-row SUVs" },
  { id: "suv"     as const, label: "Large SUV / Truck",  desc: "3-row SUVs, trucks, passenger vans" },
  { id: "xl"      as const, label: "Sprinter / Work Van",desc: "Sprinter, Transit, ProMaster, Express" },
];

type PaintSizeId = typeof PAINT_CORRECTION_SIZES[number]["id"];

const PAINT_CORRECTION_CARDS = [
  {
    serviceName: "Ultimate Exterior + 1-Step Paint Correction",
    short: "1-Step Paint Correction",
    badge: "Single Stage",
    badgeIcon: Layers,
    tagline: "Removes 60–75% of light defects — swirls, oxidation, water spots.",
    bestFor: "Newer cars or well-maintained paint",
    isFlagship: false,
    prices:    { compact: 350, sedan: 425, suv: 500, xl: 675 } satisfies Record<PaintSizeId, number>,
    hoursLow:  { compact: 3.5, sedan: 4.5, suv: 5.5, xl: 6.5 } satisfies Record<PaintSizeId, number>,
    hoursHigh: { compact: 4.5, sedan: 5.5, suv: 6.5, xl: 8.0 } satisfies Record<PaintSizeId, number>,
    process: [
      "Full hand wash & dry decontamination",
      "Clay bar & iron removal prep",
      "Single-pass machine polish with finishing foam pad",
      "6-month ceramic spray sealant applied",
    ],
  },
  {
    serviceName: "Ultimate Exterior + 2-Step Paint Correction",
    short: "2-Step Paint Correction",
    badge: "Flagship — Two Stage",
    badgeIcon: Gem,
    tagline: "Removes 85–95% of correctable defects — deeper scratches, heavy swirls.",
    bestFor: "Dark colors or older paint with swirls & scratches",
    isFlagship: true,
    prices:    { compact: 550, sedan: 650, suv: 800,  xl: 950  } satisfies Record<PaintSizeId, number>,
    hoursLow:  { compact: 6.5, sedan: 7.5, suv: 9.0,  xl: 11.0 } satisfies Record<PaintSizeId, number>,
    hoursHigh: { compact: 8.0, sedan: 9.0, suv: 11.0, xl: 13.0 } satisfies Record<PaintSizeId, number>,
    process: [
      "Full hand wash & dry decontamination",
      "Clay bar & iron removal prep",
      "Step 1: heavy compounding — levels deep defects",
      "Step 2: finishing polish — removes haze, maximizes clarity",
      "6-month ceramic spray sealant applied",
    ],
  },
] as const;

const ULTIMATE_EXTERIOR_INCLUDES = [
  "Hand wash & dry",
  "Clay bar treatment",
  "Glass & windows cleaned",
  "Wheel wells, rims & tires",
  "Plastic trim restoration",
];

const CERAMIC_3YR_PRICES: Record<PaintSizeId, number> = {
  compact: 250, sedan: 300, suv: 350, xl: 400,
};

const FAQ_ITEMS = [
  { q: "Do you need a garage or shade?", a: "For best results, yes. Paint correction requires a stable, temperature-controlled environment. We'll confirm site conditions before scheduling." },
  { q: "How long does paint correction take?", a: "1-Step typically takes 3.5–8 hours depending on vehicle size. 2-Step runs 6.5–13+ hours — large vehicles and work vans may require a 2-day appointment." },
  { q: "Will it remove all scratches?", a: "We correct swirl marks, haze, and light-to-medium scratches in the clear coat. Deep scratches that go through to the primer or metal cannot be polished out." },
  { q: "What's included beyond the polish?", a: "Both packages include the full Ultimate Exterior detail — hand wash & dry, clay bar, glass, wheel wells, tires, plastic trim restoration, and a 6-month ceramic spray sealant. The 2-year professional ceramic sealant upgrade is optional." },
  { q: "Can I add an interior detail?", a: "Yes — the Ultimate Interior add-on is a flat $175 and adds about 3 hours to the appointment. For work vans we also offer cargo space cleaning ($100 light/moderate, $150 heavy)." },
];

const sv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const vp = { once: true, margin: "-80px" };

export function PaintCorrectionPage({ services }: { services: Service[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [size, setSize] = useState<PaintSizeId>("compact");
  const [authLoyaltyDiscountPct] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const openBooking = useCallback((serviceName?: string) => {
    if (serviceName) {
      const svc = services.find(s => s.name === serviceName) ?? null;
      setSelectedService(svc);
    } else {
      setSelectedService(null);
    }
    setBookingOpen(true);
    setTimeout(() => document.getElementById("booking-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [services]);

  const handleSuccess = useCallback((data: SuccessModalData) => {
    setBookingOpen(false);
    setSuccessData(data);
    setShowSuccess(true);
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />
      <SiteHeader onBookNow={openBooking} />

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.14) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <MapPin size={10} />Precision Refinishing · Vermont
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5" style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Paint Correction<br />&amp; Restoration
          </h1>
          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-8 max-w-2xl mx-auto">
            Machine polishing to remove swirl marks, oxidation, light scratches and haze — revealing your paint&apos;s true depth and clarity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button onClick={() => openBooking()} className="btn-primary-gold-shimmer h-12 px-8 rounded-xl font-semibold tracking-wide w-full sm:w-auto min-w-[200px] bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Get a Quote</span>
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>
        </div>
      </section>

      {/* ── Level cards (4-tier pricing) ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Choose Your Level</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 1px 16px rgba(212,175,55,0.18))" }}>
              Ultimate Paint Correction
            </h2>
            <p className="text-zinc-500 mt-3 text-sm max-w-xl mx-auto leading-relaxed">
              Both packages include the full Ultimate Exterior detail and a 6-month ceramic spray. Pick a vehicle size to see your price and time on site.
            </p>
          </div>

          {/* Shared 4-tier size pills */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex flex-wrap justify-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/70 border border-white/[0.07] backdrop-blur-sm">
              {PAINT_CORRECTION_SIZES.map((s) => {
                const active = s.id === size;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSize(s.id)}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_2px_14px_rgba(212,175,55,0.35)]"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PAINT_CORRECTION_CARDS.map((card) => {
              const BadgeIcon = card.badgeIcon;
              const price = card.prices[size];
              const hoursLow = card.hoursLow[size];
              const hoursHigh = card.hoursHigh[size];
              return (
                <div key={card.serviceName}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                    card.isFlagship
                      ? "border border-[#D4AF37]/55 shadow-[0_0_50px_rgba(212,175,55,0.14)] bg-gradient-to-b from-zinc-900/85 to-zinc-950/70"
                      : "border border-white/[0.08] bg-zinc-900/55 hover:border-[#D4AF37]/30"
                  }`}
                >
                  <div className={`h-[2px] w-full shrink-0 ${card.isFlagship
                    ? "bg-gradient-to-r from-[#D4AF37]/45 via-[#F3E5AB] to-[#D4AF37]/45"
                    : "bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent"}`}
                  />

                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    {/* Badge + name */}
                    <div className="mb-5 text-center">
                      <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-white/[0.06]">
                        <BadgeIcon size={10} className="text-[#D4AF37]" fill={card.isFlagship ? "currentColor" : "none"} />
                        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">{card.badge}</span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">{card.short}</h3>
                      <p className="text-[12px] text-zinc-500 mt-1.5 leading-snug">{card.tagline}</p>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/60 border border-white/[0.06] text-[11px] text-zinc-400">
                        <CheckCircle size={11} className="text-[#D4AF37]" />Best for: {card.bestFor}
                      </div>
                    </div>

                    {/* Animated price + time */}
                    <div className={`relative rounded-xl mb-5 px-4 py-4 border ${
                      card.isFlagship ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.05]" : "border-white/[0.07] bg-white/[0.02]"
                    }`}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-0.5">Your price</div>
                          <motion.div
                            key={`price-${card.serviceName}-${size}`}
                            initial={{ opacity: 0.5, y: -3 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className={`text-3xl font-black tabular-nums ${card.isFlagship ? "text-[#D4AF37]" : "text-white"}`}
                          >
                            ${price}
                          </motion.div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-0.5 flex items-center gap-1 justify-end">
                            <Clock size={9} className="text-zinc-500" /> On site
                          </div>
                          <motion.div
                            key={`hours-${card.serviceName}-${size}`}
                            initial={{ opacity: 0.5, y: -3 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className="text-lg font-black tabular-nums text-zinc-200"
                          >
                            {hoursLow}–{hoursHigh} hrs
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Process */}
                    <div className="mb-4 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-2.5">Process</p>
                      <ul className="space-y-2">
                        {card.process.map((step) => (
                          <li key={step} className="flex items-start gap-2.5 text-[13px] text-zinc-300 leading-snug">
                            <span className="mt-[3px] w-3 h-3 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0"><span className="w-1 h-1 rounded-full bg-[#D4AF37]" /></span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Includes Ultimate Exterior */}
                    <div className="mb-4 rounded-xl px-3.5 py-3 bg-zinc-800/40 border border-white/[0.05]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-2 text-center">Includes Ultimate Exterior</p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {ULTIMATE_EXTERIOR_INCLUDES.map((item) => (
                          <span key={item} className="text-[10px] text-zinc-300 px-2 py-0.5 rounded-full bg-zinc-900/60 border border-white/[0.05]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Defect reduction */}
                    <div className={`mb-5 flex items-center gap-2 rounded-xl px-4 py-3 border ${
                      card.isFlagship ? "bg-[#D4AF37]/[0.07] border-[#D4AF37]/20" : "bg-white/[0.03] border-white/[0.06]"
                    }`}>
                      <ShieldCheck size={14} className={card.isFlagship ? "text-[#D4AF37]" : "text-zinc-500"} />
                      <span className={`text-xs font-semibold ${card.isFlagship ? "text-[#D4AF37]" : "text-zinc-400"}`}>
                        {card.isFlagship ? "Removes 85–95% of defects · 6-month ceramic spray" : "Removes 60–75% of defects · 6-month ceramic spray"}
                      </span>
                    </div>

                    <button onClick={() => openBooking(card.serviceName)} className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-[0.97] ${card.isFlagship ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)]" : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"}`}>
                      Book {card.short.replace(" Paint Correction", "")} <Sparkles size={13} className="shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add-ons strip */}
          <div className="mt-7 max-w-4xl mx-auto rounded-2xl border border-white/[0.07] bg-zinc-900/40 p-5">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Plus size={12} className="text-[#D4AF37]" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Available Add-ons</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck size={12} className="text-[#D4AF37]" />
                  <h4 className="text-[12px] font-black tracking-wide text-white">2-Year Pro Ceramic Sealant</h4>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                  Upgrade from the included 6-month spray to a professional-grade 2-year ceramic sealant.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#D4AF37] tabular-nums">${CERAMIC_3YR_PRICES[size]}</span>
                  <span className="text-[10px] text-zinc-500">{PAINT_CORRECTION_SIZES.find(s => s.id === size)?.label}</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sofa size={12} className="text-[#D4AF37]" />
                  <h4 className="text-[12px] font-black tracking-wide text-white">Ultimate Interior Add-on</h4>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                  Add the full Ultimate Interior service — hot water extraction, steam sanitation, salt neutralization. Adds 3 hrs.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#D4AF37] tabular-nums">$175</span>
                  <span className="text-[10px] text-zinc-500">Flat rate · all sizes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2.5 max-w-2xl mx-auto text-center justify-center">
            <AlertTriangle size={13} className="text-amber-500/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              <span className="font-bold text-zinc-500">Weather Notice:</span> Paint correction requires a stable, shaded environment or garage. We confirm site conditions before scheduling.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── FAQ ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors" aria-expanded={openFaq === i}>
                  <span className="font-semibold text-sm text-zinc-100">{item.q}</span>
                  <Sparkles size={14} className={`text-[#D4AF37] shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-white/[0.05] pt-3">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Booking anchor ── */}
      <div id="booking-anchor" className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          {mounted && bookingOpen && (
            <BookingSection
              isVisible={true}
              onClose={() => setBookingOpen(false)}
              selectedService={selectedService}
              services={services}
              onSelectService={setSelectedService}
              onBookingSuccess={handleSuccess}
              initialLoyaltyDiscountPct={authLoyaltyDiscountPct}
              initialDraft={null}
              onDraftRestored={() => {}}
            />
          )}
        </div>
      </div>

      {/* ── Cross-links ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-zinc-500 text-sm mb-6">Also looking for standard detailing or a monthly plan?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold">
              Auto Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="/protected" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold">
              Monthly Plans <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine VT · Paint Correction · Vermont</span>
          <a href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</a>
        </div>
      </footer>

      <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); setSuccessData(null); }} data={successData} />
    </div>
  );
}
