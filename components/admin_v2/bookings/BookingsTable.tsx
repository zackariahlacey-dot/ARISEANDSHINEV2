"use client";

import { useAdminBookings, useUpdateBookingStatus } from "@/hooks/use-admin-data";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreHorizontal,
  ChevronRight,
  User,
  Car,
  CalendarDays,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AdminBooking } from "@/types/admin";

const STATUS_CONFIG = {
  confirmed: { color: "text-emerald-400 bg-emerald-500/10", icon: CheckCircle2 },
  completed: { color: "text-blue-400 bg-blue-500/10", icon: CheckCircle2 },
  cancelled: { color: "text-rose-400 bg-rose-500/10", icon: XCircle },
  "no-show": { color: "text-zinc-400 bg-zinc-500/10", icon: Clock },
};

export default function BookingsTable() {
  const { data: bookings, isLoading, error } = useAdminBookings();
  const updateStatus = useUpdateBookingStatus();

  if (isLoading) return <BookingsSkeleton />;
  if (error) return <div className="text-rose-500">Failed to load bookings</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h1 className="text-xl font-bold text-white tracking-tight">Recent Bookings</h1>
         <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-zinc-400 hover:text-white transition-colors">Export CSV</button>
            <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all">New Booking</button>
         </div>
      </div>

      <div className="border border-white/[0.06] rounded-2xl bg-[#050505] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Customer</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Vehicle & Service</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Date & Time</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Status</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Price</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {bookings?.map((booking) => (
              <tr key={booking.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      {booking.profiles?.first_name?.[0]}{booking.profiles?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {booking.profiles?.first_name} {booking.profiles?.last_name}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">{booking.profiles?.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Car size={12} className="text-zinc-500" />
                      <span className="text-xs text-zinc-300 font-medium">
                        {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={12} className="text-amber-500/60" />
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                        {booking.services?.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={12} className="text-zinc-500" />
                      <span className="text-xs text-zinc-300">
                        {format(new Date(booking.booking_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 pl-4.5 font-mono">{booking.booking_time}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <StatusBadge status={booking.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-white">${booking.total_price}</span>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all opacity-0 group-hover:opacity-100">
                      <ChevronRight size={18} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight", config.color)}>
      <Icon size={12} />
      {status}
    </div>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-zinc-900 rounded-lg" />
      <div className="h-[600px] bg-zinc-900/50 rounded-2xl" />
    </div>
  );
}
