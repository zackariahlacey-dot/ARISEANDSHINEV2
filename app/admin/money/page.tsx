"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCouponStats, createCouponAction, toggleCouponAction,
  deleteCouponAction, getAllBookings,
} from "@/app/actions/adminActions";
import {
  useRevenueBreakdown, useAllTimeStats, useMonthlyGoal, useSetMonthlyGoal,
} from "@/hooks/use-admin-data";
import { sendStripePaymentLink } from "@/app/actions/sendStripePaymentLink";
import { useToast } from "@/components/admin/Toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";
import {
  DollarSign, CreditCard, Banknote, TrendingUp, Target, Ticket,
  ChevronLeft, ChevronRight, Plus, Trash2, Power, Loader2,
  AlertTriangle, Link, Check, Search,
} from "lucide-react";
import { format, isThisMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { to12h } from "@/lib/availability";

export default function MoneyPage() {
  const { toast }         = useToast();
  const queryClient       = useQueryClient();
  const [monthOffset, setMonthOffset] = useState(0);
  const [tab, setTab]     = useState<"overview" | "unpaid" | "services" | "coupons">("overview");
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput]       = useState("");
  const [showNewCoupon, setShowNewCoupon]   = useState(false);
  const [newCoupon, setNewCoupon]           = useState({ code: "", type: "percentage", value: "" });
  const [creating, setCreating]             = useState(false);

  const { data: rev,     isLoading: revLoading }  = useRevenueBreakdown(monthOffset);
  const { data: allTime, isLoading: atLoading }   = useAllTimeStats();
  const { data: goal }                            = useMonthlyGoal();
  const setGoal                                   = useSetMonthlyGoal();

  const { data: coupons, isLoading: cLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => await getCouponStats(),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleCouponAction(id, is_active),
    onSuccess: () => { toast("Updated"); queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCouponAction(id),
    onSuccess: () => { toast("Deleted"); queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }); },
  });

  const goalPct = goal && rev ? Math.min(100, (rev.totalRevenue / goal) * 100) : 0;

  const monthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return format(d, "MMMM yyyy");
  }, [monthOffset]);

  async function handleCreateCoupon() {
    if (!newCoupon.code || !newCoupon.value) { toast("Code and value required", "error"); return; }
    setCreating(true);
    try {
      await createCouponAction({
        code: newCoupon.code.toUpperCase().trim(),
        discount_percentage: newCoupon.type === "percentage" ? Number(newCoupon.value) : undefined,
        discount_amount:     newCoupon.type === "amount"     ? Number(newCoupon.value) : undefined,
      });
      toast("Coupon created!");
      setShowNewCoupon(false);
      setNewCoupon({ code: "", type: "percentage", value: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch { toast("Failed", "error"); }
    finally { setCreating(false); }
  }

  async function handleResendStripeLink(b: any) {
    const email = b.customer_email;
    if (!email) { toast("No email on file", "error"); return; }
    try {
      const r = await sendStripePaymentLink(b.id, {
        serviceName:  b.service_name ?? "Detailing Service",
        totalPrice:   Number(b.total_price),
        vehicleYear:  b.vehicle_year  ?? undefined,
        vehicleMake:  b.vehicle_make  ?? undefined,
        vehicleModel: b.vehicle_model ?? undefined,
        vehicleSize:  b.vehicle_size  ?? undefined,
        bookingDate:  b.booking_date  ?? "",
        bookingTime:  b.booking_time  ?? "",
        customerEmail: email,
      });
      if ("url" in r) toast("Stripe link sent!"); else toast(r.error ?? "Failed", "error");
    } catch { toast("Failed", "error"); }
  }

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "unpaid",    label: `Unpaid ${rev?.unpaid?.length ? `(${rev.unpaid.length})` : ""}` },
    { id: "services",  label: "By Service" },
    { id: "coupons",   label: "Coupons" },
  ] as const;

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">Money</h1>
        {allTime && (
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">All Time</p>
            <p className="text-lg font-black text-amber-500">${allTime.totalRevenue.toFixed(0)}</p>
          </div>
        )}
      </div>

      {/* ── Month navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3">
        <button onClick={() => setMonthOffset(o => o - 1)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-all active:scale-90"><ChevronLeft size={16} /></button>
        <span className="text-sm font-black">{monthLabel}</span>
        <button onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset >= 0}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-all active:scale-90 disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>

      {/* ── Revenue cards ────────────────────────────────────────────────── */}
      {revLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      ) : rev && (
        <div className="grid grid-cols-2 gap-3">
          <RevenueCard icon={<DollarSign size={16} />} label="Total Earned" value={`$${rev.totalRevenue.toFixed(0)}`} sub={`${rev.jobCount} job${rev.jobCount !== 1 ? "s" : ""}`} gold />
          <RevenueCard icon={<TrendingUp size={16} />} label="Avg Ticket" value={`$${rev.avgTicket.toFixed(0)}`} />
          <RevenueCard icon={<CreditCard size={16} />} label="Stripe" value={`$${rev.stripeRevenue.toFixed(0)}`} sub="Card payments" />
          <RevenueCard icon={<Banknote size={16} />} label="Cash" value={`$${rev.cashRevenue.toFixed(0)}`} sub="On arrival" />
        </div>
      )}

      {/* ── Goal progress ────────────────────────────────────────────────── */}
      {goal !== undefined && rev && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest">Monthly Goal</span>
            </div>
            <button
              onClick={() => { setGoalInput(String(goal)); setShowGoalEdit(true); }}
              className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-amber-500"
            >Edit</button>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-black text-white">${rev.totalRevenue.toFixed(0)}</span>
            <span className="text-zinc-600">/ ${goal.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", goalPct >= 100 ? "bg-emerald-500" : "bg-amber-500")}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[9px] text-zinc-600 font-bold">{goalPct.toFixed(0)}% of goal{goalPct >= 100 ? " — CRUSHED IT! 🎉" : ` — $${(goal - rev.totalRevenue).toFixed(0)} to go`}</p>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all px-2",
              tab === t.id ? "bg-amber-500 text-black" : "text-zinc-500")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview (recent completed) ─────────────────────────────── */}
      {tab === "overview" && rev && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Recent Completed</p>
          {rev.unpaid.length === 0 && <p className="text-sm text-zinc-600 py-2">No completed jobs this month yet.</p>}
          {/* We use unpaid list but for completed we'd need all — future: separate query */}
          <div className="text-xs text-zinc-600 italic">Switch to "By Service" to see breakdown, or "Unpaid" to follow up on outstanding jobs.</div>
        </div>
      )}

      {/* ── Tab: Unpaid ──────────────────────────────────────────────────── */}
      {tab === "unpaid" && (
        <div className="space-y-2">
          {!rev?.unpaid?.length ? (
            <div className="text-center py-6">
              <Check size={24} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm text-zinc-500">No outstanding payments!</p>
            </div>
          ) : rev.unpaid.map((b: any) => (
            <div key={b.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{b.customer_name ?? "Unknown"}</p>
                <p className="text-xs text-zinc-500 truncate">{b.service_name} · {b.booking_date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-amber-500">${b.total_price.toFixed(0)}</p>
                {b.is_stripe && <span className="text-[9px] text-blue-400 font-bold">STRIPE</span>}
              </div>
              <button
                onClick={() => handleResendStripeLink(b)}
                className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all active:scale-90"
                title="Send Stripe link"
              ><Link size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: By Service ──────────────────────────────────────────────── */}
      {tab === "services" && (
        <div className="space-y-2">
          {!rev?.byService?.length ? (
            <p className="text-sm text-zinc-600 py-4 text-center">No completed jobs this period.</p>
          ) : rev.byService.map((s: any) => {
            const pct = rev.totalRevenue > 0 ? (s.revenue / rev.totalRevenue) * 100 : 0;
            return (
              <div key={s.name} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold truncate flex-1 pr-2">{s.name}</span>
                  <span className="font-black text-amber-500 shrink-0">${s.revenue.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-bold shrink-0">{s.count} job{s.count !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Coupons ─────────────────────────────────────────────────── */}
      {tab === "coupons" && (
        <div className="space-y-3">
          <button
            onClick={() => setShowNewCoupon(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-amber-500/30 text-amber-500 text-xs font-black uppercase tracking-wider py-3 rounded-xl hover:border-amber-500/60 transition-all active:scale-95"
          ><Plus size={14} /> New Coupon</button>

          {cLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" size={20} /></div>
          ) : !coupons?.length ? (
            <p className="text-sm text-zinc-600 text-center py-4">No coupons yet.</p>
          ) : coupons.map((c: any) => (
            <div key={c.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-black", c.is_active ? "text-white" : "text-zinc-600 line-through")}>{c.code}</span>
                  {c.is_active ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Active</span>
                  ) : (
                    <span className="text-[8px] bg-zinc-800 text-zinc-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Off</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {c.discount_percentage ? `${c.discount_percentage}% off` : `$${c.discount_amount} off`}
                  {" · "}{c.usage_count} use{c.usage_count !== 1 ? "s" : ""} · ${c.revenue_generated.toFixed(0)} rev
                </p>
              </div>
              <button onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                className={cn("p-2 rounded-lg border transition-all active:scale-90 text-xs",
                  c.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.03] border-white/[0.08] text-zinc-600"
                )}>
                <Power size={13} />
              </button>
              <button onClick={() => { if (confirm("Delete coupon?")) deleteMut.mutate(c.id); }}
                className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-all active:scale-90">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Goal Modal ──────────────────────────────────────────────── */}
      <Modal open={showGoalEdit} onClose={() => setShowGoalEdit(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2"><Target size={16} className="text-amber-500" /> Monthly Goal</h2>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Goal Amount ($)</p>
            <input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="5000"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGoalEdit(false)} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black uppercase tracking-wider">Cancel</button>
            <button
              onClick={async () => {
                if (!goalInput) return;
                await setGoal.mutateAsync(Number(goalInput));
                toast("Goal updated!");
                setShowGoalEdit(false);
              }}
              disabled={setGoal.isPending}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95"
            >Save</button>
          </div>
        </div>
      </Modal>

      {/* ── New Coupon Modal ─────────────────────────────────────────────── */}
      <Modal open={showNewCoupon} onClose={() => setShowNewCoupon(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2"><Ticket size={16} className="text-amber-500" /> New Coupon</h2>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Code</p>
            <input
              value={newCoupon.code}
              onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="SUMMER25"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setNewCoupon(p => ({ ...p, type: "percentage" }))}
              className={cn("py-2 rounded-xl border text-xs font-black transition-all",
                newCoupon.type === "percentage" ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-400")}>
              % Off
            </button>
            <button onClick={() => setNewCoupon(p => ({ ...p, type: "amount" }))}
              className={cn("py-2 rounded-xl border text-xs font-black transition-all",
                newCoupon.type === "amount" ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-400")}>
              $ Off
            </button>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Value</p>
            <input
              type="number"
              value={newCoupon.value}
              onChange={e => setNewCoupon(p => ({ ...p, value: e.target.value }))}
              placeholder={newCoupon.type === "percentage" ? "15" : "20"}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewCoupon(false)} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-black uppercase tracking-wider">Cancel</button>
            <button onClick={handleCreateCoupon} disabled={creating}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 flex items-center justify-center gap-2">
              {creating ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={14} /> Create</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RevenueCard({ icon, label, value, sub, gold }: { icon: React.ReactNode; label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className={cn("bg-white/[0.02] border rounded-2xl p-4 space-y-1", gold ? "border-amber-500/20 bg-amber-500/[0.04]" : "border-white/[0.06]")}>
      <div className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest", gold ? "text-amber-500" : "text-zinc-600")}>
        {icon} {label}
      </div>
      <p className={cn("text-2xl font-black", gold ? "text-amber-500" : "text-white")}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 font-medium">{sub}</p>}
    </div>
  );
}
