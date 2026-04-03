"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, CheckCircle, Star, ShieldCheck,
  BadgeCheck, Phone, ArrowRight, Anchor, Waves,
  Droplets, Leaf, AlertTriangle, Calculator, ChevronRight,
} from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(() => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })), { ssr: false });

const sv = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const vp = { once: true, margin: "-80px" };

// ── Per-foot rates (match service names exactly) ──────────────────────────────
const BOAT_RATE: Record<string, number> = {
  "Boat Interior Detail": 18,
  "Boat Exterior Detail": 20,
  "Full Boat Detail": 32,
};
const BOAT_MIN_FEET = 18;

// ── Static service details (used when DB services aren't loaded yet) ──────────
const BOAT_SERVICES_STATIC = [
  {
    name: "Boat Interior Detail",
    ratePerFoot: 18,
    tagline: "Deep clean for the inside of your boat.",
    icon: Droplets,
    features: [
      "Vinyl seat & upholstery cleaning",
      "Full interior vacuum & wipe-down",
      "Dashboard & electronics cleaning",
      "Cup holders, storage & compartments",
      "Odor neutralizer treatment",
      "Floor & carpet cleaning",
    ],
    accent: "text-sky-300",
    border: "border-sky-400/20",
    bg: "bg-sky-400/[0.04]",
    popular: false,
  },
  {
    name: "Boat Exterior Detail",
    ratePerFoot: 20,
    tagline: "Restore the hull. Protect against Vermont UV.",
    icon: Sparkles,
    features: [
      "Full hull hand wash & rinse",
      "Hull, waterline & transom scrub",
      "Light oxidation removal",
      "Marine paste wax or ceramic sealant",
      "Metal & chrome brightening",
      "Cockpit wipe-down & glass cleaned",
    ],
    accent: "text-sky-300",
    border: "border-sky-400/40",
    bg: "bg-sky-400/[0.06]",
    popular: true,
  },
  {
    name: "Full Boat Detail",
    ratePerFoot: 32,
    tagline: "Inside and out — the complete treatment.",
    icon: Star,
    features: [
      "Everything in Interior + Exterior Detail",
      "Bilge area wipe-down",
      "Cooler & storage compartment detail",
      "Wire brushing around hardware",
      "Marine polymer finish applied",
      "Mold & mildew treatment included",
    ],
    accent: "text-amber-300",
    border: "border-amber-400/30",
    bg: "bg-amber-400/[0.04]",
    popular: false,
  },
];

const LAKES = [
  "Lake Champlain", "Lake Memphremagog", "Lake Willoughby",
  "Lake Bomoseen", "Lake St. Catherine", "Lake Fairlee",
  "Lake Morey", "Caspian Lake",
];

