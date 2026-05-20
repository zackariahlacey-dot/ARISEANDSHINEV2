"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera, Check, X, AlertTriangle, Loader2, Plus, Minus, DollarSign,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  getPhotoReviewBundle, approvePhotos, rejectPhotos, adjustCommission,
  type PhotoReviewBundle,
} from "@/app/actions/photoReviewActions";
import { slotLabel } from "@/lib/jobPhotos";
import { useToast } from "@/components/admin/Toast";
import { cn } from "@/lib/utils";

/**
 * Drops into the admin Schedule booking detail. Visible whenever a job is
 * marked complete (photo_review_status is set). Handles:
 *   - Grid of all uploaded photos (signed URLs, 5-min TTL)
 *   - Approve → locks final_commission_cents
 *   - Reject with mandatory reason → contractor's dashboard surfaces it
 *   - +/- commission adjustment with mandatory reason
 *   - Full adjustment history visible right below
 */
export function PhotoReviewPanel({ bookingId }: { bookingId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["photo-review", bookingId],
    queryFn:  () => getPhotoReviewBundle(bookingId),
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustSign, setAdjustSign] = useState<1 | -1>(-1);
  const [adjustDollars, setAdjustDollars] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (isLoading) {
    return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center"><Loader2 className="inline animate-spin text-amber-500" size={20} /></div>;
  }
  if (!data) {
    return null;
  }
  const d = data as PhotoReviewBundle;

  const status = d.booking.photoReviewStatus;
  const baseCommission = d.booking.baseCommissionCents / 100;
  const finalCommission = d.booking.finalCommissionCents != null ? d.booking.finalCommissionCents / 100 : null;
  const adjustSum = d.adjustments.reduce((s, a) => s + a.adjustmentCents, 0) / 100;
  const pending = baseCommission + adjustSum;

  const refresh = () => { refetch(); qc.invalidateQueries({ queryKey: ["admin-bookings"] }); };

  const handleApprove = async () => {
    setBusy("approve"); setError(null);
    const r = await approvePhotos(bookingId);
    setBusy(null);
    if (!r.ok) { setError(r.error ?? "Approve failed."); return; }
    toast("Photos approved ✓");
    refresh();
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 3) return;
    setBusy("reject"); setError(null);
    const r = await rejectPhotos(bookingId, rejectReason);
    setBusy(null);
    if (!r.ok) { setError(r.error ?? "Reject failed."); return; }
    toast("Photos rejected — contractor notified");
    setShowReject(false);
    setRejectReason("");
    refresh();
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustDollars);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter a positive dollar amount."); return; }
    if (adjustReason.trim().length < 3) { setError("Reason is required."); return; }
    const cents = Math.round(amount * 100) * adjustSign;
    setBusy("adjust"); setError(null);
    const r = await adjustCommission({ bookingId, adjustmentCents: cents, reason: adjustReason });
    setBusy(null);
    if (!r.ok) { setError(r.error ?? "Adjustment failed."); return; }
    toast(`Commission ${adjustSign > 0 ? "+" : "−"}$${amount.toFixed(0)} recorded`);
    setShowAdjust(false);
    setAdjustDollars("");
    setAdjustReason("");
    refresh();
  };

  const statusClass = status === "approved" ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                    : status === "rejected" ? "border-rose-500/30 bg-rose-500/[0.06]"
                    : "border-amber-500/30 bg-amber-500/[0.06]";
  const statusBadge = status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : status === "rejected" ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30";

  return (
    <div className={cn("rounded-2xl border overflow-hidden", statusClass)}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 inline-flex items-center gap-1.5">
          <Camera size={11} /> Photo review
        </span>
        <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border", statusBadge)}>
          {status}
        </span>
      </div>

      {/* Contractor + commission row */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Contractor</p>
          <p className="text-sm font-bold text-zinc-200 truncate">{d.booking.contractorName ?? "—"}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            {status === "approved" ? "Final commission" : "Pending commission"}
          </p>
          <p className="text-base font-black text-amber-400 tabular-nums">
            ${(finalCommission ?? pending).toFixed(0)}
            {adjustSum !== 0 && status !== "approved" && (
              <span className={cn("text-[10px] ml-1.5", adjustSum > 0 ? "text-emerald-400" : "text-rose-400")}>
                ({adjustSum > 0 ? "+" : ""}{adjustSum.toFixed(0)})
              </span>
            )}
          </p>
          <p className="text-[10px] text-zinc-600">Base ${baseCommission.toFixed(0)}</p>
        </div>
      </div>

      {/* Photo grid */}
      <div className="p-3">
        {d.photos.length === 0 ? (
          <p className="text-[11px] text-zinc-600 text-center py-6">No photos uploaded.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {d.photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className="relative aspect-square rounded-lg overflow-hidden border border-white/[0.06] hover:border-amber-500/40 transition-colors group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.fileUrl} alt={p.photoType} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1">
                  <p className="text-[8px] font-black uppercase tracking-wider text-white truncate">
                    {slotLabel(p.photoType).replace("Pre-existing damage", "Pre-damage")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 space-y-2">
        {status === "pending" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleApprove}
              disabled={busy !== null}
              className={cn(
                "py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                busy === "approve" ? "bg-zinc-800 text-zinc-600"
                  : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95"
              )}
            >
              {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
              Approve photos
            </button>
            <button
              onClick={() => setShowReject(s => !s)}
              disabled={busy !== null}
              className="py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border border-rose-500/40 text-rose-300 flex items-center justify-center gap-1.5 hover:bg-rose-500/[0.06] transition-all"
            >
              <X size={12} /> Reject
            </button>
          </div>
        )}

        {status === "rejected" && (
          <button
            onClick={handleApprove}
            disabled={busy !== null}
            className="w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-1.5"
          >
            {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
            Approve anyway
          </button>
        )}

        {/* Adjust commission — always available */}
        <button
          onClick={() => setShowAdjust(s => !s)}
          className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/[0.08] text-zinc-400 flex items-center justify-center gap-1.5 hover:border-amber-500/30"
        >
          <DollarSign size={11} /> Adjust commission
          {showAdjust ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {showAdjust && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 space-y-2">
            <div className="flex gap-1.5">
              <button
                onClick={() => setAdjustSign(-1)}
                className={cn("flex-1 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1",
                  adjustSign === -1 ? "border-rose-500/50 bg-rose-500/15 text-rose-300" : "border-white/[0.08] text-zinc-500"
                )}
              ><Minus size={10} /> Reduce</button>
              <button
                onClick={() => setAdjustSign(1)}
                className={cn("flex-1 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1",
                  adjustSign === 1 ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-white/[0.08] text-zinc-500"
                )}
              ><Plus size={10} /> Bonus / tip</button>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Amount ($)</p>
              <input
                type="number"
                inputMode="decimal"
                value={adjustDollars}
                onChange={(e) => setAdjustDollars(e.target.value)}
                placeholder="10.00"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Reason (required, contractor sees this)</p>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={2}
                placeholder={adjustSign === 1 ? "Cash tip from customer" : "Photos showed missed spots on rear seats"}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
            <button
              onClick={handleAdjust}
              disabled={busy === "adjust" || !adjustDollars || adjustReason.trim().length < 3}
              className={cn(
                "w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5",
                busy === "adjust" || !adjustDollars || adjustReason.trim().length < 3
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-amber-500 text-black"
              )}
            >
              {busy === "adjust" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
              Record {adjustSign === 1 ? "bonus" : "reduction"}
            </button>
          </div>
        )}

        {showReject && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">Why are you rejecting?</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Missed photos · poor lighting · before shots not taken before work"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReject(false); setRejectReason(""); }}
                className="flex-1 py-2 rounded-lg border border-white/[0.08] text-zinc-400 text-[10px] font-black uppercase"
              >Cancel</button>
              <button
                onClick={handleReject}
                disabled={busy === "reject" || rejectReason.trim().length < 3}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1",
                  busy === "reject" || rejectReason.trim().length < 3
                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    : "bg-rose-500 text-white"
                )}
              >
                {busy === "reject" ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={11} />}
                Reject
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2">
            <p className="text-[11px] text-rose-300">{error}</p>
          </div>
        )}

        {/* Adjustment history */}
        {d.adjustments.length > 0 && (
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 px-1">Adjustment history</p>
            {d.adjustments.map(a => (
              <div key={a.id} className="text-[11px] flex items-start gap-2 px-1 py-1">
                <span className={cn("font-black tabular-nums shrink-0 w-12", a.adjustmentCents > 0 ? "text-emerald-400" : a.adjustmentCents < 0 ? "text-rose-400" : "text-zinc-500")}>
                  {a.adjustmentCents > 0 ? "+" : ""}${(a.adjustmentCents / 100).toFixed(0)}
                </span>
                <span className="text-zinc-400 flex-1 min-w-0 truncate">{a.reason}</span>
                <span className="text-zinc-700 shrink-0">{new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && d.photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="max-w-3xl max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.photos[lightboxIdx].fileUrl} alt={d.photos[lightboxIdx].photoType} className="max-w-full max-h-[85vh] object-contain" />
            <p className="text-center text-white text-sm font-bold mt-3">{slotLabel(d.photos[lightboxIdx].photoType)}</p>
            <p className="text-center text-zinc-500 text-[11px]">
              Uploaded {new Date(d.photos[lightboxIdx].uploadedAt).toLocaleString()}
            </p>
            {/* Prev/next */}
            {d.photos.length > 1 && (
              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i === null ? null : (i + d.photos.length - 1) % d.photos.length); }}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold"
                >← Prev</button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i === null ? null : (i + 1) % d.photos.length); }}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold"
                >Next →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
