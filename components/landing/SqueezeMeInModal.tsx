"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  X, Zap, Car, Anchor, Truck,
  Check, Loader2, ChevronLeft, Sparkles, Clock, Phone,
} from "lucide-react";
import { createSqueezeRequest, getRecentVehiclesByContact } from "@/app/actions/squeezeActions";

// ── Google Places singleton loader ────────────────────────────────────────────
let _placesLoaded = false;
let _placesPromise: Promise<void> | null = null;

function loadGooglePlaces(): Promise<void> {
  if (_placesLoaded) return Promise.resolve();
  if (_placesPromise) return _placesPromise;
  setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", v: "weekly" });
  _placesPromise = importLibrary("places").then(() => { _placesLoaded = true; });
  return _placesPromise;
}

// ── NHTSA model fetcher ───────────────────────────────────────────────────────
async function fetchModelsForMake(make: string): Promise<string[]> {
  if (!make.trim()) return [];
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make.trim())}?format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    return ((data.Results ?? []) as { Model_Name: string }[])
      .map(r => r.Model_Name).filter(Boolean).sort();
  } catch { return []; }
}

const COMMON_MAKES = [
  "Acura","Alfa Romeo","Audi","BMW","Bentley","Buick","Cadillac","Chevrolet",
  "Chrysler","Dodge","Ferrari","Fiat","Ford","GMC","Genesis","Honda","Hyundai",
  "Infiniti","Jaguar","Jeep","Kia","Lamborghini","Land Rover","Lexus","Lincoln",
  "Lotus","Maserati","Mazda","McLaren","Mercedes-Benz","Mini","Mitsubishi",
  "Nissan","Pontiac","Porsche","Ram","Rivian","Rolls-Royce","Saturn","Scion",
  "Subaru","Tesla","Toyota","Volkswagen","Volvo",
];

// ── Data ──────────────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  { id: "auto", label: "Auto",  icon: Car    },
  { id: "boat", label: "Boat",  icon: Anchor },
  { id: "rv",   label: "RV",    icon: Truck  },
] as const;

const AUTO_SERVICES = [
  { label: "Exterior Detail",                    price: "$130–$170",  desc: "Hand wash, wheels, tires & 3-mo ceramic sealant"          },
  { label: "Interior Detail",                    price: "$150–$185",  desc: "Full vacuum, wipe-down, mats & interior glass"            },
  { label: "Full Detail",                        price: "$240–$280",  desc: "Interior + exterior combined"                             },
  { label: "Ultimate Interior Reset",            price: "$240–$270",  desc: "Hot water extraction, steam sanitation & salt removal"    },
  { label: "Ultimate Interior + Exterior Reset", price: "$350–$400",  desc: "Full decontamination, clay bar & 6-mo ceramic spray"     },
  { label: "Not sure yet",                       price: "",           desc: "We'll figure it out together"                             },
];
const BOAT_SERVICES = [
  { label: "Boat Interior",    price: "$15/ft",    desc: "Vinyl, carpet, upholstery & odor treatment"    },
  { label: "Boat Exterior",    price: "$20/ft",    desc: "Hull wash, oxidation removal & wax/sealant"    },
  { label: "Boat Full Detail", price: "$32/ft",    desc: "Interior + exterior combined"                  },
  { label: "Showroom Package", price: "$55/ft",    desc: "Machine polish + ceramic coating topcoat"      },
  { label: "Not sure yet",     price: "",          desc: "We'll figure it out together"                  },
];
const RV_SERVICES = [
  { label: "Exterior Refresh",        price: "$18/ft",    desc: "Full wash, clay bar & wax"                             },
  { label: "Living Space Reset",      price: "$28/ft",    desc: "Interior deep clean — surfaces, upholstery & fixtures" },
  { label: "Ultimate Transformation", price: "$50/ft",    desc: "Interior + exterior full detail"                       },
  { label: "Oxidation Restoration",   price: "$35–45/ft", desc: "Machine polish to restore faded paint"                 },
  { label: "Not sure yet",            price: "",          desc: "We'll figure it out together"                          },
];

