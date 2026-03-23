"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import {
  useOperatingHours,
  useUpdateOperatingHours,
  useBlockedDates,
  useToggleBlockedDate,
} from "@/hooks/use-admin-data";
import { sendTestEmailAction, getDiagnostics } from "@/app/actions/adminActions";
import { useToast } from "@/components/admin/Toast";
import { Clock, CalendarOff, Mail, Server, Activity, ArrowLeft, Send, Check, AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── SERVER DATA ──
  const { data: opHours, isLoading: ohLoading } = useOperatingHours();
  const { data: blockedDates, isLoading: bdLoading } = useBlockedDates();
  
  const { data: diagnostics, isLoading: dLoading } = useQuery({
    queryKey: ["admin", "diagnostics"],
    queryFn: async () => await getDiagnostics()
  });

  const updateHours = useUpdateOperatingHours();
  const toggleBlock = useToggleBlockedDate();

  // ── LOCAL STATE ──
  const [hoursState, setHoursState] = useState<any[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [newBlockReason, setNewBlockReason] = useState("");

  useEffect(() => {
    if (opHours) {
      setHoursState(DAYS.map((_, i) => {
        const found = opHours.find((h: any) => h.day_of_week === i);
        return found || { day_of_week: i, is_open: i > 0 && i < 6, start_time: "09:00", end_time: "17:00" };
      }));
    }
  }, [opHours]);

  // ── ACTIONS ──
  const handleSaveHours = async () => {
    try {
      await updateHours.mutateAsync(hoursState);
      toast("Operating hours saved");
    } catch {
      toast("Error saving hours", "error");
    }
  };

  const handleAddBlock = async () => {
    if (!newBlockDate) return;
    try {
      await toggleBlock.mutateAsync({ date: newBlockDate, isBlocked: true, reason: newBlockReason });
      toast("Date blocked");
      setNewBlockReason("");
    } catch { toast("Error", "error"); }
  };

  const handleRemoveBlock = async (date: string) => {
    try {
      await toggleBlock.mutateAsync({ date, isBlocked: false });
      toast("Block removed");
    } catch { toast("Error", "error"); }
  };

  const handleSendTest = async () => {
    if (!testEmail) { toast("Email required", "error"); return; }
    setSendingTest(true);
    try {
      const res = await sendTestEmailAction(testEmail);
      if (res.success) toast("Test email sent!");
      else toast(res.error || "Failed", "error");
    } catch { toast("Server error", "error"); }
    finally { setSendingTest(false); }
  };

  if (ohLoading || bdLoading || dLoading) return <div className="h-[100dvh] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>;

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03] flex items-center gap-4 bg-[#050505]/95 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/admin/schedule" className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.1] transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Settings</h1>
          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Config & Diagnostics</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-8 max-w-4xl mx-auto w-full">
        
        {/* OPERATING HOURS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock size={16} />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Regular Hours</h2>
          </div>
          
          <div className="p-2 bg-[#0A0A0A] border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
            {hoursState.map((h, i) => (
              <div key={i} className={cn("p-3 flex items-center gap-3 transition-colors", !h.is_open && "opacity-50 grayscale")}>
                <div className="w-10">
                  <button onClick={() => {
                    const next = [...hoursState];
                    next[i].is_open = !next[i].is_open;
                    setHoursState(next);
                  }} className={cn("px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all", h.is_open ? "bg-amber-500/10 text-amber-500" : "bg-white/[0.05] text-zinc-500")}>
                    {DAYS[i].substring(0, 3)}
                  </button>
                </div>
                {h.is_open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={h.start_time} onChange={e => {
                      const next = [...hoursState]; next[i].start_time = e.target.value; setHoursState(next);
                    }} className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-2 py-1.5 text-xs text-center focus:ring-1 ring-amber-500/50 outline-none flex-1 truncate font-mono" />
                    <span className="text-zinc-600 text-xs">to</span>
                    <input type="time" value={h.end_time} onChange={e => {
                      const next = [...hoursState]; next[i].end_time = e.target.value; setHoursState(next);
                    }} className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-2 py-1.5 text-xs text-center focus:ring-1 ring-amber-500/50 outline-none flex-1 truncate font-mono" />
                  </div>
                ) : (
                  <div className="flex-1 py-1.5 px-2 bg-white/[0.01] rounded-lg border border-dashed border-white/[0.04] text-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Closed</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleSaveHours} disabled={updateHours.isPending}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50">
            {updateHours.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save Hours"}
          </button>
        </section>

        {/* BLOCKED DATES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <CalendarOff size={16} />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Exceptions & Blocked Dates</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <input type="date" value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:ring-1 ring-rose-500/50 outline-none flex-1" />
            <input type="text" value={newBlockReason} onChange={e => setNewBlockReason(e.target.value)} placeholder="Reason (e.g. Vacation, Holiday)"
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:ring-1 ring-rose-500/50 outline-none flex-[2]" />
            <button onClick={handleAddBlock} disabled={toggleBlock.isPending || !newBlockDate}
              className="px-6 py-3 rounded-xl bg-rose-500/10 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all">
              Block
            </button>
          </div>

          <div className="space-y-2">
            {blockedDates?.filter((b: any) => new Date(b.blocked_date).getTime() >= new Date().setHours(0,0,0,0)).map((b: any) => (
              <div key={b.id} className="p-3 rounded-xl bg-[#0A0A0A] border border-rose-500/20 flex items-center justify-between">
                <div>
                  <p className="font-black text-rose-500 text-sm">{format(new Date(b.blocked_date + "T12:00:00"), "EEEE, MMM do, yyyy")}</p>
                  {b.reason && <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{b.reason}</p>}
                </div>
                <button onClick={() => handleRemoveBlock(b.blocked_date)} className="p-2 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-500 rounded-lg transition-colors text-[9px] font-black uppercase tracking-widest">
                  Unblock
                </button>
              </div>
            ))}
            {(!blockedDates || blockedDates.filter((b: any) => new Date(b.blocked_date).getTime() >= new Date().setHours(0,0,0,0)).length === 0) && (
              <div className="p-4 text-center border border-dashed border-white/[0.06] rounded-xl">
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-600">No upcoming blocks</p>
              </div>
            )}
          </div>
        </section>

        {/* EMAIL TESTING */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Mail size={16} />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Resend Mail Tester</h2>
          </div>
          
          <div className="p-4 bg-[#0A0A0A] border border-white/[0.04] rounded-2xl flex flex-col md:flex-row gap-3 items-center">
            <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Email to test..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm focus:ring-1 ring-amber-500/50 outline-none" />
            <button onClick={handleSendTest} disabled={sendingTest || !testEmail}
              className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shrink-0">
              {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Fire Test
            </button>
          </div>
        </section>

        {/* DIAGNOSTICS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Activity size={16} />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Connectors</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <DiagCard label="Supabase Auth" active={diagnostics?.env.supabaseUrl && diagnostics?.env.supabaseKey} />
            <DiagCard label="Resend Mail API" active={diagnostics?.env.resendKey} />
            <DiagCard label="Stripe API" active={diagnostics?.env.stripeKey} />
            <DiagCard label="Stripe Webhook" active={diagnostics?.env.stripeWebhook} />
            <div className="md:col-span-2 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Admin Email</span>
              <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">{diagnostics?.env.adminEmail}</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function DiagCard({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="p-4 bg-[#0A0A0A] border border-white/[0.04] rounded-2xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Server size={14} className="text-zinc-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{label}</span>
      </div>
      {active ? (
        <div className="flex items-center gap-1.5 text-emerald-500">
          <CheckCircle2 size={14} />
          <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-rose-500">
          <AlertTriangle size={14} />
          <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Missing</span>
        </div>
      )}
    </div>
  );
}
