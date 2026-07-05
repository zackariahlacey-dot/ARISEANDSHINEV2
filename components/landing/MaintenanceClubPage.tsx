"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Crown, Car, CheckCircle, ChevronDown, Shield,
  ShieldCheck, Sparkles, Star, ArrowRight, Phone,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import { SiteHeader } from "./SiteHeader";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(() => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })), { ssr: false });

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
const MAINTENANCE_ITEMS = [
  "Priority scheduling - your spot is locked in",
  "Fixed monthly dates - set it and forget it",
  "Premium ceramic-grade protectants",
  "Discounted rate vs. one-off booking",
];
const SERVICE_INCLUSIONS: Record<string, string[]> = {
  "Interior Monthly Maintenance": [...INTERIOR_ITEMS, ...MAINTENANCE_ITEMS],
  "Full Detail Monthly Maintenance": [...EXTERIOR_ITEMS, ...INTERIOR_ITEMS, ...MAINTENANCE_ITEMS],
};

const HOW_IT_WORKS = [
  { step: "01", title: "Sign Up", desc: "Choose your plan — Interior or Interior + Exterior. No long-term commitment." },
  { step: "02", title: "Initial Deep Clean", desc: "Your first visit includes a one-time Deep Clean & Reset Detail to get your vehicle to our standard." },
  { step: "03", title: "Monthly Service", desc: "We show up every month on your fixed date. You don't have to think about it." },
];

const sv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const vp = { once: true, margin: "-80px" };

