"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, CheckCircle, Star, ShieldCheck,
  BadgeCheck, Phone, ArrowRight, Truck,
  Droplets, Calculator, ChevronRight,
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

const RV_RATE: Record<string, number> = {
  "RV Interior Detail": 20,
  "RV Exterior Detail": 22,
  "RV Full Detail": 38,
};
const RV_MIN_FEET = 20;

const RV_SERVICES_STATIC = [
  {
    name: "RV Interior Detail",
    ratePerFoot: 20,
    tagline: "Every surface inside your home on wheels.",
    icon: Droplets,
    features: [
      "Full vacuum of all carpets & rugs",
      "Upholstery & dinette cleaning",
      "Dashboard, panels & controls wiped",
      "Kitchen surfaces, sink & appliances",
      "Bathroom deep scrub & sanitize",
      "Odor neutralizer treatment",
    ],
    accent: "text-emerald-300",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/[0.04]",
    popular: false,
  },
  {
    name: "RV Exterior Detail",
    ratePerFoot: 22,
    tagline: "Restore the shine. Protect against the elements.",
    icon: Sparkles,
    features: [
      "Full hand wash & rinse — roof to skirt",
      "Oxidation removal & polishing",
      "Wax or polymer sealant application",
      "Slide-out exterior wipe-down",
      "Wheel wells, tires & hubcaps",
      "Awning track cleaning",
    ],
    accent: "text-emerald-300",
    border: "border-emerald-400/40",
    bg: "bg-emerald-400/[0.06]",
    popular: true,
  },
  {
    name: "RV Full Detail",
    ratePerFoot: 38,
    tagline: "Inside and out — the complete treatment.",
    icon: Star,
    features: [
      "Everything in Interior + Exterior Detail",
      "Slide-out seal inspection & cleaning",
      "Exterior trim & roof vents cleaned",
      "Storage bay wipe-down",
      "Window treatment inside & out",
      "Final inspection & walkthrough",
    ],
    accent: "text-emerald-300",
    border: "border-emerald-400/60",
    bg: "bg-emerald-400/[0.08]",
    popular: false,
  },
];

