"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Phone, User, Mail, Car, Anchor, Truck,
  Check, Loader2, MapPin, MessageSquare, ChevronLeft, AlertTriangle,
} from "lucide-react";
import { createSqueezeRequest } from "@/app/actions/squeezeActions";

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { id: "auto", label: "Auto",  icon: Car,    color: "text-[#D4AF37]",   bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/40"   },
  { id: "boat", label: "Boat",  icon: Anchor, color: "text-blue-400",    bg: "bg-blue-500/10",  border: "border-blue-500/40"    },
  { id: "rv",   label: "RV",    icon: Truck,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/40" },
] as const;

const AUTO_SERVICES = [
  "Exterior Detail",
  "Interior Detail",
  "Full Detail",
  "Ultimate Interior Reset",
  "Ultimate Interior + Exterior Reset",
  "Paint Correction",
  "Ceramic Coating",
  "Not sure yet",
];

const BOAT_SERVICES = [
  "Boat Interior",
  "Boat Exterior",
  "Boat Full Detail",
  "Marine Showroom Polish",
  "Not sure yet",
];

const RV_SERVICES = [
  "RV Exterior Refresh",
  "RV Living Space Reset",
  "RV Ultimate Transformation",
  "RV Oxidation Restoration",
  "Not sure yet",
];

const VEHICLE_SIZES = [
  { id: "compact", label: "Compact",     sub: "Small car"  },
  { id: "sedan",   label: "Sedan",       sub: "Mid-size"   },
  { id: "suv",     label: "SUV / Truck", sub: "Full-size"  },
  { id: "xl",      label: "XL / Van",    sub: "Large"      },
];

const URGENCY_OPTIONS = [
  { id: "today",    label: "Today",     color: "text-red-400",    activeBg: "bg-red-500/10",    activeBorder: "border-red-500/40"    },
  { id: "tomorrow", label: "Tomorrow",  color: "text-orange-400", activeBg: "bg-orange-500/10", activeBorder: "border-orange-500/40" },
  { id: "this_week",label: "This Week", color: "text-amber-400",  activeBg: "bg-amber-500/10",  activeBorder: "border-amber-500/40"  },
  { id: "soon",     label: "Flexible",  color: "text-zinc-400",   activeBg: "bg-zinc-800/80",   activeBorder: "border-zinc-600/40"   },
] as const;

const DAYS_OF_WEEK = [
  { id: "mon", label: "Mon" }, { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" }, { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" }, { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;

const TIME_OF_DAY = [
  { id: "morning",   label: "Morning",   sub: "7 am – 12 pm" },
  { id: "afternoon", label: "Afternoon", sub: "12 – 5 pm"    },
  { id: "evening",   label: "Evening",   sub: "5 – 8 pm"     },
  { id: "all_day",   label: "All Day",   sub: "Any time"     },
] as const;

const CONTACT_PREFS = [
  { id: "call",   label: "Call"   },
  { id: "text",   label: "Text"   },
  { id: "either", label: "Either" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function buildAvailableDatesString(days: string[], times: string[]): string {
  if (days.length === 0 && times.length === 0) return "";
  const dayLabel: Record<string, string> = {
    mon: "Monday", tue: "Tuesday", wed: "Wednesday",
    thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
  };
  const timeLabel: Record<string, string> = {
    morning:   "mornings (7 am – 12 pm)",
    afternoon: "afternoons (12 – 5 pm)",
    evening:   "evenings (5 – 8 pm)",
    all_day:   "any time of day",
  };
  const daysStr  = days.length  > 0 ? days.map(d => dayLabel[d]  ?? d).join(", ")           : "Any day";
  const timesStr = times.length > 0 ? times.map(t => timeLabel[t] ?? t).join(" or ")        : "any time";
  return `${daysStr} — ${timesStr}`;
}

function Chip({ active, onClick, children, className = "" }: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95
        ${active
          ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
          : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/10"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">{children}</p>;
}

const inputCls =
  "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 ring-[#D4AF37]/40 transition-all";

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? "w-5 bg-[#D4AF37]" : i === current ? "w-5 bg-[#D4AF37]/60" : "w-2 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

interface SqueezeMeInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SqueezeMeInModal({ isOpen, onClose }: SqueezeMeInModalProps) {
  const [step,           setStep]           = useState<1 | 2 | 3>(1);
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [showExitConfirm,setShowExitConfirm]= useState(false);
  const [submitError,    setSubmitError]    = useState<string | null>(null);

  // Step 1 — Contact
  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [contactPref, setContactPref] = useState<string>("either");

  // Step 2 — Service
  const [serviceType,    setServiceType]    = useState<string>("auto");
  const [specificService,setSpecificService]= useState<string>("");
  const [vehicleYear,    setVehicleYear]    = useState("");
  const [vehicleMake,    setVehicleMake]    = useState("");
  const [vehicleModel,   setVehicleModel]   = useState("");
  const [vehicleSize,    setVehicleSize]    = useState("sedan");
  const [footage,        setFootage]        = useState("");
  const [serviceAddress, setServiceAddress] = useState("");

  // Step 3 — Availability
  const [urgency, setUrgency] = useState<string>("this_week");
  const [days,    setDays]    = useState<string[]>([]);
  const [times,   setTimes]   = useState<string[]>([]);
  const [notes,   setNotes]   = useState("");

  // ── Scroll lock — lock both body and html so no browser can scroll through ──
  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const step1Valid =
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length === 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const step2Valid = specificService.length > 0 && serviceAddress.trim().length >= 5;
  const step3Valid = days.length > 0 || times.length > 0;

  const hasData = !submitted && (
    name.trim() || phone.replace(/\D/g,"") || email.trim() || specificService || step > 1
  );

  // ── Close handling ───────────────────────────────────────────────────────────
  function tryClose() {
    if (submitted) { doClose(); return; }
    setShowExitConfirm(true);
  }

  function doClose() {
    setShowExitConfirm(false);
    onClose();
    // Reset after animation out
    setTimeout(() => {
      setStep(1); setSubmitted(false); setShowExitConfirm(false); setSubmitError(null);
      setName(""); setPhone(""); setEmail(""); setContactPref("either");
      setServiceType("auto"); setSpecificService(""); setVehicleYear(""); setVehicleMake("");
      setVehicleModel(""); setVehicleSize("sedan"); setFootage(""); setServiceAddress("");
      setUrgency("this_week"); setDays([]); setTimes([]); setNotes("");
    }, 300);
  }

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  function toggleDay(id: string) {
    setDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  function toggleTime(id: string) {
    if (id === "all_day") {
      setTimes(prev => prev.includes("all_day") ? [] : ["all_day"]);
      return;
    }
    setTimes(prev => {
      const without = prev.filter(t => t !== "all_day");
      return without.includes(id) ? without.filter(t => t !== id) : [...without, id];
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!step3Valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const vehicleInfo = serviceType === "auto"
      ? [vehicleYear, vehicleMake, vehicleModel, VEHICLE_SIZES.find(s => s.id === vehicleSize)?.label]
          .filter(Boolean).join(" ")
      : footage ? `${footage} ft` : undefined;

    const res = await createSqueezeRequest({
      name:              name.trim(),
      phone:             phone.replace(/\D/g, ""),
      email:             email.trim(),
      contactPreference: contactPref,
      serviceType,
      specificService:   specificService !== "Not sure yet" ? specificService : undefined,
      vehicleInfo:       vehicleInfo || undefined,
      serviceAddress:    serviceAddress.trim(),
      urgency,
      availableDates:    buildAvailableDatesString(days, times),
      notes:             notes.trim() || undefined,
    });

    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      setSubmitError("Something went wrong — please try again or call us at 802-585-5563.");
    }
  }

  const serviceList =
    serviceType === "boat" ? BOAT_SERVICES :
    serviceType === "rv"   ? RV_SERVICES   :
    AUTO_SERVICES;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop — blocked when exit confirm is showing so it can't re-trigger ── */}
          <motion.div
            key="squeeze-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={showExitConfirm ? undefined : tryClose}
            className="fixed inset-0 z-[72] bg-black/75 backdrop-blur-sm"
          />

          {/* ── Modal — flex-centered wrapper ── */}
          <div className="fixed inset-0 z-[73] flex items-center justify-center px-4 py-6 pointer-events-none">
            <motion.div
              key="squeeze-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-md max-h-[88dvh] overflow-y-auto overscroll-contain rounded-2xl pointer-events-auto"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl">

                {/* ── Header ── */}
                <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-start justify-between sticky top-0 bg-zinc-950 z-10 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                      <Zap size={16} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Squeeze Me In</h2>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {submitted ? "Request received" : showExitConfirm ? "Just checking…" : `Step ${step} of 3`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {!submitted && !showExitConfirm && <Steps current={step - 1} total={3} />}
                    <button
                      type="button"
                      onClick={tryClose}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* ── How it works banner — hidden during exit confirm ── */}
                {!submitted && !showExitConfirm && (
                  <div className="mx-5 mt-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 px-4 py-3 space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-500">How it works</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      This is a <span className="text-zinc-300">spot request</span>, not a guaranteed booking.
                      We&apos;ll reach out as fast as possible — you&apos;re first in line if anyone cancels or we finish a job early.
                    </p>
                  </div>
                )}

                {/* ── Body — exit confirm / success / step form ── */}
                <AnimatePresence mode="wait" initial={false}>

                {/* ── Exit confirm ── */}
                {showExitConfirm ? (
                  <motion.div
                    key="exit-confirm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="px-6 py-10 flex flex-col items-center text-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <AlertTriangle size={26} className="text-amber-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black text-white">Leave the form?</p>
                      <p className="text-sm text-zinc-500 leading-relaxed max-w-[260px]">
                        Your progress won&apos;t be saved. You can always come back and request a spot anytime.
                      </p>
                    </div>
                    <div className="w-full space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setShowExitConfirm(false)}
                        className="w-full py-4 rounded-xl bg-[#D4AF37] text-zinc-950 font-black text-sm uppercase tracking-widest hover:bg-[#e6c84a] active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20"
                      >
                        Keep Going
                      </button>
                      <button
                        type="button"
                        onClick={doClose}
                        className="w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 font-semibold text-sm hover:text-zinc-200 hover:border-white/20 active:scale-[0.99] transition-all"
                      >
                        Exit without saving
                      </button>
                    </div>
                  </motion.div>

                /* ── Success screen ── */
                ) : submitted ? (
                  <div className="p-8 text-center space-y-5">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <Check size={24} className="text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-black text-white">You&apos;re on the list!</p>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        A confirmation was sent to <span className="text-zinc-300">{email}</span>.
                        We&apos;ll also reach out by{" "}
                        <span className="text-zinc-300">
                          {contactPref === "call" ? "phone call" : contactPref === "text" ? "text" : "call or text"}
                        </span>{" "}
                        at <span className="text-zinc-300">{phone}</span>.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-4 text-left space-y-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">What happens next</p>
                      <div className="space-y-2 text-[12px] text-zinc-400 leading-relaxed">
                        <p>• We&apos;ll call or text the moment a spot opens up</p>
                        <p>• You&apos;re first in line for any cancellation or early finish</p>
                        <p>• No spot is guaranteed — but we&apos;ll do everything we can</p>
                        <p>• Need it faster? Call or text us directly at{" "}
                          <a href="tel:8025855563" className="text-[#D4AF37] font-semibold">802-585-5563</a>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={doClose}
                      className="px-8 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 text-sm font-black uppercase tracking-wider hover:bg-[#e6c84a] active:scale-95 transition-all"
                    >
                      Done
                    </button>
                  </div>
                ) : (

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.18 }}
                      className="p-5 space-y-5"
                    >

                      {/* ══════════════ STEP 1 — Contact ══════════════ */}
                      {step === 1 && (
                        <>
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-white">Who are you?</h3>
                            <p className="text-[11px] text-zinc-600">We&apos;ll reach out here to confirm your spot.</p>
                          </div>

                          <div>
                            <Label><User size={9} className="inline mr-1" />Full Name *</Label>
                            <input
                              value={name}
                              onChange={e => setName(e.target.value)}
                              placeholder="Your full name"
                              autoComplete="name"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <Label><Phone size={9} className="inline mr-1" />Phone *</Label>
                            <input
                              type="tel"
                              inputMode="tel"
                              value={phone}
                              onChange={e => setPhone(formatPhone(e.target.value))}
                              placeholder="(802) 555-0100"
                              autoComplete="tel"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <Label><Mail size={9} className="inline mr-1" />Email *</Label>
                            <input
                              type="email"
                              inputMode="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              autoComplete="email"
                              className={inputCls}
                            />
                            <p className="text-[10px] text-zinc-700 mt-1">You&apos;ll get a confirmation here.</p>
                          </div>

                          <div>
                            <Label><MessageSquare size={9} className="inline mr-1" />Preferred contact</Label>
                            <div className="flex gap-2">
                              {CONTACT_PREFS.map(({ id, label }) => (
                                <Chip key={id} active={contactPref === id} onClick={() => setContactPref(id)} className="flex-1 text-center justify-center">
                                  {label}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!step1Valid}
                            onClick={() => setStep(2)}
                            className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-zinc-950 font-black text-[12px] uppercase tracking-widest transition-all active:scale-[0.99] hover:bg-[#e6c84a] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next — Service Details
                          </button>
                        </>
                      )}

                      {/* ══════════════ STEP 2 — Service ══════════════ */}
                      {step === 2 && (
                        <>
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-white">What do you need?</h3>
                            <p className="text-[11px] text-zinc-600">Tell us about the vehicle and where we&apos;re going.</p>
                          </div>

                          <div>
                            <Label>Service type</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {SERVICE_TYPES.map(({ id, label, icon: Icon, color, bg, border }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => { setServiceType(id); setSpecificService(""); }}
                                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all active:scale-95 ${
                                    serviceType === id
                                      ? `${bg} ${border} ${color}`
                                      : "bg-white/[0.02] border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                                  }`}
                                >
                                  <Icon size={18} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Which service?</Label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {serviceList.map(svc => (
                                <Chip key={svc} active={specificService === svc} onClick={() => setSpecificService(svc)}>
                                  {svc}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          {serviceType === "auto" && (
                            <div>
                              <Label><Car size={9} className="inline mr-1" />Vehicle details</Label>
                              <div className="grid grid-cols-3 gap-2 mb-2.5">
                                <input
                                  value={vehicleYear}
                                  onChange={e => setVehicleYear(e.target.value)}
                                  placeholder="Year"
                                  maxLength={4}
                                  inputMode="numeric"
                                  className={inputCls}
                                />
                                <input value={vehicleMake}  onChange={e => setVehicleMake(e.target.value)}  placeholder="Make"  className={inputCls} />
                                <input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Model" className={inputCls} />
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {VEHICLE_SIZES.map(({ id, label, sub }) => (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setVehicleSize(id)}
                                    className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all active:scale-95 ${
                                      vehicleSize === id
                                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                        : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                                    }`}
                                  >
                                    <span className="text-[10px] font-bold uppercase leading-tight">{label}</span>
                                    <span className="text-[8px] text-zinc-600 mt-0.5">{sub}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {(serviceType === "boat" || serviceType === "rv") && (
                            <div>
                              <Label>{serviceType === "boat" ? "Boat" : "RV"} length (feet)</Label>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={footage}
                                onChange={e => setFootage(e.target.value)}
                                placeholder={serviceType === "boat" ? "e.g. 22" : "e.g. 30"}
                                min={1}
                                className={inputCls}
                              />
                            </div>
                          )}

                          <div>
                            <Label><MapPin size={9} className="inline mr-1" />Where should we come? *</Label>
                            <input
                              value={serviceAddress}
                              onChange={e => setServiceAddress(e.target.value)}
                              placeholder="123 Main St, Williston, VT"
                              autoComplete="street-address"
                              className={inputCls}
                            />
                            <p className="text-[10px] text-zinc-700 mt-1">Home, office, marina, storage lot, etc.</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="flex items-center gap-1 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-zinc-400 hover:text-white text-[12px] font-bold transition-all active:scale-95"
                            >
                              <ChevronLeft size={13} /> Back
                            </button>
                            <button
                              type="button"
                              disabled={!step2Valid}
                              onClick={() => setStep(3)}
                              className="flex-1 py-3.5 rounded-xl bg-[#D4AF37] text-zinc-950 font-black text-[12px] uppercase tracking-widest transition-all active:scale-[0.99] hover:bg-[#e6c84a] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Next — Availability
                            </button>
                          </div>
                        </>
                      )}

                      {/* ══════════════ STEP 3 — Availability ══════════════ */}
                      {step === 3 && (
                        <>
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-white">When are you free?</h3>
                            <p className="text-[11px] text-zinc-600">Pick as many as fit — we&apos;ll work around your schedule.</p>
                          </div>

                          <div>
                            <Label>How soon do you need it?</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {URGENCY_OPTIONS.map(({ id, label, color, activeBg, activeBorder }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setUrgency(id)}
                                  className={`py-3 px-3 rounded-xl border text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                    urgency === id
                                      ? `${activeBg} ${activeBorder} ${color}`
                                      : "bg-white/[0.02] border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Which days work for you?</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {DAYS_OF_WEEK.map(({ id, label }) => (
                                <Chip key={id} active={days.includes(id)} onClick={() => toggleDay(id)}>{label}</Chip>
                              ))}
                              <Chip active={days.length === 0} onClick={() => setDays([])}>Any Day</Chip>
                            </div>
                            {days.length === 0 && (
                              <p className="text-[10px] text-zinc-700 mt-1">No preference — any day works.</p>
                            )}
                          </div>

                          <div>
                            <Label>What time of day?</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {TIME_OF_DAY.map(({ id, label, sub }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => toggleTime(id)}
                                  className={`flex flex-col items-start px-3 py-3 rounded-xl border transition-all active:scale-95 ${
                                    times.includes(id)
                                      ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                      : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                                  }`}
                                >
                                  <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
                                  <span className="text-[9px] mt-0.5 opacity-60">{sub}</span>
                                </button>
                              ))}
                            </div>
                            {times.length === 0 && (
                              <p className="text-[10px] text-zinc-700 mt-1">Select at least one — or pick All Day.</p>
                            )}
                          </div>

                          <div>
                            <Label>
                              <MessageSquare size={9} className="inline mr-1" />
                              Anything else? <span className="normal-case font-normal text-zinc-700">(optional)</span>
                            </Label>
                            <textarea
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              rows={2}
                              placeholder="Special requests, gate codes, condition of the vehicle, etc."
                              className={`${inputCls} resize-none leading-relaxed`}
                            />
                          </div>

                          {(days.length > 0 || times.length > 0) && (
                            <div className="rounded-xl bg-[#D4AF37]/[0.04] border border-[#D4AF37]/10 px-3 py-3">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Sending availability</p>
                              <p className="text-[11px] text-zinc-300 leading-relaxed italic">
                                &ldquo;{buildAvailableDatesString(days, times)}&rdquo;
                              </p>
                            </div>
                          )}

                          {submitError && (
                            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                              {submitError}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setStep(2)}
                              className="flex items-center gap-1 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-zinc-400 hover:text-white text-[12px] font-bold transition-all active:scale-95"
                            >
                              <ChevronLeft size={13} /> Back
                            </button>
                            <button
                              type="button"
                              onClick={handleSubmit}
                              disabled={!step3Valid || submitting}
                              className="flex-1 py-3.5 rounded-xl bg-[#D4AF37] text-zinc-950 font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.99] hover:bg-[#e6c84a] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/10"
                            >
                              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                              {submitting ? "Sending..." : "Request a Spot"}
                            </button>
                          </div>

                          <p className="text-center text-[10px] text-zinc-600">
                            Or call/text:{" "}
                            <a href="tel:8025855563" className="text-zinc-400 hover:text-white transition-colors">
                              802-585-5563
                            </a>
                          </p>
                        </>
                      )}

                    </motion.div>
                  </AnimatePresence>
                )}

                </AnimatePresence>

                {/* Safe area spacing for iPhone home indicator */}
                <div className="h-safe-bottom" />

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