// ── Live Price Calculator ──────────────────────────────────────────────────────
function PriceCalculator() {
  const [feet, setFeet] = useState<number | "">(22);

  const calc = (rate: number) => {
    const length = typeof feet === "number" ? Math.max(BOAT_MIN_FEET, feet) : BOAT_MIN_FEET;
    return Math.round(rate * length);
  };

  return (
    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.03] p-5 md:p-7">
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={16} className="text-sky-400 shrink-0" />
        <h3 className="text-sm font-black uppercase tracking-widest text-sky-400">Price Calculator</h3>
      </div>

      {/* Length input */}
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
          Boat Length (feet)
        </label>
        <div className="relative max-w-[180px]">
          <input
            type="number"
            min={BOAT_MIN_FEET}
            max={80}
            value={feet}
            onChange={(e) => {
              const v = e.target.value;
              setFeet(v === "" ? "" : Math.max(1, parseInt(v, 10) || 1));
            }}
            className="w-full text-center bg-zinc-950/60 border border-white/10 focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 text-white rounded-xl px-4 py-3 outline-none text-xl font-black tabular-nums"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">ft</span>
        </div>
        {typeof feet === "number" && feet < BOAT_MIN_FEET && (
          <p className="text-[11px] text-amber-400/80 mt-1.5">{BOAT_MIN_FEET}ft minimum applies</p>
        )}
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BOAT_SERVICES_STATIC.map((svc) => (
          <div key={svc.name} className={`rounded-xl border p-4 text-center ${svc.popular ? "border-sky-400/40 bg-sky-400/[0.06]" : "border-white/[0.07] bg-zinc-900/40"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 truncate">{svc.name.replace("Boat ", "")}</p>
            <p className={`text-2xl font-black tabular-nums ${svc.popular ? "text-sky-300" : "text-white"}`}>
              ${calc(svc.ratePerFoot).toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">${svc.ratePerFoot}/ft</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600 mt-4 text-center">
        Minimum {BOAT_MIN_FEET}ft · Final price confirmed on-site
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function BoatDetailingPage({ services }: { services: Service[] }) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  const openBooking = useCallback((svc?: Service) => {
    if (svc) setSelectedService(svc);
    setBookingOpen(true);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const closeBooking = useCallback(() => {
    setBookingOpen(false);
    setSelectedService(null);
  }, []);

  // Merge DB services with static data for display
  const displayServices = BOAT_SERVICES_STATIC.map((staticSvc) => {
    const dbSvc = services.find((s) => s.name === staticSvc.name);
    return { ...staticSvc, dbService: dbSvc ?? null };
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Grain overlay */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[25]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.035, mixBlendMode: "overlay" }} />

      <SiteHeader />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56,189,248,0.10) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-sky-400 border border-sky-400/30 rounded-full px-4 py-2 mb-6">
            <Anchor size={10} className="shrink-0" />Vermont Mobile Boat Detailing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-sky-300 via-white to-sky-300 bg-clip-text text-transparent mb-5"
            style={{ filter: "drop-shadow(0 2px 24px rgba(56,189,248,0.2))" }}>
            Mobile Boat<br />Detailing Vermont
          </h1>
          <p className="text-base md:text-xl text-zinc-400 leading-relaxed mb-3 max-w-2xl mx-auto">
            We come to your marina, driveway, or storage yard — anywhere in Vermont. Simple per-foot pricing, no surprises.
          </p>
          <p className="text-sm font-bold text-sky-400 mb-8">
            Interior from $18/ft · Exterior from $20/ft · Full Detail from $32/ft
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={() => openBooking()}
              className="h-13 px-8 py-3.5 rounded-xl font-bold tracking-wide w-full sm:w-auto min-w-[220px] bg-sky-500 text-white hover:bg-sky-400 hover:shadow-[0_0_24px_rgba(56,189,248,0.4)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 text-base"
            >
              Book Your Boat Detail
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-sky-400 font-medium transition-colors text-sm">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-zinc-500">
            {[
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Leaf, label: "Eco-Friendly Products" },
              { icon: BadgeCheck, label: "Gelcoat Safe" },
              { icon: Star, label: "5★ Rated" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon size={13} className="text-sky-400" />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Price Calculator ──────────────────────────────────────── */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <PriceCalculator />
        </div>
      </section>

      {/* ── Booking Section ───────────────────────────────────────────── */}
      <div ref={bookingRef} className="px-4 sm:px-6 lg:px-8 pb-4 scroll-mt-20">
        <div className="max-w-2xl mx-auto">
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
          />
        </div>
      </div>

      {/* ── Service Cards ─────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-sky-400 mb-3">Our Services</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Boat Detailing Packages</h2>
            <p className="text-zinc-500 mt-3 max-w-xl mx-auto text-sm">
              All services at your marina, driveway, or storage yard — no trailering required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.name} className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${svc.border} ${svc.bg} ${svc.popular ? "shadow-[0_0_40px_rgba(56,189,248,0.08)]" : ""}`}>
                  {svc.popular && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-sky-400 to-transparent shrink-0" />}
                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    <div className="mb-5">
                      {svc.popular && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Star size={11} className="text-sky-400" fill="currentColor" />
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">Most Popular</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={18} className={svc.accent} />
                        <h3 className="text-xl font-black text-white tracking-tight">{svc.name}</h3>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed">{svc.tagline}</p>
                    </div>

                    {/* Per-foot pricing badge */}
                    <div className={`rounded-xl mb-6 py-4 text-center border ${svc.popular ? "border-sky-400/20 bg-sky-400/[0.05]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className={`text-3xl font-black tabular-nums ${svc.popular ? "text-sky-300" : "text-white"}`}>
                        ${svc.ratePerFoot}<span className="text-lg font-bold text-zinc-500">/ft</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                        Min {BOAT_MIN_FEET}ft · ${svc.ratePerFoot * BOAT_MIN_FEET} minimum
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {svc.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                          <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-sky-400/15 border border-sky-400/30 flex items-center justify-center shrink-0">
                            <span className="w-1 h-1 rounded-full bg-sky-400" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => openBooking(svc.dbService ?? undefined)}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 active:scale-[0.97] ${
                        svc.popular
                          ? "bg-sky-500 text-white hover:bg-sky-400 shadow-[0_4px_20px_rgba(56,189,248,0.25)]"
                          : "bg-zinc-950 border border-sky-400/30 text-sky-400 hover:bg-sky-500/10 hover:scale-[1.02]"
                      }`}
                    >
                      Book This Service <ChevronRight size={14} className="shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ── Vermont Lakes ─────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-sky-400 mb-3">We Serve Vermont's Lakes</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-6">Marinas & Lake Communities We Reach</h2>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {LAKES.map((lake) => (
              <span key={lake} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-400/20 bg-sky-400/[0.05] text-sky-300/80 text-xs font-semibold">
                <Waves size={10} />{lake}
              </span>
            ))}
          </div>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Don't see your lake?{" "}
            <a href="tel:8025855563" className="text-sky-400 hover:text-sky-300 transition-colors">Call us</a>{" "}
            and we'll confirm availability for your location.
          </p>
        </div>
      </motion.section>

      {/* ── Why Choose Us ────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-black text-white">Why Vermont Boaters Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "We Come to You", desc: "Marina, driveway, storage yard — we bring everything needed. No trailering required." },
              { title: "Transparent Per-Foot Pricing", desc: "No guesswork. Enter your boat length and know your price before we arrive." },
              { title: "Gelcoat-Safe Chemistry", desc: "Marine-grade eco-friendly soaps and polymers safe for fiberglass, aluminum, and Bimini tops." },
              { title: "Vermont UV-Ready", desc: "Vermont summers hit gelcoat hard. Our sealants provide serious UV and oxidation protection." },
              { title: "Fully Insured", desc: "We carry full liability insurance on every job so your investment is always protected." },
              { title: "5★ Local Service", desc: "Locally owned and operated. We treat your boat like we own it." },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
                <CheckCircle size={18} className="text-sky-400 mb-3" />
                <h3 className="font-bold text-sm text-white mb-1.5">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Mold/bilge surcharge note ─────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <AlertTriangle size={14} className="text-amber-500/70 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            <span className="font-bold text-zinc-400">Severe Mold / Bilge Odor:</span> Boats with heavy mold, mildew, or persistent odor may require a $75–$150 remediation surcharge. We always confirm before starting.
          </p>
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(56,189,248,0.07) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">Ready to Book?</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Enter your boat length above to get your price — then book in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openBooking()}
              className="h-12 px-8 rounded-xl font-bold text-sm bg-sky-500 text-white hover:bg-sky-400 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
            >
              Book Your Boat Detail
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-sky-400 font-medium transition-colors text-sm">
              <Phone size={15} />802-585-5563
            </a>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/detailing" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-sky-400/40 hover:text-white transition-all text-sm font-semibold">
              Auto Detailing <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/paint-correction" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-sky-400/40 hover:text-white transition-all text-sm font-semibold">
              Paint Correction <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>© 2025 Arise And Shine VT · Mobile Boat & Auto Detailing · Vermont</span>
          <Link href="/" className="hover:text-sky-400 transition-colors">← Back to Home</Link>
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
