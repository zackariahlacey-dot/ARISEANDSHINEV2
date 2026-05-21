"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, X, Check, ChevronRight, ChevronLeft, ArrowRight, RotateCcw,
  Sparkles, Sofa, Droplets, Zap,
} from "lucide-react";
import type { Service } from "@/app/page";
import {
  bundlePctFor, addonDiscountedPrice,
} from "@/lib/bundleDiscount";

// ─── Domain types ─────────────────────────────────────────────────────────────
type Scope = "interior" | "exterior" | "full";
type Severity = "light" | "medium" | "heavy";

type PainOption = {
  id: string;
  emoji: string;
  label: string;
  scopes: Array<"interior" | "exterior">; // which scope buckets show this pain
  addonIds: string[];                      // 1+ add-on ids this pain maps to
  heavyUpgradeAddonIds?: string[];         // swap-in when severity = heavy
};

const PAIN_OPTIONS: PainOption[] = [
  // Interior
  { id: "pet_hair",       emoji: "🐾", label: "Heavy pet hair",                     scopes: ["interior"], addonIds: ["pet_hair"] },
  { id: "stains_seats",   emoji: "🍝", label: "Stains on seats, carpet, or floor", scopes: ["interior"], addonIds: ["upholstery_shampoo"] },
  { id: "odors",          emoji: "💨", label: "Lingering odors",                   scopes: ["interior"], addonIds: ["odor_bomb"] },
  { id: "faded_interior", emoji: "☀️", label: "Faded dash, plastic, or trim",       scopes: ["interior"], addonIds: ["uv_interior"] },
  { id: "worn_leather",   emoji: "🪑", label: "Cracked or worn leather",           scopes: ["interior"], addonIds: ["leather_condition"] },
  { id: "salt_floor",     emoji: "❄️", label: "Salt stains on floor mats",          scopes: ["interior"], addonIds: ["salt_stain_removal"] },
  // Exterior
  { id: "salt_grime",     emoji: "❄️", label: "Winter salt + grime everywhere",     scopes: ["exterior"], addonIds: ["salt_recovery_addon"] },
  { id: "foggy_lights",   emoji: "💡", label: "Cloudy or yellow headlights",       scopes: ["exterior"], addonIds: ["headlight_restore"] },
  { id: "rough_paint",    emoji: "🪨", label: "Paint feels rough or gritty",       scopes: ["exterior"], addonIds: ["clay_bar"], heavyUpgradeAddonIds: ["mech_chem_decon"] },
  { id: "brake_dust",     emoji: "🛞", label: "Brake dust caked on wheels",         scopes: ["exterior"], addonIds: ["wheel_ceramic"] },
  { id: "water_spots",    emoji: "💦", label: "Water spots / hard water stains",    scopes: ["exterior"], addonIds: ["clay_bar"] },
  { id: "want_shine",     emoji: "✨", label: "Want long-term ceramic shine",       scopes: ["exterior"], addonIds: ["ceramic_3yr"] },
];

const FOUNDATION_DISPLAY: Record<Scope, { name: string; subtitle: string; icon: typeof Sofa }> = {
  interior: { name: "Interior Detail",          subtitle: "Ultimate Interior",            icon: Sofa     },
  exterior: { name: "Exterior Detail",          subtitle: "Ultimate Exterior",            icon: Droplets },
  full:     { name: "Full Detail",              subtitle: "Ultimate Interior + Exterior", icon: Zap      },
};

const FOUNDATION_SERVICE_NAME: Record<Scope, string> = {
  interior: "Interior Detail",
  exterior: "Exterior Detail",
  full:     "Full Detail",
};

const SCOPE_TILES: Array<{ id: Scope; label: string; sub: string; icon: typeof Sofa }> = [
  { id: "interior", label: "Interior",  sub: "Inside the cabin only", icon: Sofa     },
  { id: "exterior", label: "Exterior",  sub: "Outside wash + protect", icon: Droplets },
  { id: "full",     label: "Both",      sub: "Inside + outside",      icon: Zap      },
];

