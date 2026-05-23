"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/admin/Toast";
import { SubNav, BUSINESS_SUBNAV } from "@/components/admin/SubNav";
import {
  Tag, Save, RotateCcw, History, ChevronDown, ChevronUp, Loader2, X, Clock,
} from "lucide-react";
import {
  ADDON_META, ADDON_SIZES, SIZE_LABEL,
  getBasePriceForSize, getBaseDurationForSize, isPriceSized, isDurationSized,
  type AddonMeta, type AddonSize,
} from "@/lib/addonMeta";
import {
  listAddonOverrides, setAddonOverride, clearAddonOverride, getAddonPricingHistory,
  type AddonOverride, type AddonHistoryEntry,
} from "@/app/actions/addonPricing";

// ─── Helpers ──────────────────────────────────────────────────────────────
function findOverride(overrides: AddonOverride[], addonId: string, size: AddonSize) {
  return overrides.find(o => o.addon_id === addonId && o.size === size);
}

function dollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(0)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["admin", "addon-overrides"],
    queryFn: async () => await listAddonOverrides(),
    staleTime: 30_000,
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyForAddon, setHistoryForAddon] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03] space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600 mb-1">Business</p>
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Tag size={18} className="text-amber-500" /> Pricing
          </h1>
          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Add-on overrides · live</p>
        </div>
        <SubNav items={BUSINESS_SUBNAV} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4 max-w-3xl mx-auto w-full">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-[11px] text-amber-300/80 leading-snug">
          <p><span className="font-black">How this works:</span> every add-on has a hard-coded base price + duration. Overrides on this page take precedence on the customer-facing builder and booking flow. Every change is logged — you can revert to base at any time.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-500" size={22} /></div>
        ) : (
          <div className="space-y-2">
            {ADDON_META.map(meta => {
              const isExpanded = expanded === meta.id;
              const anyOverride = ADDON_SIZES.some(sz => {
                const o = findOverride(overrides, meta.id, sz);
                return o && (o.price_cents != null || o.duration_mins != null);
              });
              return (
                <AddonRow
                  key={meta.id}
                  meta={meta}
                  overrides={overrides}
                  expanded={isExpanded}
                  hasOverride={anyOverride}
                  onToggle={() => setExpanded(p => p === meta.id ? null : meta.id)}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin", "addon-overrides"] })}
                  onError={(m) => toast(m, "error")}
                  onSuccess={(m) => toast(m)}
                  onOpenHistory={() => setHistoryForAddon(meta.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {historyForAddon && (
        <HistoryModal
          addonId={historyForAddon}
          onClose={() => setHistoryForAddon(null)}
        />
      )}
    </div>
  );
}

// ─── Addon row ────────────────────────────────────────────────────────────
function AddonRow({
  meta, overrides, expanded, hasOverride, onToggle, onSaved, onError, onSuccess, onOpenHistory,
}: {
  meta: AddonMeta;
  overrides: AddonOverride[];
  expanded: boolean;
  hasOverride: boolean;
  onToggle: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
  onOpenHistory: () => void;
}) {
  // Initial edit state mirrors the overrides on first open.
  const editInitial = useMemo(() => {
    const state: Record<AddonSize, { price: string; duration: string }> = {} as any;
    for (const sz of ADDON_SIZES) {
      const o = findOverride(overrides, meta.id, sz);
      state[sz] = {
        price: o?.price_cents != null ? String(o.price_cents / 100) : "",
        duration: o?.duration_mins != null ? String(o.duration_mins) : "",
      };
    }
    return state;
  }, [overrides, meta.id]);

  const [edit, setEdit] = useState(editInitial);
  const [reason, setReason] = useState("");

  // Re-sync when overrides update (after save)
  useMemo(() => setEdit(editInitial), [editInitial]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async (args: { size: AddonSize; priceCents: number | null; durationMins: number | null }) => {
      const r = await setAddonOverride({
        addonId: meta.id,
        size: args.size,
        priceCents: args.priceCents,
        durationMins: args.durationMins,
        basePriceCents: Math.round(getBasePriceForSize(meta, args.size) * 100),
        baseDurationMins: getBaseDurationForSize(meta, args.size),
        reason: reason || undefined,
      });
      if (!r.success) throw new Error(r.error ?? "Save failed");
    },
    onSuccess: () => { onSuccess("Saved"); setReason(""); onSaved(); },
    onError: (e: Error) => onError(e.message),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      for (const sz of ADDON_SIZES) {
        await clearAddonOverride({
          addonId: meta.id,
          size: sz,
          basePriceCents: Math.round(getBasePriceForSize(meta, sz) * 100),
          baseDurationMins: getBaseDurationForSize(meta, sz),
          reason: reason || "Reset to base",
        });
      }
    },
    onSuccess: () => { onSuccess("Reset to base"); setReason(""); onSaved(); },
    onError: (e: Error) => onError(e.message),
  });

  function handleSaveSize(sz: AddonSize) {
    const priceStr = edit[sz].price.trim();
    const durStr = edit[sz].duration.trim();
    const priceCents = priceStr === "" ? null : Math.round(parseFloat(priceStr) * 100);
    const durationMins = durStr === "" ? null : parseInt(durStr, 10);
    if (priceStr !== "" && (!Number.isFinite(priceCents!) || priceCents! < 0)) { onError("Invalid price"); return; }
    if (durStr !== "" && (!Number.isFinite(durationMins!) || durationMins! < 0)) { onError("Invalid duration"); return; }
    save.mutate({ size: sz, priceCents, durationMins });
  }

  return (
    <div className={`rounded-2xl border ${hasOverride ? "border-amber-500/30 bg-amber-500/[0.03]" : "border-white/[0.06] bg-white/[0.02]"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-black text-white truncate">{meta.label}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Base ${(typeof meta.basePrice === "number" ? meta.basePrice : meta.basePrice.sedan)}
            {isPriceSized(meta) && " (size-tiered)"} ·{" "}
            {(typeof meta.baseDuration === "number" ? meta.baseDuration : meta.baseDuration.sedan)} min
            {isDurationSized(meta) && " (size-tiered)"}
          </p>
        </div>
        {hasOverride && (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
            Override
          </span>
        )}
        {expanded ? <ChevronUp size={14} className="text-zinc-500 shrink-0" /> : <ChevronDown size={14} className="text-zinc-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADDON_SIZES.map(sz => {
              const basePrice = getBasePriceForSize(meta, sz);
              const baseDur = getBaseDurationForSize(meta, sz);
              const o = findOverride(overrides, meta.id, sz);
              const hasSizeOverride = o && (o.price_cents != null || o.duration_mins != null);
              return (
                <div key={sz} className={`rounded-xl border p-2.5 ${hasSizeOverride ? "border-amber-500/40 bg-amber-500/[0.04]" : "border-white/[0.05] bg-white/[0.02]"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{SIZE_LABEL[sz]}</p>
                    {hasSizeOverride && <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">Active</span>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block">
                      <span className="text-[9px] text-zinc-600 block mb-0.5">Price (base ${basePrice})</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={edit[sz].price}
                        onChange={e => setEdit(p => ({ ...p, [sz]: { ...p[sz], price: e.target.value } }))}
                        placeholder={String(basePrice)}
                        className="w-full bg-zinc-950/60 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[9px] text-zinc-600 block mb-0.5">Duration min (base {baseDur})</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={edit[sz].duration}
                        onChange={e => setEdit(p => ({ ...p, [sz]: { ...p[sz], duration: e.target.value } }))}
                        placeholder={String(baseDur)}
                        className="w-full bg-zinc-950/60 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveSize(sz)}
                      disabled={save.isPending}
                      className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg py-1.5 hover:bg-amber-500/25 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      {save.isPending ? <Loader2 className="animate-spin" size={11} /> : <Save size={11} />} Save {SIZE_LABEL[sz]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional, e.g. 'Q3 price test', 'cost increase')"
            className="w-full bg-zinc-950/60 border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15] active:scale-95 transition-all"
            >
              <History size={11} /> History
            </button>
            <div className="flex-1" />
            {hasOverride && (
              <button
                type="button"
                onClick={() => clearAll.mutate()}
                disabled={clearAll.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 active:scale-95 transition-all"
              >
                {clearAll.isPending ? <Loader2 className="animate-spin" size={11} /> : <RotateCcw size={11} />} Reset to base
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History modal ────────────────────────────────────────────────────────
function HistoryModal({ addonId, onClose }: { addonId: string; onClose: () => void }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["admin", "addon-history", addonId],
    queryFn: async () => await getAddonPricingHistory(addonId, 100),
  });
  const label = ADDON_META.find(m => m.id === addonId)?.label ?? addonId;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[80dvh] flex flex-col rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">History</p>
            <p className="text-sm font-black text-white">{label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-zinc-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
          ) : history.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">No changes recorded yet.</p>
          ) : history.map((h: AddonHistoryEntry) => (
            <div key={h.id} className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 text-[11px]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-zinc-300">{SIZE_LABEL[h.size as AddonSize] ?? h.size}</span>
                <span className="text-[10px] text-zinc-600 tabular-nums">{new Date(h.changed_at).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-zinc-400">
                <div>
                  <span className="text-zinc-600">Price </span>
                  {dollars(h.prev_price_cents)} → <span className="text-amber-300 font-bold">{dollars(h.new_price_cents)}</span>
                  {h.base_price_cents != null && <span className="text-[9px] text-zinc-600"> (base {dollars(h.base_price_cents)})</span>}
                </div>
                <div>
                  <Clock size={9} className="inline mr-0.5 text-zinc-600" />
                  {h.prev_duration_mins ?? "—"} → <span className="text-amber-300 font-bold">{h.new_duration_mins ?? "—"} min</span>
                </div>
              </div>
              {h.reason && <p className="text-[10px] text-zinc-500 mt-1 italic">{h.reason}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
