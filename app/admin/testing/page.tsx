"use client";

import { useState, useEffect } from "react";
import { 
  FlaskConical, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  Bell, 
  CreditCard, 
  RefreshCw,
  Zap,
  TestTube
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerTestEmail, getDiagnostics } from "@/app/actions/adminActions";

const EMAIL_TEMPLATES = [
  { id: "confirmation", label: "Booking Confirmation", icon: Mail, description: "Sent immediately after a successful booking." },
  { id: "on-my-way", label: "On My Way", icon: Send, description: "Sent when you're heading to the client's location." },
  { id: "completed", label: "Job Completed / Receipt", icon: CheckCircle2, description: "Sent after finishing the detail with receipt & points." },
  { id: "review", label: "Review Request", icon: Zap, description: "Sent 24 hours after completion to get that 5-star review." },
  { id: "reschedule", label: "Reschedule Notice", icon: RefreshCw, description: "Sent when an appointment time is changed." },
  { id: "cancel", label: "Cancellation Notice", icon: AlertCircle, description: "Sent if an appointment is cancelled." },
];

export default function TestingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    const data = await getDiagnostics();
    setDiagnostics(data);
    if (data.env.adminEmail) setTestEmail(data.env.adminEmail);
  };

  const handleTriggerEmail = async (type: string) => {
    setLoading(type);
    setResult(null);
    try {
      const res = await triggerTestEmail(type, testEmail);
      setResult({
        id: type,
        success: res.success,
        message: res.success ? "Test email dispatched successfully!" : res.error || "Failed to send."
      });
    } catch (err) {
      setResult({ id: type, success: false, message: "Critical error occurred." });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-8 space-y-12 max-w-5xl mx-auto pb-20">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-white/[0.06] pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <FlaskConical size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Operations Lab</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">Test Suite & Communications Control</p>
          </div>
        </div>
        
        {diagnostics && (
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">System Heartbeat</p>
            <div className="flex items-center gap-2 justify-end">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-xs font-mono text-zinc-400">Stable Ops</span>
            </div>
          </div>
        )}
      </header>

      {/* SYSTEM DIAGNOSTICS */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-zinc-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">System Integrity</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {diagnostics && Object.entries(diagnostics.env).map(([key, value]) => {
            if (key === 'adminEmail') return null;
            return (
              <div key={key} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{key.replace('Key', '').replace('Webhook', ' Webhook')}</p>
                   <p className="text-xs font-bold text-white">{value ? "CONNECTED" : "DISCONNECTED"}</p>
                </div>
                <div className={cn("w-2 h-2 rounded-full", value ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500")} />
              </div>
            );
          })}
        </div>
      </section>

      {/* EMAIL TESTING LAB */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <TestTube size={18} className="text-zinc-500" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">Email Template Lab</h2>
           </div>
           
           <div className="flex items-center gap-3">
              <label className="text-[10px] font-black text-zinc-600 uppercase">Target Email:</label>
              <input 
                type="email" 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Where to send tests?"
                className="bg-zinc-900 border border-white/[0.1] rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:ring-1 ring-amber-500/50 w-64"
              />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EMAIL_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} className="group bg-[#080808] border border-white/[0.06] hover:border-amber-500/30 rounded-3xl p-6 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-zinc-400 group-hover:text-amber-500 transition-colors border border-white/[0.06]">
                    <tmpl.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{tmpl.label}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{tmpl.description}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleTriggerEmail(tmpl.id)}
                  disabled={loading === tmpl.id}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    loading === tmpl.id 
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                      : "bg-amber-500 text-black hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/10"
                  )}
                >
                  {loading === tmpl.id ? "Firing..." : "Trigger"}
                </button>
              </div>

              {result?.id === tmpl.id && (
                <div className={cn(
                  "p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
                  result.success ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                )}>
                  {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span className="text-[10px] font-bold uppercase">{result.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SOLO TIPS / NOTES */}
      <section className="bg-amber-500/5 border border-amber-500/10 rounded-[32px] p-8 space-y-4">
         <div className="flex items-center gap-3">
            <Zap size={20} className="text-amber-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-500">Solo Detailing Pro-Tip</h3>
         </div>
         <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            As a solo operator, your <strong className="text-white">Professionalism</strong> is your competitive edge. 
            Use these tests to ensure every customer touchpoint looks premium. When you're "On My Way", 
            trigger that email—it sets the tone before you even pull into the driveway.
         </p>
      </section>
    </div>
  );
}
