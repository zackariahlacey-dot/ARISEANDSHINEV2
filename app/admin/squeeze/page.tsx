"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSqueezeRequests, updateSqueezeStatus, scheduleSqueezeRequest,
  type SqueezeRequest, type SqueezeStatus,
} from "@/app/actions/squeezeActions";
import { useToast } from "@/components/admin/Toast";
import {
  Zap, Phone, Mail, Car, Anchor, Truck, Clock, Check, X,
  MessageSquare, Loader2, ChevronDown, CalendarDays, DollarSign, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "Pending",   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"  },
  contacted: { label: "Contacted", color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"   },
  booked:    { label: "Booked",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  dismissed: { label: "Dismissed", color: "text-zinc-500",    bg: "bg-zinc-800/60",    border: "border-zinc-700/30"   },
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  auto: Car,
  boat: Anchor,
  rv:   Truck,
};

const SERVICE_LABELS: Record<string, string> = {
  auto: "Auto",
  boat: "Boat",
  rv:   "RV",
};

const URGENCY_LABELS: Record<string, string> = {
  today:     "🔴 Today",
  tomorrow:  "🟠 Tomorrow",
  this_week: "🟡 This Week",
  soon:      "⚪ Flexible",
};

// 7:00 AM – 6:30 PM in 30-min steps
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 18; h++) {
  for (const m of [0, 30]) {
    if (h === 18 && m === 30) break;
    const ampm = h < 12 ? "AM" : "PM";
    const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
    TIME_SLOTS.push(`${h12}:${m === 0 ? "00" : "30"} ${ampm}`);
  }
}

const TODAY = new Date().toISOString().slice(0, 10);

function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  let d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return p;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

function timeAgo(ts: string) {
  const diff  = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const inputCls =
  "w-full bg-[#111] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors";

function SqueezeCard({ request }: { request: SqueezeRequest }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notesOpen,  setNotesOpen]  = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [schedDate,  setSchedDate]  = useState(TODAY);
  const [schedTime,  setSchedTime]  = useState("9:00 AM");
  const [schedPrice, setSchedPrice] = useState("");

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SqueezeStatus }) =>
      updateSqueezeStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["squeeze"] });
      toast(`Marked as ${STATUS_CONFIG[status]?.label ?? status}`);
    },
    onError: () => toast("Failed to update status", "error"),
  });

  const schedMutation = useMutation({
    mutationFn: () =>
      scheduleSqueezeRequest({
        squeezeId: request.id,
        date:  schedDate,
        time:  schedTime,
        price: parseFloat(schedPrice) || 0,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast(res.error ?? "Failed to schedule", "error");
        return;
      }
      qc.invalidateQueries({ queryKey: ["squeeze"] });
      setScheduling(false);
      toast("Scheduled & confirmation email sent!");
    },
    onError: () => toast("Failed to schedule", "error"),
  });

  const ServiceIcon = SERVICE_ICONS[request.service_type] ?? Car;
  const canSchedule = request.status !== "dismissed" && request.status !== "booked";

  return (
    <div className={cn(
      "rounded-2xl border p-4 space-y-3 transition-all",
      STATUS_CONFIG[request.status]?.border ?? "border-white/[0.06]",
      request.status === "dismissed" && "opacity-50"
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", STATUS_CONFIG[request.status]?.bg)}>
            <ServiceIcon size={16} className={STATUS_CONFIG[request.status]?.color} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm text-white truncate">{request.name}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{timeAgo(request.created_at)}</p>
          </div>
        </div>
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0",
          STATUS_CONFIG[request.status]?.color,
          STATUS_CONFIG[request.status]?.bg,
          STATUS_CONFIG[request.status]?.border,
        )}>
          {STATUS_CONFIG[request.status]?.label ?? request.status}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Clock size={10} className="text-zinc-600 shrink-0" />
          {URGENCY_LABELS[request.urgency] ?? request.urgency}
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <ServiceIcon size={10} className="text-zinc-600 shrink-0" />
          {SERVICE_LABELS[request.service_type] ?? request.service_type}
        </div>
      </div>

      {/* Availability */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Available</p>
        <p className="text-[11px] text-zinc-300 leading-relaxed">{request.available_dates}</p>
      </div>

      {/* Notes (collapsible) */}
      {request.notes && (
        <button
          type="button"
          onClick={() => setNotesOpen(o => !o)}
          className="w-full flex items-center justify-between text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <span className="font-bold uppercase tracking-wider">Notes</span>
          <ChevronDown size={12} className={cn("transition-transform", notesOpen && "rotate-180")} />
        </button>
      )}
      {notesOpen && request.notes && (
        <p className="text-[11px] text-zinc-400 leading-relaxed -mt-1">{request.notes}</p>
      )}

      {/* Contact row — Call · Text · Email */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <a
          href={`tel:${request.phone}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <Phone size={11} />
          Call
        </a>
        <a
          href={`sms:${request.phone}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <MessageCircle size={11} />
          Text
        </a>
        <span className="text-[10px] text-zinc-600 font-medium">{fmtPhone(request.phone)}</span>
        {request.email && (
          <a
            href={`mailto:${request.email}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all min-w-0"
          >
            <Mail size={11} className="shrink-0" />
            Email
          </a>
        )}
      </div>

      {/* ── Scheduling panel ─────────────────────────────── */}
      {canSchedule && scheduling && (
        <div className="rounded-2xl bg-white/[0.03] border border-[#D4AF37]/20 p-3.5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Schedule Appointment</p>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Date</label>
            <div className="relative">
              <CalendarDays size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                type="date"
                min={TODAY}
                value={schedDate}
                onChange={e => setSchedDate(e.target.value)}
                className={cn(inputCls, "pl-8")}
              />
            </div>
          </div>

          {/* Time */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Time</label>
            <div className="relative">
              <Clock size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <select
                value={schedTime}
                onChange={e => setSchedTime(e.target.value)}
                className={cn(inputCls, "pl-8 appearance-none")}
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Price</label>
            <div className="relative">
              <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                type="number"
                min={0}
                step={5}
                placeholder="0"
                value={schedPrice}
                onChange={e => setSchedPrice(e.target.value)}
                className={cn(inputCls, "pl-8")}
              />
            </div>
          </div>

          {/* Submit + Cancel */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => schedMutation.mutate()}
              disabled={schedMutation.isPending || !schedDate || !schedTime}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest hover:bg-[#c9a22e] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {schedMutation.isPending
                ? <Loader2 size={11} className="animate-spin" />
                : <Check size={11} />}
              {schedMutation.isPending ? "Scheduling…" : "Send Confirmation"}
            </button>
            <button
              type="button"
              onClick={() => setScheduling(false)}
              disabled={schedMutation.isPending}
              className="flex items-center justify-center px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-all active:scale-95"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Action buttons (not shown while scheduling) ─── */}
      {canSchedule && !scheduling && (
        <div className="flex gap-2 pt-1">
          {request.status === "pending" && (
            <button
              type="button"
              onClick={() => statusMutation.mutate({ id: request.id, status: "contacted" })}
              disabled={statusMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {statusMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <MessageSquare size={11} />}
              Contacted
            </button>
          )}
          <button
            type="button"
            onClick={() => setScheduling(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all active:scale-95"
          >
            <CalendarDays size={11} />
            Schedule
          </button>
          <button
            type="button"
            onClick={() => statusMutation.mutate({ id: request.id, status: "dismissed" })}
            disabled={statusMutation.isPending}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-black text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.06] transition-all active:scale-95 disabled:opacity-50"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SqueezePage() {
  const [filter, setFilter] = useState<string>("active");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["squeeze"],
    queryFn:  () => getSqueezeRequests(),
    refetchInterval: 60000,
  });

  const filtered = requests.filter(r => {
    if (filter === "active")    return r.status === "pending" || r.status === "contacted";
    if (filter === "booked")    return r.status === "booked";
    if (filter === "dismissed") return r.status === "dismissed";
    return true;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (isLoading) {
    return (
      <div className="h-[80dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Zap size={18} className="text-[#D4AF37]" />
            Squeeze Me In
          </h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[9px] font-black uppercase tracking-wider">
              {pendingCount} new
            </span>
          )}
        </div>
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-0.5">Urgent Booking Requests</p>
      </div>

      {/* Filter tabs */}
      <div className="shrink-0 flex gap-1 px-4 py-3 border-b border-white/[0.03]">
        {(["active", "booked", "dismissed", "all"] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              filter === f
                ? "bg-amber-500 text-black"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center">
              <Zap size={20} className="text-zinc-700" />
            </div>
            <p className="text-sm font-bold text-zinc-600">No requests here</p>
            <p className="text-[11px] text-zinc-700">
              {filter === "active" ? "No pending or contacted requests" : `No ${filter} requests yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-lg mx-auto">
            {filtered.map(r => (
              <SqueezeCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
