"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  X, Zap, Phone, User, Mail, Car, Anchor, Truck,
  Check, Loader2, MapPin, MessageSquare, ChevronLeft,
  AlertTriangle, Sparkles, Clock,
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
      .map(r => r.Model_Name)
      .filter(Boolean)
      .sort();
  } catch { return []; }
}

// ── Common car makes (instant filtering, no API needed) ───────────────────────
const COMMON_MAKES = [
  "Acura","Alfa Romeo","Audi","BMW","Bentley","Buick","Cadillac","Chevrolet",
  "Chrysler","Dodge","Ferrari","Fiat","Ford","GMC","Genesis","Honda","Hyundai",
  "Infiniti","Jaguar","Jeep","Kia","Lamborghini","Land Rover","Lexus","Lincoln",
  "Lotus","Maserati","Mazda","McLaren","Mercedes-Benz","Mini","Mitsubishi",
  "Nissan","Pontiac","Porsche","Ram","Rivian","Rolls-Royce","Saturn","Scion",
  "Subaru","Tesla","Toyota","Volkswagen","Volvo",
];

// ── Service lists with pricing ────────────────────────────────────────────────
const SERVICE_TYPES = [
  { id: "auto", label: "Auto",  icon: Car,    color: "text-[#D4AF37]",   bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/30"   },
  { id: "boat", label: "Boat",  icon: Anchor, color: "text-blue-400",    bg: "bg-blue-500/10",  border: "border-blue-500/30"    },
  { id: "rv",   label: "RV",    icon: Truck,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
] as const;

const AUTO_SERVICES = [
  { label: "Exterior Detail",                    price: "$125–$150",  desc: "Hand wash, wheels, tires & 3-mo ceramic sealant"           },
  { label: "Interior Detail",                    price: "$150–$175",  desc: "Full vacuum, wipe-down, mats & interior glass"             },
  { label: "Full Detail",                        price: "$240–$260",  desc: "Interior + exterior combined"                              },
  { label: "Ultimate Interior Reset",            price: "$250 flat",  desc: "Hot water extraction, steam sanitation & salt removal"     },
  { label: "Ultimate Interior + Exterior Reset", price: "$350 flat",  desc: "Full decontamination, clay bar & 12-mo ceramic sealant"   },
  { label: "Not sure yet",                       price: "",           desc: "We'll figure it out together"                              },
];

const BOAT_SERVICES = [
  { label: "Boat Interior",          price: "$15/ft", desc: "Vinyl, carpet, upholstery & odor treatment"       },
  { label: "Boat Exterior",          price: "$20/ft", desc: "Hull wash, oxidation removal & wax/sealant"       },
  { label: "Boat Full Detail",       price: "$32/ft", desc: "Interior + exterior combined"                     },
  { label: "Showroom Package",       price: "$55/ft", desc: "Machine polish + ceramic coating topcoat"         },
  { label: "Not sure yet",           price: "",       desc: "We'll figure it out together"                     },
];

const RV_SERVICES = [
  { label: "Exterior Refresh",        price: "$18/ft",     desc: "Full wash, clay bar & wax"                         },
  { label: "Living Space Reset",      price: "$28/ft",     desc: "Interior deep clean — surfaces, upholstery & fixtures" },
  { label: "Ultimate Transformation", price: "$50/ft",     desc: "Interior + exterior full detail"                    },
  { label: "Oxidation Restoration",   price: "$35–45/ft",  desc: "Machine polish to restore faded paint"             },
  { label: "Not sure yet",            price: "",           desc: "We'll figure it out together"                      },
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
  const daysStr  = days.length  > 0 ? days.map(d => dayLabel[d]  ?? d).join(", ")    : "Any day";
  const timesStr = times.length > 0 ? times.map(t => timeLabel[t] ?? t).join(" or ") : "any time";
  return `${daysStr} — ${timesStr}`;
}

/** Split "2019 Honda Civic" → { year, make, model } */
function parseVehicleString(v: string): { year: string; make: string; model: string } {
  const parts = v.trim().split(/\s+/);
  const year  = /^(19|20)\d{2}$/.test(parts[0] ?? "") ? parts[0] : "";
  const rest  = year ? parts.slice(1) : parts;
  return { year, make: rest[0] ?? "", model: rest.slice(1).join(" ") };
}

const inputCls =
  "w-full bg-zinc-900 border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 ring-[#D4AF37]/25 transition-all";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500 mb-2.5">{children}</p>;
}

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-[3px] rounded-full transition-all duration-300 ${
          i < current ? "w-6 bg-[#D4AF37]" : i === current ? "w-6 bg-[#D4AF37]/40" : "w-3 bg-white/[0.08]"
        }`} />
      ))}
    </div>
  );
}

const goldBtn =
  "btn-primary-gold-shimmer w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black text-[12px] uppercase tracking-widest transition-all duration-500 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2";

const backBtn =
  "flex items-center gap-1.5 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-zinc-400 hover:text-white text-[12px] font-bold transition-all active:scale-95 shrink-0";

// ── Google Places address input ───────────────────────────────────────────────

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
        types:                ["address"],
        componentRestrictions: { country: "us" },
        fields:               ["formatted_address"],
      });
      acRef.current.addListener("place_changed", () => {
        const addr = acRef.current?.getPlace().formatted_address ?? "";
        if (addr) onChange(addr);
      });
    }).catch(() => {});
  }, []);

  // Keep DOM in sync when value is cleared externally (modal reset)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      defaultValue={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className={className}
    />
  );
}

// ── Autocomplete dropdown ─────────────────────────────────────────────────────

function SuggestDropdown({ items, onSelect }: { items: string[]; onSelect: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-white/[0.09] bg-zinc-900 shadow-xl z-20 max-h-44 overflow-y-auto">
      {items.slice(0, 12).map(item => (
        <button key={item} type="button"
          onMouseDown={e => { e.preventDefault(); onSelect(item); }}
          className="w-full text-left px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors border-b border-white/[0.04] last:border-0"
        >{item}</button>
      ))}
    </div>
  );
}

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

  // Step 1
  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [contactPref, setContactPref] = useState("either");

  // Step 2 — service
  const [serviceType,    setServiceType]    = useState("auto");
  const [specificService,setSpecificService]= useState("");
  const [serviceAddress, setServiceAddress] = useState("");

  // Step 2 — vehicle (separate fields)
  const [vehicleYear,  setVehicleYear]  = useState("");
  const [vehicleMake,  setVehicleMake]  = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [footage,      setFootage]      = useState("");

  // Make/model autocomplete
  const [makeSuggestions,    setMakeSuggestions]    = useState<string[]>([]);
  const [showMakeDrop,       setShowMakeDrop]        = useState(false);
  const [modelSuggestions,   setModelSuggestions]    = useState<string[]>([]);
  const [showModelDrop,      setShowModelDrop]       = useState(false);
  const [modelsLoading,      setModelsLoading]       = useState(false);

  // Past-vehicle autofill
  const [vehicleSuggestions, setVehicleSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsDismissed,setSuggestionsDismissed] = useState(false);

  // Step 3
  const [urgency, setUrgency] = useState("this_week");
  const [days,    setDays]    = useState<string[]>([]);
  const [times,   setTimes]   = useState<string[]>([]);
  const [notes,   setNotes]   = useState("");

  // ── Scroll lock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const pb = document.body.style.overflow, ph = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = pb; document.documentElement.style.overflow = ph; };
  }, [isOpen]);

  // ── Past-vehicle lookup on entering step 2 ───────────────────────────────────
  useEffect(() => {
    if (step !== 2 || vehicleSuggestions.length > 0 || suggestionsLoading || suggestionsDismissed) return;
    const p = phone.replace(/\D/g, ""), e = email.trim();
    if (!p && !e) return;
    setSuggestionsLoading(true);
    getRecentVehiclesByContact(p, e)
      .then(setVehicleSuggestions)
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  }, [step]);

  // ── Make autocomplete — filter COMMON_MAKES as user types ────────────────────
  const onMakeChange = useCallback((v: string) => {
    setVehicleMake(v);
    setVehicleModel(""); // reset model when make changes
    setModelSuggestions([]);
    const q = v.trim().toLowerCase();
    setMakeSuggestions(q.length >= 1 ? COMMON_MAKES.filter(m => m.toLowerCase().startsWith(q)) : []);
    setShowMakeDrop(q.length >= 1);
  }, []);

  // ── Model autocomplete — fetch from NHTSA when make is committed ──────────────
  useEffect(() => {
    const make = vehicleMake.trim();
    if (!make || make.length < 2) { setModelSuggestions([]); return; }
    setModelsLoading(true);
    const t = setTimeout(() => {
      fetchModelsForMake(make)
        .then(setModelSuggestions)
        .finally(() => setModelsLoading(false));
    }, 450);
    return () => clearTimeout(t);
  }, [vehicleMake]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const step1Valid =
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length === 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const step2Valid = specificService.length > 0 && serviceAddress.trim().length >= 5;
  const step3Valid = true; // urgency always has a default; days/times are optional context
  const urgencyIsSpecific = urgency === "today" || urgency === "tomorrow";

  // ── Close handling ────────────────────────────────────────────────────────────
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
      setMakeSuggestions([]); setShowMakeDrop(false);
      setModelSuggestions([]); setShowModelDrop(false);
      setVehicleSuggestions([]); setSuggestionsLoading(false); setSuggestionsDismissed(false);
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

  // Filtered model dropdown while typing
  const filteredModels = vehicleModel.trim().length >= 1
    ? modelSuggestions.filter(m => m.toLowerCase().includes(vehicleModel.toLowerCase()))
    : modelSuggestions;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={showExitConfirm ? undefined : tryClose}
            className="fixed inset-0 z-[72] bg-black/80 backdrop-blur-sm"
          />

          {/* Centered wrapper */}
          <div className="fixed inset-0 z-[73] flex items-center justify-center px-4 py-6 pointer-events-none">
            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md max-h-[88dvh] overflow-y-auto overscroll-contain rounded-2xl pointer-events-auto"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="bg-zinc-950 border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/60">

                {/* Header */}
                <div className="px-5 pt-5 pb-4 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10 rounded-t-2xl border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
                      <Zap size={15} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white tracking-tight">Squeeze Me In</h2>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                        {submitted ? "Request received ✓" : showExitConfirm ? "Just checking…" : (
                          <span>{["Your Info", "Service Details", "Availability"][step - 1]}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!submitted && !showExitConfirm && <Steps current={step - 1} total={3} />}
                    <button type="button" onClick={tryClose}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.08] transition-colors"
                    ><X size={14} /></button>
                  </div>
                </div>

                {/* Body */}
                <AnimatePresence mode="wait" initial={false}>

                  {/* ── Exit confirm ── */}
                  {showExitConfirm ? (
                    <motion.div key="exit"
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
                        <button type="button" onClick={() => setShowExitConfirm(false)} className={goldBtn}>Keep Going</button>
                        <button type="button" onClick={doClose}
                          className="w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 font-semibold text-sm hover:text-zinc-200 hover:border-white/20 active:scale-[0.99] transition-all"
                        >Exit without saving</button>
                      </div>
                    </motion.div>

                  /* ── Success ── */
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
                          <span className="text-zinc-300">{contactPref === "call" ? "phone call" : contactPref === "text" ? "text" : "call or text"}</span>{" "}
                          at <span className="text-zinc-300">{phone}</span>.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-4 text-left space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">What happens next</p>
                        <div className="space-y-2 text-[12px] text-zinc-400 leading-relaxed">
                          <div className="flex gap-2"><Clock  size={11} className="text-[#D4AF37] mt-0.5 shrink-0" /><span>We&apos;ll contact you the moment a spot opens</span></div>
                          <div className="flex gap-2"><Zap    size={11} className="text-[#D4AF37] mt-0.5 shrink-0" /><span>First in line for cancellations &amp; early finishes</span></div>
                          <div className="flex gap-2"><Phone  size={11} className="text-[#D4AF37] mt-0.5 shrink-0" /><span>Need it faster? <a href="tel:8025855563" className="text-[#D4AF37] font-semibold">802-585-5563</a></span></div>
                        </div>
                      </div>
                      <button type="button" onClick={doClose} className={goldBtn}>Done</button>
                    </motion.div>

                  /* ── Step form ── */
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={step}
                        initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.18 }}
                        className="p-5 space-y-6"
                      >

                        {/* ══════════ STEP 1 — Contact ══════════ */}
                        {step === 1 && (
                          <>
                            <div>
                              <p className="text-lg font-black text-white tracking-tight">Let&apos;s get you in line.</p>
                              <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
                                This is a spot request — we&apos;ll reach out the moment one opens up.
                              </p>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label>Full Name</Label>
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
                                <p className="text-[11px] text-zinc-600 mt-1.5">Confirmation sent here.</p>
                              </div>
                              <div>
                                <Label>How should we reach you?</Label>
                                <div className="flex gap-2">
                                  {CONTACT_PREFS.map(({ id, label }) => (
                                    <button key={id} type="button" onClick={() => setContactPref(id)}
                                      className={`flex-1 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                        contactPref === id
                                          ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                          : "bg-zinc-900 border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.14]"
                                      }`}
                                    >{label}</button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <button type="button" disabled={!step1Valid} onClick={() => setStep(2)} className={goldBtn}>
                              Continue
                            </button>
                          </>
                        )}

                        {/* ══════════ STEP 2 — Service ══════════ */}
                        {step === 2 && (
                          <>
                            <div>
                              <p className="text-lg font-black text-white tracking-tight">What do you need?</p>
                              <p className="text-[12px] text-zinc-500 mt-1">Service, vehicle, and where we&apos;re coming.</p>
                            </div>

                            {/* Service type */}
                            <div>
                              <Label>Type of service</Label>
                              <div className="grid grid-cols-3 gap-2">
                                {SERVICE_TYPES.map(({ id, label, icon: Icon, color, bg, border }) => (
                                  <button key={id} type="button"
                                    onClick={() => { setServiceType(id); setSpecificService(""); }}
                                    className={`relative flex flex-col items-center gap-2 py-4 rounded-xl border transition-all active:scale-95 ${
                                      serviceType === id ? `${bg} ${border} ${color}` : "bg-zinc-900 border-white/[0.08] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.14]"
                                    }`}
                                  >
                                    {serviceType === id && (
                                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
                                        <Check size={8} className="text-[#D4AF37]" />
                                      </span>
                                    )}
                                    <Icon size={20} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Service chips */}
                            <div>
                              <Label>Which package?</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {serviceList.map(({ label, price, desc }) => {
                                  const active = specificService === label;
                                  return (
                                    <button key={label} type="button" onClick={() => setSpecificService(label)}
                                      className={`relative flex flex-col items-start px-3.5 py-3.5 rounded-xl border text-left transition-all active:scale-95 ${
                                        active
                                          ? "bg-[#D4AF37]/[0.08] border-[#D4AF37]/40 shadow-[0_0_16px_rgba(212,175,55,0.06)]"
                                          : "bg-zinc-900 border-white/[0.08] hover:border-white/[0.16] hover:bg-zinc-800/60"
                                      }`}
                                    >
                                      {active && (
                                        <span className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
                                          <Check size={8} className="text-[#D4AF37]" />
                                        </span>
                                      )}
                                      <span className={`text-[12px] font-bold leading-snug pr-4 ${active ? "text-[#D4AF37]" : "text-zinc-200"}`}>{label}</span>
                                      {price && <span className={`text-[11px] mt-1 font-black tabular-nums ${active ? "text-[#D4AF37]/80" : "text-[#D4AF37]/50"}`}>{price}</span>}
                                      {desc && <span className={`text-[10px] mt-1 leading-snug ${active ? "text-zinc-400" : "text-zinc-600"}`}>{desc}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Vehicle — year / make / model */}
                            {serviceType === "auto" && (
                              <div>
                                <Label>Your vehicle <span className="normal-case font-normal text-zinc-700">(optional)</span></Label>

                                {!suggestionsDismissed && vehicleSuggestions.length > 0 && !vehicleMake && !vehicleModel && (
                                  <div className="mb-3 rounded-xl bg-[#D4AF37]/[0.05] border border-[#D4AF37]/15 px-3.5 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]/60 mb-2">From your past bookings</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {vehicleSuggestions.map(v => (
                                        <button key={v} type="button"
                                          onClick={() => {
                                            const parsed = parseVehicleString(v);
                                            setVehicleYear(parsed.year);
                                            setVehicleMake(parsed.make);
                                            setVehicleModel(parsed.model);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[11px] text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/20 active:scale-95 transition-all"
                                        >{v}</button>
                                      ))}
                                      <button type="button" onClick={() => setSuggestionsDismissed(true)}
                                        className="px-2 py-1.5 text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
                                      >dismiss</button>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Year</p>
                                    <input value={vehicleYear} onChange={e => setVehicleYear(e.target.value.replace(/\D/g,"").slice(0,4))}
                                      placeholder="2020" inputMode="numeric" maxLength={4} className={inputCls} />
                                  </div>
                                  <div className="relative">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Make</p>
                                    <input value={vehicleMake}
                                      onChange={e => onMakeChange(e.target.value)}
                                      onFocus={() => vehicleMake.length >= 1 && setShowMakeDrop(true)}
                                      onBlur={() => setTimeout(() => setShowMakeDrop(false), 150)}
                                      placeholder="Honda" autoComplete="off" className={inputCls}
                                    />
                                    {showMakeDrop && <SuggestDropdown items={makeSuggestions} onSelect={v => { setVehicleMake(v); setMakeSuggestions([]); setShowMakeDrop(false); }} />}
                                  </div>
                                  <div className="relative">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
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

                            {/* Boat / RV length */}
                            {(serviceType === "boat" || serviceType === "rv") && (
                              <div>
                                <Label>{serviceType === "boat" ? "Boat" : "RV"} length (feet)</Label>
                                <input type="number" inputMode="numeric" value={footage}
                                  onChange={e => setFootage(e.target.value)} min={1}
                                  placeholder={serviceType === "boat" ? "e.g. 22" : "e.g. 30"}
                                  className={inputCls}
                                />
                                <p className="text-[11px] text-zinc-600 mt-1.5">
                                  {serviceType === "boat" ? "Pricing is per foot of boat length." : "Min 20 ft · pricing is per foot."}
                                </p>
                              </div>
                            )}

                            {/* Address */}
                            <div>
                              <Label>Where should we come?</Label>
                              <PlacesInput
                                value={serviceAddress}
                                onChange={setServiceAddress}
                                placeholder="Start typing your address…"
                                className={inputCls}
                              />
                              <p className="text-[11px] text-zinc-600 mt-1.5">Home, office, marina, storage lot, etc.</p>
                            </div>

                            <div className="flex gap-2">
                              <button type="button" onClick={() => setStep(1)} className={backBtn}><ChevronLeft size={13} />Back</button>
                              <button type="button" disabled={!step2Valid} onClick={() => setStep(3)} className={`${goldBtn} flex-1 w-auto`}>Continue</button>
                            </div>
                          </>
                        )}

                        {/* ══════════ STEP 3 — Availability ══════════ */}
                        {step === 3 && (
                          <>
                            <div>
                              <p className="text-lg font-black text-white tracking-tight">When do you need it?</p>
                              <p className="text-[12px] text-zinc-500 mt-1">We&apos;ll reach out the moment a spot opens.</p>
                            </div>

                            {/* Urgency */}
                            <div>
                              <Label>How soon?</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {URGENCY_OPTIONS.map(({ id, label, color, activeBg, activeBorder }) => {
                                  const emoji = { today: "🔴", tomorrow: "🟠", this_week: "🟡", soon: "⚪" }[id] ?? "";
                                  return (
                                    <button key={id} type="button" onClick={() => setUrgency(id)}
                                      className={`py-3 px-3 rounded-xl border text-[12px] font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                        urgency === id ? `${activeBg} ${activeBorder} ${color}` : "bg-zinc-900 border-white/[0.08] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.14]"
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="uppercase tracking-wider text-[11px]">{label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {urgencyIsSpecific && (
                                <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
                                  Got it — days &amp; times below are optional.
                                </p>
                              )}
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
                                    className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                      days.includes(id)
                                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                        : "bg-zinc-900 border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.14]"
                                    }`}
                                  >{label}</button>
                                ))}
                                <button type="button" onClick={() => setDays([])}
                                  className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                    days.length === 0
                                      ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                      : "bg-zinc-900 border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.14]"
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
                                    className={`flex flex-col items-start px-3.5 py-3 rounded-xl border transition-all active:scale-95 ${
                                      times.includes(id)
                                        ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]"
                                        : "bg-zinc-900 border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.14]"
                                    }`}
                                  >
                                    <span className="text-[12px] font-bold">{label}</span>
                                    <span className={`text-[10px] mt-0.5 ${times.includes(id) ? "text-[#D4AF37]/60" : "text-zinc-600"}`}>{sub}</span>
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

                            {/* Availability summary */}
                            {(days.length > 0 || times.length > 0) && (
                              <div className="rounded-xl bg-[#D4AF37]/[0.04] border border-[#D4AF37]/15 px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Your availability</p>
                                <p className="text-[12px] text-zinc-300 leading-relaxed">{buildAvailableDatesString(days, times)}</p>
                              </div>
                            )}

                            {submitError && (
                              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">{submitError}</p>
                            )}

                            <div className="flex gap-2">
                              <button type="button" onClick={() => setStep(2)} className={backBtn}><ChevronLeft size={13} />Back</button>
                              <button type="button" onClick={handleSubmit} disabled={submitting} className={`${goldBtn} flex-1 w-auto`}>
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                {submitting ? "Sending…" : "Request a Spot"}
                              </button>
                            </div>

                            <p className="text-center text-[11px] text-zinc-700">
                              Or call/text <a href="tel:8025855563" className="text-zinc-500 hover:text-[#D4AF37] transition-colors font-medium">802-585-5563</a>
                            </p>
                          </>
                        )}

                      </motion.div>
                    </AnimatePresence>
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
