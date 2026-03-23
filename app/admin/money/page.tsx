"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCouponStats, createCouponAction, toggleCouponAction, deleteCouponAction, getAllBookings } from "@/app/actions/adminActions";
import { useToast } from "@/components/admin/Toast";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";
import { DollarSign, Ticket, CalendarDays, TrendingUp, Plus, Search, Check, Trash2, Power, Loader2, Car, Calendar } from "lucide-react";
import { format, isThisMonth, isThisWeek, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function MoneyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => await getAllBookings(),
  });

  const { data: coupons, isLoading: loadingCoupons } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => await getCouponStats(),
  });

  const [showNewCoupon, setShowNewCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percentage", value: "" });
  const [creating, setCreating] = useState(false);

  // Mutations
  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => await toggleCouponAction(id, is_active),
    onSuccess: () => { toast("Coupon updated"); queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }); }
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => await deleteCouponAction(id),
    onSuccess: () => { toast("Coupon deleted"); queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }); }
  });

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.value) { toast("Code and value required", "error"); return; }
    setCreating(true);
    try {
      await createCouponAction({ 
        code: newCoupon.code.toUpperCase().trim(),
        discount_percentage: newCoupon.type === "percentage" ? Number(newCoupon.value) : undefined,
        discount_amount: newCoupon.type === "amount" ? Number(newCoupon.value) : undefined,
      });
      toast("Coupon created!");
      setShowNewCoupon(false);
      setNewCoupon({ code: "", type: "percentage", value: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    } catch { toast("Failed to create coupon", "error"); }
    finally { setCreating(false); }
  };

  // derived metrics
  const stats = useMemo(() => {
    if (!bookings) return { today: 0, week: 0, month: 0, count: 0, avg: 0, completedCount: 0, totalCount: 0 };
    
    // Convert dates explicitly to prevent timezone mismatch
    const completedList = bookings.filter((b: any) => b.status === "completed" || b.status === "confirmed");
    const totals = completedList.reduce((acc: any, b: any) => acc + Number(b.total_price || 0), 0);
    
    let today = 0, week = 0, month = 0, cc = 0;
    
    const now = new Date();
    
    completedList.forEach((b: any) => {
      // Treat booking dates as local noon to avoid timezone shift dropping them to previous day
      const d = parseISO(`${b.booking_date}T12:00:00Z`);
      const val = Number(b.total_price || 0);
      if (b.status === "completed") cc++;
      if (isToday(d)) today += val;
      if (isThisWeek(d, { weekStartsOn: 1 })) week += val;
      if (isThisMonth(d)) month += val;
    });

    return { 
      today, week, month, 
      count: completedList.length, 
      avg: completedList.length ? totals / completedList.length : 0,
      completedCount: cc,
      totalCount: bookings.length
    };
  }, [bookings]);

  if (loadingBookings || loadingCoupons) {
    return <div className="h-[80dvh] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03]">
        <h1 className="text-xl font-black uppercase tracking-tighter">Money Hub</h1>
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Financial Overview</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6">
        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="MTD Revenue" value={`$${stats.month.toLocaleString()}`} color="text-amber-500" bg="bg-amber-500/10" />
          <StatCard icon={TrendingUp} label="WTD Revenue" value={`$${stats.week.toLocaleString()}`} color="text-emerald-500" bg="bg-emerald-500/10" />
          <StatCard icon={CalendarDays} label="Avg Ticket" value={`$${stats.avg.toFixed(0)}`} color="text-blue-500" bg="bg-blue-500/10" />
          <StatCard icon={Check} label="Completion Rate" 
            value={stats.totalCount > 0 ? `${Math.round((stats.completedCount / stats.totalCount) * 100)}%` : "0%"} 
            color="text-violet-500" bg="bg-violet-500/10" />
        </div>

        {/* RECENT REVENUE */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Recent Completed Jobs</h2>
          <div className="space-y-2">
            {bookings?.filter((b: any) => b.status === "completed").sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()).slice(0, 5).map((b: any) => (
              <div key={b.id} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.04] flex items-center justify-between">
                <div>
                  <p className="font-black text-sm">{b.profiles?.first_name} {b.profiles?.last_name}</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">{b.services?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-500">${Number(b.total_price).toFixed(0)}</p>
                  <p className="text-[9px] font-mono text-zinc-600 mt-0.5">{format(parseISO(`${b.booking_date}T12:00:00Z`), "MMM d")}</p>
                </div>
              </div>
            ))}
            {(!bookings || bookings.filter((b: any) => b.status === "completed").length === 0) && (
              <div className="p-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600">No completed jobs yet</p>
              </div>
            )}
          </div>
        </div>

        {/* COUPON MANAGEMENT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Coupons</h2>
            <button onClick={() => setShowNewCoupon(true)} className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center hover:scale-110 transition-all">
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coupons?.map((c: any) => (
              <div key={c.id} className={cn("p-4 rounded-2xl border transition-all", c.is_active ? "bg-[#0A0A0A] border-white/[0.08]" : "bg-white/[0.01] border-white/[0.02] opacity-50")}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", c.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500")}>
                      <Ticket size={14} />
                    </div>
                    <div>
                      <p className="font-black tracking-widest uppercase">{c.code}</p>
                      <p className="text-[9px] font-bold text-amber-500">{c.discount_percentage ? `${c.discount_percentage}% OFF` : `$${c.discount_amount} OFF`}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })} disabled={toggleMut.isPending}
                      className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.1] transition-all disabled:opacity-50">
                      <Power size={14} className={c.is_active ? "text-emerald-500" : "text-zinc-500"} />
                    </button>
                    <button onClick={() => { if(confirm("Delete coupon permanently?")) deleteMut.mutate(c.id); }} disabled={deleteMut.isPending}
                      className="p-2 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 transition-all disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-zinc-600 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> {c.usage_count} uses</span>
                  <span className="flex items-center gap-1.5"><DollarSign size={12} /> ${c.revenue_generated} gen</span>
                </div>
              </div>
            ))}
            {(!coupons || coupons.length === 0) && (
              <div className="col-span-full p-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
                <Ticket size={24} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600">No coupons active</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW COUPON MODAL */}
      <Modal open={showNewCoupon} onClose={() => setShowNewCoupon(false)} title="Create Coupon">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Coupon Code</label>
            <input value={newCoupon.code} onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-black tracking-widest uppercase focus:ring-1 ring-amber-500/50 outline-none text-white placeholder:text-zinc-700" />
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setNewCoupon(p => ({ ...p, type: "percentage", value: "" }))}
              className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", newCoupon.type === "percentage" ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-white/[0.02] border-white/[0.04] text-zinc-500")}>
              Percentage %
            </button>
            <button onClick={() => setNewCoupon(p => ({ ...p, type: "amount", value: "" }))}
              className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", newCoupon.type === "amount" ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-white/[0.02] border-white/[0.04] text-zinc-500")}>
              Flat Amount $
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Discount Value</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black">
                {newCoupon.type === "percentage" ? "%" : "$"}
              </span>
              <input type="number" value={newCoupon.value} onChange={e => setNewCoupon(p => ({ ...p, value: e.target.value }))} placeholder={newCoupon.type === "percentage" ? "20" : "50"}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm font-black focus:ring-1 ring-amber-500/50 outline-none text-white" />
            </div>
          </div>

          <button onClick={handleCreateCoupon} disabled={creating}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : "Publish Coupon"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
