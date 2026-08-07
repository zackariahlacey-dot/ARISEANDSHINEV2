"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Truck, Sparkles, Calculator, ChevronRight, Minus, Plus,
  Mail, Phone, MapPin, User, CheckCircle, AlertTriangle, X, Crown, Loader2,
} from "lucide-react";
import { submitFleetInquiry, type FleetSizeMix } from "@/app/actions/submitFleetInquiry";

// ── Per-vehicle pricing (matches site-wide pricing tables) ────────────────
type SizeKey = "sedan" | "suv" | "xl";

const SIZE_LABELS: Record<SizeKey, string> = {
  sedan: "Sedan / Coupe",
  suv:   "SUV / Truck",
  xl:    "3-Row / Work Van",
};

const SERVICE_TIERS = [
  { id: "Exterior Detail",                       label: "Exterior Detail",          tagline: "Hand wash, wax, exterior glass" },
  { id: "Interior Detail",                       label: "Interior Detail",          tagline: "Vacuum, wipe-down, glass, mats" },
  { id: "Full Detail",                           label: "Interior + Exterior", tagline: "Interior + Exterior combined" },
  { id: "Ultimate Interior Reset",               label: "Ultimate Interior Reset",  tagline: "Hot water extraction, deep clean, UV protect" },
  { id: "Ultimate Interior + Exterior Reset",    label: "Ultimate Full Reset",      tagline: "Inside + out, ceramic spray, the works" },
] as const;

type ServiceTierId = (typeof SERVICE_TIERS)[number]["id"];

const PER_VEHICLE_PRICE: Record<ServiceTierId, Record<SizeKey, number>> = {
  "Exterior Detail":                         { sedan: 130, suv: 145, xl: 170 },
  "Interior Detail":                         { sedan: 150, suv: 170, xl: 185 },
  "Full Detail":                             { sedan: 240, suv: 260, xl: 280 },
  "Ultimate Interior Reset":                 { sedan: 240, suv: 255, xl: 270 },
  "Ultimate Interior + Exterior Reset":      { sedan: 335, suv: 355, xl: 375 },
};

const MIN_VEHICLES = 4;
const MAX_VEHICLES = 100;
const MAX_FLEET_DISCOUNT_PCT = 20;
const PCT_PER_VEHICLE = 2;

// Fleet discount — 2% off the total per vehicle, capped at 20%.
// 4 vehicles = 8% · 5 = 10% · 10+ = 20% (max).
function fleetDiscountPct(count: number): number {
  if (count < MIN_VEHICLES) return 0;
  return Math.min(MAX_FLEET_DISCOUNT_PCT, count * PCT_PER_VEHICLE);
}

