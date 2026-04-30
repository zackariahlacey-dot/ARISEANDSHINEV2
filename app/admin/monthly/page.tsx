"use client";

import { useState, useMemo, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMonthlySubscribers,
  setSubscriptionStatus,
  updateSubscriberDetails,
  sendManualScheduleReminder,
  adminSetSchedulePick,
  adminCreateSubscription,
  adminGetScheduleAvailability,
  getSubscriberHistory,
} from "@/app/actions/adminMonthlyActions";
import {
  adminGetPlanRequests,
  adminRespondToPlanRequest,
  adminUpdatePlanRequestNotes,
  adminSendMonthlyReminder,
} from "@/app/actions/planRequestActions";
import type { PlanRequest } from "@/app/actions/planRequestActions";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import {
  Crown, Search, ChevronRight, Loader2, X, Check, CheckCircle2,
  PauseCircle, PlayCircle, Trash2, Mail, Send, AlertTriangle,
  Car, Calendar, Phone, Pencil, Save, UserPlus, Copy, ExternalLink,
  Clock, FileText, ChevronDown, History, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTHLY_PLANS } from "@/lib/monthlyPlans";
import type { ScheduleDay } from "@/app/actions/monthlySubscriptions";

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

const PLAN_BAR_COLOR: Record<string, string> = {
  interior_refresh: "bg-sky-500",
  interior_elite:   "bg-violet-500",
  full_maintenance: "bg-amber-500",
  full_elite:       "bg-[#D4AF37]",
};

function pickStatusLabel(pick: any | null): { label: string; color: string } {
  if (!pick) return { label: "Not scheduled", color: "text-zinc-600" };
  if (pick.chosen_date) return {
    label: `Scheduled ${new Date(pick.chosen_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} @ ${pick.chosen_time}`,
    color: "text-emerald-400",
  };
  if (pick.reminder_sent_at) return { label: "Reminder sent — awaiting pick", color: "text-amber-400" };
  return { label: "Pending", color: "text-zinc-500" };
}

