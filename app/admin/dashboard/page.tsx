

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
} from "lucide-react";
import { RecentBookingsTable } from "./RecentBookingsTable";

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
  warn = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warn?: boolean;
}) {
  const bg = accent
    ? "bg-[#D4AF37]/8 border-[#D4AF37]/20"
    : warn
    ? "bg-amber-500/5 border-amber-500/15"
    : "bg-zinc-900/60 border-white/[0.06]";

  const iconBg = accent
    ? "bg-[#D4AF37]/15 text-[#D4AF37]"
    : warn
    ? "bg-amber-500/15 text-amber-400"
    : "bg-white/[0.05] text-zinc-400";

  const valColor = accent
    ? "text-[#D4AF37]"
    : warn
    ? "text-amber-300"
    : "text-white";

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <p className={`text-3xl font-black tabular-nums tracking-tight ${valColor}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// StatusBadge moved to RecentBookingsTable (gold/metallic for Confirmed)

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    // MRR — sum of active subscriptions (subscriptions table)
    { data: subscriptionRows },
    // Total Revenue — bookings where status is confirmed OR completed
    { data: revenueBookings },
    // Points Liability — sum of reward_points from profiles
    { data: pointsRows },
    // Upcoming next 7 days (today through today+7, non-cancelled)
    { count: upcomingCount },
    // Dashboard tables
    { data: recentBookings },
    { data: upcomingToday },
  ] = await Promise.all([
    // MRR — sum price of all active records in subscriptions table
    supabase.from("subscriptions").select("price").eq("status", "active"),

    // Total Revenue — confirmed or completed bookings, sum total_price
    supabase
      .from("bookings")
      .select("total_price")
      .in("status", ["confirmed", "completed"]),

    // Points liability — all profiles
    supabase.from("profiles").select("reward_points"),

    // Upcoming next 7 days (non-cancelled)
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("booking_date", today)
      .lte("booking_date", in7Days)
      .neq("status", "cancelled"),

    // Recent bookings (last 8)
    supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, status, total_price, profiles(first_name, last_name, phone), services(name), vehicles(make, model, year)"
      )
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false })
      .limit(8),

    // Today's schedule
    supabase
      .from("bookings")
      .select("id, booking_time, status, profiles(first_name, last_name), services(name)")
      .eq("booking_date", today)
      .neq("status", "cancelled")
      .order("booking_time"),
  ]);

  // ── KPI calculations ───────────────────────────────────────────────────────

  // MRR — sum of active subscription prices
  const mrr = (subscriptionRows ?? []).reduce(
    (sum, r) => sum + (Number((r as { price?: number }).price) ?? 0),
    0
  );

  // Total Revenue — sum total_price for confirmed + completed bookings
  const totalRevenue = (revenueBookings ?? []).reduce(
    (sum, r) => sum + (r.total_price ?? 0),
    0
  );
  const revenueBookingCount = (revenueBookings ?? []).length;

  // Points liability — total unspent points across all users → dollar equivalent (10 pts = $1)
  const totalPoints = (pointsRows ?? []).reduce(
    (sum, r) => sum + (r.reward_points ?? 0),
    0
  );
  const pointsLiabilityDollars = totalPoints / 10;

  const fmt = (n: number, decimals = 0) =>
    `$${n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-black text-white">Overview</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Arise And Shine VT · {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR"
          value={fmt(mrr)}
          sub="Active subscriptions"
          icon={RefreshCw}
          accent
        />
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue, 2)}
          sub="Confirmed + completed bookings"
          icon={DollarSign}
        />
        <KpiCard
          label="Points Liability"
          value={fmt(pointsLiabilityDollars)}
          sub={`${totalPoints.toLocaleString()} pts outstanding`}
          icon={Gift}
          warn
        />
        <KpiCard
          label="Upcoming (7 days)"
          value={upcomingCount ?? 0}
          sub="Non-cancelled bookings"
          icon={CalendarDays}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent bookings table */}
        <div className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Bookings</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Latest 8 bookings across all statuses
              </p>
            </div>
            <TrendingUp size={15} className="text-zinc-600" />
          </div>
          <RecentBookingsTable initialBookings={(recentBookings ?? []) as import("./RecentBookingsTable").DashboardBookingRow[]} />
        </div>

        {/* Today's schedule */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Today&apos;s Schedule</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">{today}</p>
            </div>
            <Clock size={15} className="text-zinc-600" />
          </div>
          <div className="p-4 space-y-2">
            {(upcomingToday ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCircle2 size={22} className="text-zinc-700" />
                <p className="text-xs text-zinc-600">No bookings today</p>
              </div>
            ) : (
              (upcomingToday ?? []).map((b) => {
                const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                const service = Array.isArray(b.services) ? b.services[0] : b.services;
                const timeStr = b.booking_time
                  ? new Date(`1970-01-01T${b.booking_time}`).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—";
                return (
                  <div
                    key={b.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
                  >
                    <div className="w-10 shrink-0 text-center">
                      <p className="text-[10px] font-bold text-[#D4AF37] leading-none">
                        {timeStr.split(" ")[0]}
                      </p>
                      <p className="text-[9px] text-zinc-600 leading-none mt-0.5">
                        {timeStr.split(" ")[1]}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 leading-none truncate">
                        {profile?.first_name ?? "Unknown"} {profile?.last_name ?? ""}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                        {service?.name ?? "—"}
                      </p>
                    </div>
                    <Car size={12} className="text-zinc-700 mt-0.5 shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Secondary KPI context row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-1">
            Points Breakdown
          </p>
          <p className="text-lg font-black text-amber-400/90 tabular-nums">
            {totalPoints.toLocaleString()} pts
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            Worth {fmt(pointsLiabilityDollars)} in future discounts · 10 pts = $1
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-1">
            Pending Confirmation
          </p>
          <p className="text-lg font-black text-amber-300 tabular-nums">
            {(recentBookings ?? []).filter((b) => b.status === "pending").length}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Of the last 8 bookings shown</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-1">
            Avg Booking Value
          </p>
          <p className="text-lg font-black text-white tabular-nums">
            {revenueBookingCount > 0
              ? fmt(totalRevenue / revenueBookingCount, 2)
              : "—"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Per confirmed/completed booking</p>
        </div>
      </div>
    </div>
  );
}