const SEVERITY_TILES: Array<{ id: Severity; label: string; sub: string; emoji: string }> = [
  { id: "light",  label: "A few months ago", sub: "Just light maintenance",  emoji: "🌟" },
  { id: "medium", label: "6+ months ago",    sub: "Normal wear has built up",emoji: "👍" },
  { id: "heavy",  label: "It's been a while",sub: "Heavy reset territory",  emoji: "💪" },
];

// ─── Build helpers ────────────────────────────────────────────────────────────
function painToAddons(painIds: string[], severity: Severity): string[] {
  const set = new Set<string>();
  for (const p of PAIN_OPTIONS) {
    if (!painIds.includes(p.id)) continue;
    const ids = severity === "heavy" && p.heavyUpgradeAddonIds ? p.heavyUpgradeAddonIds : p.addonIds;
    for (const id of ids) set.add(id);
  }
  return Array.from(set);
}

function getFoundationPriceFor(services: Service[], scope: Scope, size: "compact"|"sedan"|"suv"|"xl" = "sedan"): number {
  const svc = services.find(s => s.name === FOUNDATION_SERVICE_NAME[scope]);
  if (!svc) return 0;
  const key = ({ compact: "price_small", sedan: "price_medium", suv: "price_large", xl: "price_extra_large" } as const)[size];
  return Number((svc as any)[key] ?? (svc as any).price_small ?? 0);
}

// Hard-coded addon prices for the quiz preview (these match BuildYourPackage's
// INTERIOR_ADDONS + EXTERIOR_ADDONS source of truth — keep in sync). Could be
// passed in as a prop later if we want them dynamic, but they're static today.
const ADDON_BASE_PRICES: Record<string, number> = {
  upholstery_shampoo: 75,
  pet_hair:           50,
  leather_condition:  45,
  uv_interior:        35,
  odor_bomb:          60,
  headliner_clean:    35,
  salt_stain_removal: 50,
  clay_bar:           50,
  mech_chem_decon:    70,
  salt_recovery_addon:75,
  headlight_restore:  60,
  ceramic_3yr:        300,   // sedan default; sized by vehicle later
  wheel_ceramic:      125,
};

