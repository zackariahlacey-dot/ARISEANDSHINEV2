import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Car,
  RefreshCw,
  Gift,
} from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
    completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
        map[status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"
      }`}
    >
      {status}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    // KPI 1 — MRR: confirmed subscription bookings (current calendar month)
    { data: subscriptionBookings },
    // KPI 2 — Total Revenue: all completed bookings
    { data: completedBookings },
    // KPI 3 — Points Liability: sum of all reward_points
    { data: pointsRows },
    // KPI 4 — Upcoming next 7 days
    { count: upcomingCount },
    // Dashboard tables
    { data: recentBookings },
    { data: upcomingToday },
  ] = await Promise.all([
    // MRR — bookings this month where service is_subscription = true
    supabase
      .from("bookings")
      .select("total_price, services(name, is_subscription)")
      .eq("status", "confirmed")
      .gte("booking_date", `${today.slice(0, 7)}-01`), // first day of current month

    // Total Revenue — all completed bookings (lifetime)
    supabase
      .from("bookings")
      .select("total_price")
      .eq("status", "completed"),

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

  // MRR — filter to subscription services only
  const mrr = (subscriptionBookings ?? []).reduce((sum, b) => {
    const svc = Array.isArray(b.services) ? b.services[0] : b.services;
    return (svc as { is_subscription?: boolean } | null)?.is_subscription
      ? sum + (b.total_price ?? 0)
      : sum;
  }, 0);

  // Total Revenue (completed)
  const totalRevenue = (completedBookings ?? []).reduce(
    (sum, r) => sum + (r.total_price ?? 0),
    0
  );

  // Points liability — total unspent points across all users → dollar equivalent (10 pts = $1)
  const totalPoints = (pointsRows ?? []).reduce(
    (sum, r) => sum + (r.reward_points ?? 0),
    0
  );
  const pointsLiabilityDollars = totalPoints / 10;

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-black text-white">Overview</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          {new Date().toLocaleDateString("en-US", {
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
          sub="Active subscriptions this month"
          icon={RefreshCw}
          accent
        />
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          sub="Lifetime completed bookings"
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Customer", "Service", "Date", "Total", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentBookings ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-600 text-sm">
                      No bookings yet
                    </td>
                  </tr>
                ) : (
                  (recentBookings ?? []).map((b) => {
                    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                    const service = Array.isArray(b.services) ? b.services[0] : b.services;
                    const vehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-zinc-200 text-xs">
                            {profile?.first_name ?? "—"} {profile?.last_name ?? ""}
                          </p>
                          {vehicle && (
                            <p className="text-[10px] text-zinc-600 mt-0.5">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-zinc-400 text-xs">
                          {service?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-zinc-400 text-xs whitespace-nowrap">
                          {b.booking_date}
                        </td>
                        <td className="px-5 py-3 text-zinc-200 text-xs font-semibold tabular-nums">
                          ${(b.total_price ?? 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={b.status ?? "pending"} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
            {completedBookings && completedBookings.length > 0
              ? fmt(totalRevenue / completedBookings.length)
              : "—"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Per completed booking</p>
        </div>
      </div>
    </div>
  );
}
