"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFinancialStats, deleteCouponAction } from "@/app/actions/adminActions";
import { toggleCoupon } from "@/app/actions/toggleCoupon";
import { createClient } from "@/lib/supabase/client";
import { 
  DollarSign, 
  TrendingUp, 
  Tag, 
  Plus, 
  Trash2, 
  Check, 
  Percent, 
  Zap, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  BarChart3,
  Power
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

export default function MoneyHudTab() {
  const queryClient = useQueryClient();
  const [newCoupon, setNewCoupon] = useState({ code: "", discount: "" });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "financial-stats"],
    queryFn: async () => await getFinancialStats()
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const createCoupon = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coupons").insert([
        { 
          code: newCoupon.code.toUpperCase(), 
          discount_percentage: parseFloat(newCoupon.discount),
          is_active: true 
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "financial-stats"] });
      setNewCoupon({ code: "", discount: "" });
      showToast("Coupon generated successfully");
    },
    onError: () => {
      showToast("Failed to create coupon", "error");
    }
  });

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await deleteCouponAction(id);
      queryClient.invalidateQueries({ queryKey: ["admin", "financial-stats"] });
      showToast("Coupon deleted");
    } catch (err) {
      showToast("Delete failed", "error");
    }
  };

  const handleToggleCoupon = async (id: string, currentState: boolean) => {
    try {
      await toggleCoupon(id, !currentState);
      queryClient.invalidateQueries({ queryKey: ["admin", "financial-stats"] });
      showToast(`Coupon ${!currentState ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showToast("Toggle failed", "error");
    }
  };

  const hudStats = [
    { 
      label: "Revenue (MTD)", 
      value: `$${stats?.mtdRevenue.toLocaleString() || "0"}`, 
      sub: `${stats?.bookingCount || 0} Bookings`,
      icon: DollarSign, 
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    { 
      label: "Avg. Ticket", 
      value: `$${stats?.avgDetail.toFixed(0) || "0"}`, 
      sub: "Completed Details",
      icon: TrendingUp, 
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    { 
      label: "Promo Impact", 
      value: stats?.couponStats.filter(c => c.usageCount > 0).length || "0", 
      sub: "Active Campaigns",
      icon: Tag, 
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
  ];

  if (statsLoading) return <div className="h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto overflow-y-auto h-full pb-32">
      <header className="flex justify-between items-start">
         <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter">Financial HUD</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em] mt-2">Revenue Node & Marketing Analytics</p>
         </div>
         <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Ledger Connected</span>
         </div>
      </header>

      {/* STAT CARDS */}
      <div className="grid md:grid-cols-3 gap-8">
        {hudStats.map((s) => (
          <div key={s.label} className="p-10 rounded-[48px] border border-white/[0.06] bg-[#080808] relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform group-hover:opacity-[0.07]">
               <s.icon size={80} />
            </div>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-8 shadow-inner", s.bg)}>
               <s.icon className={s.color} size={24} />
            </div>
            <div>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{s.label}</p>
              <p className="text-5xl font-black tracking-tighter text-white">{s.value}</p>
              <p className="text-[10px] font-bold text-zinc-500 mt-3 uppercase tracking-widest flex items-center gap-2">
                 <BarChart3 size={12} />
                 {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-12 pt-8">
         {/* Coupon Creator */}
         <section className="space-y-8 lg:col-span-1">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg">
                  <Plus size={20} />
               </div>
               <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Campaign Creator</h2>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Deploy New Promos</p>
               </div>
            </div>

            <div className="p-10 rounded-[48px] border border-white/[0.08] bg-[#0A0A0A] space-y-8 shadow-3xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-transparent via-amber-500/20 to-transparent" />
               
               <div className="space-y-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-1">Protocol Code</label>
                     <input 
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                        placeholder="e.g. SPRING25" 
                        className="w-full bg-white/[0.02] border border-white/[0.06] rounded-[24px] px-8 py-5 text-sm font-mono focus:ring-1 ring-amber-500/50 outline-none transition-all uppercase text-white placeholder:text-zinc-800" 
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-1">Reduction Power</label>
                     <div className="relative">
                        <input 
                           type="number"
                           value={newCoupon.discount}
                           onChange={(e) => setNewCoupon({...newCoupon, discount: e.target.value})}
                           placeholder="15" 
                           className="w-full bg-white/[0.02] border border-white/[0.06] rounded-[24px] px-8 py-5 text-sm font-mono focus:ring-1 ring-amber-500/50 outline-none transition-all text-white placeholder:text-zinc-800" 
                        />
                        <Percent className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                     </div>
                  </div>
               </div>
               <button 
                  onClick={() => createCoupon.mutate()}
                  disabled={createCoupon.isPending || !newCoupon.code || !newCoupon.discount}
                  className="w-full py-6 rounded-[24px] bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-black font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 group"
               >
                  {createCoupon.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:scale-110 transition-transform" fill="currentColor" />}
                  Initialize Campaign
               </button>
            </div>
         </section>

         {/* Active Coupons List */}
         <section className="space-y-8 lg:col-span-2">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg">
                     <BarChart3 size={20} />
                  </div>
                  <div>
                     <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Active Protocols</h2>
                     <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Performance & Analytics</p>
                  </div>
               </div>
            </div>

            <div className="grid gap-4">
               {stats?.couponStats.map(coupon => (
                  <div key={coupon.id} className={cn(
                    "p-8 rounded-[32px] border transition-all flex items-center justify-between group",
                    coupon.is_active ? "bg-[#080808] border-white/[0.04] hover:border-white/[0.1]" : "bg-black border-white/[0.02] opacity-60"
                  )}>
                     <div className="flex items-center gap-8">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                          coupon.is_active ? "bg-amber-500/10 text-amber-500" : "bg-zinc-900 text-zinc-700"
                        )}>
                           <Tag size={24} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16">
                           <div className="min-w-[120px]">
                              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Promo Protocol</p>
                              <p className="font-mono font-bold text-lg text-white uppercase tracking-wider leading-none">{coupon.code}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Reduction</p>
                              <p className="text-lg font-black text-white leading-none">{coupon.discount_percentage}% <span className="text-[10px] text-zinc-500 uppercase font-bold ml-1">OFF</span></p>
                           </div>
                           <div className="hidden md:block">
                              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Revenue Lift</p>
                              <p className="text-lg font-black text-emerald-500 leading-none">${coupon.revenueGenerated.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                          className={cn(
                            "p-4 rounded-2xl transition-all",
                            coupon.is_active ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-amber-500/10 text-amber-500"
                          )}
                          title={coupon.is_active ? "Deactivate" : "Activate"}
                        >
                           <Power size={20} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-4 rounded-2xl hover:bg-rose-500/10 text-zinc-700 hover:text-rose-500 transition-all"
                          title="Delete Protocol"
                        >
                           <Trash2 size={20} />
                        </button>
                     </div>
                  </div>
               ))}
               
               {stats?.couponStats.length === 0 && (
                  <div className="p-20 text-center border-2 border-dashed border-white/[0.04] rounded-[48px]">
                     <p className="text-xs text-zinc-700 font-bold uppercase tracking-[0.5em]">No active protocols found</p>
                  </div>
               )}
            </div>
         </section>
      </div>

      {/* CUSTOM TOAST */}
      {toast && (
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300",
          toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