const ADDON_LABELS: Record<string, string> = {
  upholstery_shampoo: "Carpet & Upholstery Shampoo",
  pet_hair:           "Heavy Pet Hair Removal",
  leather_condition:  "Leather Conditioning",
  uv_interior:        "UV / Trim & Plastic Restoration",
  odor_bomb:          "Strong Odor Elimination",
  headliner_clean:    "Headliner Cleaning",
  salt_stain_removal: "Salt Stain Removal",
  clay_bar:           "Clay Bar Treatment",
  mech_chem_decon:    "Mech & Chemical Decon",
  salt_recovery_addon:"Salt Recovery — Undercarriage",
  headlight_restore:  "Headlight Restoration",
  ceramic_3yr:        "2-Year Pro Ceramic Sealant",
  wheel_ceramic:      "Wheel & Caliper Ceramic",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function BuildForMeQuiz({
  services,
  onUseBuild,
}: {
  services: Service[];
  onUseBuild: (args: { foundation: Scope; addonIds: string[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [scope, setScope] = useState<Scope | null>(null);
  const [pains, setPains] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity | null>(null);

  const reset = () => {
    setStep(0);
    setScope(null);
    setPains([]);
    setSeverity(null);
  };
  const close = () => { setOpen(false); setTimeout(reset, 220); };

  const availablePains = useMemo(() => {
    if (!scope) return [];
    if (scope === "full") return PAIN_OPTIONS;
    return PAIN_OPTIONS.filter(p => p.scopes.includes(scope as "interior" | "exterior"));
  }, [scope]);

  const buildSummary = useMemo(() => {
    if (!scope || !severity) return null;
    const addonIds = painToAddons(pains, severity);
    const foundationPrice = getFoundationPriceFor(services, scope, "sedan");
    const qualifyingCount = addonIds.length;
    const pct = bundlePctFor(qualifyingCount);
    const addonRows = addonIds.map(id => {
      const base = ADDON_BASE_PRICES[id] ?? 0;
      const discounted = addonDiscountedPrice(id, base, pct);
      return { id, label: ADDON_LABELS[id] ?? id, base, discounted, savings: base - discounted };
    });
    const addonsTotal = addonRows.reduce((s, r) => s + r.discounted, 0);
    const totalSavings = addonRows.reduce((s, r) => s + r.savings, 0);
    const grandTotal = foundationPrice + addonsTotal;
    return {
      foundationPrice, addonRows, addonsTotal, totalSavings, grandTotal,
      pctLabel: pct > 0 ? `${Math.round(pct * 100)}% bundle` : null,
    };
  }, [scope, severity, pains, services]);

  // ── Closed state — just the trigger button ────────────────────────────────
  if (!open) {
    return (
      <div className="w-full max-w-3xl mx-auto mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#D4AF37]/45 bg-gradient-to-br from-[#D4AF37]/[0.12] via-[#D4AF37]/[0.04] to-zinc-900/60 hover:from-[#D4AF37]/[0.20] hover:border-[#D4AF37]/70 active:scale-[0.99] transition-all overflow-hidden"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.18)_0%,transparent_60%)]" />
          <Wand2 size={14} className="text-[#D4AF37] group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">Build mine for me</span>
          <span className="text-[10px] text-zinc-500 font-bold">· 30 seconds</span>
          <ChevronRight size={13} className="text-[#D4AF37]/70 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  // ── Open state — questionnaire shell ──────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto mb-4">
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="relative rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      >
        {/* Gold glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-32 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.18)_0%,transparent_70%)]" />

        {/* Top bar: progress + close */}
        <div className="relative flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map(n => (
              <div
                key={n}
                className={`h-1 rounded-full transition-all ${
                  n < step ? "w-5 bg-[#D4AF37]"
                  : n === step ? "w-7 bg-[#D4AF37]"
                  : "w-3 bg-zinc-700"
                }`}
              />
            ))}
            <span className="ml-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
              {step === 0 ? "Step 1 of 3" : step === 1 ? "Step 2 of 3" : step === 2 ? "Step 3 of 3" : "Your build"}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>

        <div className="relative px-4 pb-4">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Step 0 — Scope ──────────────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-scope"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-base sm:text-lg font-black text-white text-center mb-1">What needs love?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">We&apos;ll build the rest from your answer.</p>
                <div className="grid grid-cols-1 gap-2">
                  {SCOPE_TILES.map(tile => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => { setScope(tile.id); setPains([]); setSeverity(null); setStep(1); }}
                        className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 hover:border-[#D4AF37]/55 hover:bg-zinc-900 active:scale-[0.99] transition-all px-4 py-3 text-left flex items-center gap-3"
                      >
                        <div className="shrink-0 w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
                          <Icon size={15} className="text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white">{tile.label}</p>
                          <p className="text-[11px] text-zinc-500">{tile.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 1 — Pains ──────────────────────────────────────── */}
            {step === 1 && scope && (
              <motion.div
                key="step-pains"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-base sm:text-lg font-black text-white text-center mb-1">What&apos;s bugging you?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">Tap everything that applies. {pains.length > 0 ? `${pains.length} picked` : "Pick at least one."}</p>
                <div className="grid grid-cols-1 gap-1.5 mb-3 max-h-[55vh] overflow-y-auto pr-1">
                  {availablePains.map(p => {
                    const selected = pains.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPains(prev => selected ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                        className={`rounded-xl border px-3 py-2.5 text-left flex items-center gap-2.5 transition-all active:scale-[0.99] ${
                          selected
                            ? "border-[#D4AF37] bg-[#D4AF37]/[0.10]"
                            : "border-white/[0.07] bg-zinc-900/40 hover:border-[#D4AF37]/35"
                        }`}
                      >
                        <span className="shrink-0 text-base leading-none">{p.emoji}</span>
                        <span className={`flex-1 text-[12px] leading-tight ${selected ? "text-white font-bold" : "text-zinc-300"}`}>
                          {p.label}
                        </span>
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          selected ? "bg-[#D4AF37]" : "bg-zinc-800 border border-zinc-700"
                        }`}>
                          {selected && <Check size={11} className="text-black" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-[11px] font-black uppercase tracking-wider"
                  >
                    <ChevronLeft size={12} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => pains.length > 0 && setStep(2)}
                    disabled={pains.length === 0}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.97] ${
                      pains.length > 0
                        ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_14px_rgba(212,175,55,0.3)]"
                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    Continue <ChevronRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2 — Severity ───────────────────────────────────── */}
            {step === 2 && scope && (
              <motion.div
                key="step-severity"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-base sm:text-lg font-black text-white text-center mb-1">When was your last detail?</p>
                <p className="text-[11px] text-zinc-500 text-center mb-4">Tells us how deep to go.</p>
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {SEVERITY_TILES.map(tile => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => { setSeverity(tile.id); setStep(3); }}
                      className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 hover:border-[#D4AF37]/55 hover:bg-zinc-900 active:scale-[0.99] transition-all px-4 py-3 text-left flex items-center gap-3"
                    >
                      <span className="shrink-0 text-2xl">{tile.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">{tile.label}</p>
                        <p className="text-[11px] text-zinc-500">{tile.sub}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-zinc-500 text-[11px] font-black uppercase tracking-wider hover:text-zinc-300"
                >
                  <ChevronLeft size={12} /> Back
                </button>
              </motion.div>
            )}

            {/* ── Step 3 — Result ─────────────────────────────────────── */}
            {step === 3 && scope && severity && buildSummary && (
              <motion.div
                key="step-result"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22 }}
              >
                <ResultCard
                  scope={scope}
                  buildSummary={buildSummary}
                  onUse={() => {
                    onUseBuild({ foundation: scope, addonIds: buildSummary.addonRows.map(r => r.id) });
                    close();
                  }}
                  onRestart={reset}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({
  scope,
  buildSummary,
  onUse,
  onRestart,
}: {
  scope: Scope;
  buildSummary: NonNullable<ReturnType<typeof useBuildSummaryStub>>;
  onUse: () => void;
  onRestart: () => void;
}) {
  const display = FOUNDATION_DISPLAY[scope];
  const Icon = display.icon;
  return (
    <div>
      <div className="text-center mb-3">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400">Your custom build</p>
      </div>

      <div className="rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-3.5 mb-3 relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-2.5 pb-2.5 border-b border-white/[0.06]">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <Icon size={15} className="text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-white truncate">{display.subtitle}</p>
            <p className="text-[10px] text-zinc-500">{display.name} foundation · sedan pricing</p>
          </div>
          <span className="shrink-0 text-base font-black text-zinc-200 tabular-nums">${buildSummary.foundationPrice}</span>
        </div>

        {buildSummary.addonRows.length > 0 ? (
          <ul className="space-y-1">
            {buildSummary.addonRows.map(r => (
              <li key={r.id} className="flex items-baseline justify-between text-[11px]">
                <span className="text-zinc-400 truncate pr-2">+ {r.label}</span>
                <span className="shrink-0">
                  {r.savings > 0 ? (
                    <>
                      <span className="text-zinc-600 line-through tabular-nums mr-1">${r.base}</span>
                      <span className="text-[#D4AF37] font-black tabular-nums">${r.discounted}</span>
                    </>
                  ) : (
                    <span className="text-zinc-300 tabular-nums">${r.discounted}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-zinc-500 text-center py-2">Just the foundation — no add-ons recommended based on your answers.</p>
        )}

        {buildSummary.pctLabel && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
            <span className="text-violet-400 font-bold inline-flex items-center gap-1">
              <Sparkles size={11} /> {buildSummary.pctLabel}
            </span>
            <span className="text-violet-300 tabular-nums font-bold">−${buildSummary.totalSavings} saved</span>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-baseline justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sedan total</span>
          <span className="text-3xl font-black text-[#D4AF37] tabular-nums">${buildSummary.grandTotal}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onUse}
        className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black shadow-[0_4px_18px_rgba(212,175,55,0.32)] active:scale-[0.97] transition-all"
      >
        Use this build <ArrowRight size={15} />
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        <RotateCcw size={11} /> Start over
      </button>
    </div>
  );
}

// Helper to type ResultCard's props without circular imports.
function useBuildSummaryStub() {
  return null as null | {
    foundationPrice: number;
    addonsTotal: number;
    totalSavings: number;
    grandTotal: number;
    pctLabel: string | null;
    addonRows: Array<{ id: string; label: string; base: number; discounted: number; savings: number }>;
  };
}
