"use client";

import { useState, useMemo } from "react";
import { 
  useAdminBookings, 
  useUpdateBookingStatus, 
  useSendOnMyWay, 
  useHandleNoShow,
  useRescheduleBooking,
  useServices,
  useDeleteBooking
} from "@/hooks/use-admin-data";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  isToday,
  isSameMonth,
  addHours,
  parse
} from "date-fns";
import Link from "next/link";
import { bookDetailing, type BookingPayload } from "@/app/actions/bookDetailing";
import { AddressAutocomplete } from "@/components/landing/AddressAutocomplete";
import { 
  ChevronLeft, 
  ChevronRight, 
  Navigation, 
  CheckCircle, 
  Camera, 
  X, 
  Car, 
  Clock, 
  Calendar,
  CloudSun,
  CloudRain,
  Sun,
  AlertTriangle,
  Mail,
  Zap,
  TrendingUp,
  Moon,
  Timer,
  LayoutGrid,
  List,
  Phone,
  AlertCircle,
  Loader2,
  Plus,
  User,
  MapPin,
  DollarSign,
  Trash2,
  Settings,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScheduleTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"month" | "timeline">("month");
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState<{ id: string, date: string } | null>(null);

  const { data: bookings, isLoading, error, refetch } = useAdminBookings();
  const { data: services } = useServices();
  const updateStatus = useUpdateBookingStatus();
  const sendOnMyWay = useSendOnMyWay();
  const handleNoShow = useHandleNoShow();
  const deleteBooking = useDeleteBooking();
  const reschedule = useRescheduleBooking();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = useMemo(() => eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  }), [calendarStart, calendarEnd]);

  const getDayBookings = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (bookings || []).filter(b => b.booking_date === dateStr);
  };

  const dayBookings = useMemo(() => {
    return getDayBookings(selectedDay).sort((a,b) => (a.booking_time || "").localeCompare(b.booking_time || ""));
  }, [selectedDay, bookings]);

  const dayMetrics = useMemo(() => {
    const revenue = dayBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    const completedCount = dayBookings.filter(b => b.status === 'completed').length;
    
    let lastTime = "08:00";
    if (dayBookings.length > 0) {
       const lastJob = dayBookings[dayBookings.length - 1];
       try {
         const end = addHours(parse(lastJob.booking_time, "HH:mm:ss", new Date()), 3);
         lastTime = format(end, "h:mm a");
       } catch (e) { lastTime = "--:--" }
    }
    return { revenue, completedCount, totalCount: dayBookings.length, estFinish: lastTime };
  }, [dayBookings]);

  const extractAddress = (notes: string | null) => {
    if (!notes) return "No Address Provided";
    const parts = notes.split("📍 Service Location:");
    return parts.length > 1 ? parts[1].trim() : "See Notes";
  };

  const handleComplete = (bookingId: string) => {
    updateStatus.mutate({ id: bookingId, status: "completed" });
    alert("Detail Finished! Email sent.");
    setSelectedBooking(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete? Client will be emailed.")) {
      try {
        await deleteBooking.mutateAsync(id);
        setSelectedBooking(null);
      } catch (err) { alert("Error deleting."); }
    }
  };

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address || "Williston, VT");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  const onDragStart = (id: string) => setDraggedBookingId(id);
  const onDrop = (date: Date) => {
    if (!draggedBookingId) return;
    setRescheduleData({ id: draggedBookingId, date: format(date, "yyyy-MM-dd") });
    setDraggedBookingId(null);
  };

  const confirmReschedule = async (time: string) => {
    if (!rescheduleData) return;
    try {
      await reschedule.mutateAsync({ id: rescheduleData.id, date: rescheduleData.date, time });
      setRescheduleData(null);
    } catch (err) { alert("Fail."); }
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#050505] gap-4">
      <Loader2 className="animate-spin text-amber-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Syncing...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#050505]">
      {/* LEFT CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 space-y-6 md:y-8 overflow-y-auto border-r border-white/[0.04]">
        <header className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center text-white">
           <div className="flex items-center justify-between md:justify-start gap-6">
              <div>
                 <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">Mission Control</h1>
                 <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">{format(currentMonth, "MMMM yyyy")}</p>
              </div>
              <div className="flex bg-white/[0.03] p-1 rounded-2xl border border-white/[0.06]">
                 <button onClick={() => setViewMode("month")} className={cn("p-2 rounded-xl transition-all", viewMode === 'month' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white")}><LayoutGrid size={18} /></button>
                 <button onClick={() => setViewMode("timeline")} className={cn("p-2 rounded-xl transition-all", viewMode === 'timeline' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white")}><List size={18} /></button>
              </div>
           </div>
           
           <div className="flex items-center justify-between md:justify-end gap-4">
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all text-white"><ChevronLeft size={18} /></button>
                <button onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.08] transition-all text-white">Today</button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all text-white"><ChevronRight size={18} /></button>
              </div>
              <Link href="/admin/schedule/settings" className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-white transition-all"><Settings size={20} /></Link>
           </div>
        </header>

        {/* MOBILE DATE STRIP (Optional but good for UX) */}
        <div className="md:hidden flex overflow-x-auto gap-2 pb-4 no-scrollbar">
           {Array.from({ length: 7 }).map((_, i) => {
              const d = addMonths(startOfWeek(new Date()), 0); // simplify for now, just show current week
              const day = new Date(); // this is just a placeholder logic
              // Real logic: show a few days around selectedDay
              return null; 
           })}
        </div>

        {viewMode === "month" ? (
          <div className="grid grid-cols-7 gap-px bg-white/[0.06] border border-white/[0.06] rounded-[24px] md:rounded-[40px] overflow-hidden shadow-2xl">
             {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, i) => (
                <div key={i} className="bg-[#080808] py-3 md:p-4 text-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-white/[0.06]">{day}</div>
             ))}
             {days.map((day, idx) => {
                const currentDayBookings = getDayBookings(day);
                const isSelected = isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                return (
                   <div key={idx} 
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={() => onDrop(day)} 
                        onClick={() => { setSelectedDay(day); if (currentDayBookings.length === 0 && isCurrentMonth) setIsQuickBookOpen(true); }} 
                        className={cn(
                          "bg-[#050505] min-h-[80px] md:min-h-[140px] p-2 md:p-5 text-left transition-all active:bg-amber-500/10 relative group flex flex-col justify-between cursor-pointer text-white", 
                          !isCurrentMonth && "opacity-20", 
                          isSelected && "bg-amber-500/5 ring-inset ring-1 ring-amber-500/30"
                        )}>
                      <span className={cn("text-xs md:text-sm font-black", isToday(day) ? "w-6 h-6 md:w-8 md:h-8 bg-amber-500 text-black rounded-lg md:rounded-2xl flex items-center justify-center -ml-0.5 -mt-0.5 shadow-md" : isSelected ? "text-amber-500" : "text-zinc-600 group-hover:text-zinc-400")}>{format(day, "d")}</span>
                      <div className="mt-2 md:mt-4 space-y-1">
                         {currentDayBookings.slice(0, 2).map((b, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                               <div className={cn("w-1 h-1 md:h-3 rounded-full shrink-0", b.status === 'completed' ? "bg-emerald-500/30" : "bg-amber-500")} />
                               <span className="hidden md:block text-[9px] font-bold text-zinc-500 truncate uppercase tracking-tight">{b.profiles?.last_name || "Guest"}</span>
                            </div>
                         ))}
                         {currentDayBookings.length > 2 && <p className="text-[7px] md:text-[8px] font-black text-zinc-700 md:pl-2">+{currentDayBookings.length - 2}</p>}
                      </div>
                   </div>
                );
             })}
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
             {Array.from({ length: 12 }).map((_, i) => {
                const hour = i + 8;
                const bookingsAtHour = dayBookings.filter(b => parseInt((b.booking_time || "0").split(':')[0]) === hour);
                return (
                   <div key={hour} className="flex gap-3 md:gap-6 group text-white">
                      <div className="w-12 md:w-16 text-right pt-1 text-[9px] md:text-[10px] font-black text-zinc-600 uppercase">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}</div>
                      <div className="flex-1 min-h-[60px] md:min-h-[100px] border-t border-white/[0.04] py-3 md:py-4 relative">
                         {bookingsAtHour.length > 0 ? bookingsAtHour.map(b => (
                            <div key={b.id} onClick={() => setSelectedBooking(b)} className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform">
                               <div className="flex items-center gap-3 md:gap-6">
                                 <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                   <Car size={18} className="md:w-5 md:h-5" />
                                 </div>
                                 <div>
                                   <p className="font-black text-sm md:text-lg text-white leading-none mb-1">{b.profiles?.first_name} {b.profiles?.last_name}</p>
                                   <div className="flex items-center gap-2 md:gap-3 text-zinc-500 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">
                                     <span>{b.booking_time}</span>
                                     <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                     <span className="truncate max-w-[80px] md:max-w-none">{b.services?.name}</span>
                                   </div>
                                 </div>
                               </div>
                               <ChevronRight size={16} className="text-zinc-700 md:hidden" />
                               <button className="hidden md:block px-6 py-3 rounded-2xl bg-white/[0.03] text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.08] transition-all text-white">Open Interface</button>
                            </div>
                         )) : <div onClick={() => setIsQuickBookOpen(true)} className="w-full h-full min-h-[40px] rounded-xl border border-dashed border-white/[0.04] flex items-center justify-center gap-3 group/slot cursor-pointer hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all"><Plus size={12} className="text-zinc-800 group-hover:text-amber-500" /><span className="text-[9px] font-black text-zinc-800 uppercase tracking-widest group-hover:text-amber-500">Slot Available</span></div>}
                      </div>
                   </div>
                );
             })}
          </div>
        )}
      </div>

      <aside className="w-full md:w-[400px] lg:w-[500px] bg-[#080808] flex flex-col shadow-2xl text-white">
         <div className="p-6 md:p-10 border-b border-white/[0.04] space-y-6 md:space-y-10 bg-white/[0.01]">
            <div>
              <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-2 md:mb-3">Today's Revenue</h2>
              <p className="text-4xl md:text-5xl font-black tracking-tighter flex items-end gap-3 leading-none text-white">${dayMetrics.revenue}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
               <div className="p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-white/[0.04] bg-[#0A0A0A] space-y-2 md:space-y-3 shadow-lg">
                 <div className="flex items-center gap-2 md:gap-3"><Timer size={14} className="text-amber-500" /><span className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Est. End</span></div>
                 <p className="text-xl md:text-2xl font-black text-white">{dayMetrics.estFinish}</p>
               </div>
               <div className="p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-white/[0.04] bg-[#0A0A0A] space-y-2 md:space-y-3 shadow-lg">
                 <div className="flex items-center gap-2 md:gap-3"><TrendingUp size={14} className="text-emerald-500" /><span className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Efficiency</span></div>
                 <p className="text-xl md:text-2xl font-black text-white">{dayMetrics.completedCount}/{dayMetrics.totalCount}</p>
               </div>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 pb-32 md:pb-10">
            <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Glove Box / Operations</h3>
            {dayBookings.length === 0 ? (
               <div className="p-10 md:p-20 text-center border-2 border-dashed border-white/[0.04] rounded-[32px] md:rounded-[60px] space-y-4 md:space-y-6">
                 <p className="text-[10px] md:text-xs font-black text-zinc-700 uppercase tracking-widest">No Active Contracts</p>
                 <button onClick={() => setIsQuickBookOpen(true)} className="px-6 py-3 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Quick Book</button>
               </div>
            ) : dayBookings.map(b => (
               <div key={b.id} onClick={() => setSelectedBooking(b)} className="group relative cursor-pointer active:scale-[0.98] transition-transform">
                  <div className={cn("w-full p-6 md:p-8 rounded-[32px] md:rounded-[48px] border transition-all relative overflow-hidden", b.status === 'completed' ? "bg-white/[0.01] border-white/[0.04] opacity-40 shadow-none" : "bg-[#0A0A0A] border-white/[0.06] hover:border-amber-500/40 shadow-2xl")}>
                     <div className="flex justify-between items-center">
                        <div className="space-y-2 md:space-y-3">
                           <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-md" /><p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">{b.booking_time}</p></div>
                           <h4 className="text-xl md:text-2xl font-black leading-none text-white">{b.profiles?.first_name} {b.profiles?.last_name}</h4>
                           <div className="flex items-center gap-2 md:gap-3"><p className="text-[8px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-white/[0.03] px-2 py-1 rounded-md">{b.vehicles?.make} {b.vehicles?.model}</p></div>
                        </div>
                        <div className="flex flex-col gap-2 md:gap-3">
                           <button onClick={(e) => { e.stopPropagation(); sendOnMyWay.mutate(b.id); alert('Email sent!'); }} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-amber-500 hover:text-black transition-all text-white"><Mail size={16} className="md:w-[18px] md:h-[18px]" /></button>
                           <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.1] transition-all text-white"><Zap size={16} className="md:w-[18px] md:h-[18px]" /></button>
                        </div>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </aside>

      {/* DETAIL INTERFACE MODAL */}
      {selectedBooking && (
         <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[150] flex items-center justify-center p-4 md:p-8 text-white overflow-y-auto">
            <div className="w-full max-w-2xl bg-[#080808] border border-white/[0.1] rounded-[40px] md:rounded-[80px] overflow-hidden shadow-2xl my-auto">
               <header className="p-8 md:p-14 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
                  <div className="flex items-center gap-4 md:gap-8">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-[32px] bg-amber-500 flex items-center justify-center text-black shadow-3xl shadow-amber-500/30">
                      <Car size={24} className="md:w-10 md:h-10" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-white leading-none">Detail Interface</h3>
                      <div className="flex items-center gap-2 md:gap-3 mt-2 md:mt-3"><Clock size={14} className="text-amber-500" /><p className="text-amber-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em]">{selectedBooking.booking_time}</p></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                    <button onClick={() => handleDelete(selectedBooking.id)} className="p-3 md:p-4 rounded-2xl md:rounded-[32px] hover:bg-rose-500/10 text-rose-500 transition-all"><Trash2 size={20} className="md:w-6 md:h-6" /></button>
                    <button onClick={() => setSelectedBooking(null)} className="p-3 md:p-5 rounded-2xl md:rounded-[32px] hover:bg-white/[0.05] text-zinc-600 hover:text-white transition-all"><X size={24} className="md:w-8 md:h-8" /></button>
                  </div>
               </header>
               <div className="p-8 md:p-14 space-y-8 md:space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                     <div className="flex items-center gap-4 md:gap-8">
                       <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-lg md:text-xl font-black text-zinc-400">
                         {selectedBooking.profiles?.first_name?.[0]}
                       </div>
                       <div className="space-y-1 md:space-y-2">
                         <p className="text-2xl md:text-3xl font-black tracking-tighter text-white">{selectedBooking.profiles?.first_name} {selectedBooking.profiles?.last_name}</p>
                         <p className="text-[10px] md:text-sm text-zinc-500 font-mono tracking-tighter max-w-xs">{extractAddress(selectedBooking.notes)}</p>
                       </div>
                     </div>
                     <div className="md:text-right w-full md:w-auto">
                       <p className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1 md:mb-2">Value</p>
                       <p className="text-4xl md:text-5xl font-black tracking-tighter leading-none text-white">${selectedBooking.total_price}</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                     <button onClick={() => { openInMaps(extractAddress(selectedBooking.notes)); sendOnMyWay.mutate(selectedBooking.id); }} className="flex md:flex-col items-center gap-4 md:gap-5 p-6 md:p-10 rounded-3xl md:rounded-[50px] bg-white/[0.02] border border-white/[0.06] hover:bg-blue-500/10 hover:border-blue-500/40 transition-all group text-white">
                       <Navigation className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
                       <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 md:text-center">Navigate + Arrival Email</span>
                     </button>
                     <button onClick={() => { if(confirm("Report No-Show? Email triggers.")) handleNoShow.mutate(selectedBooking.id); }} className="flex md:flex-col items-center gap-4 md:gap-5 p-6 md:p-10 rounded-3xl md:rounded-[50px] bg-white/[0.02] border border-white/[0.06] hover:bg-rose-500/10 hover:border-rose-500/40 transition-all group text-white">
                       <AlertTriangle className="text-rose-500 group-hover:scale-110 transition-transform" size={24} />
                       <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 md:text-center">No-Show Protocol</span>
                     </button>
                  </div>
                  <button disabled={selectedBooking.status === 'completed'} onClick={() => handleComplete(selectedBooking.id)} className={cn("w-full py-6 md:py-10 rounded-3xl md:rounded-[50px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] transition-all flex items-center justify-center gap-4 md:gap-6 shadow-3xl text-xs md:text-sm", selectedBooking.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed" : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-emerald-500/20")}>
                     <CheckCircle size={20} className="md:w-7 md:h-7" />{selectedBooking.status === 'completed' ? "Completed" : "Initialize Completion"}
                  </button>
               </div>
            </div>
         </div>
      )}

      {rescheduleData && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[90] flex items-center justify-center p-8 text-white">
           <div className="w-full max-w-md bg-[#0A0A0A] border border-white/[0.1] rounded-[40px] p-10 space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-2"><div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-4"><Clock size={32} /></div><h3 className="text-xl font-black uppercase tracking-tight text-white">Select Reschedule Time</h3><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">New Date: {rescheduleData.date}</p></div>
              <div className="grid grid-cols-2 gap-3">{["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM"].map(time => (<button key={time} onClick={() => confirmReschedule(time)} className="py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/50 hover:bg-amber-500/5 text-sm font-bold transition-all uppercase tracking-tighter text-white"> {time}</button>))}</div>
              <button onClick={() => setRescheduleData(null)} className="w-full py-4 rounded-2xl bg-white/[0.01] text-zinc-600 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all">Cancel Move</button>
           </div>
        </div>
      )}

      {isQuickBookOpen && <QuickBookModal date={selectedDay} services={services || []} onClose={() => { setIsQuickBookOpen(false); refetch(); }} />}
    </div>
  );
}

