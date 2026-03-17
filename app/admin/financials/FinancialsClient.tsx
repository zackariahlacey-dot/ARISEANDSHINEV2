"use client";

import { useState, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  CalendarDays, 
  CreditCard, 
  Download, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Wallet
} from "lucide-react";

export type FinancialsData = {
  id: string;
  date: string;
  amount: number;
  status: string;
  isOnline: boolean;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinancialsClient({ bookings }: { bookings: FinancialsData[] }) {
  const [range, setRange] = useState<"all" | "30d" | "ytd">("all");

  const filtered = useMemo(() => {
    const now = new Date();
    if (range === "30d") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return bookings.filter(b => new Date(b.date) >= thirtyDaysAgo);
    }
    if (range === "ytd") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return bookings.filter(b => new Date(b.date) >= startOfYear);
    }
    return bookings;
  }, [bookings, range]);

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, b) => sum + b.amount, 0);
    const online = filtered.filter(b => b.isOnline).reduce((sum, b) => sum + b.amount, 0);
    const inPerson = filtered.filter(b => !b.isOnline).reduce((sum, b) => sum + b.amount, 0);
    const avg = filtered.length > 0 ? total / filtered.length : 0;
    
    return { total, online, inPerson, avg, count: filtered.length };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    filtered.forEach(b => {
      const m = b.date.slice(0, 7); // YYYY-MM
      months[m] = (months[m] ?? 0) + b.amount;
    });
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [filtered]);

  const exportCsv = () => {
    const headers = ["Date", "Customer", "Service", "Amount", "Payment Type", "Status"];
    const rows = filtered.map(b => [
      b.date,
      b.customerName,
      b.serviceName,
      b.amount.toFixed(2),
      b.isOnline ? "Online (Stripe)" : "In-Person",
      b.status
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `financials_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Financials</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Revenue breakdown and performance tracking</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 border border-white/[0.06] rounded-xl p-1">
            {(["all", "30d", "ytd"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  range === r ? "bg-[#D4AF37] text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-white"
                }`}
              >
                {r === "all" ? "All Time" : r === "30d" ? "30 Days" : "YTD"}
              </button>
            ))}
          </div>
          
          <button 
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-200 text-xs font-bold hover:bg-zinc-700 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{fmt(stats.total)}</p>
          <div className="flex items-center gap-1 mt-2 text-emerald-400">
            <ArrowUpRight size={12} />
            <span className="text-[10px] font-bold uppercase">{stats.count} jobs</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Online Sales</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Globe size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{fmt(stats.online)}</p>
          <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
            {stats.total > 0 ? ((stats.online / stats.total) * 100).toFixed(0) : 0}% of total
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">In-Person Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{fmt(stats.inPerson)}</p>
          <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
            {stats.total > 0 ? ((stats.inPerson / stats.total) * 100).toFixed(0) : 0}% of total
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Avg. Job Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{fmt(stats.avg)}</p>
          <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">Per confirmed job</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-8">Revenue Trend (Last 6 Months)</h3>
          <div className="h-48 flex items-end justify-between gap-4">
            {monthlyData.length === 0 ? (
              <p className="text-sm text-zinc-600 w-full text-center py-20">No data for selected range</p>
            ) : (
              monthlyData.map(([month, amount]) => {
                const max = Math.max(...monthlyData.map(d => d[1]), 1);
                const height = (amount / max) * 100;
                const label = new Date(month + "-01T12:00:00").toLocaleDateString("en-US", { month: "short" });
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-3 h-full group">
                    <div className="relative w-full flex-1 flex flex-col justify-end items-center">
                      <div className="absolute -top-6 hidden group-hover:block text-[10px] font-black text-white bg-zinc-800 px-2 py-1 rounded border border-white/10 shadow-xl">
                        {fmt(amount)}
                      </div>
                      <div 
                        style={{ height: `${height}%` }}
                        className="w-full max-w-[40px] bg-gradient-to-t from-[#D4AF37] to-[#fcf6ba] rounded-t-lg transition-all duration-1000 group-hover:opacity-80"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Type Split */}
        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-6">Payment Split</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-blue-400">Online (Stripe)</span>
                <span className="text-zinc-200">{fmt(stats.online)}</span>
              </div>
              <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${stats.total > 0 ? (stats.online / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">In-Person / Cash</span>
                <span className="text-zinc-200">{fmt(stats.inPerson)}</span>
              </div>
              <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${stats.total > 0 ? (stats.inPerson / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-white/[0.06] mt-6">
              <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-widest">
                System Logic: 
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Online payments are identified by an active Stripe checkout session. All other confirmed bookings are tracked as In-Person.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
