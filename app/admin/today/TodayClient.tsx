"use client";

import { useState } from "react";
import { 
  MapPin, 
  Phone, 
  MessageSquare, 
  Car, 
  Clock, 
  CheckCircle2, 
  Info,
  DollarSign,
  Loader2,
  CheckCircle
} from "lucide-react";
import { updateBookingStatus } from "@/app/actions/updateBookingStatus";
import { useRouter } from "next/navigation";

export type TodayJobRow = {
  id: string;
  booking_time: string | null;
  status: string;
  total_price: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_id: string | null; // Added
  service_name: string;
  vehicle_desc: string;
  address: string | null;
  notes: string;
};

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

export function TodayClient({ jobs: initialJobs, date }: { jobs: TodayJobRow[]; date: string }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  const addToast = (msg: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const handleComplete = async (job: TodayJobRow) => {
    setCompletingId(job.id);
    const result = await updateBookingStatus(
      job.id,
      "completed",
      job.customer_id,
      job.total_price ?? 0
    );
    setCompletingId(null);

    if (result.success) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed' } : j));
      addToast(`Job completed! Awarded ${result.pointsAwarded} points to ${job.customer_name}.`);
      router.refresh();
    } else {
      alert("Failed to update status: " + result.error);
    }
  };

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Today's Jobs</h2>
        <p className="text-sm text-zinc-500 mt-0.5">{displayDate}</p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/40 border border-white/[0.06] rounded-3xl">
          <CheckCircle2 size={40} className="text-zinc-700 mb-3" />
          <p className="text-zinc-400 font-medium">No jobs scheduled for today.</p>
          <p className="text-zinc-600 text-xs mt-1">Enjoy the day off!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isExpanded = selectedJob === job.id;
            const isCompleted = job.status === "completed";
            
            return (
              <div 
                key={job.id} 
                className={`bg-zinc-900/60 border rounded-2xl overflow-hidden transition-colors ${
                  isExpanded ? "border-[#D4AF37]/30" : "border-white/[0.06] hover:border-white/[0.1]"
                } ${isCompleted ? 'opacity-60' : ''}`}
              >
                {/* Header / Summary row */}
                <div 
                  className="p-4 cursor-pointer flex gap-4"
                  onClick={() => setSelectedJob(isExpanded ? null : job.id)}
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-sm font-black text-[#D4AF37] leading-tight">
                      {fmt12(job.booking_time).split(" ")[0]}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">
                      {fmt12(job.booking_time).split(" ")[1]}
                    </p>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">
                      {job.customer_name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      {job.service_name}
                    </p>
                  </div>
                  
                  <div className="shrink-0 text-right">
                    <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      isCompleted 
                        ? "bg-blue-500/10 text-blue-400" 
                        : job.status === "confirmed" 
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-zinc-950/30 p-4 space-y-5">
                    
                    {/* Action Buttons (Large tap targets) */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {job.address && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col items-center justify-center p-3 bg-zinc-900 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] transition-colors col-span-2 sm:col-span-1"
                        >
                          <MapPin size={20} className="text-blue-400 mb-2" />
                          <span className="text-[11px] font-semibold text-zinc-300">Navigate</span>
                        </a>
                      )}
                      
                      {job.customer_phone && (
                        <>
                          <a 
                            href={`tel:${job.customer_phone}`}
                            className="flex flex-col items-center justify-center p-3 bg-zinc-900 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] transition-colors"
                          >
                            <Phone size={20} className="text-emerald-400 mb-2" />
                            <span className="text-[11px] font-semibold text-zinc-300">Call</span>
                          </a>
                          <a 
                            href={`sms:${job.customer_phone}`}
                            className="flex flex-col items-center justify-center p-3 bg-zinc-900 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] transition-colors"
                          >
                            <MessageSquare size={20} className="text-indigo-400 mb-2" />
                            <span className="text-[11px] font-semibold text-zinc-300">Text</span>
                          </a>
                        </>
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                          <Car size={12} /> Vehicle
                        </p>
                        <p className="text-sm text-zinc-300">{job.vehicle_desc}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                          <DollarSign size={12} /> Total Due
                        </p>
                        <p className="text-sm font-bold text-[#D4AF37]">${job.total_price?.toFixed(2) ?? "0.00"}</p>
                      </div>

                      {job.address && (
                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                            <MapPin size={12} /> Location
                          </p>
                          <p className="text-sm text-zinc-300">{job.address}</p>
                        </div>
                      )}

                      {job.notes && (
                        <div className="space-y-1 sm:col-span-2 bg-zinc-900 border border-white/[0.05] p-3 rounded-xl mt-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5 mb-2">
                            <Info size={12} /> Notes
                          </p>
                          <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                            {job.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mark as Complete Button */}
                    {!isCompleted && (
                      <button
                        onClick={() => handleComplete(job)}
                        disabled={completingId === job.id}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#c9a430] text-zinc-950 font-bold text-sm transition-all shadow-[0_0_20px_rgba(212,175,55,0.15)] disabled:opacity-50"
                      >
                        {completingId === job.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        Mark Job as Complete
                      </button>
                    )}
                    {isCompleted && (
                      <div className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm">
                        <CheckCircle2 size={18} />
                        Job Completed
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-black/80 px-4 py-3 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <CheckCircle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
            <p className="text-sm text-gray-300">{t.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}