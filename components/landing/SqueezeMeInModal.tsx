"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Phone, User, Mail, Car, Anchor, Truck,
  Check, Loader2, MapPin, MessageSquare, ChevronLeft,
  AlertTriangle, Sparkles, Clock,
} from "lucide-react";
import { createSqueezeRequest, getRecentVehiclesByContact } from "@/app/actions/squeezeActions";

// ── Service lists with pricing ────────────────────────────────────────────────

const SERVICE_TYPES = [
  { id: "auto", label: "Auto",  icon: Car,    color: "text-[#D4AF37]",   bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/30"   },
  { id: "boat", label: "Boat",  icon: Anchor, color: "text-blue-400",    bg: "bg-blue-500/10",  border: "border-blue-500/30"    },
  { id: "rv",   label: "RV",    icon: Truck,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
] as const;

const AUTO_SERVICES = [
  { label: "Exterior Detail",                    price: "from $125" },
  { label: "Interior Detail",                    price: "from $150" },
  { label: "Full Detail",                        price: "from $240" },
  { label: "Ultimate Interior Reset",            price: "from $340" },
  { label: "Ultimate Interior + Exterior Reset", price: "$350 flat" },
  { label: "Paint Correction",                   price: "from $350" },
  { label: "Ceramic Coating",                    price: "quote"     },
  { label: "Not sure yet",                       price: ""          },
];

const BOAT_SERVICES = [
  { label: "Boat Interior",          price: "$15/ft" },
  { label: "Boat Exterior",          price: "$20/ft" },
  { label: "Boat Full Detail",       price: "$32/ft" },
  { label: "Marine Showroom Polish", price: "quote"  },
  { label: "Not sure yet",           price: ""       },
];

const RV_SERVICES = [
  { label: "RV Exterior Refresh",       price: "$22/ft" },
  { label: "RV Living Space Reset",     price: "$20/ft" },
  { label: "RV Ultimate Transformation",price: "$38/ft" },
  { label: "RV Oxidation Restoration",  price: "quote"  },
  { label: "Not sure yet",              price: ""       },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
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
    morning: "mornings (7 am – 12 pm)", afternoon: "afternoons (12 – 5 pm)",
    evening: "evenings (5 – 8 pm)",     all_day:   "any time of day",
  };
  const daysStr  = days.length  > 0 ? days.map(d => dayLabel[d]  ?? d).join(", ")     : "Any day";
  const timesStr = times.length > 0 ? times.map(t => timeLabel[t] ?? t).join(" or ")  : "any time";
  return `${daysStr} — ${timesStr}`;
}

const inputCls =
  "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 ring-[#D4AF37]/40 transition-all";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">{children}</p>;
}

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
          i < current ? "w-5 bg-[#D4AF37]" : i === current ? "w-5 bg-[#D4AF37]/50" : "w-2 bg-white/10"
        }`} />
      ))}
    </div>
  );
}

// ── Primary gold button shared classes ────────────────────────────────────────
const goldBtn =
  "btn-primary-gold-shimmer w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black text-[12px] uppercase tracking-widest transition-all duration-500 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2";

const backBtn =
  "flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-zinc-400 hover:text-white text-[12px] font-bold transition-all active:scale-95 shrink-0";

// ── Main modal ────────────────────────────────────────────────────────────────

interface SqueezeMeInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SqueezeMeInModal({ isOpen, onClose }: SqueezeMeInModalProps) {
  const [step,            setStep]            = useState<1 | 2 | 3>(1);
  const [submitting,      setSubmitting]       = useState(false);
  const [submitted,       setSubmitted]        = useState(false);
  const [showExitConfirm, setShowExitConfirm]  = useState(false);
  const [submitError,     setSubmitError]      = useState<string | null>(null);

  // Step 1 — Contact
  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [contactPref, setContactPref] = useState("either");

  // Step 2 — Service
  const [serviceType,    setServiceType]    = useState("auto");
  const [specificService,setSpecificService]= useState("");
  const [vehicleStr,     setVehicleStr]     = useState("");
  const [footage,        setFootage]        = useState("");
  const [serviceAddress, setServiceAddress] = useState("");

  // Vehicle autofill
  const [vehicleSuggestions,        setVehicleSuggestions]        = useState<string[]>([]);
  const [vehicleSuggestionsLoading, setVehicleSuggestionsLoading] = useState(false);
  const [vehicleSuggestionDismissed,setVehicleSuggestionDismissed]= useState(false);

  // Step 3 — Availability
  const [urgency, setUrgency] = useState("this_week");
  const [days,    setDays]    = useState<string[]>([]);
  const [times,   setTimes]   = useState<string[]>([]);
  const [notes,   setNotes]   = useState("");

  // ── Scroll lock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const pb = document.body.style.overflow;
    const ph = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = pb; document.documentElement.style.overflow = ph; };
  }, [isOpen]);

  // ── Vehicle autofill — fires when entering step 2 ────────────────────────────
  useEffect(() => {
    if (step !== 2 || vehicleSuggestions.length > 0 || vehicleSuggestionsLoading || vehicleSuggestionDismissed) return;
    const p = phone.replace(/\D/g, "");
    const e = email.trim();
    if (!p && !e) return;
    setVehicleSuggestionsLoading(true);
    getRecentVehiclesByContact(p, e)
      .then(setVehicleSuggestions)
      .catch(() => {})
      .finally(() => setVehicleSuggestionsLoading(false));
  }, [step]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const step1Valid =
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length === 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const step2Valid = specificService.length > 0 && serviceAddress.trim().length >= 5;
  const step3Valid = days.length > 0 || times.length > 0;

  // ── Close handling ────────────────────────────────────────────────────────────
  function tryClose() {
    if (submitted) { doClose(); return; }
    setShowExitConfirm(true);
  }

  function doClose() {
    setShowExitConfirm(false);
    onClose();
    setTimeout(() => {
      setStep(1); setSubmitted(false); setShowExitConfirm(false); setSubmitError(null);
      setName(""); setPhone(""); setEmail(""); setContactPref("either");
      setServiceType("auto"); setSpecificService(""); setVehicleStr(""); setFootage(""); setServiceAddress("");
      setVehicleSuggestions([]); setVehicleSuggestionsLoading(false); setVehicleSuggestionDismissed(false);
      setUrgency("this_week"); setDays([]); setTimes([]); setNotes("");
    }, 300);
  }

  // ── Toggles ───────────────────────────────────────────────────────────────────
  function toggleDay(id: string) { setDays(p => p.includes(id) ? p.filter(d => d !== id) : [...p, id]); }

  function toggleTime(id: string) {
    if (id === "all_day") { setTimes(p => p.includes("all_day") ? [] : ["all_day"]); return; }
    setTimes(p => { const w = p.filter(t => t !== "all_day"); return w.includes(id) ? w.filter(t => t !== id) : [...w, id]; });
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!step3Valid || submitting) return;
    setSubmitting(true); setSubmitError(null);

    const vehicleInfo = serviceType === "auto"
      ? vehicleStr.trim() || undefined
      : footage ? `${footage} ft` : undefined;

    const res = await createSqueezeRequest({
      name: name.trim(), phone: phone.replace(/\D/g, ""), email: email.trim(),
      contactPreference: contactPref, serviceType,
      specificService: specificService !== "Not sure yet" ? specificService : undefined,
      vehicleInfo: vehicleInfo || undefined,
      serviceAddress: serviceAddress.trim(), urgency,
      availableDates: buildAvailableDatesString(days, times),
      notes: notes.trim() || undefined,
    });

    setSubmitting(false);
    if (res.success) { setSubmitted(true); }
    else { setSubmitError("Something went wrong — please try again or call 802-585-5563."); }
  }

  const serviceList = serviceType === "boat" ? BOAT_SERVICES : serviceType === "rv" ? RV_SERVICES : AUTO_SERVICES;

  // ── Filtered autocomplete suggestions ────────────────────────────────────────
  const filteredSuggestions = vehicleStr.trim().length >= 1
    ? vehicleSuggestions.filter(v => v.toLowerCase().includes(vehicleStr.toLowerCase()))
    : vehicleSuggestions;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="squeeze-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={showExitConfirm ? undefined : tryClose}
            className="fixed inset-0 z-[72] bg-black/80 backdrop-blur-sm"
          />

          {/* Flex-centered wrapper */}
          <div className="fixed inset-0 z-[73] flex items-center justify-center px-4 py-6 pointer-events-none">
            <motion.div
              key="squeeze-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md max-h-[88dvh] overflow-y-auto overscroll-contain rounded-2xl pointer-events-auto"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="bg-zinc-950 border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/60">

                {/* ── Sticky header ── */}
                <div className="px-5 pt-5 pb-4 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10 rounded-t-2xl border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                      <Zap size={15} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white tracking-tight">Squeeze Me In</h2>
                      <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">
                        {submitted ? "Request received ✓" : showExitConfirm ? "Just checking…" : `Step ${step} of 3`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {!submitted && !showExitConfirm && <Steps current={step - 1} total={3} />}
                    <button type="button" onClick={tryClose}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-colors"
                    ><X size={14} /></button>
                  </div>
                </div>

                {/* ── Body — swaps between exit confirm / success / steps ── */}
                <AnimatePresence mode="wait" initial={false}>

                  {/* ──────────── Exit confirm ──────────── */}
                  {showExitConfirm ? (
                    <motion.div key="exit-confirm"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
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
                        <button type="button" onClick={() => setShowExitConfirm(false)}
                          className={goldBtn}
                        >Keep Going</button>
                        <button type="button" onClick={doClose}
                          className="w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 font-semibold text-sm hover:text-zinc-200 hover:border-white/20 active:scale-[0.99] transition-all"
                        >Exit without saving</button>
                      </div>
                    </motion.div>

                  /* ──────────── Success ──────────── */
                  ) : submitted ? (
                    <motion.div key="success"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                      className="p-8 text-center space-y-6"
                    >
                      <div className="relative inline-flex">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Check size={26} className="text-emerald-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                          <Sparkles size={11} className="text-[#D4AF37]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-black text-white">You&apos;re on the list!</p>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          Confirmation sent to <span className="text-zinc-300">{email}</span>.
                          We&apos;ll reach out by{" "}
                          <span className="text-zinc-300">
                            {contactPref === "call" ? "phone call" : contactPref === "text" ? "text" : "call or text"}
                          </span>{" "}
                          at <span className="text-zinc-300">{phone}</span>.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-4 text-left space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">What happens next</p>
                        <div className="space-y-2 text-[12px] text-zinc-400 leading-relaxed">
                          <div className="flex gap-2"><Clock size={11} className="text-[#D4AF37] mt-0.5 shrink-0" /><span>We&apos;ll contact you the moment a spot opens</span></div>
                          <div className="flex gap-2"><Zap    size={11} className="text-[#D4AF37] mt-0.5 shrink-0" /><span>You&apos;re first in line for cancellations &amp; early finishes</span></div>
                          <div className="flex gap-2"><Phone  size={11} className="text-[#D4AF37] mt-0.5 shrink-0" /><span>Need it faster? Call or text <a href="tel:8025855563" className="text-[#D4AF37] font-semibold">802-585-5563</a></span></div>
                        </div>
                      </div>
                      <button type="button" onClick={doClose} className={goldBtn}>Done</button>
                    </motion.div>

                  /* ──────────── Step form ──────────── */
                  ) : (
                    <>
                      {/* How it works — only step 1 */}
                      {step === 1 && (
                        <motion.div key="how-it-works"
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                          className="mx-5 mt-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 px-4 py-3 space-y-1"
                        >
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500/80">How it works</p>
                          <p className="text-[11px] text-zinc-600 leading-relaxed">
                            This is a <span className="text-zinc-400">spot request</span>, not a guaranteed booking.
                            We&apos;ll reach out as fast as possible — you&apos;re first in line if anyone cancels or we finish early.
                          </p>
                        </motion.div>
                      )}

                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={step}
                          initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.18 }}
                          className="p-5 space-y-5"
                        >

                          {/* ════════════ STEP 1 — Contact ════════════ */}
                          {step === 1 && (
                            <>
                              <div>
                                <p className="text-base font-black text-white">Who are you?</p>
                                <p className="text-[11px] text-zinc-600 mt-0.5">We&apos;ll use this to confirm your spot.</p>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <Label><User size={9} className="inline mr-1" />Full Name *</Label>
                                  <input value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Your full name" autoComplete="name" className={inputCls} />
                                </div>
                                <div>
                                  <Label><Phone size={9} className="inline mr-1" />Phone *</Label>
                                  <input type="tel" inputMode="tel" value={phone}
                                    onChange={e => setPhone(formatPhone(e.target.value))}
                                    placeholder="(802) 555-0100" autoComplete="tel" className={inputCls} />
                                </div>
                                <div>
                                  <Label><Mail size={9} className="inline mr-1" />Email *</Label>
                                  <input type="email" inputMode="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com" autoComplete="email" className={inputCls} />
                                  <p className="text-[10px] text-zinc-700 mt-1">Confirmation sent here.</p>
                                </div>
                                <div>
                                  <Label><MessageSquare size={9} className="inline mr-1" />Preferred contact</Label>
                                  <div className="flex gap-2">
                                    {CONTACT_PREFS.map(({ id, label }) => (
                                      <button key={id} type="button" onClick={() => setContactPref(id)}
                                        className={`flex-1 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                          contactPref === id
                                            ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                            : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                                        }`}
                                      >{label}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <button type="button" disabled={!step1Valid} onClick={() => setStep(2)} className={goldBtn}>
                                Next — Service Details
                              </button>
                            </>
                          )}

                          {/* ════════════ STEP 2 — Service ════════════ */}
                          {step === 2 && (
                            <>
                              <div>
                                <p className="text-base font-black text-white">What do you need?</p>
                                <p className="text-[11px] text-zinc-600 mt-0.5">Tell us about the vehicle and where we&apos;re going.</p>
                              </div>

                              {/* Service type tabs */}
                              <div>
                                <Label>Service type</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  {SERVICE_TYPES.map(({ id, label, icon: Icon, color, bg, border }) => (
                                    <button key={id} type="button"
                                      onClick={() => { setServiceType(id); setSpecificService(""); }}
                                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all active:scale-95 ${
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

                              {/* Service chips with pricing */}
                              <div>
                                <Label>Which service?</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {serviceList.map(({ label, price }) => {
                                    const active = specificService === label;
                                    return (
                                      <button key={label} type="button"
                                        onClick={() => setSpecificService(label)}
                                        className={`flex flex-col items-start px-3 py-3 rounded-xl border text-left transition-all active:scale-95 ${
                                          active
                                            ? "bg-[#D4AF37]/10 border-[#D4AF37]/40"
                                            : "bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]"
                                        }`}
                                      >
                                        <span className={`text-[11px] font-bold leading-snug ${active ? "text-[#D4AF37]" : "text-zinc-300"}`}>
                                          {label}
                                        </span>
                                        {price && (
                                          <span className={`text-[10px] mt-0.5 font-semibold ${active ? "text-[#D4AF37]/60" : "text-zinc-600"}`}>
                                            {price}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Vehicle input with autofill */}
                              {serviceType === "auto" && (
                                <div>
                                  <Label><Car size={9} className="inline mr-1" />Your vehicle</Label>

                                  {/* Autofill suggestions */}
                                  {!vehicleSuggestionDismissed && vehicleSuggestions.length > 0 && !vehicleStr && (
                                    <div className="mb-2 rounded-xl bg-[#D4AF37]/[0.05] border border-[#D4AF37]/15 px-3 py-2.5">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37]/60 mb-1.5">From your past bookings</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {vehicleSuggestions.map(v => (
                                          <button key={v} type="button"
                                            onClick={() => setVehicleStr(v)}
                                            className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[11px] text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/20 active:scale-95 transition-all"
                                          >{v}</button>
                                        ))}
                                        <button type="button"
                                          onClick={() => setVehicleSuggestionDismissed(true)}
                                          className="px-2 py-1.5 text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
                                        >dismiss</button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="relative">
                                    <input value={vehicleStr} onChange={e => setVehicleStr(e.target.value)}
                                      placeholder="2019 Honda CR-V, 2022 Ford F-150…"
                                      autoComplete="off"
                                      className={inputCls}
                                    />
                                    {vehicleSuggestionsLoading && (
                                      <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 animate-spin" />
                                    )}
                                  </div>

                                  {/* Inline dropdown when typing */}
                                  {vehicleStr.trim().length >= 1 && filteredSuggestions.length > 0 && (
                                    <div className="mt-1 rounded-xl border border-white/[0.08] bg-zinc-900 overflow-hidden">
                                      {filteredSuggestions.map(v => (
                                        <button key={v} type="button"
                                          onClick={() => setVehicleStr(v)}
                                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left border-b border-white/[0.04] last:border-0"
                                        >
                                          <Car size={12} className="text-zinc-600 shrink-0" />
                                          {v}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Boat / RV length */}
                              {(serviceType === "boat" || serviceType === "rv") && (
                                <div>
                                  <Label>{serviceType === "boat" ? "Boat" : "RV"} length (feet)</Label>
                                  <input type="number" inputMode="numeric" value={footage}
                                    onChange={e => setFootage(e.target.value)}
                                    placeholder={serviceType === "boat" ? "e.g. 22" : "e.g. 30"}
                                    min={1} className={inputCls}
                                  />
                                  <p className="text-[10px] text-zinc-700 mt-1">
                                    {serviceType === "boat" ? "Pricing is per foot of boat length." : "Min 20 ft. Pricing is per foot."}
                                  </p>
                                </div>
                              )}

                              {/* Address */}
                              <div>
                                <Label><MapPin size={9} className="inline mr-1" />Where should we come? *</Label>
                                <input value={serviceAddress} onChange={e => setServiceAddress(e.target.value)}
                                  placeholder="123 Main St, Williston, VT"
                                  autoComplete="street-address" className={inputCls}
                                />
                                <p className="text-[10px] text-zinc-700 mt-1">Home, office, marina, storage lot, etc.</p>
                              </div>

                              <div className="flex gap-2">
                                <button type="button" onClick={() => setStep(1)} className={backBtn}>
                                  <ChevronLeft size={13} />Back
                                </button>
                                <button type="button" disabled={!step2Valid} onClick={() => setStep(3)}
                                  className={`${goldBtn} flex-1 w-auto`}
                                >Next — Availability</button>
                              </div>
                            </>
                          )}

                          {/* ════════════ STEP 3 — Availability ════════════ */}
                          {step === 3 && (
                            <>
                              <div>
                                <p className="text-base font-black text-white">When are you free?</p>
                                <p className="text-[11px] text-zinc-600 mt-0.5">Pick as many as fit — we&apos;ll work around you.</p>
                              </div>

                              <div>
                                <Label>How soon do you need it?</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {URGENCY_OPTIONS.map(({ id, label, color, activeBg, activeBorder }) => (
                                    <button key={id} type="button" onClick={() => setUrgency(id)}
                                      className={`py-3 px-3 rounded-xl border text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                        urgency === id
                                          ? `${activeBg} ${activeBorder} ${color}`
                                          : "bg-white/[0.02] border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                                      }`}
                                    >{label}</button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label>Which days work for you?</Label>
                                <div className="flex flex-wrap gap-1.5">
                                  {DAYS_OF_WEEK.map(({ id, label }) => (
                                    <button key={id} type="button" onClick={() => toggleDay(id)}
                                      className={`px-3 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                        days.includes(id)
                                          ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                          : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                                      }`}
                                    >{label}</button>
                                  ))}
                                  <button type="button" onClick={() => setDays([])}
                                    className={`px-3 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                      days.length === 0
                                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                        : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                                    }`}
                                  >Any</button>
                                </div>
                              </div>

                              <div>
                                <Label>Time of day?</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {TIME_OF_DAY.map(({ id, label, sub }) => (
                                    <button key={id} type="button" onClick={() => toggleTime(id)}
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
                                  <p className="text-[10px] text-zinc-700 mt-1">Select at least one, or pick All Day.</p>
                                )}
                              </div>

                              <div>
                                <Label>
                                  <MessageSquare size={9} className="inline mr-1" />
                                  Anything else? <span className="normal-case font-normal text-zinc-700">(optional)</span>
                                </Label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                  placeholder="Special requests, gate codes, vehicle condition, etc."
                                  className={`${inputCls} resize-none leading-relaxed`}
                                />
                              </div>

                              {(days.length > 0 || times.length > 0) && (
                                <div className="rounded-xl bg-[#D4AF37]/[0.04] border border-[#D4AF37]/10 px-3 py-3">
                                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mb-1">Sending availability</p>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed italic">
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
                                <button type="button" onClick={() => setStep(2)} className={backBtn}>
                                  <ChevronLeft size={13} />Back
                                </button>
                                <button type="button" onClick={handleSubmit}
                                  disabled={!step3Valid || submitting}
                                  className={`${goldBtn} flex-1 w-auto`}
                                >
                                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                  {submitting ? "Sending…" : "Request a Spot"}
                                </button>
                              </div>

                              <p className="text-center text-[10px] text-zinc-700">
                                Or call/text directly:{" "}
                                <a href="tel:8025855563" className="text-zinc-500 hover:text-white transition-colors">802-585-5563</a>
                              </p>
                            </>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    </>
                  )}

                </AnimatePresence>

                <div className="h-safe-bottom" />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
