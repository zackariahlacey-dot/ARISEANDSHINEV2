export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Car,
  RefreshCw,
  Gift,
  ArrowUpRight,
  ChevronRight,
  Package,
  ArrowRight
} from "lucide-react";
import { RecentBookingsTable } from "./RecentBookingsTable";
import Link from "next/link";

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
  trend = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  trend?: number;
}) {
  const bg = accent
    ? "bg-[#D4AF37]/8 border-[#D4AF37]/20"
    : "bg-zinc-900/60 border-white/[0.06]";

  const iconBg = accent
    ? "bg-[#D4AF37]/15 text-[#D4AF37]"
    : "bg-white/[0.05] text-zinc-400";

  const valColor = accent
    ? "text-[#D4AF37]"
    : "text-white";

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:border-white/[0.1] group ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${iconBg}`}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-black tabular-nums tracking-tight ${valColor}`}>
            {value}
          </p>
          {trend !== 0 && (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <ArrowUpRight size={10} className={trend < 0 ? 'rotate-90' : ''} />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    { data: subscriptionRows },
    { data: revenueBookings },
    { data: pointsRows },
    { count: upcomingCount },
    { data: recentBookings },
    { data: upcomingToday },
    { data: servicesData },
  ] = await Promise.all([
    supabase.from("subscriptions").select("price").eq("status", "active"),
    supabase.from("bookings").select("total_price, status, service_id").in("status", ["confirmed", "completed"]),
    supabase.from("profiles").select("reward_points"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("booking_date", today).lte("booking_date", in7Days).neq("status", "cancelled"),
    supabase.from("bookings").select("id, booking_date, booking_time, status, total_price, profiles(first_name, last_name, phone), services(name), vehicles(make, model, year)").order("booking_date", { ascending: false }).order("booking_time", { ascending: false }).limit(8),
    supabase.from("bookings").select("id, booking_time, status, profiles(first_name, last_name), services(name)").eq("booking_date", today).neq("status", "cancelled").order("booking_time"),
    supabase.from("services").select("id, name"),
  ]);

  // ── Calculations ──────────────────────────────────────────────────────────

  const mrr = (subscriptionRows ?? []).reduce((sum, r) => sum + (Number((r as { price?: number }).price) ?? 0), 0);
  const totalRevenue = (revenueBookings ?? []).reduce((sum, r) => sum + (r.total_price ?? 0), 0);
  const revenueBookingCount = (revenueBookings ?? []).length;
  const totalPoints = (pointsRows ?? []).reduce((sum, r) => sum + (r.reward_points ?? 0), 0);
  const pointsLiabilityDollars = totalPoints / 10;

  // Top Services Calc
  const serviceStats: Record<string, { count: number; rev: number; name: string }> = {};
  (revenueBookings ?? []).forEach(b => {
    if (!b.service_id) return;
    const sInfo = (servicesData ?? []).find(s => s.id === b.service_id);
    const sName = sInfo?.name ?? "Other";
    if (!serviceStats[b.service_id]) serviceStats[b.service_id] = { count: 0, rev: 0, name: sName };
    serviceStats[b.service_id].count++;
    serviceStats[b.service_id].rev += (b.total_price ?? 0);
  });
  const topServices = Object.values(serviceStats).sort((a, b) => b.rev - a.rev).slice(0, 4);

  const fmt = (n: number, decimals = 0) =>
    `$${n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page title */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-white">Overview</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/admin/today" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all">
          View Today's Jobs <ArrowRight size={14} />
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={fmt(mrr)} sub="Active subscriptions" icon={RefreshCw} accent trend={12} />
        <KpiCard label="Total Revenue" value={fmt(totalRevenue, 0)} sub="All-time sales" icon={DollarSign} />
        <KpiCard label="Points Liability" value={fmt(pointsLiabilityDollars)} sub={`${totalPoints.toLocaleString()} pts out`} icon={Gift} />
        <KpiCard label="Upcoming (7d)" value={upcomingCount ?? 0} sub="Scheduled jobs" icon={CalendarDays} trend={5} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main: Top Services & Recent */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Top Services Chart (Visual Upgrade) */}
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-bold text-white">Service Performance</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Revenue breakdown by package</p>
              </div>
              <Package size={15} className="text-zinc-600" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {topServices.length === 0 ? (
                <p className="text-xs text-zinc-600 col-span-2 py-4">No service data yet</p>
              ) : (
                topServices.map((s) => {
                  const maxRev = Math.max(...topServices.map(x => x.rev), 1);
                  return (
                    <div key={s.name} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-zinc-300 truncate pr-2">{s.name}</span>
                        <span className="text-[10px] font-black text-white tabular-nums">{fmt(s.rev)}</span>
                      </div>
                      <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-[#fcf6ba] rounded-full transition-all duration-1000" 
                          style={{ width: `${(s.rev / maxRev) * 100}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{s.count} bookings</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Recent Activity</h3>
              <TrendingUp size={15} className="text-zinc-600" />
            </div>
            <RecentBookingsTable initialBookings={(recentBookings ?? []) as any} />
          </div>
        </div>

        {/* Sidebar: Today's Schedule */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Today&apos;s Schedule</h3>
              <Clock size={15} className="text-zinc-600" />
            </div>
            <div className="p-4 space-y-2 flex-1">
              {(upcomingToday ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <CheckCircle2 size={32} className="text-zinc-800" />
                  <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Clear Schedule</p>
                </div>
              ) : (
                (upcomingToday ?? []).map((b) => {
                  const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                  const service = Array.isArray(b.services) ? b.services[0] : b.services;
                  const timeStr = b.booking_time ? new Date(`1970-01-01T${b.booking_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
                  return (
                    <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] transition-colors hover:bg-white/[0.05]">
                      <div className="w-10 shrink-0 text-center">
                        <p className="text-[10px] font-black text-[#D4AF37] leading-none">{timeStr.split(" ")[0]}</p>
                        <p className="text-[9px] text-zinc-600 leading-none mt-0.5 uppercase">{timeStr.split(" ")[1]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-200 leading-none truncate">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 truncate">{service?.name}</p>
                      </div>
                      <ChevronRight size={12} className="text-zinc-700 mt-1" />
                    </div>
                  );
                })
              )}
            </div>
            <Link href="/admin/bookings" className="p-4 border-t border-white/[0.06] text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors">
              View Full Calendar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
