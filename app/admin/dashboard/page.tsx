import Link from "next/link";
import { ArrowRight, Calendar, Users, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { label: "Active Bookings", value: "24", icon: Calendar, color: "text-amber-500" },
    { label: "Total Customers", value: "1,242", icon: Users, color: "text-blue-500" },
    { label: "Revenue (MTD)", value: "$12,450", icon: TrendingUp, color: "text-emerald-500" },
  ];

  return (
    <div className="p-12 bg-[#050505] min-h-screen text-white selection:bg-amber-500/30">
      <div className="max-w-[1200px] mx-auto space-y-16">
        <header className="space-y-4">
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Command Center</h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-[0.3em]">Arise & Shine / Ground One V2</p>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="p-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] space-y-6">
              <s.icon className={s.color} size={28} />
              <div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</p>
                <p className="text-4xl font-black mt-2 tracking-tighter">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700">Strategic Operations</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link 
              href="/admin/bookings" 
              className="group p-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-amber-500/50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Calendar size={24} />
                </div>
                <div>
                  <span className="block font-black uppercase tracking-tight text-lg">Manage Bookings</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Real-time scheduling center</span>
                </div>
              </div>
              <ArrowRight className="text-zinc-600 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" size={24} />
            </Link>

            <div className="p-8 rounded-3xl border border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 flex items-center justify-center text-zinc-500">
                  <Users size={24} />
                </div>
                <div>
                  <span className="block font-black uppercase tracking-tight text-lg text-zinc-500">Customer CRM</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Database expansion locked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
