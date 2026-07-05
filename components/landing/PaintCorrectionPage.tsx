"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, Gem, CheckCircle, ShieldCheck,
  BadgeCheck, Star, Phone, AlertTriangle, Droplets,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import type { BookingSuccessData } from "./BookingModal";
import { SiteHeader } from "./SiteHeader";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(
  () => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })),
  { ssr: false }
);

const PC_CARDS = [
  {
    name: "Paint Correction — 1 Step",
    tagline: "Removes 60–75% of light swirls, oxidation, and water spots.",
    priceLow: 449,
    priceHigh: 599,
    badge: "Best for Daily Drivers",
    features: [
      "Single-pass machine polish",
      "Clay bar decontamination",
      "Full hand wash + wheels/tires/trim",
      "Included: 1–3 month ceramic spray sealant",
      "Optional Premium Ceramic add-ons (per-section or full body)",
    ],
    isFlagship: false,
  },
  {
    name: "Paint Correction — 2 Step",
    tagline: "Removes 85–95% of correctable defects — deeper scratches, heavy swirls.",
    priceLow: 675,
    priceHigh: 875,
    badge: "Flagship",
    features: [
      "Two-stage compound + finishing polish",
      "Deep clay bar + iron decontamination",
      "Full hand wash + wheels/tires/trim",
      "Included: 1–3 month ceramic spray sealant",
      "Optional Premium Ceramic add-ons (per-section or full body)",
    ],
    isFlagship: true,
  },
] as const;

const sv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const vp = { once: true, margin: "-80px" };