export function MaintenanceClubPage({ services }: { services: Service[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [authLoyaltyDiscountPct] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const [openInclusions, setOpenInclusions] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const openBooking = useCallback((service?: Service) => {
    setSelectedService(service ?? null);
    setBookingOpen(true);
    setTimeout(() => document.getElementById("booking-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);

  const handleSuccess = useCallback((data: SuccessModalData) => {
    setBookingOpen(false);
    setSuccessData(data);
    setShowSuccess(true);
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />
      <SiteHeader onBookNow={() => openBooking()} />

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.14) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-6">
            <Crown size={10} />Member Exclusive · Vermont
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5" style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Vermont&apos;s Monthly<br />Detailing Club
          </h1>
          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-8 max-w-2xl mx-auto">
            Lock in a fixed monthly date and keep your vehicle in showroom condition year-round — automatically. Priority scheduling, premium products, always.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button onClick={() => openBooking()} className="btn-primary-gold-shimmer h-12 px-8 rounded-xl font-semibold tracking-wide w-full sm:w-auto min-w-[200px] bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Join the Club</span>
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>
          {/* Setup fee note */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-zinc-900/80 border border-white/5 px-5 py-3 rounded-2xl text-xs text-zinc-400">
            <ShieldCheck size={13} className="text-[#D4AF37]" />
            <span className="text-white font-bold">$75–$100 one-time setup fee</span>
            <span className="text-zinc-700">·</span>
            <span>Includes Deep Clean on first visit</span>
            <span className="text-zinc-700">·</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center p-6 rounded-2xl border border-white/[0.06] bg-zinc-900/40 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-black text-zinc-800 leading-none select-none">{step}</div>
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                  {step === "01" ? <Star size={20} className="text-[#D4AF37]" /> : step === "02" ? <Sparkles size={20} className="text-[#D4AF37]" /> : <CheckCircle size={20} className="text-[#D4AF37]" />}
                </div>
                <h3 className="font-black text-lg text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Plan cards ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#D4AF37]/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Choose Your Plan</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Membership Plans</h2>
            <p className="text-zinc-500 mt-3 text-sm">Limited spots available each month.</p>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <Crown size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Plans loading — check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((plan) => {
                const isFull = plan.name.toLowerCase().includes("full");
                const inclusions = SERVICE_INCLUSIONS[plan.name] ?? [];
                const isOpen = openInclusions === plan.id;
                return (
                  <div key={plan.id} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-[#D4AF37]/20 to-transparent rounded-[1.5rem] blur opacity-40 group-hover:opacity-80 transition duration-500" />
                    <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-7 flex flex-col">
                      {/* Icon + badge */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/5">
                          {isFull ? <Crown className="text-[#D4AF37]" size={22} /> : <Car className="text-[#D4AF37]" size={22} />}
                        </div>
                        <span className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Limited Spots</span>
                      </div>

                      <h3 className="text-xl font-black text-white mb-1 tracking-tight">{plan.name}</h3>
                      <p className="text-zinc-500 text-xs leading-relaxed mb-5">{plan.description}</p>

                      {/* Price */}
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-4xl font-black text-white">${plan.price_small}</span>
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">/ mo</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-6">+ ${isFull ? 100 : 75} one-time setup fee</p>

                      {/* Core features */}
                      <ul className="space-y-2.5 mb-6">
                        {["Priority Scheduling", "Fixed Monthly Dates", "Premium Protectants"].map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                            <CheckCircle size={13} className="text-[#D4AF37] shrink-0" />{f}
                          </li>
                        ))}
                      </ul>

                      {/* Inclusions accordion */}
                      {inclusions.length > 0 && (
                        <div className="mb-6">
                          <button
                            onClick={() => setOpenInclusions(isOpen ? null : plan.id)}
                            className="flex items-center justify-between w-full border-t border-white/[0.05] pt-4 text-xs font-bold text-zinc-500 hover:text-[#D4AF37] transition-colors"
                          >
                            Full Inclusions ({inclusions.length} items)
                            <ChevronDown size={13} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                          {isOpen && (
                            <ul className="mt-4 space-y-2">
                              {inclusions.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-[11px] text-zinc-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />{item}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Protection */}
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-5 bg-[#D4AF37]/[0.05] border border-[#D4AF37]/15">
                        <Shield size={12} className="text-[#D4AF37] shrink-0" />
                        <span className="text-[11px] text-[#D4AF37] font-semibold">Ceramic-grade protectants every visit</span>
                      </div>

                      <button type="button" onClick={() => openBooking(plan)}
                        className="btn-primary-gold-shimmer mt-auto w-full py-4 rounded-xl bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] font-black hover:text-black hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-500 overflow-hidden active:scale-[0.98]">
                        <span className="relative z-[1]">Join The Club</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Compare: Club vs One-off ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white">Club vs. One-Off</h2>
            <p className="text-zinc-500 mt-2 text-sm">Members save more over time and never have to remember to book.</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="grid grid-cols-3 bg-zinc-900/60 border-b border-white/[0.06]">
              <div className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Feature</div>
              <div className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] text-center border-l border-white/[0.06]">Club Member</div>
              <div className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center border-l border-white/[0.06]">One-Off Booking</div>
            </div>
            {[
              ["Priority Scheduling", "✓", "—"],
              ["Fixed Monthly Date", "✓", "—"],
              ["Loyalty Discounts", "✓", "✓"],
              ["Ceramic Protectants", "✓", "✓"],
              ["Need to Rebook", "Never", "Every time"],
              ["Best Pricing", "Yes", "—"],
            ].map(([feature, club, oneoff]) => (
              <div key={feature} className="grid grid-cols-3 border-b border-white/[0.04] last:border-0">
                <div className="py-3 px-4 text-sm text-zinc-400">{feature}</div>
                <div className="py-3 px-4 text-sm text-center text-[#D4AF37] font-semibold border-l border-white/[0.04]">{club}</div>
                <div className="py-3 px-4 text-sm text-center text-zinc-600 border-l border-white/[0.04]">{oneoff}</div>
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-xl mx-auto">
          <p className="text-zinc-500 text-sm mb-6">Just need a one-time detail?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold">
              Auto Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine Detailing · Maintenance Club · Vermont</span>
          <a href="/" className="hover:text-[#D4AF37] transition-colors">← Back to Home</a>
        </div>
      </footer>

      <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); setSuccessData(null); }} data={successData} />
    </div>
  );
}
