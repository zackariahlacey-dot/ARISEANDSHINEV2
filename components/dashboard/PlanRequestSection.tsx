"use client";

import { useState, useTransition } from "react";
import { Crown, ChevronRight, Check, Loader2, AlertCircle, CheckCircle2, Clock, Sparkles, Zap, X } from "lucide-react";
import { submitPlanRequest } from "@/app/actions/planRequestActions";
import type { PlanRequest, PlanType, PlanFrequency } from "@/app/actions/planRequestActions";

// ── Pricing & Plan Config ────────────────────────────────────────────────────

const PLANS = [
  {
    id: "interior_only" as PlanType,
    label:      "Interior Only",
    price:      75,
    ultimatePrice: 120,
    icon:       "🪑",
    description: "Full vacuum, wipe-down, interior glass, trash removal.",
    ultimateExtras: "+ deep conditioning, odor treatment & premium protectant",
  },
  {
    id: "exterior_only" as PlanType,
    label:      "Exterior Only",
    price:      65,
    ultimatePrice: 100,
    icon:       "✨",
    description: "Hand wash, dry, tire & trim shine.",
    ultimateExtras: "+ clay bar, paint sealant & enhanced gloss finish",
  },
  {
    id: "full_detail" as PlanType,
    label:      "Full Detail",
    price:      125,
    ultimatePrice: 185,
    icon:       "🏆",
    description: "Complete interior + exterior — inside and out every time.",
    ultimateExtras: "+ every Ultimate upgrade from both services",
    recommended: true,
  },
] as const;

const FREQS: { id: PlanFrequency; label: string; sublabel: string }[] = [
  { id: "monthly",  label: "Monthly",       sublabel: "Once a month" },
  { id: "biweekly", label: "Every 2 Weeks", sublabel: "Twice a month" },
  { id: "weekly",   label: "Weekly",        sublabel: "4× per month" },
];

const SIZES = [
  { value: "compact",   label: "Compact" },
  { value: "sedan",     label: "Sedan / Coupe" },
  { value: "medium",    label: "Mid-size SUV / Minivan" },
  { value: "large_suv", label: "Large SUV / Full-size Truck" },
  { value: "xl_truck",  label: "XL Truck / Oversized" },
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  existingRequest: PlanRequest | null;
}

export function PlanRequestSection({ existingRequest }: Props) {
  const [open, setOpen] = useState(false);

  if (!open && existingRequest) {
    return <ExistingRequestCard request={existingRequest} />;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-4 rounded-2xl border border-[#D4AF37]/15 bg-zinc-900/60 p-5 w-full transition-all duration-200 hover:border-[#D4AF37]/30 hover:bg-zinc-900/80"
      >
        <div className="shrink-0 w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
          <Crown size={20} className="text-[#D4AF37]" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] mb-0.5">
            Monthly Plans
          </p>
          <p className="text-sm font-bold text-zinc-100">Request a Monthly Plan</p>
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
            Starting from $65/mo — keep your vehicle in showroom condition year-round.
          </p>
        </div>
        <ChevronRight size={16} className="text-zinc-600 shrink-0 group-hover:text-[#D4AF37] transition-colors" />
      </button>
    );
  }

  return (
    <PlanRequestForm
      onClose={() => setOpen(false)}
      onSubmitted={() => {
        setOpen(false);
        // Reload page to show the new request
        window.location.reload();
      }}
    />
  );
}

// ── Existing Request Card ─────────────────────────────────────────────────────

