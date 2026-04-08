"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMonthlySubscribers,
  setSubscriptionStatus,
  updateSubscriberDetails,
  sendManualScheduleReminder,
} from "@/app/actions/adminMonthlyActions";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import {
  Crown, Search, ChevronRight, Loader2, X, Check, CheckCircle2,
  AlertTriangle, PauseCircle, PlayCircle, Trash2, Mail, Send,
  Car, Calendar, Phone, Pencil, Save, RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTHLY_PLANS } from "@/lib/monthlyPlans";

const STATUS_COLORS: Record<string, string> = {
  active:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  paused:    "text-amber-400  bg-amber-500/10  border-amber-500/25",
  cancelled: "text-zinc-500   bg-zinc-800      border-zinc-700",
};

const PLAN_BADGE: Record<string, string> = {
  interior_refresh: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  interior_elite:   "bg-violet-500/10 text-violet-400 border-violet-500/20",
  full_maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  full_elite:       "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20",
};

function pickStatusLabel(pick: any | null, month: string): { label: string; color: string } {
  if (!pick) return { label: "Not scheduled", color: "text-zinc-600" };
  if (pick.chosen_date) return {
    label: `Scheduled ${new Date(pick.chosen_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} @ ${pick.chosen_time}`,
    color: "text-emerald-400",
  };
  if (pick.reminder_sent_at) return { label: "Reminder sent — awaiting pick", color: "text-amber-400" };
  return { label: "Pending", color: "text-zinc-500" };
}

