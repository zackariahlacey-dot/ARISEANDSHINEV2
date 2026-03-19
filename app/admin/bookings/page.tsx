"use client";

import { useAdminBookings, useUpdateBookingStatus } from "@/hooks/use-admin-data";
import { format } from "date-fns";
import { Loader2, AlertCircle, Car, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MISSION CONTROL: GROUND ONE V2
 * A hyper-minimalist, high-density booking management table.
 */
export default function BookingsPage() {
  const { data: bookings, isLoading, error } = useAdminBookings();
  const { mutate: updateStatus } = useUpdateBookingStatus();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="p-6 bg-[#050505] min-h-screen text-zinc-100 selection:bg-amber-500/30">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-white">Bookings</h1>
            <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Ground One / Real-Time Operations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              System Online
            </div>
          </div>
        </header>

        {/* TABLE CONTAINER */}
        <div className="rounded-3xl border border-white/[0.06] bg-[#080808] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Customer</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Vehicle / Service</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Schedule</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {bookings?.map((b) => (
                <tr key={b.id} className="group hover:bg-white/[0.02] transition-all duration-200">
                  {/* CUSTOMER INFO */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-zinc-400 uppercase">
                        {b.profiles?.first_name?.[0]}{b.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors">
                          {b.profiles?.first_name} {b.profiles?.last_name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 tracking-tighter uppercase">{b.profiles?.phone}</p>
                      </div>
                    </div>
                  </td>

                  {/* VEHICLE & SERVICE */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Car size={12} className="text-zinc-500" />
                        <span className="text-xs font-medium uppercase tracking-tight">
                          {b.vehicles?.year} {b.vehicles?.make} {b.vehicles?.model}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight pl-4.5">
                        {b.services?.name}
                      </p>
                    </div>
                  </td>

                  {/* DATE & TIME */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Calendar size={12} className="text-zinc-500" />
                        <span className="text-xs font-mono uppercase">{format(new Date(b.booking_date), "MMM dd, yyyy")}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono pl-4.5 uppercase tracking-tighter">{b.booking_time}</p>
                    </div>
                  </td>

                  {/* STATUS SELECTOR */}
                  <td className="px-6 py-4">
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus({ id: b.id, status: e.target.value as any })}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-tight px-2.5 py-1.5 rounded-lg border-none ring-1 ring-white/[0.06] cursor-pointer appearance-none bg-[#0a0a0a] transition-all",
                        b.status === 'confirmed' && "text-emerald-400 ring-emerald-500/20",
                        b.status === 'completed' && "text-blue-400 ring-blue-500/20",
                        b.status === 'cancelled' && "text-rose-400 ring-rose-500/20",
                        b.status === 'no-show' && "text-zinc-500 ring-white/[0.06]"
                      )}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no-show">No Show</option>
                    </select>
                  </td>

                  {/* PRICE */}
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1 text-amber-500">
                      <span className="text-sm font-black tracking-tighter">${b.total_price}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* EMPTY STATE */}
          {bookings?.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">No Records Found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-amber-500" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Synchronizing Operations...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="h-screen bg-[#050505] p-6 flex items-center justify-center">
      <div className="max-w-md w-full p-8 border border-rose-500/20 bg-rose-500/5 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 text-rose-500">
          <AlertCircle size={24} />
          <h2 className="font-bold uppercase tracking-tight">Interface Fault</h2>
        </div>
        <p className="text-xs text-rose-400/60 font-mono leading-relaxed uppercase tracking-tighter">{message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-colors"
        >
          Attempt Re-link
        </button>
      </div>
    </div>
  );
}
