"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, Crown, CheckCircle, Leaf, ShieldCheck,
  BadgeCheck, Star, Phone, ArrowRight, Car, Gem, AlertTriangle,
  Sofa, Droplets, Zap,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";
import { SiteHeader } from "./SiteHeader";
import { BuildYourPackage } from "./BuildYourPackage";
import { getServiceDisplayName } from "@/lib/serviceDisplay";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(
  () => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })),
  { ssr: false }
);

const DETAIL_ORDER = ["Interior Detail", "Full Detail", "Exterior Detail"];

// What's unique per service — Basic Interior + Exterior just references the others
const CORE_FEATURES: Record<string, { icon: React.ElementType; items: string[] }> = {
  "Interior Detail": {
    icon: Sofa,
    items: [
      "Full vacuum — every surface, crack & crevice",
      "Wipe-down & protection of all plastics & leather",
      "Floor mats & carpet cleaning",
      "Interior glass cleaned & protected",
    ],
  },
  "Exterior Detail": {
    icon: Droplets,
    items: [
      "Full hand wash & foam bath",
      "Deep clean wheel wells, rims & tires",
      "3-Month Ceramic Sealant protection",
    ],
  },
  "Full Detail": {
    icon: Zap,
    items: [], // handled separately — shows "Interior + Exterior combined"
  },
};

const ULTIMATE_CARDS = [
  {
    name: "Ultimate Interior Reset",
    tagline: "The deep clean your interior deserves.",
    priceLow: 240,
    priceHigh: 270,
    badge: "Best for Families",
    badgeIcon: Star,
    features: [
      "Everything in Basic Interior + Exterior",
      "Hot water extraction & shampooing (carpets & seats)",
      "High-pressure steam sanitation (vents, cup holders, crevices)",
      "Vermont road salt & calcium neutralization",
      "6-Month Ceramic Sealant upgrade",
    ],
    isFlagship: false,
  },
  {
    name: "Ultimate Interior + Exterior Reset",
    tagline: "Showroom condition — every surface, inside and out.",
    priceLow: 350,
    priceHigh: 400,
    badge: "Flagship Service",
    badgeIcon: Gem,
    features: [
      "Everything in Ultimate Interior Reset",
      "Full exterior decontamination & clay bar treatment",
      "Iron & fallout decontamination (paint prep)",
      "6-Month Ceramic Spray Coating",
      "All trim, rubber & glass dressing",
      "Exhaust tips & wheel barrels deep cleaned",
    ],
    isFlagship: true,
  },
] as const;

const sv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const vp = { once: true, margin: "-80px" };