const URGENCY_OPTIONS = [
  { id: "today",     emoji: "🔴", label: "Today",     sub: "I need it ASAP",       color: "text-red-400",    activeBg: "bg-red-500/[0.08]",    activeBorder: "border-red-500/30"    },
  { id: "tomorrow",  emoji: "🟠", label: "Tomorrow",  sub: "Within 24 hours",      color: "text-orange-400", activeBg: "bg-orange-500/[0.08]", activeBorder: "border-orange-500/30" },
  { id: "this_week", emoji: "🟡", label: "This Week", sub: "Next few days",         color: "text-amber-400",  activeBg: "bg-amber-500/[0.08]",  activeBorder: "border-amber-500/30"  },
  { id: "soon",      emoji: "⚪", label: "Flexible",  sub: "Whenever works",        color: "text-zinc-400",   activeBg: "bg-zinc-800/60",       activeBorder: "border-zinc-600/30"   },
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
  const daysStr  = days.length  > 0 ? days.map(d => dayLabel[d]  ?? d).join(", ")    : "Any day";
  const timesStr = times.length > 0 ? times.map(t => timeLabel[t] ?? t).join(" or ") : "any time";
  return `${daysStr} — ${timesStr}`;
}

function parseVehicleString(v: string): { year: string; make: string; model: string } {
  const parts = v.trim().split(/\s+/);
  const year  = /^(19|20)\d{2}$/.test(parts[0] ?? "") ? parts[0] : "";
  const rest  = year ? parts.slice(1) : parts;
  return { year, make: rest[0] ?? "", model: rest.slice(1).join(" ") };
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/50 transition-colors";

const chipBase =
  "transition-all duration-150 active:scale-[0.97] cursor-pointer";

const chipOff =
  `${chipBase} bg-[#1c1c1c] border border-[#2e2e2e] hover:border-[#3a3a3a]`;

const chipOn =
  `${chipBase} bg-[#D4AF37]/[0.07] border border-[#D4AF37]/50 text-[#D4AF37]`;

const goldBtn =
  "btn-primary-gold-shimmer w-full py-[14px] rounded-2xl bg-[#D4AF37] text-black font-black text-[13px] uppercase tracking-widest transition-all duration-500 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600 mb-2.5">{children}</p>;
}

// ── Google Places input ───────────────────────────────────────────────────────
interface PlacesInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}
function PlacesInput({ value, onChange, placeholder, className }: PlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef    = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    loadGooglePlaces().then(() => {
      if (!inputRef.current || acRef.current) return;
      acRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["address"], componentRestrictions: { country: "us" }, fields: ["formatted_address"],
      });
      acRef.current.addListener("place_changed", () => {
        const addr = acRef.current?.getPlace().formatted_address ?? "";
        if (addr) onChange(addr);
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) inputRef.current.value = value;
  }, [value]);

  return (
    <input ref={inputRef} defaultValue={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} autoComplete="off" className={className} />
  );
}

