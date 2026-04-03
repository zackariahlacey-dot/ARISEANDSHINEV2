"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, Crown, CheckCircle, Star, Leaf, ShieldCheck,
  BadgeCheck, Phone, ArrowRight, Car, Gem, AlertTriangle,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import { SiteHeader } from "./SiteHeader";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(() => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })), { ssr: false });

const DETAIL_ORDER = ["Interior Detail", "Full Detail", "Exterior Detail"];
const EXTERIOR_ITEMS = [
  "Full handwash and foam bath",
  "Deep clean wheel wells, rims, and tires",
  "3-Month Ceramic Sealant protection",
];
const INTERIOR_ITEMS = [
  "Full wipe-down & vacuum of every surface, crack and crevice",
  "Clean and protect plastics and leathers",
  "Floor mats & carpet cleaning",
  "Interior glass cleaned and protected",
];
const INCLUSIONS: Record<string, string[]> = {
  "Exterior Detail": EXTERIOR_ITEMS,
  "Interior Detail": INTERIOR_ITEMS,
  "Full Detail": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS],
};

const ULTIMATE_CARDS = [
  {
    name: "Ultimate Interior Reset",
    tagline: "The deep interior clean your vehicle deserves.",
    priceNormal: 250,
    priceLarge: 250,
    pointsNormal: 275,
    pointsLarge: 275,
    badge: { label: "Best for Families", icon: "star" as const },
    features: [
      "Everything in Full Detail",
      "Hot Water Extraction & Shampooing (Carpets & Seats)",
      "High-Pressure Steam Sanitation (Vents, Cup Holders, Crevices)",
      "Vermont Road Salt & Calcium Neutralization",
      "Engine Bay Deep Clean & Dressing (Add-On Available)",
      "6-Month Ceramic Sealant Upgrade",
    ],
    isFlagship: false,
  },
  {
    name: "Ultimate Interior + Exterior Reset",
    tagline: "Showroom quality — every surface, inside and out. No polishing required.",
    priceNormal: 325,
    priceLarge: 325,
    pointsNormal: 360,
    pointsLarge: 360,
    badge: { label: "Flagship Service", icon: "gem" as const },
    features: [
      "Everything in Ultimate Interior Reset",
      "Full Exterior Decontamination Wash & Clay Bar Treatment",
      "Iron & Fallout Decontamination (Paint Prep)",
      "Ceramic Sealant Application — 12-Month Protection",
      "All Exterior Trim, Rubber & Glass Dressing",
      "Exhaust Tips & Wheel Barrels Deep Cleaned",
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
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [authRewardPoints] = useState<number | null>(null);
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
    const dbService = services.find(s => s.name === cardName) ?? null;
    setSelectedService(dbService);
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
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader onBookNow={() => openBooking()} />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.14) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <MapPin size={10} className="shrink-0" />Vermont Mobile Detailing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5" style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Mobile Car Detailing<br />in Vermont
          </h1>
          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-8 max-w-2xl mx-auto">
            We come to your home, office, or anywhere in Vermont. Professional results with premium, eco-friendly products — no shop visit needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button onClick={() => openBooking()} className="btn-primary-gold-shimmer h-12 px-8 rounded-xl font-semibold tracking-wide w-full sm:w-auto min-w-[200px] bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Book Your Detail</span>
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-zinc-500">
            {[
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Leaf, label: "Eco-Friendly Products" },
              { icon: BadgeCheck, label: "Satisfaction Guaranteed" },
              { icon: Star, label: "5★ Rated" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon size={13} className="text-[#D4AF37]" />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Cards ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Choose Your Service</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">What We Offer</h2>
            <p className="text-zinc-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">All prices are per visit. Choose the service that fits your vehicle's needs.</p>
          </div>

          {orderedServices.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <Car size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Services loading — check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {orderedServices.map((service) => {
                const isPopular = service.name === "Full Detail";
                const inclusions = INCLUSIONS[service.name] ?? [];
                return (
                  <div key={service.id} className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${isPopular ? "border border-[#D4AF37]/45 shadow-[0_0_40px_rgba(212,175,55,0.1)] bg-zinc-900/70" : "border border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/25"}`}>
                    {isPopular && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />}
                    <div className="p-6 sm:p-7 flex flex-col flex-1">
                      <div className="mb-5">
                        {isPopular && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Crown size={11} className="text-[#D4AF37]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Most Popular</span>
                          </div>
                        )}
                        <h3 className="text-2xl font-black text-white tracking-tight">{service.name}</h3>
                        {service.description && <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{service.description}</p>}
                      </div>

                      {/* Pricing */}
                      <div className={`flex rounded-xl mb-6 overflow-hidden border ${isPopular ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
                        <div className="flex-1 py-4 text-center bg-white/[0.02]">
                          <div className="text-2xl font-black text-white">${service.price_small}</div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Normal</div>
                        </div>
                        <div className="w-px bg-white/[0.06]" />
                        <div className={`flex-1 py-4 text-center ${isPopular ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                          <div className={`text-2xl font-black ${isPopular ? "text-[#D4AF37]" : "text-zinc-200"}`}>${service.price_large}</div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mt-1">Large / 3-Row</div>
                        </div>
                      </div>

                      {/* Inclusions */}
                      {inclusions.length > 0 && (
                        <div className="mb-6 flex-1">
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

                      <button onClick={() => openBooking(service)} className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${isPopular ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)]" : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"}`}>
                        Book This Service <Sparkles size={13} className="shrink-0" />
                      </button>
                      <p className="text-center text-[11px] text-zinc-600 mt-2.5">
                        <Sparkles size={9} className="inline mr-1" />Earn {service.price_small}–{service.price_large} loyalty points
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Ultimate Series ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Premium Collection</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Ultimate Series</h2>
            <p className="text-zinc-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">Our most comprehensive packages — engineered for vehicles that deserve nothing less than perfection.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {ULTIMATE_CARDS.map((card) => (
              <UltimateServiceCard key={card.name} {...card} onBook={() => openUltimateBooking(card.name)} />
            ))}
          </div>

          <div className="mt-8 flex items-start gap-2.5 max-w-xl mx-auto justify-center text-center">
            <AlertTriangle size={13} className="text-amber-500/70 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              <span className="font-bold text-zinc-500">Heavy Soil / Biohazard:</span> Vehicles with extreme mold, biohazards, or excessive pet hair may incur a $50–$100 surcharge.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Why Choose Us ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-black text-white">Why Vermont Drivers Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { title: "We Come to You", desc: "Your home, office, or anywhere in Vermont. No drop-off, no wait." },
              { title: "Premium Products", desc: "Eco-friendly, pH-neutral soaps and ceramic-grade protectants safe for all surfaces." },
              { title: "Vermont Salt Ready", desc: "Our process neutralizes road salt and calcium that builds up every winter." },
              { title: "Fully Insured", desc: "We are fully insured for your peace of mind on every visit." },
              { title: "Satisfaction Guaranteed", desc: "Not happy? We'll come back and make it right, no questions asked." },
              { title: "Loyalty Rewards", desc: "Earn 1 point per $1 spent. Stack them for free details." },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
                <CheckCircle size={18} className="text-[#D4AF37] mb-3" />
                <h3 className="font-bold text-sm text-white mb-1.5">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
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
              initialRewardPoints={authRewardPoints}
              initialDraft={null}
              onDraftRestored={() => {}}
            />
          )}
        </div>
      </div>

      {/* ── Bottom CTA & cross-links ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">Want More?</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Looking for paint restoration or a recurring monthly plan? We do those too.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/paint-correction" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold">
              Paint Correction <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="/maintenance-club" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold">
              Monthly Club <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine VT · Mobile Detailing · Vermont</span>
          <a href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</a>
        </div>
      </footer>

      <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); setSuccessData(null); }} data={successData} />
    </div>
  );
}

function UltimateServiceCard({
  name,
  tagline,
  priceNormal,
  priceLarge,
  pointsNormal,
  pointsLarge,
  badge,
  features,
  onBook,
  isFlagship,
}: {
  name: string;
  tagline: string;
  priceNormal: number;
  priceLarge: number;
  pointsNormal: number;
  pointsLarge: number;
  badge: { label: string; icon: "star" | "gem" };
  features: readonly string[];
  onBook: () => void;
  isFlagship: boolean;
}) {
  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
      isFlagship
        ? "border border-[#D4AF37]/60 shadow-[0_0_50px_rgba(212,175,55,0.2)] bg-zinc-900/70"
        : "border border-white/[0.08] bg-zinc-900/50 hover:border-[#D4AF37]/30"
    }`}>
      <div className={`h-[2px] w-full shrink-0 ${isFlagship ? "bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40" : "bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"}`} />
      <div className="p-6 sm:p-7 flex flex-col flex-1 relative">
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2">
            {badge.icon === "gem" ? <Gem size={11} className="text-[#D4AF37]" /> : <Star size={11} className="text-[#D4AF37]" fill="currentColor" />}
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">{badge.label}</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">{name}</h3>
          <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{tagline}</p>
        </div>

        <div className={`rounded-xl mb-6 overflow-hidden border ${isFlagship ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
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

        <div className="mb-6 flex-1">
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
        <p className="text-center text-[11px] text-zinc-600 mt-2.5">
          <Sparkles size={9} className="inline mr-1" />
          Earn {pointsNormal === pointsLarge ? pointsNormal : `${pointsNormal}–${pointsLarge}`} loyalty points
        </p>
      </div>
    </div>
  );
}
