"use client";

import { useState, useEffect } from "react";
import { 
  useOperatingHours, 
  useUpdateOperatingHours, 
  useBlockedDates, 
  useToggleBlockedDate 
} from "@/hooks/use-admin-data";
import { 
  Clock, 
  CalendarOff, 
  Save, 
  Plus, 
  Trash2, 
  ChevronLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ScheduleSettingsPage() {
  const { data: opHours, isLoading: loadingHours } = useOperatingHours();
  const updateHours = useUpdateOperatingHours();
  
  const { data: blockedDates, isLoading: loadingBlocked } = useBlockedDates();
  const toggleBlock = useToggleBlockedDate();

  const [localHours, setLocalHours] = useState<any[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    if (opHours) setLocalHours(opHours);
  }, [opHours]);

  const handleHourChange = (dayIdx: number, field: string, value: any) => {
    setLocalHours(prev => prev.map(h => h.day_of_week === dayIdx ? { ...h, [field]: value } : h));
  };

  const saveHours = async () => {
    try {
      await updateHours.mutateAsync(localHours);
      alert("Operating hours updated successfully.");
    } catch (err) {
      alert("Error updating hours.");
    }
  };

  const handleBlockDate = async () => {
    if (!newBlockedDate) return;
    try {
      await toggleBlock.mutateAsync({ date: newBlockedDate, isBlocked: true, reason: blockReason });
      setNewBlockedDate("");
      setBlockReason("");
    } catch (err) {
      alert("Error blocking date.");
    }
  };

  return (
    <div className="p-12 bg-[#050505] min-h-screen text-white">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="flex justify-between items-center">
           <div className="flex items-center gap-6">
              <Link href="/admin/schedule" className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
                 <ChevronLeft size={24} />
              </Link>
              <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter">Schedule Settings</h1>
                 <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Operational Control Center</p>
              </div>
           </div>
           <button 
            onClick={saveHours}
            disabled={updateHours.isPending}
            className="flex items-center gap-3 px-8 py-4 rounded-[32px] bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20"
           >
              <Save size={18} />
              Save Modifications
           </button>
        </header>

        <div className="grid md:grid-cols-2 gap-12">
           {/* Section 1: Weekly Hours */}
           <section className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Clock size={20} />
                 </div>
                 <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Weekly Operating Hours</h2>
              </div>

              <div className="space-y-3">
                 {DAYS.map((day, idx) => {
                    const hourSetting = localHours.find(h => h.day_of_week === idx) || { is_open: true, start_time: "09:00:00", end_time: "17:00:00" };
                    return (
                       <div key={day} className={cn(
                        "p-6 rounded-[32px] border border-white/[0.04] transition-all flex items-center justify-between group",
                        hourSetting.is_open ? "bg-[#080808] border-white/[0.06]" : "bg-white/[0.01] opacity-40"
                       )}>
                          <div className="flex items-center gap-4">
                             <input 
                              type="checkbox" 
                              checked={hourSetting.is_open} 
                              onChange={(e) => handleHourChange(idx, 'is_open', e.target.checked)}
                              className="w-5 h-5 rounded-lg bg-white/[0.05] border-white/[0.1] text-amber-500 focus:ring-amber-500/50 transition-all cursor-pointer"
                             />
                             <span className="font-black text-sm uppercase tracking-widest">{day}</span>
                          </div>
                          
                          {hourSetting.is_open && (
                             <div className="flex items-center gap-3">
                                <input 
                                  type="time" 
                                  value={hourSetting.start_time} 
                                  onChange={(e) => handleHourChange(idx, 'start_time', e.target.value)}
                                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-mono text-white focus:ring-1 ring-amber-500/50 outline-none" 
                                />
                                <span className="text-[10px] font-black text-zinc-700">TO</span>
                                <input 
                                  type="time" 
                                  value={hourSetting.end_time} 
                                  onChange={(e) => handleHourChange(idx, 'end_time', e.target.value)}
                                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-mono text-white focus:ring-1 ring-amber-500/50 outline-none" 
                                />
                             </div>
                          )}
                       </div>
                    );
                 })}
              </div>
           </section>

           {/* Section 2: Blocked Dates */}
           <section className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <CalendarOff size={20} />
                 </div>
                 <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Temporary Closures</h2>
              </div>

              {/* Add Closure */}
              <div className="p-8 rounded-[40px] border border-white/[0.08] bg-[#0A0A0A] space-y-6 shadow-2xl">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Target Date</label>
                       <input 
                        type="date" 
                        value={newBlockedDate}
                        onChange={(e) => setNewBlockedDate(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-4 text-sm font-mono focus:ring-1 ring-amber-500/50 outline-none transition-all text-white" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Reason (Optional)</label>
                       <input 
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Family Event, Vacation, etc." 
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none transition-all text-white" 
                       />
                    </div>
                 </div>
                 <button 
                  onClick={handleBlockDate}
                  className="w-full py-5 rounded-3xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-[10px]"
                 >
                    <Plus size={18} />
                    Deploy Blockade
                 </button>
              </div>

              {/* Active Blocks */}
              <div className="space-y-3">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 px-2">Active Closure Nodes</h3>
                 {blockedDates?.map(block => (
                    <div key={block.id} className="p-6 rounded-[32px] border border-white/[0.04] bg-[#080808] flex items-center justify-between group shadow-lg">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-rose-500">
                             <Calendar size={20} />
                          </div>
                          <div>
                             <p className="font-black text-sm text-white uppercase tracking-widest">{format(new Date(block.blocked_date + 'T12:00:00'), "MMMM do, yyyy")}</p>
                             <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">{block.reason || "General Closure"}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => toggleBlock.mutate({ date: block.blocked_date, isBlocked: false })}
                        className="p-3 rounded-xl hover:bg-white/[0.05] text-zinc-700 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                 ))}
                 {(!blockedDates || blockedDates.length === 0) && (
                    <div className="p-12 text-center border-2 border-dashed border-white/[0.04] rounded-[40px]">
                       <p className="text-[10px] text-zinc-800 font-black uppercase tracking-widest">No active closures</p>
                    </div>
                 )}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