export function DetailingPage({ services }: { services: Service[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  // Persist booking-open + builder-prefill across page reloads so customers
  // who refresh mid-checkout land back where they were. Read sync on first
  // render so the BookingSection renders on the first paint, not after.
  const HANDOFF_KEY = "buildYourPackageHandoff";
  const initialHandoff = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const [bookingOpen, setBookingOpen] = useState<boolean>(!!initialHandoff?.bookingOpen);
  const [selectedService, setSelectedService] = useState<Service | null>(() => {
    if (initialHandoff?.serviceName) {
      return services.find(s => s.name === initialHandoff.serviceName) ?? null;
    }
    return null;
  });
  const [builderPrefill, setBuilderPrefill] = useState<{
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    vehicleSize: VehicleSizeSlug;
    addonIds: string[];
    additionalVehicles?: Array<{
      serviceName: string;
      vehicleSize: VehicleSizeSlug;
      vehicleMake: string;
      vehicleModel: string;
      vehicleYear: string;
      addons: { id: string; label: string; price: number }[];
    }>;
  } | null>(initialHandoff?.builderPrefill ?? null);

  // Save handoff state to sessionStorage on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (bookingOpen && builderPrefill) {
        sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({
          bookingOpen,
          builderPrefill,
          serviceName: selectedService?.name ?? null,
        }));
      } else {
        sessionStorage.removeItem(HANDOFF_KEY);
      }
    } catch {}
  }, [bookingOpen, builderPrefill, selectedService]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);

  useEffect(() => {
    setMounted(true);
    if (searchParams.get("book") === "1") setBookingOpen(true);
  }, [searchParams]);

  const orderedServices = useMemo(() =>
    [...services].sort((a, b) => {
      const ai = DETAIL_ORDER.indexOf(a.name);
      const bi = DETAIL_ORDER.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }), [services]);

  const openBooking = useCallback((service?: Service) => {
    setSelectedService(service ?? null);
    setBookingOpen(true);
    setTimeout(() => document.getElementById("booking-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);

  const openUltimateBooking = useCallback((cardName: string) => {
    const svc = services.find(s => s.name === cardName) ?? null;
    setSelectedService(svc);
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
      {/* Grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader onBookNow={() => openBooking()} />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-14 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.14) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <MapPin size={10} className="shrink-0" />Vermont Mobile Detailing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-4"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Mobile Car Detailing<br />in Vermont
          </h1>
          <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-8 max-w-xl mx-auto">
            We come to your home, office, or anywhere in Vermont — premium results, no shop visit needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <button onClick={() => openBooking()}
              className="btn-primary-gold-shimmer h-12 px-8 rounded-xl font-semibold tracking-wide w-full sm:w-auto min-w-[190px] bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Book Your Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={14} />802-585-5563
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
            {[
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Leaf,        label: "Eco-Friendly" },
              { icon: BadgeCheck,  label: "Satisfaction Guaranteed" },
              { icon: Star,        label: "5★ Rated" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon size={12} className="text-[#D4AF37]" />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Build Your Package (replaces the old 3-card Core Packages grid) ──── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <BuildYourPackage
          services={services}
          onContinueToBooking={({ serviceName, addonIds, vehicleSize, vehicleMake, vehicleModel, vehicleYear, additionalVehicles }) => {
            const svc = services.find(s => s.name === serviceName) ?? null;
            setSelectedService(svc);
            setBuilderPrefill({ vehicleMake, vehicleModel, vehicleYear, vehicleSize, addonIds, additionalVehicles });
            setBookingOpen(true);
            setTimeout(() => document.getElementById("booking-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          }}
        />
      </motion.section>

      {/* ── Legacy core-package grid (hidden — superseded by Build Your Package) */}
      {false && (
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="hidden py-12 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">Standard Cleaning</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Core Packages</h2>
            <p className="text-zinc-500 mt-1.5 text-sm max-w-lg mx-auto">
              A thorough professional clean — vacuum, wipe-down, wash, and protect. Perfect for regular maintenance and keeping your vehicle looking its best day-to-day.
            </p>
          </div>

          {orderedServices.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <Car size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Services loading — check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {orderedServices.filter(s => DETAIL_ORDER.includes(s.name)).map((service) => {
                const isPopular = service.name === "Full Detail";
                const meta = CORE_FEATURES[service.name];
                const Icon = meta?.icon ?? Sparkles;
                return (
                  <div key={service.id}
                    className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isPopular
                        ? "border border-[#D4AF37]/40 shadow-[0_0_32px_rgba(212,175,55,0.08)] bg-zinc-900/70"
                        : "border border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/20"
                    }`}>
                    {isPopular && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />}

                    <div className="p-5 flex flex-col flex-1 text-center">
                      {/* Header */}
                      <div className="flex flex-col items-center mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isPopular ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20" : "bg-white/[0.04] border border-white/[0.06]"}`}>
                          <Icon size={17} className={isPopular ? "text-[#D4AF37]" : "text-zinc-400"} strokeWidth={1.5} />
                        </div>
                        {isPopular && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <Crown size={10} className="text-[#D4AF37]" />
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Most Popular</span>
                          </div>
                        )}
                        <h3 className="text-lg font-black text-white tracking-tight">{getServiceDisplayName(service.name)}</h3>
                        {service.description && (
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{service.description}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className={`flex rounded-xl mb-4 overflow-hidden border text-center ${isPopular ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
                        <div className="flex-1 py-3 bg-white/[0.02]">
                          <div className="text-xl font-black text-white">${service.price_small}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Normal</div>
                        </div>
                        <div className="w-px bg-white/[0.05]" />
                        <div className={`flex-1 py-3 ${isPopular ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                          <div className={`text-xl font-black ${isPopular ? "text-[#D4AF37]" : "text-zinc-200"}`}>${service.price_large}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Large / 3-Row</div>
                        </div>
                      </div>

                      {/* Inclusions */}
                      <div className="mb-5 flex-1">
                        {service.name === "Full Detail" ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#D4AF37]/[0.05] border border-[#D4AF37]/15">
                              <Sofa size={12} className="text-[#D4AF37] shrink-0" />
                              <span className="text-xs text-zinc-300 font-medium">Full Interior Detail</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#D4AF37]/[0.05] border border-[#D4AF37]/15">
                              <Droplets size={12} className="text-[#D4AF37] shrink-0" />
                              <span className="text-xs text-zinc-300 font-medium">Full Exterior Detail</span>
                            </div>
                            <p className="text-[10px] text-zinc-600">Both services in one visit — best value.</p>
                          </div>
                        ) : (
                          <ul className="space-y-1.5 inline-block text-left">
                            {(meta?.items ?? []).map((item) => (
                              <li key={item} className="flex items-start gap-2 text-xs text-zinc-400 leading-snug">
                                <CheckCircle size={11} className={`shrink-0 mt-0.5 ${isPopular ? "text-[#D4AF37]" : "text-zinc-500"}`} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <button onClick={() => openBooking(service)}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-200 active:scale-[0.97] ${
                          isPopular
                            ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                            : "bg-zinc-900 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/[0.07]"
                        }`}>
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>
      )}

      {/* ── Ultimate Series (HIDDEN — superseded by Build Your Package) ──────── */}
      {false && (
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="hidden py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">A Level Above</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Ultimate Series</h2>
            <p className="text-zinc-400 mt-2 text-sm max-w-xl mx-auto leading-relaxed">
              Beyond clean — <span className="text-white font-semibold">restored</span>. Where a core package removes surface dirt, the Ultimate Series goes deep: hot water extraction, steam sanitation, decontamination, and a long-term ceramic seal that protects your paint for months.
              If your vehicle has road salt buildup, stained seats, or just hasn&apos;t had a proper deep clean in years — this is what it needs.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {["Post-winter refresh", "Pre-sale prep", "Years of buildup", "Stained seats or carpets", "High-traffic vehicles"].map(tag => (
                <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] text-[#D4AF37]">{tag}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {ULTIMATE_CARDS.map((card) => {
              const BadgeIcon = card.badgeIcon;
              return (
                <div key={card.name}
                  className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                    card.isFlagship
                      ? "border border-[#D4AF37]/50 shadow-[0_0_40px_rgba(212,175,55,0.12)] bg-zinc-900/70"
                      : "border border-white/[0.08] bg-zinc-900/50 hover:border-[#D4AF37]/25"
                  }`}>
                  <div className={`h-[2px] w-full shrink-0 ${card.isFlagship ? "bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40" : "bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"}`} />

                  <div className="p-5 flex flex-col flex-1 text-center">
                    {/* Header */}
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-1.5 mb-1.5">
                        <BadgeIcon size={10} className="text-[#D4AF37]" fill={card.isFlagship ? "currentColor" : "none"} />
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">{card.badge}</span>
                      </div>
                      <h3 className="text-lg font-black text-white tracking-tight leading-snug">{card.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{card.tagline}</p>
                    </div>

                    {/* Price */}
                    <div className={`rounded-xl mb-4 py-3 text-center border ${card.isFlagship ? "border-[#D4AF37]/20 bg-[#D4AF37]/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className={`text-2xl font-black tabular-nums ${card.isFlagship ? "text-[#D4AF37]" : "text-white"}`}>${card.priceLow}–${card.priceHigh}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Range — Varies by Size</div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5 flex-1 inline-block text-left w-full">
                      {card.features.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-zinc-300 leading-snug">
                          <span className={`mt-[3px] w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${card.isFlagship ? "bg-[#D4AF37]/15 border border-[#D4AF37]/30" : "bg-white/[0.06] border border-white/[0.1]"}`}>
                            <span className={`w-1 h-1 rounded-full ${card.isFlagship ? "bg-[#D4AF37]" : "bg-zinc-400"}`} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>

                    <button onClick={() => openUltimateBooking(card.name)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] ${
                        card.isFlagship
                          ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
                          : "bg-zinc-900 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/[0.07]"
                      }`}>
                      Book This Service
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <AlertTriangle size={12} className="text-amber-500/60 shrink-0" />
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Vehicles with extreme mold, biohazards, or excessive pet hair may incur a $50–$100 surcharge.
            </p>
          </div>
        </div>
      </motion.section>
      )}

      {/* ── Why Us ───────────────────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-black text-white mb-5">Why Vermont drivers choose us</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: MapPin,      title: "We Come to You",          desc: "Home, office, or anywhere in Vermont. No drop-off, no wait." },
              { icon: Leaf,        title: "Eco-Friendly Products",    desc: "pH-neutral soaps and ceramic-grade protectants safe for all surfaces." },
              { icon: ShieldCheck, title: "Vermont Salt Ready",       desc: "Our process neutralizes road salt and calcium buildup every season." },
              { icon: BadgeCheck,  title: "Fully Insured",            desc: "Full liability insurance on every visit, every vehicle." },
              { icon: CheckCircle, title: "Satisfaction Guaranteed",  desc: "Not happy? We'll come back and make it right, no questions asked." },
              { icon: Star,        title: "Loyalty Rewards",          desc: "Every detail counts toward your tier — unlock up to 20% off forever." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/[0.05] bg-zinc-900/30 p-4 flex flex-col items-center text-center">
                <Icon size={15} className="text-[#D4AF37] mb-2.5" />
                <h3 className="font-bold text-xs text-white mb-1">{title}</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Booking anchor ───────────────────────────────────────────────────── */}
      <div id="booking-anchor" className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          {/* Step-4 header — shown when the builder hands off so the booking
              section feels like a continuation, not a separate flow */}
          {mounted && bookingOpen && builderPrefill && (
            <div className="text-center mb-5 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="inline-flex items-center justify-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-black">4</span>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-300">Schedule & Pay</p>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white">Pick a date, time, and how you want to pay.</h3>
              <p className="text-[11px] text-zinc-500 mt-1">Your build is locked in — Pay at Arrival or Pay Now after you choose a slot.</p>
            </div>
          )}
          {mounted && bookingOpen && (builderPrefill || selectedService?.name?.toLowerCase().includes("paint")) && (
            <BookingSection
              isVisible={true}
              onClose={() => { setBookingOpen(false); setBuilderPrefill(null); }}
              selectedService={selectedService}
              services={services}
              onSelectService={setSelectedService}
              onBookingSuccess={handleSuccess}
              initialLoyaltyDiscountPct={null}
              initialDraft={null}
              onDraftRestored={() => {}}
              prefilledVehicle={builderPrefill ? {
                make: builderPrefill.vehicleMake,
                model: builderPrefill.vehicleModel,
                size: builderPrefill.vehicleSize,
                year: builderPrefill.vehicleYear,
              } : null}
              prefilledAddonIds={builderPrefill?.addonIds ?? null}
              prefilledAdditionalVehicles={builderPrefill?.additionalVehicles ?? null}
            />
          )}
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.06) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-xl md:text-2xl font-black text-white mb-2">Looking for more?</h2>
          <p className="text-zinc-500 text-sm mb-6">Boat detailing, RV detailing, or a monthly maintenance plan — we do it all.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/protected" className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.07] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/35 hover:text-white transition-all text-sm font-semibold">
              Monthly Plans <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine Detailing · Mobile Detailing · Vermont</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</Link>
        </div>
      </footer>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => { setShowSuccess(false); setSuccessData(null); }}
        data={successData}
      />
    </div>
  );
}

