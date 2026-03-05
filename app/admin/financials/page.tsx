import { createClient } from "@/lib/supabase/server";
import { DollarSign, TrendingUp, CalendarDays, CreditCard } from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-3 ${
        accent
          ? "bg-[#D4AF37]/8 border-[#D4AF37]/20"
          : "bg-zinc-900/60 border-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            accent
              ? "bg-[#D4AF37]/15 text-[#D4AF37]"
              : "bg-white/[0.05] text-zinc-400"
          }`}
        >
          <Icon size={15} />
        </div>
      </div>
      <div>
        <p
          className={`text-3xl font-black tabular-nums tracking-tight ${
            accent ? "text-[#D4AF37]" : "text-white"
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default async function FinancialsPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOf30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const startOfYear = `${now.getFullYear()}-01-01`;

  const [
    { data: allConfirmed },
    { data: last30 },
    { data: yearData },
    { data: byService },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("total_price")
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("total_price, booking_date")
      .eq("status", "confirmed")
      .gte("booking_date", startOf30),
    supabase
      .from("bookings")
      .select("total_price, booking_date")
      .eq("status", "confirmed")
      .gte("booking_date", startOfYear),
    supabase
      .from("bookings")
      .select("total_price, status, services(name)")
      .eq("status", "confirmed"),
  ]);

  const sum = (rows: { total_price: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.total_price ?? 0), 0);

  const totalRevenue = sum(allConfirmed);
  const revenue30d = sum(last30);
  const revenueYTD = sum(yearData);
  const avgBooking =
    (allConfirmed?.length ?? 0) > 0
      ? totalRevenue / (allConfirmed?.length ?? 1)
      : 0;

  // Revenue by service
  const serviceMap: Record<string, number> = {};
  for (const row of byService ?? []) {
    const svc = Array.isArray(row.services)
      ? (row.services[0] as { name: string } | undefined)?.name
      : (row.services as { name: string } | null)?.name;
    const name = svc ?? "Unknown";
    serviceMap[name] = (serviceMap[name] ?? 0) + (row.total_price ?? 0);
  }
  const serviceRows = Object.entries(serviceMap).sort((a, b) => b[1] - a[1]);
  const maxServiceRevenue = serviceRows[0]?.[1] ?? 1;

  // Monthly buckets (current year)
  const monthlyMap: Record<string, number> = {};
  for (const row of yearData ?? []) {
    const month = (row.booking_date as string).slice(0, 7); // YYYY-MM
    monthlyMap[month] = (monthlyMap[month] ?? 0) + (row.total_price ?? 0);
  }
  const monthlyRows = Object.entries(monthlyMap).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-white">Financials</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Revenue from confirmed bookings</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="All-Time Revenue"
          value={fmt(totalRevenue)}
          sub={`${allConfirmed?.length ?? 0} bookings`}
          icon={DollarSign}
          accent
        />
        <StatCard
          label="Last 30 Days"
          value={fmt(revenue30d)}
          sub={`${last30?.length ?? 0} bookings`}
          icon={CalendarDays}
        />
        <StatCard
          label={`YTD ${now.getFullYear()}`}
          value={fmt(revenueYTD)}
          sub={`${yearData?.length ?? 0} bookings`}
          icon={TrendingUp}
        />
        <StatCard
          label="Avg Booking"
          value={fmt(avgBooking)}
          sub="Per confirmed booking"
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by service */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Revenue by Service</h3>
          <div className="space-y-3">
            {serviceRows.length === 0 ? (
              <p className="text-xs text-zinc-600">No data yet</p>
            ) : (
              serviceRows.map(([name, rev]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300">{name}</span>
                    <span className="text-xs font-bold text-zinc-100 tabular-nums">
                      {fmt(rev)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#c9a430] rounded-full transition-all duration-700"
                      style={{ width: `${(rev / maxServiceRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5">
          <h3 className="text-sm font-bold text-white mb-4">
            Monthly Revenue ({now.getFullYear()})
          </h3>
          <div className="space-y-2.5">
            {monthlyRows.length === 0 ? (
              <p className="text-xs text-zinc-600">No data yet for this year</p>
            ) : (
              monthlyRows.map(([month, rev]) => {
                const label = new Date(`${month}-01`).toLocaleString("en-US", {
                  month: "short",
                  year: "numeric",
                });
                const maxRev = Math.max(...monthlyRows.map(([, v]) => v), 1);
                return (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 w-16 shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-zinc-500 to-zinc-400 rounded-full"
                        style={{ width: `${(rev / maxRev) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-300 tabular-nums w-20 text-right">
                      {fmt(rev)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