function defaultSchedulingMonth(): string {
  const now = new Date();
  const target = now.getDate() <= 25
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MonthlySubscribersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<"requests" | "subscribers">("requests");

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["admin", "monthly-subs"],
    queryFn: async () => await getMonthlySubscribers(),
  });

  const { data: planRequests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["admin", "plan-requests"],
    queryFn: async () => await adminGetPlanRequests(),
  });

  const pendingCount = (planRequests as PlanRequest[]).filter(r => r.status === "pending").length;

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "cancelled">("active");
  const [activeSub, setActiveSub]       = useState<any>(null);
  const [editMode, setEditMode]         = useState(false);
  const [showNewSub, setShowNewSub]     = useState(false);

  // Vehicle edit state
  const [editMake,    setEditMake]    = useState("");
  const [editModel,   setEditModel]   = useState("");
  const [editYear,    setEditYear]    = useState("");
  const [editSize,    setEditSize]    = useState("medium");
  const [editAddress, setEditAddress] = useState("");
  const [editPlanId,  setEditPlanId]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [sending,     setSending]     = useState(false);

  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue,   setNotesValue]   = useState("");
  const [savingNotes,  setSavingNotes]  = useState(false);

  function openSub(sub: any) {
    setActiveSub(sub);
    setEditMode(false);
    setEditMake(sub.vehicle_make ?? "");
    setEditModel(sub.vehicle_model ?? "");
    setEditYear(sub.vehicle_year ?? "");
    setEditSize(sub.vehicle_size ?? "medium");
    setEditAddress(sub.service_address ?? "");
    setEditPlanId(sub.plan_id ?? "");
    setEditingNotes(false);
    setNotesValue(sub.admin_notes ?? "");
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

  // Plan breakdown (computed from loaded data — no extra query)
  const planBreakdown = useMemo(() => {
    const active = (subs as any[]).filter(s => s.status === "active");
    const map = new Map<string, { name: string; count: number; mrr: number; color: string }>();
    for (const s of active) {
      if (!map.has(s.plan_id)) {
        map.set(s.plan_id, { name: s.plan_name, count: 0, mrr: 0, color: PLAN_BAR_COLOR[s.plan_id] ?? "bg-zinc-500" });
      }
      const e = map.get(s.plan_id)!;
      e.count++;
      e.mrr += Number(s.plan_price ?? 0);
    }
    return Array.from(map.values()).sort((a, b) => b.mrr - a.mrr);
  }, [subs]);

  async function handleSaveEdits() {
    if (!activeSub) return;
    setSaving(true);
    const plan = MONTHLY_PLANS.find(p => p.id === editPlanId);
    const { ok, error } = await updateSubscriberDetails(activeSub.id, {
      vehicle_make:    editMake,
      vehicle_model:   editModel,
      vehicle_year:    editYear,
      vehicle_size:    editSize,
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
      setActiveSub({
        ...activeSub,
        vehicle_make: editMake, vehicle_model: editModel, vehicle_year: editYear,
        vehicle_size: editSize, service_address: editAddress,
        plan_id: editPlanId, plan_name: plan?.name ?? activeSub.plan_name,
      });
    } else {
      toast(error ?? "Failed to save", "error");
    }
  }

  async function handleSaveNotes() {
    if (!activeSub) return;
    setSavingNotes(true);
    const { ok, error } = await updateSubscriberDetails(activeSub.id, { admin_notes: notesValue });
    setSavingNotes(false);
    if (ok) {
      toast("Notes saved ✅");
      setEditingNotes(false);
      setActiveSub({ ...activeSub, admin_notes: notesValue });
      queryClient.invalidateQueries({ queryKey: ["admin", "monthly-subs"] });
    } else {
      toast(error ?? "Failed", "error");
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crown size={18} className="text-[#D4AF37]" />
          <h1 className="text-xl font-black">Monthly Plans</h1>
        </div>
        <button
          onClick={() => setShowNewSub(true)}
          className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl hover:bg-[#D4AF37]/20 transition-all active:scale-95"
        >
          <UserPlus size={13} />
          Add Subscriber
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <button
          onClick={() => setMainTab("requests")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
            mainTab === "requests" ? "bg-amber-500 text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Inbox size={11} />
          Requests
          {pendingCount > 0 && (
            <span className={cn("ml-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black px-1",
              mainTab === "requests" ? "bg-black/30 text-white" : "bg-red-500 text-white"
            )}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab("subscribers")}
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
            mainTab === "subscribers" ? "bg-amber-500 text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Crown size={11} />
          Subscribers
        </button>
      </div>

      {/* ── Plan Requests Tab ───────────────────────────────────────────── */}
      {mainTab === "requests" && (
        <PlanRequestsTab
          requests={planRequests as PlanRequest[]}
          isLoading={reqLoading}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["admin", "plan-requests"] })}
          toast={toast}
        />
      )}

      {/* ── Subscribers Tab ────────────────────────────────────────────── */}
      {mainTab === "subscribers" && (<>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Active"     value={String(stats.active)}    color="text-emerald-400" />
        <StatCard label="Paused"     value={String(stats.paused)}    color="text-amber-400" />
        <StatCard label="Scheduled"  value={String(stats.scheduled)} color="text-sky-400" />
        <StatCard label="MRR"        value={`$${stats.mrr}`}         color="text-[#D4AF37]" />
      </div>

      {/* Plan breakdown */}
      {planBreakdown.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Plan Breakdown</p>
          {planBreakdown.map(p => (
            <div key={p.name} className="flex items-center gap-3">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.color)} />
              <p className="text-xs text-zinc-300 flex-1">{p.name}</p>
              <p className="text-xs text-zinc-500">{p.count} sub{p.count !== 1 ? "s" : ""}</p>
              <p className="text-xs font-bold text-[#D4AF37] w-14 text-right">${p.mrr}/mo</p>
            </div>
          ))}
        </div>
      )}

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
            const pick      = pickStatusLabel(s.thisMonthPick);
            const planBadge = PLAN_BADGE[s.plan_id] ?? "bg-zinc-800 text-zinc-400 border-zinc-700";
            return (
              <button
                key={s.id}
                onClick={() => openSub(s)}
                className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
              >
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
                  {s.admin_notes && <p className="text-[8px] text-zinc-700 mt-0.5">📝 note</p>}
                </div>
                <ChevronRight size={14} className="text-zinc-700 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      </>)} {/* end subscribers tab */}

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
              const pick = pickStatusLabel(activeSub.thisMonthPick);
              return (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">This Month&apos;s Appointment</p>
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
              {activeSub.customer_email ? (
                <a href={`mailto:${activeSub.customer_email}`} className="flex items-center gap-2 text-sm text-sky-400/90 hover:text-sky-300">
                  <Mail size={13} className="text-zinc-600" />
                  {activeSub.customer_email}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-xs text-zinc-600 italic">
                  <Mail size={12} className="text-zinc-700" /> No email — schedule reminders won&apos;t be sent
                </p>
              )}
            </div>

            {/* ── Admin Notes ───────────────────────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <FileText size={12} className="text-zinc-600" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Admin Notes</p>
                </div>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-amber-500 flex items-center gap-1"
                  >
                    <Pencil size={9} /> {activeSub.admin_notes ? "Edit" : "Add"}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    rows={3}
                    placeholder="Gate code, prefers afternoon, dog in yard…"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-700 resize-none focus:outline-none focus:border-amber-500/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingNotes(false)} className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-xs text-zinc-600 font-bold">
                      Cancel
                    </button>
                    <button onClick={handleSaveNotes} disabled={savingNotes}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-black flex items-center justify-center gap-1 disabled:opacity-50">
                      {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <><Save size={11} /> Save</>}
                    </button>
                  </div>
                </div>
              ) : activeSub.admin_notes ? (
                <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{activeSub.admin_notes}</p>
              ) : (
                <p className="text-xs text-zinc-700 italic">No notes yet.</p>
              )}
            </div>

            {/* Vehicle & Address */}
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
                  <p className="flex items-center gap-2"><Car size={12} className="text-zinc-600" />
                    {[activeSub.vehicle_year, activeSub.vehicle_make, activeSub.vehicle_model].filter(Boolean).join(" ") || "—"}
                    {" "}<span className="text-zinc-600 text-xs capitalize">{activeSub.vehicle_size?.replace(/_/g," ")}</span>
                  </p>
                  {activeSub.service_address && <p className="text-xs text-zinc-500 pl-5">{activeSub.service_address}</p>}
                </div>
              )}
            </div>

            {/* ── Book for Them ─────────────────────────────────────────────── */}
            {activeSub.status === "active" && (
              <AdminBookingPicker
                subscriptionId={activeSub.id}
                currentMonth={activeSub.currentMonth}
                existingPick={activeSub.thisMonthPick}
                onBooked={(date, time) => {
                  toast(`Booked ${date} @ ${time} ✅`);
                  queryClient.invalidateQueries({ queryKey: ["admin", "monthly-subs"] });
                  setActiveSub({ ...activeSub, thisMonthPick: { chosen_date: date, chosen_time: time, status: "pending" } });
                }}
              />
            )}

            {/* Actions */}
            {activeSub.status === "active" && (
              <button onClick={handleSendReminder} disabled={sending || !activeSub.customer_email}
                title={!activeSub.customer_email ? "No email on file" : undefined}
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

            {/* ── Appointment History ───────────────────────────────────────── */}
            <AdminHistorySection subscriptionId={activeSub.id} />

            {activeSub.stripe_subscription_id && (
              <p className="text-[9px] text-zinc-700 font-mono text-center">Stripe: {activeSub.stripe_subscription_id}</p>
            )}
          </div>
        )}
      </Modal>

      {/* ── New Subscriber Modal ────────────────────────────────────────────── */}
      <NewSubscriberModal
        open={showNewSub}
        onClose={() => setShowNewSub(false)}
        onCreated={() => {
          toast("Subscriber added! ✅");
          queryClient.invalidateQueries({ queryKey: ["admin", "monthly-subs"] });
          setShowNewSub(false);
        }}
      />
    </div>
  );
}

// ── Plan Requests Tab ─────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  interior_only: "Interior Only",
  exterior_only: "Exterior Only",
  full_detail:   "Full Detail",
};