export default function MonthlySubscribersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["admin", "monthly-subs"],
    queryFn: async () => await getMonthlySubscribers(),
  });

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "cancelled">("active");
  const [activeSub, setActiveSub]       = useState<any>(null);
  const [editMode, setEditMode]         = useState(false);

  // Edit form state
  const [editMake,    setEditMake]    = useState("");
  const [editModel,   setEditModel]   = useState("");
  const [editYear,    setEditYear]    = useState("");
  const [editSize,    setEditSize]    = useState("medium");
  const [editAddress, setEditAddress] = useState("");
  const [editPlanId,  setEditPlanId]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [sending,     setSending]     = useState(false);

  function openSub(sub: any) {
    setActiveSub(sub);
    setEditMode(false);
    setEditMake(sub.vehicle_make ?? "");
    setEditModel(sub.vehicle_model ?? "");
    setEditYear(sub.vehicle_year ?? "");
    setEditSize(sub.vehicle_size ?? "medium");
    setEditAddress(sub.service_address ?? "");
    setEditPlanId(sub.plan_id ?? "");
  }

  const filtered = useMemo(() => {
    if (!subs.length) return [];
    const q = search.toLowerCase();
    return subs.filter((s: any) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (s.customer_name ?? "").toLowerCase().includes(q) ||
        (s.customer_email ?? "").toLowerCase().includes(q) ||
        (s.plan_name ?? "").toLowerCase().includes(q) ||
        (s.vehicle_make ?? "").toLowerCase().includes(q) ||
        (s.vehicle_model ?? "").toLowerCase().includes(q)
      );
    });
  }, [subs, search, statusFilter]);

  const stats = useMemo(() => {
    const all = subs as any[];
    return {
      active:    all.filter(s => s.status === "active").length,
      paused:    all.filter(s => s.status === "paused").length,
      scheduled: all.filter(s => s.status === "active" && s.thisMonthPick?.chosen_date).length,
      mrr:       all.filter(s => s.status === "active").reduce((acc: number, s: any) => acc + Number(s.plan_price ?? 0), 0),
    };
  }, [subs]);

  async function handleSaveEdits() {
    if (!activeSub) return;
    setSaving(true);
    const plan = MONTHLY_PLANS.find(p => p.id === editPlanId);
    const { ok, error } = await updateSubscriberDetails(activeSub.id, {
      vehicle_make:  editMake,
      vehicle_model: editModel,
      vehicle_year:  editYear,
      vehicle_size:  editSize,
      service_address: editAddress,
      plan_id:   plan?.id   ?? activeSub.plan_id,
      plan_name: plan?.name ?? activeSub.plan_name,
      plan_price: (activeSub.payment_method === "cash" ? plan?.cashPrice : plan?.price) ?? activeSub.plan_price,
    });
    setSaving(false);
    if (ok) {
      toast("Saved! ✅");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "monthly-subs"] });
      setActiveSub({ ...activeSub, vehicle_make: editMake, vehicle_model: editModel, vehicle_year: editYear, vehicle_size: editSize, service_address: editAddress, plan_id: editPlanId, plan_name: plan?.name ?? activeSub.plan_name });
    } else {
      toast(error ?? "Failed to save", "error");
    }
  }

  async function handleSetStatus(status: "active" | "paused" | "cancelled") {
    if (!activeSub) return;
    const label = status === "active" ? "reactivate" : status;
    if (!confirm(`Are you sure you want to ${label} this subscription?`)) return;
    setSaving(true);
    const { ok, error } = await setSubscriptionStatus(activeSub.id, status);
    setSaving(false);
    if (ok) {
      toast(`Subscription ${status} ✅`);
      setActiveSub(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "monthly-subs"] });
    } else {
      toast(error ?? "Failed", "error");
    }
  }

  async function handleSendReminder() {
    if (!activeSub) return;
    setSending(true);
    const { ok, error } = await sendManualScheduleReminder(activeSub.id);
    setSending(false);
    if (ok) {
      toast("Reminder sent! ✅");
      queryClient.invalidateQueries({ queryKey: ["admin", "monthly-subs"] });
    } else {
      toast(error ?? "Failed to send", "error");
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Crown size={18} className="text-[#D4AF37]" />
        <h1 className="text-xl font-black">Monthly Subscribers</h1>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Active" value={String(stats.active)} color="text-emerald-400" />
        <StatCard label="Paused" value={String(stats.paused)} color="text-amber-400" />
        <StatCard label="Scheduled" value={String(stats.scheduled)} color="text-sky-400" />
        <StatCard label="MRR" value={`$${stats.mrr}`} color="text-[#D4AF37]" />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, vehicle…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "paused", "cancelled"] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("flex-1 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                statusFilter === f ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-600"
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-6">No subscribers found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s: any) => {
            const pick      = pickStatusLabel(s.thisMonthPick, s.currentMonth);
            const planBadge = PLAN_BADGE[s.plan_id] ?? "bg-zinc-800 text-zinc-400 border-zinc-700";
            return (
              <button
                key={s.id}
                onClick={() => openSub(s)}
                className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-sm font-black text-[#D4AF37] shrink-0">
                  {(s.customer_name?.[0] ?? "?").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold truncate">{s.customer_name}</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border", STATUS_COLORS[s.status] ?? STATUS_COLORS.cancelled)}>
                      {s.status}
                    </span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border", planBadge)}>
                      {s.plan_name}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{s.vehicle_year} {s.vehicle_make} {s.vehicle_model}</p>
                  <p className={cn("text-[10px] mt-0.5 font-medium", pick.color)}>{pick.label}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#D4AF37]">${s.plan_price}</p>
                  <p className="text-[9px] text-zinc-600">{s.payment_method === "cash" ? "cash" : "card"}/mo</p>
                </div>
                <ChevronRight size={14} className="text-zinc-700 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Subscriber Detail Modal ─────────────────────────────────────────── */}
      <Modal open={!!activeSub} onClose={() => { setActiveSub(null); setEditMode(false); }} fullScreen>
        {activeSub && (
          <div className="space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black">{activeSub.customer_name}</h2>
                  <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border", STATUS_COLORS[activeSub.status] ?? STATUS_COLORS.cancelled)}>
                    {activeSub.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Since {new Date(activeSub.signup_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[#D4AF37]">${activeSub.plan_price}<span className="text-xs text-zinc-600 font-normal">/mo</span></p>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{activeSub.payment_method === "cash" ? "💵 Cash" : "💳 Card"}</p>
              </div>
            </div>

            {/* This month's scheduling status */}
            {activeSub.status === "active" && (() => {
              const pick = pickStatusLabel(activeSub.thisMonthPick, activeSub.currentMonth);
              return (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">This Month's Appointment</p>
                  <p className={cn("text-sm font-bold", pick.color)}>{pick.label}</p>
                </div>
              );
            })()}

            {/* Contact */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
              {activeSub.customer_phone && (
                <a href={`tel:+1${activeSub.customer_phone}`} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
                  <Phone size={13} className="text-zinc-600" />
                  {activeSub.customer_phone}
                </a>
              )}
              {activeSub.customer_email && (
                <a href={`mailto:${activeSub.customer_email}`} className="flex items-center gap-2 text-sm text-sky-400/90 hover:text-sky-300">
                  <Mail size={13} className="text-zinc-600" />
                  {activeSub.customer_email}
                </a>
              )}
            </div>

            {/* Edit / View details */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Vehicle & Address</p>
                <button onClick={() => setEditMode(!editMode)}
                  className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-amber-500 flex items-center gap-1">
                  {editMode ? <><X size={10} /> Cancel</> : <><Pencil size={10} /> Edit</>}
                </button>
              </div>

              {editMode ? (
                <div className="space-y-2">
                  {/* Plan selector */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block mb-1">Plan</label>
                    <select value={editPlanId} onChange={e => setEditPlanId(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50">
                      {MONTHLY_PLANS.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — ${activeSub.payment_method === "cash" ? p.cashPrice : p.price}/mo</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[["Year", editYear, setEditYear], ["Make", editMake, setEditMake], ["Model", editModel, setEditModel]].map(([label, val, setter]: any) => (
                      <div key={label}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block mb-1">{label}</label>
                        <input value={val} onChange={e => setter(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block mb-1">Size</label>
                    <select value={editSize} onChange={e => setEditSize(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50">
                      {["compact", "sedan", "medium", "large_suv", "xl_truck"].map(sz => (
                        <option key={sz} value={sz}>{sz.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block mb-1">Service Address</label>
                    <input value={editAddress} onChange={e => setEditAddress(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50" />
                  </div>
                  <button onClick={handleSaveEdits} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={13} /> Save Changes</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-zinc-300">
                  <p className="flex items-center gap-2"><Car size={12} className="text-zinc-600" />{[activeSub.vehicle_year, activeSub.vehicle_make, activeSub.vehicle_model].filter(Boolean).join(" ") || "—"} <span className="text-zinc-600 text-xs capitalize">{activeSub.vehicle_size?.replace(/_/g," ")}</span></p>
                  {activeSub.service_address && <p className="text-xs text-zinc-500 pl-5">{activeSub.service_address}</p>}
                </div>
              )}
            </div>

            {/* Actions */}
            {activeSub.status === "active" && (
              <button onClick={handleSendReminder} disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send Schedule Reminder
              </button>
            )}

            {/* Status control */}
            <div className="grid grid-cols-2 gap-2">
              {activeSub.status === "active" && (
                <button onClick={() => handleSetStatus("paused")} disabled={saving}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">
                  <PauseCircle size={14} /> Pause Plan
                </button>
              )}
              {activeSub.status === "paused" && (
                <button onClick={() => handleSetStatus("active")} disabled={saving}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">
                  <PlayCircle size={14} /> Reactivate
                </button>
              )}
              {activeSub.status !== "cancelled" && (
                <button onClick={() => handleSetStatus("cancelled")} disabled={saving}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">
                  <Trash2 size={14} /> Cancel Plan
                </button>
              )}
            </div>

            {/* Stripe sub ID for reference */}
            {activeSub.stripe_subscription_id && (
              <p className="text-[9px] text-zinc-700 font-mono text-center">Stripe: {activeSub.stripe_subscription_id}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl py-2 px-3 text-center">
      <p className={cn("text-lg font-black", color ?? "text-white")}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mt-0.5">{label}</p>
    </div>
  );
}
