"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useAdminBookings,
  useUpdateBookingStatus,
  useSendOnMyWay,
  useHandleNoShow,
  useRescheduleBooking,
  useServices,
  useDeleteBooking,
} from "@/hooks/use-admin-data";
import { adminQuickBookAction, getBookedSlotsAction } from "@/app/actions/adminActions";
import { sendStripePaymentLink } from "@/app/actions/sendStripePaymentLink";
import { useToast } from "@/components/admin/Toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Mail,
  Navigation,
  Check,
  X,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Loader2,
  Car,
  DollarSign,
  User,
  CalendarDays,
  Link,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  addDays,
  getDaysInMonth,
  startOfMonth,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { AddressAutocomplete } from "@/components/landing/AddressAutocomplete";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  "07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM",
];

// ── Booking field helpers: prefer direct lead columns, fall back to joins ──
function bName(b: any): string {
  if (b.customer_name) return b.customer_name;
  const p = b.profiles;
  if (!p) return "Unknown";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown";
}
function bInitials(b: any): string {
  const name = bName(b);
  if (name === "Unknown") return "?";
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.[0] ?? "?").toUpperCase();
}
function bPhone(b: any): string | null { return b.customer_phone ?? b.profiles?.phone ?? null; }
function bEmail(b: any): string | null { return b.customer_email ?? b.profiles?.email ?? null; }
function bVehicle(b: any): string {
  const year  = b.vehicle_year  ?? b.vehicles?.year  ?? "";
  const make  = b.vehicle_make  ?? b.vehicles?.make  ?? "";
  const model = b.vehicle_model ?? b.vehicles?.model ?? "";
  return [year, make, model].filter(Boolean).join(" ");
}
function bService(b: any): string { return b.service_name ?? b.services?.name ?? "Standard Detail"; }
function bAddress(b: any): string | null {
  if (b.service_address) return b.service_address;
  if (!b.notes) return null;
  const match = b.notes.match(/📍 Service Location:\s*(.+)/);
  return match ? match[1].trim() : null;
}