function PriceCalculator({ services }: { services: Service[] }) {
  const [length, setLength] = useState<number | "">(28);
  const [selected, setSelected] = useState("RV Exterior Detail");

  const rate = RV_RATE[selected] ?? 22;
  const price = typeof length === "number" && length >= RV_MIN_FEET
    ? Math.max(Math.round(rate * RV_MIN_FEET), Math.round(rate * length))
    : null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={16} className="text-emerald-400" />
        <h3 className="font-bold text-white text-sm uppercase tracking-widest">Price Calculator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Service</label>
          <div className="space-y-2">
            {RV_SERVICES_STATIC.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelected(s.name)}
                className={`w-full px-4 py-3 rounded-xl border text-left text-sm font-semibold transition-all ${
                  selected === s.name
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/20"
                }`}
              >
                <span>{s.name}</span>
                <span className="float-right font-black text-emerald-400">${s.ratePerFoot}/ft</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            RV Length (feet)
          </label>
          <div className="relative">
            <input
              type="number"
              min={RV_MIN_FEET}
              max={60}
              value={length}
              onChange={(e) => {
                const v = e.target.value;
                setLength(v === "" ? "" : Math.max(1, parseInt(v, 10) || 1));
              }}
              className="w-full text-center bg-zinc-950/50 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-white rounded-xl px-4 py-4 outline-none transition-all text-2xl font-black tabular-nums"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">ft</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 text-center">Minimum {RV_MIN_FEET} ft</p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-5 py-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Estimated Price</p>
          {price != null ? (
            <>
              <p className="text-3xl font-black text-emerald-400 tabular-nums">${price}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {typeof length === "number" && length < RV_MIN_FEET
                  ? `${RV_MIN_FEET}ft minimum applies`
                  : `${length}ft × $${rate}/ft`}
              </p>
            </>
          ) : (
            <p className="text-zinc-500 text-sm">Enter your RV length above</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RVDetailingPage({ services }: { services: Service[] }) {
  const router = useRouter();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [successModal, setSuccessModal] = useState<SuccessModalData | null>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  // Merge static display data with DB services
  const displayServices = RV_SERVICES_STATIC.map((s) => ({
    ...s,
    dbService: services.find((db) => db.name === s.name) ?? null,
  }));

  const openBooking = useCallback((svc: Service | null) => {
    setSelectedService(svc);
    setBookingOpen(true);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const handleBookNow = useCallback(() => openBooking(null), [openBooking]);

  useEffect(() => {
    if (!bookingOpen) return;
    const t = setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [bookingOpen]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader onBookNow={handleBookNow} />

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-emerald-600/5 blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial="hidden" animate="visible" variants={sv}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Truck size={12} />
              Mobile RV Detailing · Vermont
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4">
              RV Detailing<br />
              <span className="text-emerald-400">That Comes to You</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              Per-foot pricing for motorhomes, travel trailers, fifth wheels, and campervans.
              We come to your driveway, campsite, or storage facility across Vermont.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <CheckCircle size={15} className="text-emerald-400" />
                Interior from $20/ft
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <CheckCircle size={15} className="text-emerald-400" />
                Exterior from $22/ft
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <CheckCircle size={15} className="text-emerald-400" />
                Full Detail from $38/ft
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <MapPin size={14} className="text-emerald-400" />
                20 ft minimum
              </div>
            </div>
            <button
              onClick={handleBookNow}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-8 py-4 rounded-xl text-sm tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get a Quote & Book
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── PRICE CALCULATOR + SERVICE CARDS ── */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">

            {/* Service cards */}
            <div className="space-y-5">
              {displayServices.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.name}
                    initial="hidden" whileInView="visible" viewport={vp}
                    variants={{ ...sv, visible: { ...sv.visible, transition: { duration: 0.55, delay: i * 0.1 } } }}
                    className={`relative rounded-2xl border ${s.border} ${s.bg} p-6`}
                  >
                    {s.popular && (
                      <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Icon size={18} className={s.accent} />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg leading-tight">{s.name}</h3>
                        <p className="text-zinc-500 text-sm mt-0.5">{s.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-black text-emerald-400 tabular-nums">${s.ratePerFoot}</span>
                      <span className="text-zinc-500 text-sm font-medium">/ft</span>
                      <span className="ml-2 text-zinc-600 text-xs">· Min {RV_MIN_FEET}ft · ${s.ratePerFoot * RV_MIN_FEET} minimum</span>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-6">
                      {s.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => s.dbService ? openBooking(s.dbService) : handleBookNow()}
                      className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-sm hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2"
                    >
                      Book This Service <ChevronRight size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Right rail — calculator + trust */}
            <div className="space-y-5">
              <PriceCalculator services={services} />

              <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Why Arise & Shine VT</h3>
                {[
                  { icon: MapPin,       text: "We come to your driveway, campsite, or storage facility" },
                  { icon: ShieldCheck,  text: "RV-safe products — no harsh chemicals on seals or roof" },
                  { icon: BadgeCheck,   text: "Flexible scheduling, solo operator — you deal with me directly" },
                  { icon: Phone,        text: "Text or call for a custom quote on large rigs" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <Icon size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>

              <a
                href="tel:8025855563"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border border-emerald-500/30 text-emerald-300 font-bold text-sm hover:bg-emerald-500/10 transition-all"
              >
                <Phone size={15} />
                Call 802-585-5563
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOOKING SECTION ── */}
      <section ref={bookingRef} className="px-4 pb-20 scroll-mt-24">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBookNow}
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
            >
              Schedule RV Detailing
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
          <BookingSection
            isVisible={bookingOpen}
            onClose={() => setBookingOpen(false)}
            selectedService={selectedService}
            services={services}
            onSelectService={setSelectedService}
            onClearService={() => setSelectedService(null)}
            onBookingSuccess={(data) => {
              setBookingOpen(false);
              setSuccessModal(data);
              router.refresh();
            }}
          />
        </div>
      </section>

      {successModal && (
        <SuccessModal
          isOpen={!!successModal}
          onClose={() => setSuccessModal(null)}
          data={successModal}
        />
      )}
    </div>
  );
}
