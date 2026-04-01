"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin, Sparkles, Layers, ShieldCheck, AlertTriangle,
  CheckCircle, ArrowRight, Phone,
} from "lucide-react";
import type { Service } from "@/app/page";
import type { SuccessModalData } from "./SuccessModal";
import { SiteHeader } from "./SiteHeader";

const BookingSection = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingSection })),
  { ssr: true, loading: () => <div className="min-h-[400px] rounded-xl bg-zinc-900/30 animate-pulse" /> }
);
const SuccessModal = dynamic(() => import("./SuccessModal").then((m) => ({ default: m.SuccessModal })), { ssr: false });

const PAINT_CARDS = [
  {
    level: 1 as const,
    name: "Paint Enhancement",
    subtitle: "Level 1 — Single-Stage Polish",
    tagline: "Big gloss improvement for newer or well-maintained paint.",
    priceNormal: 350, priceLarge: 450,
    bestFor: "Newer cars or well-maintained paint",
    process: [
      "Full decontamination wash & iron removal",
      "Mechanical clay bar treatment",
      "Single-pass machine polish with finishing foam pad",
      "Removes 50–70% of light swirl marks and oxidation",
    ],
    protection: "Includes 6-Month Ceramic Sealant",
    isFull: false,
  },
  {
    level: 2 as const,
    name: "Full Paint Correction",
    subtitle: "Level 2 — Two-Stage Compound + Polish",
    tagline: "The ultimate restoration for dark colors or paint with deep defects.",
    priceNormal: 650, priceLarge: 800,
    bestFor: "Dark colors or older paint with swirls & scratches",
    process: [
      "Full decontamination & clay bar prep",
      "Step 1: Heavy compounding pass — levels deep defects",
      "Step 2: Finishing polish pass — removes haze, maximizes clarity",
      "Removes 85–95% of all correctable surface defects",
    ],
    protection: "Includes 12-Month Premium Ceramic Coating Lite",
    isFull: true,
  },
] as const;

const FAQ_ITEMS = [
  { q: "Do you need a garage or shade?", a: "For best results, yes. Paint correction requires a stable, temperature-controlled environment. We'll confirm site conditions before scheduling." },
  { q: "How long does paint correction take?", a: "Level 1 typically takes 4–6 hours. Level 2 is a full-day service (6–10 hours) depending on vehicle size and defect severity." },
  { q: "Will it remove all scratches?", a: "We correct swirl marks, haze, and light-to-medium scratches in the clear coat. Deep scratches that go through to the primer or metal cannot be polished out." },
  { q: "Does it include clay bar and door jambs?", a: "Yes — both levels include a full clay bar decontamination treatment and door jamb cleaning as part of the prep process." },
];

const sv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const vp = { once: true, margin: "-80px" };

export function PaintCorrectionPage({ services }: { services: Service[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [authRewardPoints] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessModalData | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const openBooking = useCallback(() => {
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
      <SiteHeader onBookNow={openBooking} />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
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
            <button onClick={openBooking} className="btn-primary-gold-shimmer h-12 px-8 rounded-xl font-semibold tracking-wide w-full sm:w-auto min-w-[200px] bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Get a Quote</span>
            </button>
            <a href="tel:8025855563" className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              <Phone size={15} />Call 802-585-5563
            </a>
          </div>
        </div>
      </section>

      {/* ── Level cards ── */}
      <motion.section initial="hidden" whileInView="visible" viewport={vp} variants={sv}
        className="py-12 md:py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Choose Your Level</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Two-Level System</h2>
            <p className="text-zinc-500 mt-3 text-sm max-w-xl mx-auto leading-relaxed">Both levels include clay bar treatment and door jamb cleaning as part of the prep.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PAINT_CARDS.map((card) => (
              <div key={card.level} className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${card.isFull ? "border border-[#D4AF37]/45 shadow-[0_0_40px_rgba(212,175,55,0.1)] bg-zinc-900/70" : "border border-white/[0.07] bg-zinc-900/50 hover:border-[#D4AF37]/25"}`}>
                {card.isFull && <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />}
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${card.isFull ? "bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]" : "bg-white/[0.06] border-white/10 text-zinc-400"}`}>{card.level}</div>
                      <Layers size={11} className={card.isFull ? "text-[#D4AF37]" : "text-zinc-500"} />
                      <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${card.isFull ? "text-[#D4AF37]" : "text-zinc-500"}`}>{card.subtitle}</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{card.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{card.tagline}</p>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-white/[0.06] text-[11px] text-zinc-400">
                      <CheckCircle size={11} className="text-[#D4AF37]" />Best for: {card.bestFor}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className={`flex rounded-xl mb-6 overflow-hidden border ${card.isFull ? "border-[#D4AF37]/20" : "border-white/[0.06]"}`}>
                    <div className="flex-1 py-4 text-center bg-white/[0.02]">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1">Starting at</div>
                      <div className="text-2xl font-black text-white">${card.priceNormal}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mt-1">Normal</div>
                    </div>
                    <div className="w-px bg-white/[0.06]" />
                    <div className={`flex-1 py-4 text-center ${card.isFull ? "bg-[#D4AF37]/[0.05]" : "bg-white/[0.02]"}`}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1">Starting at</div>
                      <div className={`text-2xl font-black ${card.isFull ? "text-[#D4AF37]" : "text-zinc-200"}`}>${card.priceLarge}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500 mt-1">Large</div>
                    </div>
                  </div>

                  {/* Process */}
                  <div className="mb-5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-3">Process</p>
                    <ul className="space-y-2.5">
                      {card.process.map((step) => (
                        <li key={step} className="flex items-start gap-3 text-sm text-zinc-300 leading-snug">
                          <span className="mt-[3px] w-3.5 h-3.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0"><span className="w-1 h-1 rounded-full bg-[#D4AF37]" /></span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Clay bar + door jamb note */}
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl px-4 py-3 bg-zinc-800/40 border border-white/[0.05]">
                    <CheckCircle size={13} className="text-[#D4AF37] shrink-0" />
                    <span className="text-[11px] text-zinc-400">Includes <strong className="text-zinc-200">clay bar</strong> and <strong className="text-zinc-200">door jamb cleaning</strong></span>
                  </div>

                  {/* Protection */}
                  <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 mb-5 border ${card.isFull ? "bg-[#D4AF37]/[0.07] border-[#D4AF37]/20" : "bg-white/[0.03] border-white/[0.06]"}`}>
                    <ShieldCheck size={14} className={card.isFull ? "text-[#D4AF37]" : "text-zinc-500"} />
                    <span className={`text-xs font-semibold ${card.isFull ? "text-[#D4AF37]" : "text-zinc-400"}`}>{card.protection}</span>
                  </div>

                  <button onClick={openBooking} className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-[0.97] ${card.isFull ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(212,175,55,0.35)]" : "btn-primary-gold-shimmer bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:scale-[1.02]"}`}>
                    Book Level {card.level} <Sparkles size={13} className="shrink-0" />
                  </button>
                </div>
              </div>
            ))}
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
              selectedService={null}
              services={services}
              onSelectService={() => {}}
              onBookingSuccess={handleSuccess}
              initialRewardPoints={authRewardPoints}
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
            <a href="/maintenance-club" className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all text-sm font-semibold">
              Monthly Club <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
