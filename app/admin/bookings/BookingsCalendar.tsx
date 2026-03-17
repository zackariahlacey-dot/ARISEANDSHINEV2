"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Car, CheckCircle2 } from "lucide-react";
import type { BookingRow } from "./BookingsTable";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

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

export function BookingsCalendar({ bookings }: { bookings: BookingRow[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Group bookings by date string (YYYY-MM-DD)
  const bookingsByDate = bookings.reduce((acc, b) => {
    if (!acc[b.booking_date]) acc[b.booking_date] = [];
    acc[b.booking_date].push(b);
    return acc;
  }, {} as Record<string, BookingRow[]>);

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[100px] bg-zinc-950/20 border-r border-b border-white/[0.03]"></div>);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dayBookings = (bookingsByDate[dateStr] ?? []).filter(b => b.status !== 'cancelled').sort((a, b) => (a.booking_time ?? "").localeCompare(b.booking_time ?? ""));
    const isToday = isCurrentMonth && today.getDate() === i;

    days.push(
      <div key={`day-${i}`} className={`min-h-[120px] p-2 border-r border-b border-white/[0.05] transition-colors ${isToday ? 'bg-[#D4AF37]/5' : 'hover:bg-white/[0.02]'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#D4AF37] text-zinc-950' : 'text-zinc-500'}`}>
            {i}
          </span>
          {dayBookings.length > 0 && (
            <span className="text-[9px] font-bold bg-white/[0.05] text-zinc-400 px-1.5 py-0.5 rounded">
              {dayBookings.length} {dayBookings.length === 1 ? 'job' : 'jobs'}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {dayBookings.slice(0, 4).map(b => {
            const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
            const service = Array.isArray(b.services) ? b.services[0] : b.services;
            return (
              <div key={b.id} className="bg-zinc-900 border border-white/[0.05] p-1.5 rounded-md truncate relative group">
                <p className="text-[10px] font-bold text-white truncate">
                  {fmt12(b.booking_time).split(" ")[0]} - {profile?.first_name || "Customer"}
                </p>
                <p className="text-[9px] text-zinc-500 truncate">{service?.name || "Service"}</p>
                
                {/* Tooltip on hover */}
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-48 bg-zinc-800 border border-white/[0.1] rounded-xl p-3 shadow-xl pointer-events-none">
                   <p className="text-xs font-bold text-white mb-1">{profile?.first_name} {profile?.last_name}</p>
                   <p className="text-[10px] text-zinc-400">{service?.name}</p>
                   <p className="text-[10px] text-[#D4AF37] mt-1">{fmt12(b.booking_time)}</p>
                </div>
              </div>
            )
          })}
          {dayBookings.length > 4 && (
            <p className="text-[10px] text-zinc-500 font-medium text-center">+{dayBookings.length - 4} more</p>
          )}
        </div>
      </div>
    );
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <h3 className="text-lg font-black text-white w-48">{monthName} {year}</h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-colors">
            Today
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 border-b border-white/[0.06] bg-zinc-950/40">
        {WEEKDAYS.map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-r border-white/[0.03]">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1">
        {days}
      </div>
    </div>
  );
}