// ── Component ──────────────────────────────────────────────────────────────
export function FleetQuoteCalculator() {
  const [vehicleCount, setVehicleCount] = useState(8);
  const [sedanCount,   setSedanCount]   = useState(8);
  const [suvCount,     setSuvCount]     = useState(0);
  const [xlCount,      setXlCount]      = useState(0);
  const [serviceTier,  setServiceTier]  = useState<ServiceTierId>("Full Detail");
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // ── Auto-balance sizes when vehicleCount changes ──────────────────────────
  // When the customer bumps the count slider, we redistribute the existing
  // size ratio so the totals always match.
  const setCountAndBalance = (n: number) => {
    const clamped = Math.max(MIN_VEHICLES, Math.min(MAX_VEHICLES, Math.round(n)));
    const oldTotal = sedanCount + suvCount + xlCount;
    if (oldTotal === 0) {
      setSedanCount(clamped);
      setSuvCount(0);
      setXlCount(0);
    } else {
      const sR = sedanCount / oldTotal;
      const uR = suvCount / oldTotal;
      const xR = xlCount / oldTotal;
      let sN = Math.round(clamped * sR);
      let uN = Math.round(clamped * uR);
      let xN = clamped - sN - uN;
      if (xN < 0) { uN += xN; xN = 0; }
      if (uN < 0) { sN += uN; uN = 0; }
      setSedanCount(sN);
      setSuvCount(uN);
      setXlCount(Math.max(0, xN));
    }
    setVehicleCount(clamped);
  };

  // ── Adjust per-size while keeping total in sync ───────────────────────────
  const adjustSize = (size: SizeKey, delta: number) => {
    const current = size === "sedan" ? sedanCount : size === "suv" ? suvCount : xlCount;
    const newVal  = Math.max(0, current + delta);
    if (size === "sedan") setSedanCount(newVal);
    else if (size === "suv") setSuvCount(newVal);
    else setXlCount(newVal);
    setVehicleCount(
      (size === "sedan" ? newVal : sedanCount) +
      (size === "suv"   ? newVal : suvCount)   +
      (size === "xl"    ? newVal : xlCount)
    );
  };

  // ── Live quote ────────────────────────────────────────────────────────────
  const quote = useMemo(() => {
    const prices = PER_VEHICLE_PRICE[serviceTier];
    const allSmall = sedanCount * prices.sedan + suvCount * prices.sedan + xlCount * prices.sedan;
    const actual   = sedanCount * prices.sedan + suvCount * prices.suv   + xlCount * prices.xl;
    const allLarge = sedanCount * prices.xl    + suvCount * prices.xl    + xlCount * prices.xl;

    const totalVehicles = sedanCount + suvCount + xlCount;
    const pct = fleetDiscountPct(totalVehicles);

    const discount = Math.round(actual * pct / 100);
    const finalTotal = actual - discount;
    const perVehicleAvg = totalVehicles > 0 ? Math.round(finalTotal / totalVehicles) : 0;

    // Range bookends (all-sedan vs all-xl) to give customer a "from-to" hint
    const lowEnd  = Math.round(allSmall * (1 - pct / 100));
    const highEnd = Math.round(allLarge * (1 - pct / 100));

    return { actual, discount, pct, finalTotal, totalVehicles, perVehicleAvg, lowEnd, highEnd };
  }, [sedanCount, suvCount, xlCount, serviceTier]);

  // With the linear 2%-per-vehicle formula, every additional vehicle bumps
  // the discount by 2% until it caps at MAX_FLEET_DISCOUNT_PCT. We only
  // surface the "add more" hint while the customer is still below the cap.
  const nextDiscountTier = useMemo(() => {
    const cur = quote.totalVehicles;
    if (cur >= MAX_FLEET_DISCOUNT_PCT / PCT_PER_VEHICLE) return null;
    return { needed: 1, pct: Math.min(MAX_FLEET_DISCOUNT_PCT, (cur + 1) * PCT_PER_VEHICLE) };
  }, [quote.totalVehicles]);

  return (
    <div className="space-y-6">
      {/* ── Service Tier Picker ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[#D4AF37]" />
          <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Service Tier
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICE_TIERS.map(tier => {
            const isSelected = serviceTier === tier.id;
            const isUltimate = tier.id.includes("Ultimate");
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setServiceTier(tier.id)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                  isSelected
                    ? "border-[#D4AF37] bg-[#D4AF37]/[0.08] shadow-[0_0_18px_rgba(212,175,55,0.15)]"
                    : "border-white/[0.07] bg-zinc-950/40 hover:border-[#D4AF37]/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isUltimate && <Crown size={11} className="text-[#D4AF37]" fill="currentColor" />}
                  <span className={`text-sm font-black ${isSelected ? "text-[#D4AF37]" : "text-white"}`}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug">{tier.tagline}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Vehicle Count Slider ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-[#D4AF37]" />
            <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
              How Many Vehicles?
            </label>
          </div>
          <span className="text-2xl font-black text-[#D4AF37] tabular-nums">{vehicleCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCountAndBalance(vehicleCount - 1)}
            disabled={vehicleCount <= MIN_VEHICLES}
            className="w-11 h-11 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 active:scale-95 transition-all shrink-0"
            aria-label="Decrease count"
          >
            <Minus size={16} />
          </button>
          <input
            type="range"
            min={MIN_VEHICLES}
            max={MAX_VEHICLES}
            value={vehicleCount}
            onChange={e => setCountAndBalance(Number(e.target.value))}
            className="flex-1 h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
          <button
            type="button"
            onClick={() => setCountAndBalance(vehicleCount + 1)}
            disabled={vehicleCount >= MAX_VEHICLES}
            className="w-11 h-11 rounded-xl border border-white/10 bg-zinc-900/60 flex items-center justify-center text-zinc-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 active:scale-95 transition-all shrink-0"
            aria-label="Increase count"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 mt-1 px-12">
          <span>{MIN_VEHICLES} min</span>
          <span>{MAX_VEHICLES}+</span>
        </div>
      </div>

      {/* ── Size Mix ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={14} className="text-[#D4AF37]" />
          <label className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Vehicle Mix
          </label>
          <span className="text-[10px] text-zinc-500 ml-auto">
            Totals to {sedanCount + suvCount + xlCount}
          </span>
        </div>
        <div className="space-y-2">
          {(["sedan", "suv", "xl"] as SizeKey[]).map(size => {
            const count = size === "sedan" ? sedanCount : size === "suv" ? suvCount : xlCount;
            return (
              <div key={size} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/[0.07] bg-zinc-950/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{SIZE_LABELS[size]}</p>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {size === "sedan" && "Cars, coupes, 2-row crossovers"}
                    {size === "suv"   && "2-row SUVs, midsize trucks"}
                    {size === "xl"    && "3-row SUVs, Sprinters, Transits"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => adjustSize(size, -1)} disabled={count <= 0}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-400 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-30 active:scale-90 transition-all">
                    <Minus size={12} />
                  </button>
                  <span className="text-base font-black text-[#D4AF37] w-8 text-center tabular-nums">{count}</span>
                  <button type="button" onClick={() => adjustSize(size, +1)}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-400 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] active:scale-90 transition-all">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Quote ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-950 to-zinc-950 overflow-hidden">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={14} className="text-[#D4AF37]" />
            <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Live Quote</span>
            {quote.pct > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                {quote.pct}% Fleet Discount
              </span>
            )}
          </div>
          {quote.pct > 0 && (
            <div className="text-xs text-zinc-500 mb-2 tabular-nums">
              <span className="line-through">${quote.actual.toLocaleString()}</span>
              <span className="text-emerald-400 font-bold ml-2">−${quote.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-4xl font-black text-[#D4AF37] tabular-nums">
              ${quote.finalTotal.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500">
              ≈ ${quote.perVehicleAvg.toLocaleString()} per vehicle
            </div>
          </div>
          <div className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
            Range: <strong className="text-zinc-400">${quote.lowEnd.toLocaleString()}</strong> (all sedans) → <strong className="text-zinc-400">${quote.highEnd.toLocaleString()}</strong> (all 3-row). Final quote confirmed on inspection.
          </div>
          {nextDiscountTier && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/[0.06] text-[11px] text-zinc-400">
              <span className="text-emerald-300 font-bold">+1 vehicle</span> → <span className="text-[#D4AF37] font-bold">{nextDiscountTier.pct}% off</span> ({PCT_PER_VEHICLE}% per vehicle, max {MAX_FLEET_DISCOUNT_PCT}%).
            </div>
          )}
        </div>
      </div>

      {/* ── Request Quote CTA ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowQuoteForm(true)}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black font-black text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2"
      >
        Request Personalized Quote
        <ChevronRight size={16} strokeWidth={3} />
      </button>

      <p className="text-center text-[11px] text-zinc-600 leading-relaxed">
        We&apos;ll review your request and reach out within 24 hours to confirm scheduling.<br />
        For urgent fleets, call <a href="#" className="text-[#D4AF37] hover:underline"></a>.
      </p>

      <AnimatePresence>
        {showQuoteForm && (
          <FleetInquiryForm
            onClose={() => setShowQuoteForm(false)}
            quote={quote}
            serviceTier={serviceTier}
            vehicleMix={{ sedan: sedanCount, suv: suvCount, xl: xlCount }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Contact Form Modal ───────────────────────────────────────────────────────
function FleetInquiryForm({
  onClose, quote, serviceTier, vehicleMix,
}: {
  onClose: () => void;
  quote: { finalTotal: number; pct: number; totalVehicles: number };
  serviceTier: ServiceTierId;
  vehicleMix: FleetSizeMix;
}) {
  const [businessName,   setBusinessName]   = useState("");
  const [contactName,    setContactName]    = useState("");
  const [contactEmail,   setContactEmail]   = useState("");
  const [contactPhone,   setContactPhone]   = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" } | { kind: "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const res = await submitFleetInquiry({
      businessName:    businessName || undefined,
      contactName,
      contactEmail,
      contactPhone,
      serviceAddress:  serviceAddress || undefined,
      vehicleCount:    quote.totalVehicles,
      vehicleMix,
      serviceTier,
      estimatedTotal:  quote.finalTotal,
      fleetDiscountPct: quote.pct,
      preferredWindow: preferredWindow || undefined,
      notes:           notes || undefined,
    });
    setSubmitting(false);
    setResult(res.status === "ok" ? { kind: "ok" } : { kind: "error", message: res.message });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl"
      >
        {result?.kind === "ok" ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Request Sent!</h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              We&apos;ll review your fleet quote and reach out within 24 hours to confirm scheduling.
            </p>
            <button onClick={onClose} className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-black text-sm">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="sticky top-0 bg-zinc-950 px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Request Quote</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {quote.totalVehicles} vehicles · {serviceTier} · ${quote.finalTotal.toLocaleString()}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {result?.kind === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{result.message}</p>
                </div>
              )}

              <Field label="Business / Company" optional>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="Burlington Auto Group"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50" />
              </Field>

              <Field label="Your Name" required icon={User}>
                <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50" />
              </Field>

              <Field label="Email" required icon={Mail}>
                <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50" />
              </Field>

              <Field label="Phone" required icon={Phone}>
                <input type="tel" required value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  placeholder="(802) 555-0123"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50" />
              </Field>

              <Field label="Service Address" optional icon={MapPin}>
                <input type="text" value={serviceAddress} onChange={e => setServiceAddress(e.target.value)}
                  placeholder="123 Main St, Burlington VT"
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50" />
              </Field>

              <Field label="Preferred Timing" optional>
                <select value={preferredWindow} onChange={e => setPreferredWindow(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">Not sure yet</option>
                  <option>Within 1 week</option>
                  <option>Within 2 weeks</option>
                  <option>This month</option>
                  <option>Next month</option>
                  <option>Spring/Summer</option>
                  <option>Flexible — best price</option>
                </select>
              </Field>

              <Field label="Notes" optional>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Anything we should know? Special add-ons, scheduling constraints, etc."
                  className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 px-6 py-4 border-t border-white/[0.08]">
              <button type="submit" disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black font-black text-sm hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <>Send Request <ChevronRight size={14} strokeWidth={3} /></>}
              </button>
              <p className="text-center text-[10px] text-zinc-600 mt-2">
                We respond within 24 hours · No deposit required to inquire
              </p>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label, required, optional, icon: Icon, children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
        {Icon && <Icon size={10} className="text-[#D4AF37]" />}
        {label}
        {required && <span className="text-[#D4AF37]">*</span>}
        {optional && <span className="text-zinc-700 normal-case font-medium tracking-normal">(optional)</span>}
      </label>
      {children}
    </div>
  );
}