function QuickBookModal({ date, services, onClose }: { date: Date, services: any[], onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", serviceAddress: "", serviceId: "", serviceName: "", vehicleYear: "", vehicleMake: "", vehicleModel: "", vehicleSize: "sedan" as any, bookingTime: "09:00 AM", totalPrice: 0, notes: "" });

  const handleServiceChange = (id: string) => {
    const s = services.find(x => x.id === id);
    if (s) setForm({ ...form, serviceId: id, serviceName: s.name, totalPrice: Number(s.price_small) || 0 });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.serviceId) { alert("Please fill in Name, Email, and Service."); return; }
    setLoading(true);
    try {
      const payload: BookingPayload = { 
        ...form, 
        bookingDate: format(date, "yyyy-MM-dd"), 
        paymentMethod: "pay_at_arrival",
        selectedAddons: []
      };
      const res = await bookDetailing(payload);
      if (res.success) { alert("Success!"); onClose(); } else alert("Error: " + res.error);
    } catch (err) { alert("Critical Error."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[80] flex items-center justify-center p-8 text-white">
       {/* FIXED: overflow-visible to show Google Autocomplete dropdown */}
       <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/[0.1] rounded-[60px] shadow-2xl animate-in zoom-in-95 duration-300 overflow-visible">
          <header className="p-10 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
             <div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-lg"><Zap size={28} fill="currentColor" /></div><div><h3 className="text-xl font-black uppercase tracking-tight text-white">Quick Book Flow</h3><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">For {format(date, "MMMM do")}</p></div></div>
             <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/[0.05] text-zinc-500 transition-all"><X size={24} /></button>
          </header>
          <div className="p-10 space-y-8">
             {step === 1 ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Step 1: Contact</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Full Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                   </div>
                   <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Email Address</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                   <div className="space-y-2 relative">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Service Address</label>
                      {/* FIXED: Dropdown styling & Autocomplete Linkage */}
                      <div className="custom-autocomplete-wrapper">
                        <AddressAutocomplete value={form.serviceAddress} onChange={(addr) => setForm({...form, serviceAddress: addr})} />
                      </div>
                   </div>
                   <button onClick={() => setStep(2)} className="w-full py-5 rounded-[32px] bg-white/[0.03] border border-white/[0.06] text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/[0.08] transition-all shadow-md">Next: Assets & Service</button>
                </div>
             ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Step 2: Service</h4>
                   <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Service Package</label><div className="relative"><select value={form.serviceId} onChange={e => handleServiceChange(e.target.value)} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm text-white focus:ring-1 ring-amber-500/50 outline-none appearance-none cursor-pointer shadow-inner">{services.map(s => <option key={s.id} value={s.id} className="bg-[#0A0A0A]">{s.name} - ${s.price_small}</option>)}</select><ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-zinc-600 pointer-events-none" /></div></div>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Year</label><input value={form.vehicleYear} onChange={e => setForm({...form, vehicleYear: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Make</label><input value={form.vehicleMake} onChange={e => setForm({...form, vehicleMake: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Model</label><input value={form.vehicleModel} onChange={e => setForm({...form, vehicleModel: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Time</label><input value={form.bookingTime} onChange={e => setForm({...form, bookingTime: e.target.value})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Price Override</label><div className="relative"><DollarSign size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" /><input type="number" value={form.totalPrice} onChange={e => setForm({...form, totalPrice: Number(e.target.value)})} className="w-full bg-[#111111] border border-white/[0.06] rounded-2xl pl-10 pr-5 py-4 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white shadow-inner" /></div></div>
                   </div>
                   <div className="flex gap-3 pt-4"><button onClick={() => setStep(1)} className="flex-1 py-5 rounded-[32px] bg-white/[0.03] border border-white/[0.06] text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:bg-white/[0.08] transition-all">Back</button><button disabled={loading} onClick={handleSubmit} className="flex-[2] py-5 rounded-[32px] bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}Deploy</button></div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