// ── Autocomplete dropdown ─────────────────────────────────────────────────────
function SuggestDropdown({ items, onSelect }: { items: string[]; onSelect: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl border border-[#2e2e2e] bg-[#181818] shadow-2xl z-20 max-h-44 overflow-y-auto">
      {items.slice(0, 12).map(item => (
        <button key={item} type="button"
          onMouseDown={e => { e.preventDefault(); onSelect(item); }}
          className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors border-b border-[#252525] last:border-0"
        >{item}</button>
      ))}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────
function Segment<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl p-1 gap-1">
      {options.map(({ id, label }) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all ${
            value === id ? "bg-[#D4AF37] text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >{label}</button>
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
interface SqueezeMeInModalProps { isOpen: boolean; onClose: () => void; }

export function SqueezeMeInModal({ isOpen, onClose }: SqueezeMeInModalProps) {
  const [step,            setStep]            = useState<1 | 2 | 3>(1);
  const [submitting,      setSubmitting]       = useState(false);
  const [submitted,       setSubmitted]        = useState(false);
  const [showExitConfirm, setShowExitConfirm]  = useState(false);
  const [submitError,     setSubmitError]      = useState<string | null>(null);

  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [contactPref, setContactPref] = useState("either");

  const [serviceType,     setServiceType]     = useState("auto");
  const [specificService, setSpecificService] = useState("");
  const [serviceAddress,  setServiceAddress]  = useState("");
  const [vehicleYear,     setVehicleYear]     = useState("");
  const [vehicleMake,     setVehicleMake]     = useState("");
  const [vehicleModel,    setVehicleModel]    = useState("");
  const [footage,         setFootage]         = useState("");

  const [makeSuggestions,    setMakeSuggestions]    = useState<string[]>([]);
  const [showMakeDrop,       setShowMakeDrop]        = useState(false);
  const [modelSuggestions,   setModelSuggestions]    = useState<string[]>([]);
  const [showModelDrop,      setShowModelDrop]       = useState(false);
  const [modelsLoading,      setModelsLoading]       = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  const [urgency, setUrgency] = useState("this_week");
  const [days,    setDays]    = useState<string[]>([]);
  const [times,   setTimes]   = useState<string[]>([]);
  const [notes,   setNotes]   = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const pb = document.body.style.overflow, ph = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = pb; document.documentElement.style.overflow = ph; };
  }, [isOpen]);

  useEffect(() => {
    if (step !== 2 || vehicleSuggestions.length > 0 || suggestionsLoading || suggestionsDismissed) return;
    const p = phone.replace(/\D/g, ""), e = email.trim();
    if (!p && !e) return;
    setSuggestionsLoading(true);
    getRecentVehiclesByContact(p, e).then(setVehicleSuggestions).catch(() => {}).finally(() => setSuggestionsLoading(false));
  }, [step]);

  const onMakeChange = useCallback((v: string) => {
    setVehicleMake(v); setVehicleModel(""); setModelSuggestions([]);
    const q = v.trim().toLowerCase();
    setMakeSuggestions(q.length >= 1 ? COMMON_MAKES.filter(m => m.toLowerCase().startsWith(q)) : []);
    setShowMakeDrop(q.length >= 1);
  }, []);

  useEffect(() => {
    const make = vehicleMake.trim();
    if (!make || make.length < 2) { setModelSuggestions([]); return; }
    setModelsLoading(true);
    const t = setTimeout(() => {
      fetchModelsForMake(make).then(setModelSuggestions).finally(() => setModelsLoading(false));
    }, 450);
    return () => clearTimeout(t);
  }, [vehicleMake]);

  const step1Valid =
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length === 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const step2Valid = specificService.length > 0 && serviceAddress.trim().length >= 5;
  const urgencyIsSpecific = urgency === "today" || urgency === "tomorrow";

  function tryClose() {
    if (submitted) { doClose(); return; }
    setShowExitConfirm(true);
  }

  function doClose() {
    setShowExitConfirm(false); onClose();
    setTimeout(() => {
      setStep(1); setSubmitted(false); setShowExitConfirm(false); setSubmitError(null);
      setName(""); setPhone(""); setEmail(""); setContactPref("either");
      setServiceType("auto"); setSpecificService(""); setServiceAddress("");
      setVehicleYear(""); setVehicleMake(""); setVehicleModel(""); setFootage("");
      setMakeSuggestions([]); setShowMakeDrop(false); setModelSuggestions([]); setShowModelDrop(false);
      setVehicleSuggestions([]); setSuggestionsLoading(false); setSuggestionsDismissed(false);
      setUrgency("this_week"); setDays([]); setTimes([]); setNotes("");
    }, 300);
  }

  function toggleDay(id: string) { setDays(p => p.includes(id) ? p.filter(d => d !== id) : [...p, id]); }
  function toggleTime(id: string) {
    if (id === "all_day") { setTimes(p => p.includes("all_day") ? [] : ["all_day"]); return; }
    setTimes(p => { const w = p.filter(t => t !== "all_day"); return w.includes(id) ? w.filter(t => t !== id) : [...w, id]; });
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true); setSubmitError(null);
    const vehicleInfo = serviceType === "auto"
      ? [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ") || undefined
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
    if (res.success) setSubmitted(true);
    else setSubmitError("Something went wrong — please try again or call 802-585-5563.");
  }

  const serviceList = serviceType === "boat" ? BOAT_SERVICES : serviceType === "rv" ? RV_SERVICES : AUTO_SERVICES;
  const filteredModels = vehicleModel.trim().length >= 1
    ? modelSuggestions.filter(m => m.toLowerCase().includes(vehicleModel.toLowerCase()))
    : modelSuggestions;

  const stepNames = ["Your Info", "Service Details", "Availability"];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={showExitConfirm ? undefined : tryClose}
            className="fixed inset-0 z-[72] bg-black/85 backdrop-blur-md"
          />

          {/* Modal wrapper */}
          <div className="fixed inset-0 z-[73] flex items-center justify-center px-4 py-6 pointer-events-none">
            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[440px] max-h-[90dvh] flex flex-col rounded-3xl overflow-hidden pointer-events-auto"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex flex-col bg-[#111111] border border-[#222222] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden">

                {/* Progress bar */}
                {!submitted && !showExitConfirm && (
                  <div className="h-[2px] bg-[#1e1e1e] shrink-0">
                    <motion.div
                      className="h-full bg-[#D4AF37]"
                      animate={{ width: `${(step / 3) * 100}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}

                {/* Header */}
                <div className="px-6 pt-5 pb-5 flex items-center justify-between shrink-0 border-b border-[#1e1e1e]">
                  <div className="flex items-center gap-3">
                    <Zap size={17} className="text-[#D4AF37] shrink-0" />
                    <div>
                      <h2 className="text-[15px] font-black text-white tracking-tight leading-none">Squeeze Me In</h2>
                      <p className="text-[11px] text-zinc-600 mt-1 font-medium">
                        {submitted ? "Request received" : showExitConfirm ? "One second…" : stepNames[step - 1]}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={tryClose}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all"
                  ><X size={15} /></button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto overscroll-contain">
                  <AnimatePresence mode="wait" initial={false}>

                    {/* ── Exit confirm ── */}
                    {showExitConfirm ? (
                      <motion.div key="exit"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                        className="px-8 py-12 flex flex-col items-center text-center gap-7"
                      >
                        <div>
                          <p className="text-xl font-black text-white">Leave without saving?</p>
                          <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-[220px] mx-auto">
                            Your progress won&apos;t be saved.
                          </p>
                        </div>
                        <div className="w-full space-y-2">
                          <button type="button" onClick={() => setShowExitConfirm(false)} className={goldBtn}>
                            Keep Going
                          </button>
                          <button type="button" onClick={doClose}
                            className="w-full py-3.5 rounded-2xl text-zinc-600 font-semibold text-sm hover:text-zinc-400 transition-colors"
                          >
                            Leave
                          </button>
                        </div>
                      </motion.div>

                    /* ── Success ── */
                    ) : submitted ? (
                      <motion.div key="success"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                        className="px-6 py-10 flex flex-col items-center text-center gap-6"
                      >
                        <div className="relative inline-flex">
                          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
                            <Check size={26} className="text-[#D4AF37]" strokeWidth={2.5} />
                          </div>
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center">
                            <Sparkles size={11} className="text-[#D4AF37]" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xl font-black text-white">You&apos;re on the list!</p>
                          <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-[280px]">
                            We&apos;ll reach out by{" "}
                            <span className="text-zinc-300">{contactPref === "call" ? "phone call" : contactPref === "text" ? "text" : "call or text"}</span>{" "}
                            the moment a spot opens.
                          </p>
                        </div>
                        <div className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl px-5 py-4 text-left space-y-3">
                          <div className="flex items-start gap-3 text-[13px] text-zinc-400">
                            <Clock size={13} className="text-[#D4AF37] mt-0.5 shrink-0" />
                            <span>First in line for cancellations &amp; early finishes</span>
                          </div>
                          <div className="flex items-start gap-3 text-[13px] text-zinc-400">
                            <Phone size={13} className="text-[#D4AF37] mt-0.5 shrink-0" />
                            <span>
                              Need it faster?{" "}
                              <a href="tel:8025855563" className="text-[#D4AF37] font-semibold hover:underline">802-585-5563</a>
                            </span>
                          </div>
                        </div>
                        <button type="button" onClick={doClose} className={goldBtn}>Done</button>
                      </motion.div>

                    /* ── Steps ── */
                    ) : (
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={step}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                          className="px-6 pt-6 pb-8 space-y-6"
                        >

                          {/* ══ STEP 1 — Contact ══ */}
                          {step === 1 && (
                            <>
                              <div>
                                <p className="text-xl font-black text-white tracking-tight">Let&apos;s get you in line.</p>
                                <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                                  Spot requests go first when something opens up.
                                </p>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <Label>Name</Label>
                                  <input value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Your full name" autoComplete="name" className={inputCls} />
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <input type="tel" inputMode="tel" value={phone}
                                    onChange={e => setPhone(formatPhone(e.target.value))}
                                    placeholder="(802) 555-0100" autoComplete="tel" className={inputCls} />
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <input type="email" inputMode="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com" autoComplete="email" className={inputCls} />
                                </div>
                                <div>
                                  <Label>Best way to reach you</Label>
                                  <Segment
                                    options={[...CONTACT_PREFS]}
                                    value={contactPref as "call" | "text" | "either"}
                                    onChange={setContactPref as (v: "call" | "text" | "either") => void}
                                  />
                                </div>
                              </div>

                              <button type="button" disabled={!step1Valid} onClick={() => setStep(2)} className={goldBtn}>
                                Continue
                              </button>
                            </>
                          )}

                          {/* ══ STEP 2 — Service ══ */}
                          {step === 2 && (
                            <>
                              <div>
                                <p className="text-xl font-black text-white tracking-tight">What do you need?</p>
                                <p className="text-sm text-zinc-500 mt-1.5">Service, vehicle, and where we&apos;re coming.</p>
                              </div>

                              {/* Service type tabs */}
                              <div>
                                <Label>Service type</Label>
                                <div className="flex bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl p-1 gap-1">
                                  {SERVICE_TYPES.map(({ id, label, icon: Icon }) => (
                                    <button key={id} type="button"
                                      onClick={() => { setServiceType(id); setSpecificService(""); }}
                                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all ${
                                        serviceType === id ? "bg-[#D4AF37] text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                      }`}
                                    >
                                      <Icon size={13} />
                                      <span>{label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Service list */}
                              <div>
                                <Label>Package</Label>
                                <div className="space-y-2">
                                  {serviceList.map(({ label, price, desc }) => {
                                    const active = specificService === label;
                                    return (
                                      <button key={label} type="button" onClick={() => setSpecificService(label)}
                                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                                          active ? chipOn : chipOff
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0 pr-3">
                                          <p className={`text-sm font-semibold leading-snug ${active ? "text-[#D4AF37]" : "text-zinc-200"}`}>{label}</p>
                                          {desc && <p className={`text-xs mt-0.5 leading-snug ${active ? "text-zinc-500" : "text-zinc-600"}`}>{desc}</p>}
                                        </div>
                                        {price
                                          ? <span className={`text-sm font-black tabular-nums shrink-0 ${active ? "text-[#D4AF37]" : "text-zinc-500"}`}>{price}</span>
                                          : active && <Check size={14} className="text-[#D4AF37] shrink-0" />
                                        }
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Vehicle (auto) */}
                              {serviceType === "auto" && (
                                <div>
                                  <Label>Vehicle <span className="normal-case font-normal text-zinc-700">— optional</span></Label>

                                  {!suggestionsDismissed && vehicleSuggestions.length > 0 && !vehicleMake && !vehicleModel && (
                                    <div className="mb-3 bg-[#1c1c1c] border border-[#D4AF37]/20 rounded-2xl px-4 py-3">
                                      <p className="text-[11px] text-[#D4AF37]/60 font-semibold mb-2">From your past bookings</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {vehicleSuggestions.map(v => (
                                          <button key={v} type="button"
                                            onClick={() => { const p = parseVehicleString(v); setVehicleYear(p.year); setVehicleMake(p.make); setVehicleModel(p.model); }}
                                            className="px-3 py-1.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[12px] text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/20 active:scale-95 transition-all"
                                          >{v}</button>
                                        ))}
                                        <button type="button" onClick={() => setSuggestionsDismissed(true)}
                                          className="px-2 py-1.5 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors"
                                        >dismiss</button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Year</p>
                                      <input value={vehicleYear}
                                        onChange={e => setVehicleYear(e.target.value.replace(/\D/g,"").slice(0,4))}
                                        placeholder="2020" inputMode="numeric" maxLength={4} className={inputCls} />
                                    </div>
                                    <div className="relative">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">Make</p>
                                      <input value={vehicleMake}
                                        onChange={e => onMakeChange(e.target.value)}
                                        onFocus={() => vehicleMake.length >= 1 && setShowMakeDrop(true)}
                                        onBlur={() => setTimeout(() => setShowMakeDrop(false), 150)}
                                        placeholder="Honda" autoComplete="off" className={inputCls}
                                      />
                                      {showMakeDrop && <SuggestDropdown items={makeSuggestions} onSelect={v => { setVehicleMake(v); setMakeSuggestions([]); setShowMakeDrop(false); }} />}
                                    </div>
                                    <div className="relative">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-700 mb-1.5">
                                        Model {modelsLoading && <Loader2 size={9} className="inline animate-spin ml-0.5" />}
                                      </p>
                                      <input value={vehicleModel}
                                        onChange={e => { setVehicleModel(e.target.value); setShowModelDrop(true); }}
                                        onFocus={() => filteredModels.length > 0 && setShowModelDrop(true)}
                                        onBlur={() => setTimeout(() => setShowModelDrop(false), 150)}
                                        placeholder="Civic" autoComplete="off" className={inputCls}
                                      />
                                      {showModelDrop && <SuggestDropdown items={filteredModels} onSelect={v => { setVehicleModel(v); setShowModelDrop(false); }} />}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Boat / RV footage */}
                              {(serviceType === "boat" || serviceType === "rv") && (
                                <div>
                                  <Label>{serviceType === "boat" ? "Boat" : "RV"} length (feet)</Label>
                                  <input type="number" inputMode="numeric" value={footage}
                                    onChange={e => setFootage(e.target.value)} min={1}
                                    placeholder={serviceType === "boat" ? "e.g. 22" : "e.g. 30"}
                                    className={inputCls}
                                  />
                                  <p className="text-[12px] text-zinc-600 mt-2">
                                    {serviceType === "boat" ? "Pricing is per foot of boat length." : "Min 20 ft · pricing is per foot."}
                                  </p>
                                </div>
                              )}

                              {/* Address */}
                              <div>
                                <Label>Where should we come?</Label>
                                <PlacesInput value={serviceAddress} onChange={setServiceAddress}
                                  placeholder="Start typing your address…" className={inputCls} />
                                <p className="text-[12px] text-zinc-600 mt-2">Home, office, marina, storage lot, etc.</p>
                              </div>

                              <div className="flex items-center gap-3 pt-1">
                                <button type="button" onClick={() => setStep(1)}
                                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-sm font-medium transition-colors py-2 shrink-0"
                                ><ChevronLeft size={14} />Back</button>
                                <button type="button" disabled={!step2Valid} onClick={() => setStep(3)} className={`${goldBtn} flex-1`}>
                                  Continue
                                </button>
                              </div>
                            </>
                          )}

                          {/* ══ STEP 3 — Availability ══ */}
                          {step === 3 && (
                            <>
                              <div>
                                <p className="text-xl font-black text-white tracking-tight">When do you need it?</p>
                                <p className="text-sm text-zinc-500 mt-1.5">We&apos;ll reach out the moment a spot opens.</p>
                              </div>

                              {/* Urgency */}
                              <div>
                                <Label>How soon?</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {URGENCY_OPTIONS.map(({ id, emoji, label, sub, color, activeBg, activeBorder }) => (
                                    <button key={id} type="button" onClick={() => setUrgency(id)}
                                      className={`flex flex-col items-start px-4 py-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                                        urgency === id ? `${activeBg} ${activeBorder}` : chipOff
                                      }`}
                                    >
                                      <span className="text-lg mb-1.5 leading-none">{emoji}</span>
                                      <span className={`text-sm font-bold ${urgency === id ? color : "text-zinc-300"}`}>{label}</span>
                                      <span className={`text-[11px] mt-0.5 ${urgency === id ? "text-zinc-500" : "text-zinc-700"}`}>{sub}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Days */}
                              <div>
                                <Label>
                                  Days that work
                                  {urgencyIsSpecific && <span className="ml-1 normal-case font-normal text-zinc-700">· optional</span>}
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                  {DAYS_OF_WEEK.map(({ id, label }) => (
                                    <button key={id} type="button" onClick={() => toggleDay(id)}
                                      className={`px-3.5 py-2.5 rounded-xl border text-[12px] font-bold uppercase tracking-wider ${
                                        days.includes(id) ? chipOn : chipOff
                                      }`}
                                    >{label}</button>
                                  ))}
                                  <button type="button" onClick={() => setDays([])}
                                    className={`px-3.5 py-2.5 rounded-xl border text-[12px] font-bold uppercase tracking-wider ${
                                      days.length === 0 ? chipOn : chipOff
                                    }`}
                                  >Any</button>
                                </div>
                              </div>

                              {/* Time of day */}
                              <div>
                                <Label>
                                  Time of day
                                  {urgencyIsSpecific && <span className="ml-1 normal-case font-normal text-zinc-700">· optional</span>}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {TIME_OF_DAY.map(({ id, label, sub }) => (
                                    <button key={id} type="button" onClick={() => toggleTime(id)}
                                      className={`flex flex-col items-start px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                                        times.includes(id) ? chipOn : chipOff
                                      }`}
                                    >
                                      <span className={`text-sm font-bold ${times.includes(id) ? "text-[#D4AF37]" : "text-zinc-300"}`}>{label}</span>
                                      <span className={`text-[11px] mt-0.5 ${times.includes(id) ? "text-[#D4AF37]/50" : "text-zinc-700"}`}>{sub}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Notes */}
                              <div>
                                <Label>Anything else? <span className="normal-case font-normal text-zinc-700">· optional</span></Label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                  placeholder="Special requests, gate codes, vehicle condition…"
                                  className={`${inputCls} resize-none leading-relaxed`}
                                />
                              </div>

                              {/* Availability preview */}
                              {(days.length > 0 || times.length > 0) && (
                                <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl px-4 py-3.5">
                                  <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-wider mb-1.5">Your availability</p>
                                  <p className="text-sm text-zinc-300">{buildAvailableDatesString(days, times)}</p>
                                </div>
                              )}

                              {submitError && (
                                <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-4 py-3">{submitError}</p>
                              )}

                              <div className="flex items-center gap-3 pt-1">
                                <button type="button" onClick={() => setStep(2)}
                                  className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-sm font-medium transition-colors py-2 shrink-0"
                                ><ChevronLeft size={14} />Back</button>
                                <button type="button" onClick={handleSubmit} disabled={submitting} className={`${goldBtn} flex-1`}>
                                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                  {submitting ? "Sending…" : "Request a Spot"}
                                </button>
                              </div>

                              <p className="text-center text-[12px] text-zinc-700 pt-1">
                                Or call/text{" "}
                                <a href="tel:8025855563" className="text-zinc-500 hover:text-[#D4AF37] transition-colors font-medium">802-585-5563</a>
                              </p>
                            </>
                          )}

                        </motion.div>
                      </AnimatePresence>
                    )}

                  </AnimatePresence>
                  <div className="h-safe-bottom" />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
