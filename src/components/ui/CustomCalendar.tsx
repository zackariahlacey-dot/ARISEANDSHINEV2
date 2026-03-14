"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isBefore, isWeekend, startOfToday } from "date-fns";

interface CustomCalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  className?: string;
}

export function CustomCalendar({ selectedDate, onSelect, className }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6 px-2">
        <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">
          {format(currentMonth, "MMMM yyyy")}
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[8px] font-black uppercase tracking-widest text-white/20">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "yyyy-MM-dd");
        const cloneDay = day;
        
        const isPast = isBefore(cloneDay, today);
        const isOff = isWeekend(cloneDay);
        const isSelected = selectedDate === formattedDate;
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);

        days.push(
          <button
            key={day.toString()}
            disabled={isPast || isOff}
            onClick={() => onSelect(format(cloneDay, "yyyy-MM-dd"))}
            className={cn(
              "relative h-12 flex flex-col items-center justify-center rounded-xl transition-all border",
              !isCurrentMonth && "opacity-0 pointer-events-none",
              isSelected 
                ? "bg-[#fbbf24] border-[#fbbf24] text-black shadow-[0_0_20px_rgba(251,191,36,0.3)] z-10" 
                : "bg-transparent border-transparent",
              !isSelected && !isPast && !isOff && "text-white/60 hover:bg-white/5 hover:border-white/10",
              (isPast || isOff) && "text-white/10 cursor-not-allowed"
            )}
          >
            <span className="text-[10px] font-black">{format(cloneDay, "d")}</span>
            {isSameDay(cloneDay, today) && !isSelected && (
              <div className="absolute bottom-2 w-1 h-1 rounded-full bg-[#fbbf24]" />
            )}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className={cn("p-6 bg-white/[0.02] border border-white/5 rounded-[32px]", className)}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      <div className="mt-6 flex items-center gap-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#fbbf24]/60">Selection</span>
        </div>
      </div>
    </div>
  );
}