export default function SchedulePage() {
  const { data: bookings, isLoading, refetch } = useAdminBookings();
  const { data: services } = useServices();
  const updateStatus = useUpdateBookingStatus();
  const sendOmw = useSendOnMyWay();
  const handleNoShow = useHandleNoShow();
  const reschedule = useRescheduleBooking();
  const deleteBooking = useDeleteBooking();
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");
  const [monthDate, setMonthDate] = useState(new Date());
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00 AM");
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }), [weekStart]);

  const dayBookings = useMemo(() => {
    if (!bookings) return [];
    if (viewMode === "list") {
      // For list view, show upcoming bookings from today onwards
      const todayStr = format(new Date(), "yyyy-MM-dd");
      return bookings
        .filter(b => b.booking_date >= todayStr && b.status !== "cancelled")
        .sort((a, b) => {
          if (a.booking_date !== b.booking_date) return a.booking_date.localeCompare(b.booking_date);
          return (a.booking_time || "").localeCompare(b.booking_time || "");
        });
    } else {
      const dateStr = format(selectedDay, "yyyy-MM-dd");
      return bookings
        .filter(b => b.booking_date === dateStr && b.status !== "cancelled")
        .sort((a, b) => (a.booking_time || "").localeCompare(b.booking_time || ""));
    }
  }, [bookings, selectedDay, viewMode]);

  const getBookingsForDate = useCallback((date: Date) => {
    if (!bookings) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(b => b.booking_date === dateStr && b.status !== "cancelled");
  }, [bookings]);

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    const period = hr >= 12 ? "PM" : "AM";
    const h12 = hr % 12 || 12;
    return `${h12}:${m} ${period}`;
  };

  // ── Actions ──
  const handleNavigateAndOmw = async (b: any) => {
    const addr = bAddress(b);
    if (addr) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
    try { await sendOmw.mutateAsync(b.id); toast("On My Way email sent!"); } catch { toast("Failed to send", "error"); }
  };

  const handleComplete = async (b: any) => {
    try { await updateStatus.mutateAsync({ id: b.id, status: "completed" }); toast("Job completed!"); setActiveBooking(null); refetch(); } catch { toast("Error", "error"); }
  };

  const handleNoShowClick = async (b: any) => {
    try { await handleNoShow.mutateAsync(b.id); toast("Marked no-show"); setActiveBooking(null); refetch(); } catch { toast("Error", "error"); }
  };

  const handleCancel = async (b: any) => {
    if (!confirm("Cancel this booking?")) return;
    try { await updateStatus.mutateAsync({ id: b.id, status: "cancelled" }); toast("Booking cancelled"); setActiveBooking(null); refetch(); } catch { toast("Error", "error"); }
  };

  const handleDelete = async (b: any) => {
    if (!confirm("Permanently delete this booking? This cannot be undone.")) return;
    try { await deleteBooking.mutateAsync(b.id); toast("Deleted"); setActiveBooking(null); refetch(); } catch { toast("Error", "error"); }
  };

  const handleReschedule = async () => {
    if (!activeBooking || !rescheduleDate || !rescheduleTime) return;
    const [timePart, period] = rescheduleTime.split(" ");
    const [rh, rm] = timePart.split(":");
    let h = parseInt(rh);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const time24 = `${String(h).padStart(2, "0")}:${rm}:00`;
    try {
      await reschedule.mutateAsync({ id: activeBooking.id, date: rescheduleDate, time: time24 });
      toast("Rescheduled!"); setShowReschedule(false); setActiveBooking(null); refetch();
    } catch { toast("Error", "error"); }
  };

  const handleSendPaymentLink = async (b: any) => {
    setSendingPaymentLink(true);
    try {
      const vehicles = b.vehicles;
      const customerEmail = bEmail(b);
      const customerName = bName(b);
      const result = await sendStripePaymentLink(b.id, {
        serviceName: bService(b),
        totalPrice: Number(b.total_price),
        vehicleYear: vehicles?.year ?? b.vehicle_year ?? "",
        vehicleMake: vehicles?.make ?? b.vehicle_make ?? "",
        vehicleModel: vehicles?.model ?? b.vehicle_model ?? "",
        vehicleSize: vehicles?.size ?? b.vehicle_size ?? "",
        bookingDate: b.booking_date,
        bookingTime: formatTime(b.booking_time),
        customerEmail: customerEmail ?? "",
        customerName: customerName,
      });
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        await navigator.clipboard.writeText(result.url).catch(() => {});
        if (result.emailSent) {
          toast(`Payment link emailed to ${customerEmail} & copied!`);
        } else if (customerEmail) {
          toast("Payment link copied — email failed, send manually.", "error");
        } else {
          toast("Payment link copied (no email on file for this client).");
        }
      }
    } catch {
      toast("Failed to create payment link", "error");
    } finally {
      setSendingPaymentLink(false);
    }
  };

  if (isLoading) {
    return <div className="h-[80dvh] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>;
  }

  // Month calendar grid
  const monthStart = startOfMonth(monthDate);
  const daysInMonth = getDaysInMonth(monthDate);
  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* ── HEADER ── */}
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Agenda</h1>
            {viewMode !== "list" && (
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                {format(selectedDay, "EEEE, MMM do")}
                {isToday(selectedDay) && <span className="text-amber-500 ml-2">TODAY</span>}
              </p>
            )}
          </div>
          <button onClick={() => { setSelectedDay(new Date()); setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setMonthDate(new Date()); }}
            className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-amber-500 transition-all active:scale-95">
            Today
          </button>
        </div>

        {/* Triple Toggle */}
        <div className="flex p-1 rounded-xl bg-[#0A0A0A] border border-white/[0.04] mb-4">
          {(["month", "week", "list"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={cn(
                "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all text-center",
                viewMode === mode ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-zinc-500 hover:text-white"
              )}>
              {mode}
            </button>
          ))}
        </div>

        {viewMode === "week" && (
          /* ── WEEK STRIP ── */
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="p-2 rounded-xl bg-white/[0.03] text-zinc-500 hover:text-white transition-all"><ChevronLeft size={16} /></button>
            <div className="flex-1 grid grid-cols-7 gap-1">
              {weekDays.map(day => {
                const count = getBookingsForDate(day).length;
                const active = isSameDay(day, selectedDay);
                const today = isToday(day);
                return (
                  <button key={day.toISOString()} onClick={() => { setSelectedDay(day); setShowDayModal(true); }}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-xl transition-all relative border",
                      active ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" : today ? "bg-white/[0.05] border-white/[0.08] text-white" : "border-transparent text-zinc-500 hover:bg-white/[0.02]"
                    )}>
                    <span className="text-[8px] font-black uppercase tracking-widest">{format(day, "EEE")}</span>
                    <span className={cn("text-base font-black leading-none mt-1", active ? "text-black" : today ? "text-white" : "")}>{format(day, "d")}</span>
                    {count > 0 && <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5", active ? "bg-black/50" : "bg-amber-500 line-clamp-1")} />}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="p-2 rounded-xl bg-white/[0.03] text-zinc-500 hover:text-white transition-all"><ChevronRight size={16} /></button>
          </div>
        )}

        {viewMode === "month" && (
          /* ── 30-DAY CALENDAR ── */
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/[0.04] p-3 md:p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setMonthDate(subMonths(monthDate, 1))} className="p-2 bg-white/[0.03] rounded-lg text-zinc-500 hover:text-white transition-all"><ChevronLeft size={14} /></button>
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-amber-500">{format(monthDate, "MMMM yyyy")}</span>
              <button onClick={() => setMonthDate(addMonths(monthDate, 1))} className="p-2 bg-white/[0.03] rounded-lg text-zinc-500 hover:text-white transition-all"><ChevronRight size={14} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} className="text-[9px] font-black text-zinc-600 uppercase py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: adjustedStartDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = addDays(monthStart, i);
                const count = getBookingsForDate(day).length;
                const active = isSameDay(day, selectedDay);
                const today = isToday(day);
                return (
                  <button key={i} onClick={() => { setSelectedDay(day); setShowDayModal(true); }}
                    className={cn(
                      "aspect-square flex flex-col justify-center items-center rounded-xl transition-all relative border",
                      active ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" : today ? "bg-white/[0.06] border-white/[0.1] text-white" : "bg-white/[0.01] border-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                    )}>
                    <span className="text-[11px] font-black">{i + 1}</span>
                    {count > 0 && <div className={cn("w-1.5 h-1.5 rounded-full absolute bottom-1.5", active ? "bg-black/50" : "bg-amber-500")} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── TIMELINE / LIST VIEW ── */}
      {viewMode === "list" && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 pb-24 md:pb-6">
          {dayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-3">
                <Calendar size={24} className="text-zinc-800" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">No upcoming bookings</p>
            </div>
          ) : (
            dayBookings.map(b => {
              const clientName = bName(b);
              const vehicleInfo = bVehicle(b);
              return (
                <button key={b.id} onClick={() => setActiveBooking(b)}
                  className="w-full p-3.5 rounded-2xl bg-[#0A0A0A] border border-white/[0.05] hover:border-amber-500/20 transition-all text-left group active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-amber-500">{formatTime(b.booking_time)}</span>
                        <StatusBadge status={b.status} />
                        <span className="text-[10px] text-zinc-600 ml-auto">{format(new Date(b.booking_date + "T12:00:00"), "MMM d")}</span>
                      </div>
                      <p className="font-black text-sm mt-1 truncate">{clientName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {vehicleInfo && <span className="text-[9px] text-zinc-500 flex items-center gap-1"><Car size={10} />{vehicleInfo}</span>}
                        <span className="text-[9px] text-zinc-500 flex items-center gap-1"><DollarSign size={10} />${Number(b.total_price).toFixed(0)}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-800 group-hover:text-zinc-500 shrink-0 mt-1.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button onClick={() => setShowNewBooking(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 rounded-2xl bg-amber-500 text-black shadow-xl shadow-amber-500/20 flex items-center justify-center active:scale-90 transition-all z-50 hover:bg-amber-400">
        <Plus size={22} strokeWidth={3} />
      </button>

      {/* ── DAY VIEW MODAL ── */}
      <Modal open={showDayModal} onClose={() => setShowDayModal(false)} title={format(selectedDay, "EEEE, MMM do")}>
        <div className="p-4 space-y-3">
          {getBookingsForDate(selectedDay).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mb-3 text-zinc-800">
                <Calendar size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No bookings for this day</p>
              <button onClick={() => { setShowDayModal(false); setShowNewBooking(true); }} 
                className="mt-4 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                + Quick Book
              </button>
            </div>
          ) : (
            getBookingsForDate(selectedDay).map(b => {
              return (
                <button key={b.id} onClick={() => setActiveBooking(b)}
                  className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition-all text-left group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-amber-500">{formatTime(b.booking_time)}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="font-black text-sm mt-1">{bName(b)}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{bService(b)}</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-amber-500" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Modal>

      {/* ── BOOKING DETAIL SHEET ── */}
      <Modal open={!!activeBooking} onClose={() => setActiveBooking(null)} title="Booking Details">
        {activeBooking && (() => {
          const b = activeBooking;
          const clientName = bName(b);
          const phone = bPhone(b);
          const vehicleInfo = bVehicle(b);
          const addr = bAddress(b);
          return (
            <div className="p-4 space-y-4">
              {/* PRIMARY STAT CARD */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-zinc-900 to-[#050505] border border-white/[0.08] shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-amber-500/20">
                      {bInitials(b)}
                    </div>
                    <div>
                      <p className="font-black text-lg tracking-tight leading-tight">{clientName}</p>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-white/[0.05]" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Service</p>
                    <p className="font-bold text-xs truncate text-zinc-200">{bService(b)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Total Price</p>
                    <p className="font-black text-sm text-emerald-500">${Number(b.total_price).toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Date</p>
                    <p className="font-bold text-xs text-zinc-200">{format(new Date(b.booking_date + "T12:00:00"), "MMM do")}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Time</p>
                    <p className="font-bold text-xs text-zinc-200">{formatTime(b.booking_time)}</p>
                  </div>
                </div>

                {(vehicleInfo || addr) && (
                   <div className="pt-2 space-y-1.5 border-t border-white/[0.03]">
                      {vehicleInfo && (
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <Car size={12} className="text-amber-500/50" />
                          <span className="font-medium">{vehicleInfo}</span>
                        </div>
                      )}
                      {addr && (
                        <div className="flex items-start gap-2 text-[10px] text-zinc-400">
                          <MapPin size={12} className="text-rose-500/50 mt-0.5" />
                          <span className="font-medium flex-1">{addr}</span>
                        </div>
                      )}
                   </div>
                )}
              </div>

              {/* ACTION GRID */}
              <div className="grid grid-cols-2 gap-2">
                {addr && (
                  <button onClick={() => {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`, "_blank");
                  }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] active:scale-95 transition-all group">
                    <Navigation size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Directions</span>
                  </button>
                )}
                
                {phone && (
                  <a href={`sms:${phone}`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] active:scale-95 transition-all group">
                    <MessageSquare size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Text Client</span>
                  </a>
                )}

                {phone && (
                  <a href={`tel:${phone}`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] active:scale-95 transition-all group">
                    <Phone size={20} className="text-violet-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Call Client</span>
                  </a>
                )}

                <button onClick={() => setShowReschedule(true)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] active:scale-95 transition-all group">
                  <RotateCcw size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Reschedule</span>
                </button>

                <button
                  onClick={() => handleSendPaymentLink(b)}
                  disabled={sendingPaymentLink}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] active:scale-95 transition-all group disabled:opacity-50"
                >
                  {sendingPaymentLink ? (
                    <Loader2 size={20} className="text-emerald-500 animate-spin" />
                  ) : (
                    <Link size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[9px] font-black uppercase tracking-widest">Send Payment Link</span>
                </button>
              </div>

              {/* SECONDARY ACTIONS (Status management) */}
              <div className="pt-2 space-y-2">
                {b.status === "confirmed" && (
                  <>
                    <button onClick={() => handleComplete(b)} className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all">
                      <Check size={18} strokeWidth={3} />
                      Complete Job
                    </button>
                    <button onClick={() => handleNavigateAndOmw(b)} className="w-full py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                      <Mail size={14} /> Send "On My Way" Email
                    </button>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2">
                   {b.status !== "no-show" && b.status !== "completed" && (
                     <button onClick={() => handleNoShowClick(b)} className="py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                       <AlertTriangle size={12} /> No-Show
                     </button>
                   )}
                   <button onClick={() => handleCancel(b)} className="py-3 rounded-xl bg-zinc-900 border border-white/[0.05] text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                     <X size={12} /> Cancel
                   </button>
                </div>
                
                <button onClick={() => handleDelete(b)} className="w-full py-3 text-zinc-800 hover:text-rose-900 transition-colors text-[8px] font-black uppercase tracking-[0.3em]">
                   Permanently Delete Record
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── RESCHEDULE MODAL ── */}
      <Modal open={showReschedule} onClose={() => setShowReschedule(false)} title="Reschedule">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">New Date</label>
            <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-mono focus:ring-1 ring-amber-500/50 outline-none text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">New Time</label>
            <div className="grid grid-cols-4 gap-1">
              {TIME_SLOTS.map(s => (
                <button key={s} onClick={() => setRescheduleTime(s)}
                  className={cn("py-2 rounded-lg text-[9px] font-bold transition-all",
                    rescheduleTime === s ? "bg-amber-500 text-black" : "bg-white/[0.03] border border-white/[0.04] text-zinc-500 hover:text-white")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleReschedule} disabled={reschedule.isPending}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
            {reschedule.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Confirm Reschedule
          </button>
        </div>
      </Modal>

      {/* ── NEW BOOKING MODAL ── */}
      <Modal open={showNewBooking} onClose={() => setShowNewBooking(false)} title="New Booking">
        <NewBookingForm
          date={selectedDay}
          services={services || []}
          onClose={() => { setShowNewBooking(false); refetch(); }}
        />
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEW BOOKING FORM (Multi-step)
   ═══════════════════════════════════════════════════════ */
function NewBookingForm({ date, services, onClose }: { date: Date; services: any[]; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "",
    serviceId: services[0]?.id || "", serviceName: services[0]?.name || "",
    vehicleYear: "", vehicleMake: "", vehicleModel: "",
    vehicleSize: "sedan",
    bookingTime: "09:00 AM",
    totalPrice: Number(services[0]?.price_small) || 0,
    notes: "",
  });

  // Load already-booked slots when the form opens
  useEffect(() => {
    const dateStr = format(date, "yyyy-MM-dd");
    getBookedSlotsAction(dateStr).then(raw => {
      // convert HH:MM:SS from DB to "HH:MM AM/PM" to match TIME_SLOTS
      const converted = raw.map(t => {
        const [h, m] = t.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
      });
      setBookedSlots(converted);
      // Auto-select first available slot
      const firstOpen = TIME_SLOTS.find(s => !converted.includes(s));
      if (firstOpen) setForm(p => ({ ...p, bookingTime: firstOpen }));
    });
  }, [date]);

  const isSlotTaken = (slot: string) => bookedSlots.some(taken => {
    // block slots within ±3 hours (180 min) of a taken slot
    const toMins = (t: string) => { const [tp, per] = t.split(" "); const [h, m] = tp.split(":").map(Number); let hh = h; if (per === "PM" && h !== 12) hh += 12; if (per === "AM" && h === 12) hh = 0; return hh * 60 + m; };
    return Math.abs(toMins(slot) - toMins(taken)) < 180;
  });

  const up = (f: Partial<typeof form>) => setForm(p => ({ ...p, ...f }));

  const handleServiceChange = (id: string) => {
    const s = services.find((x: any) => x.id === id);
    if (s) up({ serviceId: id, serviceName: s.name, totalPrice: Number(s.price_small) || 0 });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone) { toast("Name and phone required", "error"); return; }
    setLoading(true);
    try {
      const res = await adminQuickBookAction({
        ...form,
        bookingDate: format(date, "yyyy-MM-dd"),
      });
      if (res.success) { toast("Booking created! Client account saved."); onClose(); }
      else { toast(res.error || "Error", "error"); }
    } catch { toast("Failed", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-4 space-y-4">
      {step === 1 && (
        <>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Step 1 · Client Info</p>
          <div className="space-y-3">
            <Input label="Full Name" value={form.name} onChange={v => up({ name: v })} placeholder="John Doe" required />
            <Input label="Phone" value={form.phone} onChange={v => up({ phone: v })} placeholder="(802) 555-1234" type="tel" required />
            <Input label="Email" value={form.email} onChange={v => up({ email: v })} placeholder="john@email.com" type="email" />
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Service Address</label>
              <AddressAutocomplete value={form.address} onChange={v => up({ address: v })} />
            </div>
          </div>
          <button onClick={() => { if (!form.name || !form.phone) { toast("Name & phone required", "error"); return; } setStep(2); }}
            className="w-full py-3 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
            Next — Vehicle & Service
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Step 2 · Vehicle & Service</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Input label="Year" value={form.vehicleYear} onChange={v => up({ vehicleYear: v })} placeholder="2024" />
              <Input label="Make" value={form.vehicleMake} onChange={v => up({ vehicleMake: v })} placeholder="Toyota" />
              <Input label="Model" value={form.vehicleModel} onChange={v => up({ vehicleModel: v })} placeholder="Camry" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Vehicle Size</label>
              <div className="grid grid-cols-4 gap-1">
                {(["compact","sedan","suv","xl"] as const).map(s => (
                  <button key={s} onClick={() => up({ vehicleSize: s })}
                    className={cn("py-2 rounded-lg text-[9px] font-bold uppercase transition-all",
                      form.vehicleSize === s ? "bg-amber-500 text-black" : "bg-white/[0.03] border border-white/[0.04] text-zinc-500")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Service</label>
              <select value={form.serviceId} onChange={e => handleServiceChange(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:ring-1 ring-amber-500/50 outline-none">
                {services.map((s: any) => <option key={s.id} value={s.id} className="bg-zinc-900">{s.name} — ${s.price_small}</option>)}
              </select>
            </div>
            <Input label="Price ($)" value={String(form.totalPrice)} onChange={v => up({ totalPrice: Number(v) })} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setStep(1)} className="py-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-zinc-400 font-black text-[10px] uppercase tracking-widest">Back</button>
            <button onClick={() => setStep(3)} className="py-3 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Next — Time</button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Step 3 · Date & Time</p>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Date</p>
              <p className="text-sm font-black mt-0.5">{format(date, "EEEE, MMMM do, yyyy")}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">Time Slot</label>
              <div className="grid grid-cols-4 gap-1">
                {TIME_SLOTS.map(s => {
                  const taken = isSlotTaken(s);
                  return (
                    <button key={s} onClick={() => !taken && up({ bookingTime: s })} disabled={taken}
                      title={taken ? "Already booked" : ""}
                      className={cn("py-2 rounded-lg text-[9px] font-bold transition-all relative",
                        taken
                          ? "bg-red-500/10 border border-red-500/15 text-red-900 cursor-not-allowed line-through"
                          : form.bookingTime === s
                            ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                            : "bg-white/[0.03] border border-white/[0.04] text-zinc-500 hover:text-white")}>
                      {s}
                      {taken && <span className="absolute inset-0 flex items-center justify-center text-[6px] text-red-700/60 font-black mt-4">TAKEN</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <Input label="Notes" value={form.notes} onChange={v => up({ notes: v })} placeholder="Special instructions..." />
          </div>
          {/* Summary */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-1 text-[9px]">
            <p className="font-black text-amber-500">Booking Summary</p>
            <p><span className="text-zinc-500">Client:</span> {form.name}</p>
            <p><span className="text-zinc-500">Vehicle:</span> {form.vehicleYear} {form.vehicleMake} {form.vehicleModel}</p>
            <p><span className="text-zinc-500">Service:</span> {form.serviceName}</p>
            <p><span className="text-zinc-500">Total:</span> <span className="text-emerald-500 font-bold">${form.totalPrice}</span></p>
            <p><span className="text-zinc-500">When:</span> {format(date, "MMM d")} at {form.bookingTime}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setStep(2)} className="py-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-zinc-400 font-black text-[10px] uppercase tracking-widest">Back</button>
            <button onClick={handleSubmit} disabled={loading}
              className="py-3 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Book It
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Input helper ── */
function Input({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 ml-1">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm focus:ring-1 ring-amber-500/50 outline-none text-white placeholder:text-zinc-700" />
    </div>
  );
}
