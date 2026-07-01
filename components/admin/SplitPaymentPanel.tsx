"use client";

/**
 * Admin panel: split a booking's total across multiple email recipients.
 * Renders in the booking detail modal below the "Send Payment Link" row.
 *
 * Two workflows:
 *   1. Even split — quick button divides total by N
 *   2. By vehicle — pre-fill rows from booking_vehicles' line_totals
 *      so a shop paying for their fleet gets one line per vehicle
 *
 * Amounts must sum to the booking total (±1c). Recipients get their own
 * unique /pay/split/[token] URL emailed to them; each payment stamps a
 * paid_at on its row and — once every row is paid — the aggregate
 * booking.paid_at flips too.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSplitPayments,
  listSplitPayments,
  deleteSplitPayment,
  sendSplitPaymentLinks,
  type SplitRow,
} from "@/app/actions/splitPayments";
import { listBookingVehicles } from "@/app/actions/bookingVehicleActions";
import { Users, Plus, Trash2, Send, Loader2, Check, CheckCircle2, X, Split } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/admin/Toast";

type Draft = {
  recipientEmail:   string;
  recipientName:    string;
  amount:           string;
  vehiclePosition?: number | null;
};

export function SplitPaymentPanel({
  bookingId,
  totalPrice,
  defaultEmail,
  defaultName,
  onSplitsSaved,
}: {
  bookingId: string;
  totalPrice: number;
  defaultEmail?: string | null;
  defaultName?: string | null;
  onSplitsSaved?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: splits, isLoading, refetch } = useQuery({
    queryKey: ["admin", "booking-splits", bookingId],
    queryFn:  () => listSplitPayments(bookingId),
    staleTime: 20_000,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["booking_vehicles", bookingId],
    queryFn:  () => listBookingVehicles(bookingId),
    staleTime: 20_000,
  });

  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    if (splits && splits.length > 0) {
      setDrafts(splits.map((s: SplitRow) => ({
        recipientEmail:   s.recipient_email,
        recipientName:    s.recipient_name ?? "",
        amount:           s.amount.toFixed(2),
        vehiclePosition:  s.vehicle_position,
      })));
    } else if (drafts.length === 0) {
      // Seed with two blank rows so the admin can start typing immediately.
      setDrafts([
        { recipientEmail: defaultEmail ?? "", recipientName: defaultName ?? "", amount: (totalPrice / 2).toFixed(2) },
        { recipientEmail: "", recipientName: "", amount: (totalPrice / 2).toFixed(2) },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splits]);

  const sumDrafts = drafts.reduce((n, d) => n + (Number(d.amount) || 0), 0);
  const balanced = Math.abs(sumDrafts - totalPrice) <= 0.01;

  function addRow() {
    setDrafts(p => [...p, { recipientEmail: "", recipientName: "", amount: "0.00" }]);
  }
  function removeRow(i: number) {
    setDrafts(p => p.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, patch: Partial<Draft>) {
    setDrafts(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function evenSplit(count?: number) {
    const n = count ?? drafts.length;
    if (n < 1) return;
    // Distribute cents evenly; put any 1-cent remainder on the first row so
    // the total is exact.
    const cents = Math.round(totalPrice * 100);
    const each = Math.floor(cents / n);
    const remainder = cents - (each * n);
    const next: Draft[] = [];
    for (let i = 0; i < n; i++) {
      const src = drafts[i] ?? { recipientEmail: "", recipientName: "", amount: "" };
      const c = each + (i === 0 ? remainder : 0);
      next.push({ ...src, amount: (c / 100).toFixed(2), vehiclePosition: null });
    }
    setDrafts(next);
  }

  function splitByVehicle() {
    if (!vehicles || vehicles.length === 0) return;
    const next: Draft[] = vehicles.map((v, i) => {
      const existing = drafts[i];
      return {
        recipientEmail:  existing?.recipientEmail ?? "",
        recipientName:   existing?.recipientName ?? "",
        amount:          Number(v.line_total ?? 0).toFixed(2),
        vehiclePosition: v.position,
      };
    });
    // If vehicles' line_totals don't sum to the booking total, adjust the
    // first row so the split still balances (avoids silent rounding drift).
    const sum = next.reduce((n, r) => n + (Number(r.amount) || 0), 0);
    const diff = Math.round((totalPrice - sum) * 100) / 100;
    if (Math.abs(diff) > 0.01 && next.length > 0) {
      next[0].amount = (Number(next[0].amount) + diff).toFixed(2);
    }
    setDrafts(next);
  }

  async function handleSave() {
    setBusy(true);
    try {
      const r = await createSplitPayments(
        bookingId,
        drafts.map((d, i) => ({
          recipientEmail:  d.recipientEmail,
          recipientName:   d.recipientName || null,
          amount:          Number(d.amount || 0),
          vehiclePosition: d.vehiclePosition ?? i,
        })),
      );
      if (!r.ok) { toast(r.error ?? "Failed", "error"); }
      else {
        toast(`Split saved — ${r.splits?.length ?? 0} recipients`);
        refetch();
        queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
        onSplitsSaved?.();
      }
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
    setBusy(false);
  }

  async function handleSendAll() {
    setBusy(true);
    try {
      const r = await sendSplitPaymentLinks(bookingId);
      if (!r.ok) toast(r.error ?? "Failed", "error");
      else toast(`Sent ${r.sent} link${r.sent === 1 ? "" : "s"}${r.errors > 0 ? ` · ${r.errors} failed` : ""}`);
      refetch();
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
    setBusy(false);
  }

  async function handleDelete(splitId: string) {
    if (!confirm("Remove this split row? This can't be undone.")) return;
    setBusy(true);
    try {
      const r = await deleteSplitPayment(splitId);
      if (!r.ok) toast(r.error ?? "Failed", "error");
      else { toast("Split removed"); refetch(); }
    } catch (e: any) { toast(e?.message ?? "Failed", "error"); }
    setBusy(false);
  }

  const paidTotal    = (splits ?? []).filter(s => s.status === "paid").reduce((n, s) => n + Number(s.amount || 0), 0);
  const hasAnyPaid   = (splits ?? []).some(s => s.status === "paid");
  const allPaid      = (splits?.length ?? 0) > 0 && (splits ?? []).every(s => s.status === "paid");

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-amber-500"><Split size={15} /></span>
          <span className="text-sm font-black uppercase tracking-widest">Split Payment</span>
          {(splits?.length ?? 0) > 0 && (
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
              allPaid
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : hasAnyPaid
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-zinc-800 border-white/10 text-zinc-500"
            )}>
              {allPaid ? "All Paid" : `${splits!.length} rows · $${paidTotal.toFixed(0)}/$${totalPrice.toFixed(0)}`}
            </span>
          )}
        </div>
        <span className="text-zinc-500 text-xs">{open ? "Hide" : "Setup"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.04] pt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
          ) : (
            <>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Break the total into multiple recipients. Each gets their own payment page
                + Stripe receipt emailed to their address. Booking flips to <strong>Paid</strong> once every row is settled.
              </p>

              {/* Existing paid rows (uneditable) + form rows below */}
              {(splits ?? []).some(s => s.status === "paid") && (
                <div className="space-y-1.5">
                  {(splits ?? []).filter(s => s.status === "paid").map(s => (
                    <div key={s.id} className="flex items-center gap-2 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl px-3 py-2">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-300 truncate">{s.recipient_email}</p>
                        {s.recipient_name && <p className="text-[10px] text-zinc-500 truncate">{s.recipient_name}</p>}
                      </div>
                      <p className="text-sm font-black text-emerald-400 tabular-nums">${Number(s.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => evenSplit(2)} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                  Even 2-way
                </button>
                <button onClick={() => evenSplit(3)} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                  Even 3-way
                </button>
                {vehicles && vehicles.length > 1 && (
                  <button onClick={splitByVehicle} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/15 transition-colors flex items-center gap-1.5">
                    <Users size={11} /> Split by vehicle ({vehicles.length})
                  </button>
                )}
              </div>

              {/* Draft rows */}
              <div className="space-y-2">
                {drafts.map((d, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={d.recipientName}
                        onChange={e => updateRow(i, { recipientName: e.target.value })}
                        placeholder="Name (optional)"
                        className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40"
                      />
                      <button onClick={() => removeRow(i)} disabled={drafts.length <= 2} className="text-zinc-600 hover:text-red-400 disabled:opacity-30 shrink-0 p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={d.recipientEmail}
                        onChange={e => updateRow(i, { recipientEmail: e.target.value })}
                        placeholder="recipient@email.com"
                        className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40"
                      />
                      <div className="relative shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">$</span>
                        <input
                          type="number"
                          value={d.amount}
                          onChange={e => updateRow(i, { amount: e.target.value })}
                          step="0.01"
                          min="0"
                          className="w-24 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-5 pr-2 py-2 text-xs text-white tabular-nums focus:outline-none focus:border-amber-500/40"
                        />
                      </div>
                    </div>
                    {vehicles && vehicles.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Vehicle</span>
                        <button
                          onClick={() => updateRow(i, { vehiclePosition: null })}
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded border",
                            d.vehiclePosition == null
                              ? "border-zinc-600 bg-zinc-800/60 text-zinc-300"
                              : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          Any
                        </button>
                        {vehicles.map(v => (
                          <button
                            key={v.id}
                            onClick={() => updateRow(i, { vehiclePosition: v.position })}
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded border truncate max-w-[140px]",
                              d.vehiclePosition === v.position
                                ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                                : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
                            )}
                            title={[v.year, v.make, v.model].filter(Boolean).join(" ")}
                          >
                            #{v.position + 1} {v.make ?? "Vehicle"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/[0.1] text-zinc-500 text-[11px] font-black uppercase tracking-widest hover:border-amber-500/30 hover:text-amber-400 transition-colors"
                >
                  <Plus size={13} /> Add recipient
                </button>
              </div>

              {/* Sum check */}
              <div className={cn(
                "rounded-xl border px-3 py-2.5 flex items-center justify-between",
                balanced
                  ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400"
                  : "border-red-500/25 bg-red-500/[0.06] text-red-400"
              )}>
                <div className="flex items-center gap-1.5">
                  {balanced ? <Check size={14} /> : <X size={14} />}
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {balanced ? "Balanced" : "Doesn't match total"}
                  </span>
                </div>
                <span className="text-xs font-black tabular-nums">
                  ${sumDrafts.toFixed(2)} / ${totalPrice.toFixed(2)}
                </span>
              </div>

              {/* Save + send */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSave}
                  disabled={busy || !balanced}
                  className="flex items-center justify-center gap-1.5 bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-xs font-black uppercase tracking-widest py-2.5 rounded-xl hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-50 transition-all"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save Split
                </button>
                <button
                  onClick={handleSendAll}
                  disabled={busy || (splits?.length ?? 0) === 0}
                  className="flex items-center justify-center gap-1.5 bg-amber-500 text-black text-xs font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Send All Links
                </button>
              </div>

              {/* Pending rows list */}
              {(splits ?? []).filter(s => s.status !== "paid").length > 0 && (
                <div className="pt-2 space-y-1.5 border-t border-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Pending</p>
                  {(splits ?? []).filter(s => s.status !== "paid").map(s => (
                    <div key={s.id} className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 border",
                      s.status === "sent" ? "bg-sky-500/[0.05] border-sky-500/20"
                        : s.status === "cancelled" ? "bg-zinc-900/60 border-white/[0.05] opacity-60"
                          : "bg-zinc-900/40 border-white/[0.05]"
                    )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate">{s.recipient_email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            s.status === "sent" ? "bg-sky-500/15 text-sky-400"
                              : s.status === "cancelled" ? "bg-zinc-800 text-zinc-500"
                                : "bg-amber-500/15 text-amber-400"
                          )}>
                            {s.status}
                          </span>
                          {s.sent_at && (
                            <span className="text-[10px] text-zinc-600">
                              sent {new Date(s.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-black text-zinc-200 tabular-nums shrink-0">${Number(s.amount).toFixed(2)}</p>
                      <button onClick={() => handleDelete(s.id)} disabled={busy} className="text-zinc-600 hover:text-red-400 shrink-0 p-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