function ExistingRequestCard({ request }: { request: PlanRequest }) {
  const plan = PLANS.find(p => p.id === request.plan_type);
  const label = plan ? plan.label + (request.ultimate_upgrade ? " — Ultimate" : "") : request.plan_type;
  const price = plan ? (request.ultimate_upgrade ? plan.ultimatePrice : plan.price) : "—";

  const vehicle = [request.vehicle_year, request.vehicle_make, request.vehicle_model].filter(Boolean).join(" ");

  const STATUS_MAP = {
    pending:  { color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: Clock,         label: "Under Review" },
    approved: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, label: "Approved!" },
    declined: { color: "text-zinc-400",   bg: "bg-zinc-800 border-zinc-700",          icon: X,             label: "Not Available" },
  } as const;

  const st = STATUS_MAP[request.status];
  const StatusIcon = st.icon;

  return (
    <div className="rounded-2xl border border-[#D4AF37]/15 bg-zinc-900/60 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
            <Crown size={18} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37]">Monthly Plan</p>
            <p className="text-sm font-bold text-zinc-100">{label}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl border ${st.bg} ${st.color}`}>
          <StatusIcon size={10} />
          {st.label}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-zinc-500">
        <div className="flex justify-between">
          <span>Price</span>
          <span className="text-zinc-300 font-semibold">${price}/mo</span>
        </div>
        {vehicle && (
          <div className="flex justify-between">
            <span>Vehicle</span>
            <span className="text-zinc-300">{vehicle}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Frequency</span>
          <span className="text-zinc-300">
            {FREQS.find(f => f.id === request.preferred_frequency)?.label ?? request.preferred_frequency}
          </span>
        </div>
      </div>

      {request.status === "pending" && (
        <p className="mt-3 text-[11px] text-zinc-600 leading-relaxed">
          We'll reach out within 24 hours to confirm and schedule your first detail.
        </p>
      )}

      {request.status === "approved" && (
        <p className="mt-3 text-[11px] text-emerald-500/80 leading-relaxed">
          We'll be in touch shortly to lock in your first appointment.
        </p>
      )}

      {request.admin_notes && (
        <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <p className="text-[10px] text-zinc-600 mb-1 font-bold uppercase tracking-wider">Note from us</p>
          <p className="text-xs text-zinc-400">{request.admin_notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Request Form ──────────────────────────────────────────────────────────────

function PlanRequestForm({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("full_detail");
  const [ultimateUpgrade, setUltimateUpgrade] = useState(false);
  const [frequency, setFrequency] = useState<PlanFrequency>("monthly");

  const [vehicleMake,  setVehicleMake]  = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear,  setVehicleYear]  = useState("");
  const [vehicleSize,  setVehicleSize]  = useState("medium");
  const [address,      setAddress]      = useState("");
  const [notes,        setNotes]        = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const price = ultimateUpgrade ? plan.ultimatePrice : plan.price;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanRequest({
        planType:           selectedPlan,
        ultimateUpgrade,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        vehicleSize,
        serviceAddress:     address,
        preferredFrequency: frequency,
        notes,
      });

      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      setTimeout(onSubmitted, 2200);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={26} className="text-emerald-400" />
        </div>
        <p className="text-base font-black text-zinc-100 mb-1">Request Sent!</p>
        <p className="text-xs text-zinc-500">We'll review it and reach out within 24 hours to confirm and schedule.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#D4AF37]/15 bg-zinc-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
            <Crown size={15} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100">Request Monthly Plan</p>
            <p className="text-[10px] text-zinc-600">Step {step} of 3</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.07] transition-all">
          <X size={14} />
        </button>
      </div>

      <div className="p-5">

        {/* ── Step 1: How it works + Plan Selection ─── */}
        {step === 1 && (
          <div className="space-y-5">

            {/* How it works */}
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">How It Works</p>
              <div className="space-y-2.5">
                {[
                  { n: "1", t: "Choose your plan & frequency", s: "Pick what fits your vehicle and schedule." },
                  { n: "2", t: "We review & confirm",          s: "You'll hear from us within 24 hours." },
                  { n: "3", t: "Lock in your recurring day",   s: "We show up same day every month — no thinking required." },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center text-[9px] font-black text-[#D4AF37]">
                      {item.n}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-zinc-300">{item.t}</p>
                      <p className="text-[11px] text-zinc-600">{item.s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan cards */}
            <div className="space-y-2.5">
              {PLANS.map(p => {
                const sel = selectedPlan === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                      sel
                        ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{p.icon}</span>
                          <span className={`text-sm font-black ${sel ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                            {p.label}
                          </span>
                          {"recommended" in p && p.recommended && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 ml-6">{p.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${sel ? "text-[#D4AF37]" : "text-zinc-300"}`}>
                          ${ultimateUpgrade ? p.ultimatePrice : p.price}
                        </p>
                        <p className="text-[9px] text-zinc-600">/mo</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Ultimate upgrade toggle */}
            <div
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                ultimateUpgrade
                  ? "border-amber-400/30 bg-amber-500/[0.05]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={14} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-200">
                      Upgrade to Ultimate{" "}
                      <span className="text-amber-400">+${plan.ultimatePrice - plan.price}/mo</span>
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{plan.ultimateExtras}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUltimateUpgrade(!ultimateUpgrade)}
                  className={`shrink-0 w-11 h-6 rounded-full border transition-all duration-200 relative ${
                    ultimateUpgrade
                      ? "bg-amber-500 border-amber-400"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                  aria-pressed={ultimateUpgrade}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                      ultimateUpgrade ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* What's different */}
              <div className={`mt-3 grid grid-cols-2 gap-2 transition-all ${ultimateUpgrade ? "opacity-100" : "opacity-40"}`}>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Standard</p>
                  <p className="text-[11px] text-zinc-400">{plan.description}</p>
                </div>
                <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500/70 mb-1.5">Ultimate</p>
                  <p className="text-[11px] text-zinc-400">Everything in Standard, {plan.ultimateExtras.replace("+ ", "")}</p>
                </div>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">How Often?</p>
              <div className="grid grid-cols-3 gap-2">
                {FREQS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={`rounded-xl border py-3 px-2 text-center transition-all ${
                      frequency === f.id
                        ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
                    }`}
                  >
                    <p className={`text-xs font-bold ${frequency === f.id ? "text-[#D4AF37]" : "text-zinc-300"}`}>
                      {f.label}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-0.5">{f.sublabel}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Continue — ${price}/mo
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Step 2: Vehicle Info ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] px-3.5 py-2.5">
              <span className="text-xs font-bold text-[#D4AF37]">{plan.label}{ultimateUpgrade ? " — Ultimate" : ""}</span>
              <span className="text-xs font-black text-zinc-300">${price}/mo</span>
            </div>

            <p className="text-xs text-zinc-500">Tell us about your vehicle so we can price accurately for size.</p>

            <div className="grid grid-cols-3 gap-2">
              {(["Year", "Make", "Model"] as const).map((lbl) => {
                const val   = lbl === "Year" ? vehicleYear : lbl === "Make" ? vehicleMake : vehicleModel;
                const setVal = lbl === "Year" ? setVehicleYear : lbl === "Make" ? setVehicleMake : setVehicleModel;
                return (
                  <div key={lbl}>
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">{lbl}</label>
                    <input
                      value={val}
                      onChange={e => setVal(e.target.value)}
                      placeholder={lbl === "Year" ? "2021" : lbl === "Make" ? "Toyota" : "Camry"}
                      className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Vehicle Size</label>
              <select
                value={vehicleSize}
                onChange={e => setVehicleSize(e.target.value)}
                className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]/40 transition-all"
              >
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Where do you park? (optional)</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, Burlington VT"
                className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
              />
              <p className="text-[10px] text-zinc-700 mt-1">Home, work, or anywhere we should come to.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => setStep(1)}
                className="h-11 rounded-xl border border-white/[0.08] text-sm text-zinc-500 font-bold hover:text-zinc-300 transition-all">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)}
                className="h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all">
                Continue <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm & Submit ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">Almost done — confirm your plan details below.</p>

            {/* Summary */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
              <Row label="Plan"      value={plan.label + (ultimateUpgrade ? " — Ultimate" : "")} gold />
              <Row label="Price"     value={`$${price}/mo`} />
              <Row label="Frequency" value={FREQS.find(f => f.id === frequency)!.label} />
              {(vehicleYear || vehicleMake || vehicleModel) && (
                <Row label="Vehicle" value={[vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ")} />
              )}
              {address && <Row label="Address" value={address} />}
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Anything we should know? (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Gate code, dog in yard, prefer afternoons…"
                className="w-full bg-zinc-900/70 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-xs text-red-400 bg-red-400/[0.07] border border-red-400/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => setStep(2)}
                className="h-11 rounded-xl border border-white/[0.08] text-sm text-zinc-500 font-bold hover:text-zinc-300 transition-all">
                Back
              </button>
              <button type="button" onClick={handleSubmit} disabled={isPending}
                className="h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none">
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <><Check size={14} /> Send Request</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-600">{label}</span>
      <span className={`text-xs font-semibold ${gold ? "text-[#D4AF37]" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}