const FREQ_LABELS: Record<string, string> = {
  weekly:   "Weekly",
  biweekly: "Every 2 Weeks",
  monthly:  "Monthly",
};

function PlanRequestsTab({
  requests, isLoading, onRefresh, toast,
}: {
  requests: PlanRequest[];
  isLoading: boolean;
  onRefresh: () => void;
  toast: (msg: string, type?: "error") => void;
}) {
  const [filter, setFilter]         = useState<"all" | "pending" | "approved" | "declined">("pending");
  const [activeReq, setActiveReq]   = useState<PlanRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = requests.filter(r => filter === "all" || r.status === filter);

  function openReq(r: PlanRequest) {
    setActiveReq(r);
    setAdminNotes(r.admin_notes ?? "");
  }

  function handleRespond(decision: "approved" | "declined") {
    if (!activeReq) return;
    startTransition(async () => {
      const { ok, error } = await adminRespondToPlanRequest(activeReq.id, decision, adminNotes);
      if (ok) {
        toast(decision === "approved" ? "Approved! Email sent ✅" : "Declined — customer notified");
        setActiveReq(null);
        onRefresh();
      } else {
        toast(error ?? "Failed", "error");
      }
    });
  }

  async function handleSaveNotes() {
    if (!activeReq) return;
    setSavingNotes(true);
    const { ok, error } = await adminUpdatePlanRequestNotes(activeReq.id, adminNotes);
    setSavingNotes(false);
    if (ok) {
      toast("Notes saved ✅");
      setActiveReq({ ...activeReq, admin_notes: adminNotes });
      onRefresh();
    } else {
      toast(error ?? "Failed", "error");
    }
  }

  const STATUS_STYLE: Record<string, string> = {
    pending:  "text-amber-400 bg-amber-500/10 border-amber-500/25",
    approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    declined: "text-zinc-500 bg-zinc-800 border-zinc-700",
  };

  return (
    <>
      {/* Filter row */}
      <div className="flex gap-1.5">
        {(["pending", "approved", "declined", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("flex-1 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
              filter === f ? "bg-amber-500 border-amber-500 text-black" : "border-white/[0.08] text-zinc-600"
            )}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Inbox size={28} className="text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">No {filter === "all" ? "" : filter + " "}requests.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const planLabel = PLAN_LABELS[r.plan_type] + (r.ultimate_upgrade ? " — Ultimate" : "");
            return (
              <button
                key={r.id}
                onClick={() => openReq(r)}
                className="w-full text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-sm font-black text-[#D4AF37] shrink-0">
                  {(r.customer_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold truncate">{r.customer_name}</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border", STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{planLabel} · {FREQ_LABELS[r.preferred_frequency]}</p>
                  {(r.vehicle_make || r.vehicle_model) && (
                    <p className="text-[10px] text-zinc-700 mt-0.5">{[r.vehicle_year, r.vehicle_make, r.vehicle_model].filter(Boolean).join(" ")}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-zinc-600">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-700 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Request Detail Modal */}
      <Modal open={!!activeReq} onClose={() => setActiveReq(null)} fullScreen>
        {activeReq && (() => {
          const planLabel   = PLAN_LABELS[activeReq.plan_type] + (activeReq.ultimate_upgrade ? " — Ultimate" : "");
          const schedLabel  = activeReq.schedule_preference === "monthly_pick"
            ? "Monthly email reminder"
            : activeReq.schedule_preference === "fixed_day" && activeReq.fixed_day_of_week !== null && activeReq.fixed_week_of_month !== null
              ? `Every ${["1st","2nd","3rd","4th"][activeReq.fixed_week_of_month - 1]} ${["Monday","Tuesday","Wednesday","Thursday","Friday"][activeReq.fixed_day_of_week]}`
              : null;

          return (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{activeReq.customer_name}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">{planLabel} · {FREQ_LABELS[activeReq.preferred_frequency]}</p>
                </div>
                <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border", STATUS_STYLE[activeReq.status])}>
                  {activeReq.status}
                </span>
              </div>

              {/* Schedule */}
              {activeReq.status === "approved" && (
                <div className={cn("rounded-xl border p-3", schedLabel ? "bg-emerald-500/[0.04] border-emerald-500/20" : "bg-amber-500/[0.04] border-amber-500/20")}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Recurring Schedule</p>
                  {schedLabel ? (
                    <p className="text-sm font-bold text-emerald-400">{schedLabel}</p>
                  ) : (
                    <p className="text-xs text-amber-400">Customer hasn't set their schedule yet</p>
                  )}
                </div>
              )}

              {/* Monthly reminder button */}
              {activeReq.status === "approved" && activeReq.schedule_preference === "monthly_pick" && (
                <button
                  onClick={() => {
                    startTransition(async () => {
                      const { ok, error } = await adminSendMonthlyReminder(activeReq.id);
                      if (ok) toast("Reminder sent ✅");
                      else toast(error ?? "Failed", "error");
                    });
                  }}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Send Monthly Pick Reminder
                </button>
              )}

              {/* Contact */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
                {activeReq.customer_phone && (
                  <a href={`tel:${activeReq.customer_phone}`} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
                    <Phone size={13} className="text-zinc-600" />
                    {activeReq.customer_phone}
                  </a>
                )}
                <a href={`mailto:${activeReq.customer_email}`} className="flex items-center gap-2 text-sm text-sky-400/90 hover:text-sky-300">
                  <Mail size={13} className="text-zinc-600" />
                  {activeReq.customer_email}
                </a>
              </div>

              {/* Vehicle */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Vehicle</p>
                <p className="flex items-center gap-2 text-sm text-zinc-300">
                  <Car size={12} className="text-zinc-600" />
                  {[activeReq.vehicle_year, activeReq.vehicle_make, activeReq.vehicle_model].filter(Boolean).join(" ") || "Not specified"}
                  {" "}<span className="text-zinc-600 text-xs capitalize">{activeReq.vehicle_size?.replace(/_/g, " ")}</span>
                </p>
                {activeReq.service_address && (
                  <p className="text-xs text-zinc-500 pl-5">{activeReq.service_address}</p>
                )}
              </div>

              {/* Notes from customer */}
              {activeReq.notes && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Customer Note</p>
                  <p className="text-xs text-zinc-400">{activeReq.notes}</p>
                </div>
              )}

              {/* Admin notes */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Note to Customer (optional)</p>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="Context for approval/decline email…"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-700 resize-none focus:outline-none focus:border-amber-500/50"
                />
                <button onClick={handleSaveNotes} disabled={savingNotes}
                  className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-amber-500 disabled:opacity-50">
                  {savingNotes ? <Loader2 size={9} className="animate-spin" /> : <Save size={9} />}
                  Save Note
                </button>
              </div>

              {/* Pending: approve / decline */}
              {activeReq.status === "pending" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRespond("declined")}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
                  >
                    <X size={14} /> Decline
                  </button>
                  <button
                    onClick={() => handleRespond("approved")}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <><Check size={14} /> Approve</>}
                  </button>
                </div>
              )}

              <p className="text-[9px] text-zinc-700 text-center">
                Submitted {new Date(activeReq.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl py-2 px-3 text-center">
      <p className={cn("text-lg font-black", color ?? "text-white")}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mt-0.5">{label}</p>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

const inputCls = "w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Admin History Section (lazy) ──────────────────────────────────────────────

function AdminHistorySection({ subscriptionId }: { subscriptionId: string }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems]     = useState<any[] | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !items) {
      setLoading(true);
      const h = await getSubscriberHistory(subscriptionId);
      setItems(h);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <History size={12} />
          <span className="font-black uppercase tracking-widest text-[9px]">Appointment History</span>
        </div>
        {loading
          ? <Loader2 size={11} className="animate-spin" />
          : <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
        }
      </button>

      {open && (
        <div className="mt-3">
          {items === null || loading ? (
            <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-zinc-700" /></div>
          ) : items.length === 0 ? (
            <p className="text-xs text-zinc-700 text-center py-2">No appointments yet.</p>
          ) : (
            <div className="space-y-1">
              {items.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-xs text-zinc-300 font-medium">
                      {new Date(h.booking_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(h.booking_time)}</p>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                    h.status === "confirmed" || h.status === "completed"
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8"
                      : h.status === "cancelled"
                      ? "text-zinc-600 border-zinc-700 bg-zinc-800"
                      : "text-zinc-500 border-zinc-700"
                  )}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── New Subscriber Modal ──────────────────────────────────────────────────────

const PLAN_ACCENT: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  interior_refresh: { border: "border-sky-500/40",      bg: "bg-sky-500/8",      text: "text-sky-400",      dot: "bg-sky-500" },
  interior_elite:   { border: "border-violet-500/40",   bg: "bg-violet-500/8",   text: "text-violet-400",   dot: "bg-violet-500" },
  full_maintenance: { border: "border-amber-500/40",    bg: "bg-amber-500/8",    text: "text-amber-400",    dot: "bg-amber-500" },
  full_elite:       { border: "border-[#D4AF37]/40",    bg: "bg-[#D4AF37]/8",    text: "text-[#D4AF37]",    dot: "bg-[#D4AF37]" },
};

const VEHICLE_SIZE_LABELS: Record<string, string> = {
  compact:  "Compact",
  sedan:    "Sedan / Coupe",
  medium:   "Mid-size SUV / Minivan",
  large_suv:"Large SUV / Full-size Truck",
  xl_truck: "XL Truck / Oversized",
};

function NewSubscriberModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step,    setStep]    = useState<1 | 2 | 3>(1);
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [planId,  setPlanId]  = useState("full_maintenance");
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [make,    setMake]    = useState("");
  const [model,   setModel]   = useState("");
  const [year,    setYear]    = useState("");
  const [size,    setSize]    = useState("medium");
  const [address, setAddress] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setStep(1);
    setName(""); setEmail(""); setPhone("");
    setPlanId("full_maintenance"); setPayment("cash");
    setMake(""); setModel(""); setYear(""); setSize("medium"); setAddress("");
    setError(null); setCheckoutUrl(null); setCopied(false); setSubmitting(false);
  }

  function handleClose() { reset(); onClose(); }

  const selectedPlan = MONTHLY_PLANS.find(p => p.id === planId)!;
  const price = payment === "cash" ? selectedPlan?.cashPrice : selectedPlan?.price;
  const accent = PLAN_ACCENT[planId] ?? PLAN_ACCENT.full_maintenance;

  // ── Step validation & advance ──────────────────────────────────────────────
  function advanceStep() {
    setError(null);
    if (step === 2) {
      if (!name.trim())  { setError("Name is required."); return; }
      if (!phone.trim()) { setError("Phone is required."); return; }
      if (payment === "card" && !email.trim()) {
        setError("Email is required for card payments."); return;
      }
    }
    setStep(s => (s < 3 ? (s + 1) as 1 | 2 | 3 : s));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const result = await adminCreateSubscription({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      planId,
      paymentMethod:  payment,
      vehicleMake:    make.trim(),
      vehicleModel:   model.trim(),
      vehicleYear:    year.trim(),
      vehicleSize:    size,
      serviceAddress: address.trim(),
    });

    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Something went wrong."); return; }

    if (result.checkoutUrl) {
      setCheckoutUrl(result.checkoutUrl);
    } else {
      onCreated();
    }
  }

  async function copyLink() {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={handleClose} fullScreen>
      <div className="space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <UserPlus size={15} className="text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight">New Subscriber</h2>
              {!checkoutUrl && (
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                  Step {step} of 3 · {["", "Choose Plan", "Customer Info", "Vehicle"][step]}
                </p>
              )}
            </div>
          </div>
          {!checkoutUrl && (
            <div className="flex gap-1">
              {([1, 2, 3] as const).map(s => (
                <div key={s} className={cn("h-1 rounded-full transition-all", s === step ? "w-6 bg-[#D4AF37]" : s < step ? "w-3 bg-[#D4AF37]/40" : "w-3 bg-white/[0.08]")} />
              ))}
            </div>
          )}
        </div>

        {/* ── Checkout success ────────────────────────────────────────────── */}
        {checkoutUrl ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={22} className="text-emerald-400" />
              </div>
              <p className="text-sm font-black text-white">Subscriber added!</p>
              <p className="text-xs text-zinc-400 mt-1">Send <strong className="text-white">{name.split(" ")[0]}</strong> this link to set up their card.</p>
            </div>
            <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Payment Link</p>
              <p className="text-xs font-mono text-zinc-400 break-all leading-relaxed">{checkoutUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyLink}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-black uppercase tracking-wider active:scale-95 transition-all">
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
              </button>
              <a
                href={`sms:${phone}&body=${encodeURIComponent(`Hi ${name.split(" ")[0]}, here's your Arise & Shine VT monthly plan payment link: ${checkoutUrl}`)}`}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-sm font-black uppercase tracking-wider active:scale-95 transition-all"
              >
                <Phone size={14} /> Text Link
              </a>
            </div>
            <button onClick={() => onCreated()}
              className="w-full py-2.5 rounded-xl border border-white/[0.08] text-xs text-zinc-500 font-bold active:scale-95 transition-all">
              Done
            </button>
          </div>

        /* ── Step 1: Choose Plan ─────────────────────────────────────────── */
        ) : step === 1 ? (
          <div className="space-y-3">
            {/* Payment method toggle — affects all prices shown */}
            <div className="flex gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              {(["cash", "card"] as const).map(m => (
                <button key={m} onClick={() => setPayment(m)}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                    payment === m ? "bg-amber-500 text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}>
                  {m === "cash" ? "💵 Cash" : "💳 Card"}
                </button>
              ))}
            </div>

            {/* Plan cards */}
            <div className="space-y-2">
              {MONTHLY_PLANS.map(p => {
                const sel = planId === p.id;
                const ac  = PLAN_ACCENT[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={cn(
                      "w-full rounded-xl border p-3.5 text-left transition-all active:scale-[0.98]",
                      sel ? `${ac.border} ${ac.bg}` : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", ac.dot)} />
                          <p className={cn("text-sm font-black", sel ? ac.text : "text-white")}>{p.name}</p>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic mb-2 pl-4">{p.tagline}</p>
                        {sel && (
                          <ul className="pl-4 space-y-0.5">
                            {p.features.map(f => (
                              <li key={f} className="flex items-start gap-1.5 text-[10px] text-zinc-400">
                                <Check size={9} className={cn("mt-0.5 shrink-0", ac.text)} />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-lg font-black leading-none", sel ? ac.text : "text-zinc-300")}>
                          ${payment === "cash" ? p.cashPrice : p.price}
                        </p>
                        <p className="text-[9px] text-zinc-600">/mo</p>
                        <p className="text-[9px] text-zinc-700 mt-1">{p.durationMins} min</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={advanceStep}
              className={cn("w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all", accent.bg, accent.border, "border", accent.text)}
            >
              Continue — {selectedPlan.name} · ${price}/mo
              <ChevronRight size={15} />
            </button>
          </div>

        /* ── Step 2: Customer Info ───────────────────────────────────────── */
        ) : step === 2 ? (
          <div className="space-y-3">
            {/* Plan summary pill */}
            <div className={cn("flex items-center justify-between rounded-xl border px-3 py-2", accent.border, accent.bg)}>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", accent.dot)} />
                <span className={cn("text-xs font-black", accent.text)}>{selectedPlan.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">${price}/mo</span>
                <span className="text-[9px] text-zinc-600 uppercase">{payment}</span>
                <button onClick={() => setStep(1)} className="text-[9px] text-zinc-600 hover:text-zinc-400 underline underline-offset-2">change</button>
              </div>
            </div>

            <Field label="Full Name *">
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                autoFocus
                className={inputCls}
              />
            </Field>
            <Field label="Phone *">
              <input
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="802-555-0100" type="tel"
                className={inputCls}
              />
            </Field>
            <Field label={payment === "card" ? "Email * (required for Stripe checkout)" : "Email (optional — for scheduling reminders)"}>
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com" type="email"
                className={inputCls}
              />
            </Field>
            {payment === "cash" && !email && (
              <div className="flex items-start gap-2 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-3 py-2.5">
                <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-500/80 leading-relaxed">No email — monthly scheduling reminders won't be sent automatically.</p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => { setError(null); setStep(1); }}
                className="py-3 rounded-xl border border-white/[0.08] text-sm text-zinc-500 font-bold active:scale-95 transition-all">
                Back
              </button>
              <button onClick={advanceStep}
                className="py-3 rounded-xl bg-[#D4AF37] text-black text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all">
                Continue <ChevronRight size={14} />
              </button>
            </div>
          </div>

        /* ── Step 3: Vehicle & Address ───────────────────────────────────── */
        ) : (
          <div className="space-y-3">
            {/* Summary pill */}
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2">
              <div>
                <p className="text-xs font-black text-white">{name}</p>
                <p className="text-[10px] text-zinc-600">{phone}{email ? ` · ${email}` : ""}</p>
              </div>
              <button onClick={() => { setError(null); setStep(2); }} className="text-[9px] text-zinc-600 hover:text-zinc-400 underline underline-offset-2">edit</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Year">
                <input value={year} onChange={e => setYear(e.target.value)} placeholder="2019" className={inputCls} />
              </Field>
              <Field label="Make">
                <input value={make} onChange={e => setMake(e.target.value)} placeholder="Toyota" className={inputCls} />
              </Field>
              <Field label="Model">
                <input value={model} onChange={e => setModel(e.target.value)} placeholder="Camry" className={inputCls} />
              </Field>
            </div>

            <Field label="Vehicle Size">
              <select value={size} onChange={e => setSize(e.target.value)} className={inputCls}>
                {Object.entries(VEHICLE_SIZE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </Field>

            <Field label="Service Address (optional)">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Burlington VT" className={inputCls} />
            </Field>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => { setError(null); setStep(2); }}
                className="py-3 rounded-xl border border-white/[0.08] text-sm text-zinc-500 font-bold active:scale-95 transition-all">
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="py-3 rounded-xl bg-[#D4AF37] text-black text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                {submitting
                  ? <Loader2 size={15} className="animate-spin" />
                  : payment === "cash"
                    ? <><Check size={14} /> Add Subscriber</>
                    : <><ExternalLink size={14} /> Generate Link</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Admin Booking Picker ──────────────────────────────────────────────────────

function AdminBookingPicker({
  subscriptionId,
  currentMonth,
  existingPick,
  onBooked,
}: {
  subscriptionId: string;
  currentMonth: string;
  existingPick: any;
  onBooked: (date: string, time: string) => void;
}) {
  const [open, setOpen]               = useState(false);
  const [month, setMonth]             = useState(currentMonth);
  const [loading, setLoading]         = useState(false);
  const [availDays, setAvailDays]     = useState<ScheduleDay[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<ScheduleDay | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [done, setDone]               = useState(false);

  const thisMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();
  const nextMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  async function loadAvailability() {
    setLoading(true);
    setAvailDays(null);
    setSelectedDay(null);
    setSelectedTime("");
    setError(null);
    const days = await adminGetScheduleAvailability(subscriptionId, month);
    setAvailDays(days);
    setLoading(false);
  }

  async function handleBook() {
    if (!selectedDay || !selectedTime) return;
    setSubmitting(true);
    const result = await adminSetSchedulePick({ subscriptionId, date: selectedDay.date, time12: selectedTime, month });
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Booking failed."); return; }
    setDone(true);
    onBooked(selectedDay.date, selectedTime);
  }

  const hasExistingPick = !!existingPick?.chosen_date;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-sm font-black uppercase tracking-wider active:scale-95 transition-all">
        <Calendar size={15} />
        {hasExistingPick ? "Reschedule Appointment" : "Book Appointment"}
      </button>
    );
  }

  if (done) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 text-center">
        <Check size={20} className="text-emerald-400 mx-auto mb-1" />
        <p className="text-sm font-black text-emerald-400">Booked!</p>
        <p className="text-xs text-zinc-400 mt-1">{selectedDay?.label} @ {selectedTime}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
          {hasExistingPick ? "Reschedule Appointment" : "Book Appointment"}
        </p>
        <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X size={13} /></button>
      </div>

      {hasExistingPick && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2">
          <p className="text-[10px] text-amber-400 font-bold">
            Currently: {new Date(existingPick.chosen_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} @ {existingPick.chosen_time}
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">Selecting a new time will cancel the current booking.</p>
        </div>
      )}

      <div className="flex gap-2">
        {[thisMonth, nextMonth].map(m => (
          <button key={m} onClick={() => { setMonth(m); setAvailDays(null); setSelectedDay(null); setSelectedTime(""); }}
            className={cn("flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all",
              month === m ? "bg-sky-500/15 border-sky-500/40 text-sky-400" : "border-white/[0.06] text-zinc-600"
            )}>
            {monthLabel(m).split(" ")[0]}
          </button>
        ))}
        <button onClick={loadAvailability} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-black uppercase tracking-wider disabled:opacity-50 active:scale-95 transition-all">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Clock size={11} />}
          {availDays ? "Reload" : "Load"}
        </button>
      </div>

      {availDays !== null && (
        availDays.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-2">No available slots for {monthLabel(month)}.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {availDays.map(day => {
              const sel = selectedDay?.date === day.date;
              return (
                <button key={day.date} onClick={() => { setSelectedDay(day); setSelectedTime(""); }}
                  className={cn("rounded-xl border py-2 text-center text-xs transition-all active:scale-[0.97]",
                    sel ? "border-sky-500/50 bg-sky-500/10 text-sky-400 font-black" : "border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                  )}>
                  <p className="font-bold">{day.label.split(",")[0]}</p>
                  <p className="text-[9px] text-zinc-600 mt-0.5">{day.slots.length} slot{day.slots.length !== 1 ? "s" : ""}</p>
                </button>
              );
            })}
          </div>
        )
      )}

      {selectedDay && (
        <div className="grid grid-cols-3 gap-1.5">
          {selectedDay.slots.map(slot => {
            const sel = selectedTime === slot.time12;
            return (
              <button key={slot.time24} onClick={() => setSelectedTime(slot.time12)}
                className={cn("py-2 rounded-xl border text-xs font-bold transition-all active:scale-[0.97]",
                  sel ? "border-sky-500/50 bg-sky-500/10 text-sky-400" : "border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                )}>
                {slot.time12}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}

      {selectedDay && selectedTime && (
        <button onClick={handleBook} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white text-sm font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50">
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Confirm {selectedTime} · {selectedDay.label}</>}
        </button>
      )}
    </div>
  );
}
