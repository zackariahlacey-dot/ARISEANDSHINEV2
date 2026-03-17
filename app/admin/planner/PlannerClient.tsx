"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus,
  MapPin,
  Car,
  CheckCircle2,
  X,
  Bell,
  BellOff,
  Phone,
  MessageSquare,
  DollarSign,
  Loader2,
  LayoutGrid,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  CalendarDays
} from "lucide-react";
import { 
  format, 
  addDays, 
  startOfToday, 
  isSameDay, 
  parseISO, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  isToday,
  differenceInMinutes,
  isAfter
} from "date-fns";
import { updateBookingStatus } from "@/app/actions/updateBookingStatus";

export type PlannerBooking = {
  id: string;
  userId: string | null;
  date: string;
  time: string | null;
  status: string;
  price: number | null;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  vehicleDesc: string;
  notes: string;
  address: string | null;
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

function fmt12(t: string | null): string {
  if (!t) return "—";
  try {
    return new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return t;
  }
}

export function PlannerClient({ initialBookings }: { initialBookings: PlannerBooking[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(startOfToday()));
  const [activeBooking, setActiveBooking] = useState<PlannerBooking | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifs = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        new Notification("Notifications Enabled!", {
          body: "You'll now receive alerts for new bookings.",
          icon: "/aasbanner.png"
        });
      }
    }
  };

  // ── Month View Logic ───────────────────────────────────────────────────────
  
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    return bookings.reduce((acc, b) => {
      if (!acc[b.date]) acc[b.date] = [];
      acc[b.date].push(b);
      return acc;
    }, {} as Record<string, PlannerBooking[]>);
  }, [bookings]);

  const monthStats = useMemo(() => {
    const dateStr = format(currentMonth, "yyyy-MM");
    const monthBookings = bookings.filter(b => b.date.startsWith(dateStr));
    const totalRevenue = monthBookings.reduce((sum, b) => sum + (b.price ?? 0), 0);
    return {
      count: monthBookings.length,
      revenue: totalRevenue
    };
  }, [bookings, currentMonth]);

  // ── Next Detail Alert ──────────────────────────────────────────────────────

  const nextBooking = useMemo(() => {
    const now = new Date();
    return bookings
      .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
      .sort((a, b) => {
        const dA = new Date(`${a.date}T${a.time}`);
        const dB = new Date(`${b.date}T${b.time}`);
        return dA.getTime() - dB.getTime();
      })
      .find(b => {
        const bDate = new Date(`${b.date}T${b.time}`);
        return isAfter(bDate, now);
      });
  }, [bookings]);

  // ── Day View Logic ─────────────────────────────────────────────────────────

  const dayBookings = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return bookings.filter(b => b.date === dateStr);
  }, [bookings, selectedDate]);

  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewMode === "day" && timelineRef.current) {
      timelineRef.current.scrollTop = 100;
    }
  }, [viewMode]);

  const handleComplete = async (booking: PlannerBooking) => {
    setCompletingId(booking.id);
    const result = await updateBookingStatus(
      booking.id,
      "completed",
      booking.userId,
      booking.price ?? 0
    );
    setCompletingId(null);

    if (result.success) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
      setActiveBooking(prev => prev?.id === booking.id ? { ...prev, status: 'completed' } : prev);
    } else {
      alert("Failed to update status: " + result.error);
    }
  };

  const goToDay = (date: Date) => {
    setSelectedDate(date);
    setViewMode("day");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto bg-zinc-950 overflow-hidden sm:rounded-3xl border border-white/[0.05] relative">
      
      {/* ── Dynamic Header ── */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-white/[0.08] p-4 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-white">
              {viewMode === "month" ? format(currentMonth, "MMMM yyyy") : format(selectedDate, "MMMM d")}
            </h2>
            <button 
              onClick={requestNotifs}
              className={`p-2 rounded-xl transition-all ${
                notifPermission === "granted" ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-500 bg-white/5"
              }`}
            >
              {notifPermission === "granted" ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          </div>
          
          <div className="flex bg-zinc-950/50 rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setViewMode("month")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "month" ? "bg-[#D4AF37] text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-white"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode("day")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "day" ? "bg-[#D4AF37] text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-white"}`}
            >
              <Clock size={16} />
            </button>
          </div>
        </div>

        {/* Next Job Banner */}
        {nextBooking && (
          <div className="mb-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-zinc-950">
              <CalendarDays size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase text-[#D4AF37] leading-none mb-1">Next Detail</p>
              <p className="text-xs font-bold text-white truncate">
                {nextBooking.customerName} &bull; {format(parseISO(nextBooking.date), "MMM d")} at {fmt12(nextBooking.time)}
              </p>
            </div>
            <button 
              onClick={() => goToDay(parseISO(nextBooking.date))}
              className="p-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Month Stats / Quick Nav */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="flex flex-col text-center">
              <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest leading-none mb-1">Revenue</span>
              <span className="text-sm font-black text-emerald-400 tabular-nums">${monthStats.revenue.toLocaleString()}</span>
            </div>
            <div className="w-px h-8 bg-white/5"></div>
            <div className="flex flex-col text-center">
              <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest leading-none mb-1">Jobs</span>
              <span className="text-sm font-black text-[#D4AF37] tabular-nums">{monthStats.count}</span>
            </div>
          </div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={() => viewMode === "month" ? setCurrentMonth(subMonths(currentMonth, 1)) : setSelectedDate(addDays(selectedDate, -1))}
              className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white active:scale-90 transition-all border border-white/5"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => {
                const now = startOfToday();
                setSelectedDate(now);
                setCurrentMonth(startOfMonth(now));
              }}
              className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-zinc-300 hover:text-[#D4AF37] active:scale-95 transition-all border border-white/5"
            >
              Today
            </button>
            <button 
              onClick={() => viewMode === "month" ? setCurrentMonth(addMonths(currentMonth, 1)) : setSelectedDate(addDays(selectedDate, 1))}
              className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white active:scale-90 transition-all border border-white/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Viewport Content ── */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* MONTH VIEW GRID */}
        {viewMode === "month" && (
          <div className="flex-1 flex flex-col p-2 gap-2 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
            <div className="grid grid-cols-7 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-zinc-700 py-1 uppercase tracking-tighter">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr flex-1 gap-1.5 min-h-[380px]">
              {monthDays.map((day, idx) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayJobs = bookingsByDate[dateStr] ?? [];
                const dayRevenue = dayJobs.reduce((sum, b) => sum + (b.price ?? 0), 0);
                const completedJobs = dayJobs.filter(b => b.status === 'completed').length;
                const activeMonth = isSameMonth(day, currentMonth);
                const current = isToday(day);
                const selected = isSameDay(day, selectedDate);

                // Heatmap logic
                let intensity = 0;
                if (dayRevenue > 0) intensity = 1;
                if (dayRevenue > 300) intensity = 2;
                if (dayRevenue > 600) intensity = 3;

                const heatmapClasses = [
                  "",
                  "bg-[#D4AF37]/5 border-[#D4AF37]/10",
                  "bg-[#D4AF37]/10 border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]",
                  "bg-[#D4AF37]/20 border-[#D4AF37]/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                ];

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => goToDay(day)}
                    className={`relative rounded-2xl p-2 flex flex-col items-center justify-between border transition-all active:scale-95 group ${
                      activeMonth ? `bg-zinc-900/40 border-white/[0.03] ${heatmapClasses[intensity]}` : "bg-transparent border-transparent opacity-10"
                    } ${selected ? "ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-zinc-950 z-10" : ""}`}
                  >
                    <span className={`text-[11px] font-black ${current ? "text-[#D4AF37]" : activeMonth ? "text-zinc-400" : "text-zinc-700"}`}>
                      {format(day, "d")}
                    </span>
                    
                    {dayJobs.length > 0 && activeMonth && (
                      <div className="flex flex-col items-center gap-1 w-full">
                        {/* Completion Bar */}
                        <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden flex border border-white/5">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ width: `${(completedJobs / dayJobs.length) * 100}%` }}
                          />
                        </div>
                        {dayRevenue > 0 && (
                          <span className="text-[9px] font-black text-white leading-none opacity-80 tabular-nums">
                            ${dayRevenue >= 1000 ? `${(dayRevenue/1000).toFixed(1)}k` : dayRevenue}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Agenda (Below Grid) */}
            <div className="mt-4 p-4 bg-zinc-900/60 border border-white/[0.06] rounded-[24px] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                  <Clock size={14} /> Agenda &bull; {format(selectedDate, "MMM d")}
                </h3>
                <button 
                  onClick={() => setViewMode("day")}
                  className="text-[10px] font-black uppercase text-[#D4AF37] flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Full View <ArrowRight size={12} />
                </button>
              </div>
              
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {dayBookings.length === 0 ? (
                  <p className="text-xs text-zinc-600 font-bold py-4 text-center">No details scheduled.</p>
                ) : (
                  dayBookings.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => setActiveBooking(b)}
                      className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-white/5 active:bg-[#D4AF37]/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-[#D4AF37] tabular-nums w-14">{fmt12(b.time)}</span>
                        <p className="text-xs font-bold text-white truncate">{b.customerName}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${b.status === 'completed' ? 'bg-emerald-500' : 'bg-[#D4AF37]'}`} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DAY VIEW TIMELINE */}
        {viewMode === "day" && (
          <div 
            ref={timelineRef}
            className="h-full overflow-y-auto relative bg-[#050505] animate-in slide-in-from-right duration-300"
          >
            {HOURS.map((hour) => (
              <div key={hour} className="flex h-24 border-b border-white/[0.03] group">
                <div className="w-16 flex-shrink-0 flex justify-center pt-2">
                  <span className="text-[10px] font-bold text-zinc-700 uppercase">
                    {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
                  </span>
                </div>
                <div 
                  className="flex-1 relative border-l border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => {
                    const dateStr = format(selectedDate, "yyyy-MM-dd");
                    const isPM = hour >= 12;
                    const displayH = hour > 12 ? hour - 12 : hour;
                    const timeStr = `${displayH}:00 ${isPM ? "PM" : "AM"}`;
                    router.push(`/admin/bookings?new=true&date=${dateStr}&time=${timeStr}`);
                  }}
                >
                  <div className="absolute top-1/2 left-0 right-0 h-px border-t border-white/[0.02] border-dashed pointer-events-none" />
                </div>
              </div>
            ))}

            {dayBookings.map((booking) => {
              if (!booking.time) return null;
              const [h, m] = booking.time.split(":").map(Number);
              const top = (h - 7) * 96 + (m / 60) * 96;
              
              return (
                <div
                  key={booking.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBooking(booking);
                  }}
                  style={{ top: `${top}px`, height: "80px" }}
                  className={`absolute left-20 right-4 rounded-2xl p-3 shadow-lg cursor-pointer transition-all active:scale-[0.98] border ${
                    booking.status === "completed" 
                      ? "bg-zinc-900 border-white/5 text-zinc-500 opacity-60" 
                      : "bg-gradient-to-br from-[#D4AF37] to-[#a8882a] border-[#D4AF37]/50 text-zinc-950"
                  }`}
                >
                  <div className="flex justify-between items-start h-full">
                    <div className="min-w-0 flex flex-col justify-center h-full">
                      <p className="text-[10px] font-black uppercase opacity-70 leading-none mb-1">
                        {fmt12(booking.time)}
                      </p>
                      <h3 className="text-sm font-black truncate leading-tight">
                        {booking.customerName}
                      </h3>
                      <p className="text-[10px] font-bold truncate opacity-80 mt-0.5">
                        {booking.serviceName}
                      </p>
                    </div>
                    {booking.status === "completed" && <CheckCircle2 size={16} className="mt-1 opacity-50" />}
                  </div>
                </div>
              );
            })}

            {isSameDay(selectedDate, startOfToday()) && (
              <div 
                className="absolute left-16 right-0 border-t-2 border-rose-500 z-10 pointer-events-none"
                style={{ top: `${(new Date().getHours() - 7) * 96 + (new Date().getMinutes() / 60) * 96}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 absolute -left-1 -top-1 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Booking Detail Drawer ── */}
      {activeBooking && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveBooking(null)} />
          
          <div className="relative bg-zinc-900 border-t border-white/10 rounded-t-[32px] p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300 pb-safe">
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-1">Booking Detail</p>
                <h2 className="text-2xl font-black text-white">{activeBooking.customerName}</h2>
                <p className="text-sm text-zinc-400 mt-1">{activeBooking.serviceName}</p>
              </div>
              <button onClick={() => setActiveBooking(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {activeBooking.address && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeBooking.address)}`} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center justify-center p-3 bg-zinc-950/50 border border-white/[0.04] rounded-2xl text-blue-400 active:bg-white/5 transition-colors">
                  <MapPin size={20} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Nav</span>
                </a>
              )}
              {activeBooking.customerPhone && (
                <>
                  <a href={`tel:${activeBooking.customerPhone}`} className="flex-1 flex flex-col items-center justify-center p-3 bg-zinc-950/50 border border-white/[0.04] rounded-2xl text-emerald-400 active:bg-white/5 transition-colors">
                    <Phone size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Call</span>
                  </a>
                  <a href={`sms:${activeBooking.customerPhone}`} className="flex-1 flex flex-col items-center justify-center p-3 bg-zinc-950/50 border border-white/[0.04] rounded-2xl text-indigo-400 active:bg-white/5 transition-colors">
                    <MessageSquare size={20} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Text</span>
                  </a>
                </>
              )}
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-zinc-500" />
                  <span className="text-sm font-bold text-zinc-200">{format(parseISO(activeBooking.date), "EEEE, MMM d")} at {fmt12(activeBooking.time)}</span>
                </div>
                <button onClick={() => router.push(`/admin/bookings`)} className="text-xs font-bold text-[#D4AF37] px-3 py-1.5 bg-[#D4AF37]/10 rounded-lg">Edit</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <Car size={16} className="text-zinc-500 shrink-0" />
                  <span className="text-sm font-bold text-zinc-200 truncate">{activeBooking.vehicleDesc}</span>
                </div>
                <span className="text-sm font-black text-white shrink-0">${(activeBooking.price ?? 0).toFixed(2)}</span>
              </div>
              {activeBooking.notes && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Internal Notes</p>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{activeBooking.notes}</p>
                </div>
              )}
            </div>

            {activeBooking.status !== "completed" ? (
              <button onClick={() => handleComplete(activeBooking)} disabled={completingId === activeBooking.id} className="w-full py-4 rounded-2xl bg-[#D4AF37] text-zinc-950 font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-[0.98] transition-all disabled:opacity-50">
                {completingId === activeBooking.id ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                Mark Job as Complete
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black flex items-center justify-center gap-2">
                <CheckCircle2 size={20} />
                Job Completed
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button 
        onClick={() => router.push('/admin/bookings?new=true')}
        className="absolute bottom-6 sm:bottom-10 right-6 w-14 h-14 rounded-full bg-[#D4AF37] text-zinc-950 shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center justify-center transition-transform active:scale-90 z-20"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