export function PaintCorrectionPage({
  services,
  allServices,
}: {
  services: Service[];
  allServices: Service[];
  /** Reserved for admin add-on price overrides — plumbed through the DataProvider. */
  addonOverrides?: unknown;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);

  useEffect(() => {
    setMounted(true);
    if (searchParams.get("book") === "1") setBookingOpen(true);
  }, [searchParams]);

  const openBooking = useCallback((serviceName: string) => {
    const svc = services.find(s => s.name === serviceName) ?? null;
    setSelectedService(svc);
    setBookingOpen(true);
    setTimeout(() => document.getElementById("booking-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [services]);

  const handleSuccess = useCallback((data: BookingSuccessData) => {
    setBookingOpen(false);
    setSuccessData(data as unknown as SuccessModalData);
    setShowSuccess(true);
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <SiteHeader onBookNow={() => openBooking("Paint Correction — 1 Step")} />

      {/* Hero */}
      <section className="relative pt-36 pb-14 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.14) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <MapPin size={10} className="shrink-0" />Vermont Paint Correction
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-4"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Paint Correction<br />+ Premium Ceramic
          </h1>
          <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-8 max-w-xl mx-auto">
            Real machine polishing to restore your paint — set prices, no quotes. Add Premium Ceramic section-by-section, or grab the full body bundle for best value.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <button onClick={() => openBooking("Paint Correction — 1 Step")}
              className="h-12 px-8 rounded-xl font-semibold tracking-wide w-full sm:w-auto min-w-[190px] bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Book Now</span>
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={14} />802-585-5563
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
            {[
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: BadgeCheck,  label: "Set Pricing" },
              { icon: Star,        label: "5★ Rated" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon size={12} className="text-[#D4AF37]" />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Paint Correction Cards */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">Machine Polish</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Paint Correction Packages</h2>
            <p className="text-zinc-500 mt-1.5 text-sm max-w-lg mx-auto">
              Real machine polishing — not just a wax. Priced under Vermont market, transparent by vehicle size.
            </p>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <Sparkles size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Paint correction services loading — check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {PC_CARDS.map((card) => {
                const svc = services.find(s => s.name === card.name);
                if (!svc) return null;
                return (
                  <div key={card.name}
                    className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      card.isFlagship
                        ? "border border-[#D4AF37]/50 shadow-[0_0_32px_rgba(212,175,55,0.08)] bg-zinc-900/70"
                        : "border border-white/[0.08] bg-zinc-900/50 hover:border-[#D4AF37]/25"
                    }`}>
                    <div className={`h-[2px] w-full shrink-0 ${card.isFlagship ? "bg-gradient-to-r from-[#D4AF37]/40 via-[#D4AF37] to-[#D4AF37]/40" : "bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"}`} />

                    <div className="p-5 flex flex-col flex-1 text-center">
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Gem size={10} className="text-[#D4AF37]" fill={card.isFlagship ? "currentColor" : "none"} />
                          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">{card.badge}</span>
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight leading-snug">{card.name}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{card.tagline}</p>
                      </div>

                      <div className={`flex rounded-xl mb-4 overflow-hidden border text-center ${card.isFlagship ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
                        <div className="flex-1 py-3 bg-white/[0.02]">
                          <div className="text-xl font-black text-white">${svc.price_small}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Sedan</div>
                        </div>
                        <div className="w-px bg-white/[0.05]" />
                        <div className="flex-1 py-3 bg-white/[0.02]">
                          <div className="text-xl font-black text-white">${svc.price_large}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">SUV / Truck</div>
                        </div>
                        <div className="w-px bg-white/[0.05]" />
                        <div className={`flex-1 py-3 ${card.isFlagship ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                          <div className={`text-xl font-black ${card.isFlagship ? "text-[#D4AF37]" : "text-zinc-200"}`}>${svc.price_extra_large}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">3-Row / Van</div>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-5 flex-1 inline-block text-left w-full">
                        {card.features.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-zinc-300 leading-snug">
                            <CheckCircle size={11} className={`shrink-0 mt-0.5 ${card.isFlagship ? "text-[#D4AF37]" : "text-zinc-500"}`} />
                            {item}
                          </li>
                        ))}
                      </ul>

                      <button onClick={() => openBooking(card.name)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] ${
                          card.isFlagship
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

      {/* Premium Ceramic explainer */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-1">Section-by-Section</p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-4">Premium Ceramic — Add What You Want</h2>
          <p className="text-zinc-500 text-sm mb-6 max-w-xl mx-auto leading-relaxed">
            Real 2-year professional ceramic coating — pick the sections you want protected, or grab the full body bundle for best value. Prices scale with volume: the more sections you add, the bigger the discount.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left mb-6">
            {[
              { label: "Hood", price: "$85" },
              { label: "Roof", price: "$75" },
              { label: "Trunk", price: "$60" },
              { label: "Front Bumper", price: "$65" },
              { label: "Rear Bumper", price: "$65" },
              { label: "All Doors", price: "$110" },
              { label: "All Fenders", price: "$75" },
              { label: "Mirrors", price: "$30" },
              { label: "Wheels + Calipers", price: "$150" },
              { label: "Windshield", price: "$95" },
              { label: "Side + Rear Glass", price: "$175" },
              { label: "Full Glass", price: "$250" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/[0.06] bg-zinc-900/40 p-3 flex items-center justify-between">
                <span className="text-xs text-zinc-300">{s.label}</span>
                <span className="text-xs font-black text-[#D4AF37]">{s.price}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.05] p-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Droplets size={14} className="text-[#D4AF37]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Best Value</span>
            </div>
            <h3 className="text-lg font-black text-white mb-1">Full Body Bundle</h3>
            <div className="flex justify-center gap-4 text-sm text-zinc-300 mb-3">
              <span>Sedan <span className="text-[#D4AF37] font-black">$650</span></span>
              <span>SUV <span className="text-[#D4AF37] font-black">$775</span></span>
              <span>3-Row <span className="text-[#D4AF37] font-black">$895</span></span>
            </div>
            <p className="text-[11px] text-zinc-500">Every body panel coated in one flat price. Skip the section picker — get it all.</p>
          </div>
          <div className="mt-4 text-[11px] text-zinc-500 leading-relaxed">
            <span className="font-semibold text-zinc-400">Volume discount:</span>{" "}
            2 sections = 5% off · 3 = 10% · 4 = 15% · 5+ = 20% off each
          </div>
        </div>
      </motion.section>

      {/* Booking anchor */}
      <div id="booking-anchor" className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          {mounted && bookingOpen && (
            <BookingSection
              isVisible={true}
              onClose={() => setBookingOpen(false)}
              selectedService={selectedService}
              services={allServices}
              onSelectService={setSelectedService}
              onBookingSuccess={handleSuccess}
              initialLoyaltyDiscountPct={null}
              initialDraft={null}
              onDraftRestored={() => {}}
            />
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto pb-10 px-4 flex items-start gap-2">
        <AlertTriangle size={12} className="text-amber-500/60 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Paint correction results depend on paint condition. We inspect on-site before starting — if a deeper defect is found, we&apos;ll tell you what we recommend and only proceed with your OK.
        </p>
      </div>

      <SuccessModal isOpen={showSuccess && !!successData} data={successData} onClose={() => setShowSuccess(false)} />

    </div>
  );
}
