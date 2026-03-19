"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllClients } from "@/app/actions/adminActions";
import { 
  Search, 
  MapPin, 
  Phone, 
  User, 
  Star, 
  Plus, 
  ChevronRight, 
  X, 
  Loader2, 
  AlertCircle, 
  Car,
  TrendingUp,
  History,
  Crown,
  Mail,
  Zap,
  Calendar,
  DollarSign,
  MessageSquare,
  Navigation,
  Save,
  Clock,
  CheckCircle2,
  Coins,
  ShieldCheck,
  UserPlus
  } from "lucide-react";
  import { cn } from "@/lib/utils";
  import { format, differenceInMonths } from "date-fns";
  import { updateCustomerProfile } from "@/app/actions/updateCustomerProfile";

  export default function ClientsTab() {
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);
  const [pointsInput, setPointsInput] = useState("");

  const { data: clients, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async () => await getAllClients()
  });

  useEffect(() => {
    if (selectedClient) {
      setEditedNotes(selectedClient.notes || "");
      setPointsInput(selectedClient.reward_points?.toString() || "0");
    }
  }, [selectedClient]);

  const handleUpdatePoints = async () => {
    if (!selectedClient) return;
    setIsAdjustingPoints(true);
    try {
      const res = await updateCustomerProfile(selectedClient.id, { reward_points: parseInt(pointsInput) });
      if (res.success) {
        showToast(`Points updated to ${pointsInput}`);
        refetch();
        setSelectedClient({ ...selectedClient, reward_points: parseInt(pointsInput) });
      } else {
        showToast("Failed to update points", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleSaveNotes = async () => {
    if (!selectedClient) return;
    setIsSavingNotes(true);
    try {
      const res = await updateCustomerProfile(selectedClient.id, { notes: editedNotes });
      if (res.success) {
        showToast("Notes updated successfully");
        refetch();
      } else {
        showToast("Failed to save notes", "error");
      }
    } catch (err) {
      showToast("An error occurred while saving notes", "error");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleWinBack = (client: any) => {
    const lastVehicle = client.vehicles?.[0] ? `${client.vehicles[0].year} ${client.vehicles[0].make}` : "your vehicle";
    const message = `Hey ${client.first_name}, it's been a few months since your last detail on ${lastVehicle}! Thinking about getting it back to showroom shine? Reply for 10% off your next booking! - Arise & Shine`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(message);
    showToast("Win-back message copied!");

    // Open SMS
    window.location.href = `sms:${client.phone}&body=${encodeURIComponent(message)}`;
  };

  const filtered = clients?.filter((c: any) => 
    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;

  return (
    <div className="flex h-full bg-[#050505] text-white selection:bg-amber-500/30">
      {/* Client List */}
      <div className={cn("flex-1 p-10 space-y-10 transition-all duration-500", selectedClient ? "pr-0 md:mr-[500px]" : "")}>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter">Client CRM</h1>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em] mt-2">Executive Database & LTV Tracker</p>
           </div>
           <div className="flex items-center gap-6 bg-white/[0.02] border border-white/[0.06] rounded-[32px] px-8 py-4 w-full md:w-[450px] focus-within:ring-1 ring-amber-500/50 transition-all shadow-2xl">
              <Search size={20} className="text-zinc-600" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or vehicle..." className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-zinc-700 text-white font-medium" />
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered?.map((client: any) => {
            const isVIP = client._ltv >= 500;
            const monthsSinceLast = client._lastService ? differenceInMonths(new Date(), new Date(client._lastService)) : null;
            const isAtRisk = monthsSinceLast !== null && monthsSinceLast >= 4; // Lowered to 4 months for proactive win-back

            return (
              <button key={client.id} onClick={() => setSelectedClient(client)} className="group p-8 rounded-[48px] border border-white/[0.06] bg-[#080808] hover:bg-white/[0.02] hover:border-amber-500/40 transition-all text-left relative overflow-hidden shadow-xl">
                {isVIP && <div className="absolute top-6 right-8 text-amber-500"><Crown size={20} fill="currentColor" /></div>}
                
                <div className="flex items-center gap-6 mb-8">
                   <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center font-black text-amber-500 text-2xl uppercase shadow-inner group-hover:scale-110 transition-transform">
                      {client.first_name?.[0]}{client.last_name?.[0]}
                   </div>
                   <div>
                      <p className="font-black text-2xl text-white group-hover:text-amber-500 transition-colors tracking-tighter">{client.first_name} {client.last_name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">{client.phone || "Unlisted"}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.04]">
                   <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Lifetime Value</p>
                      <p className="text-xl font-black text-white">${client._ltv.toFixed(0)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</p>
                      {isAtRisk ? (
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20 animate-pulse">At Risk</span>
                      ) : (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Active</span>
                      )}
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PLAYER CARD */}
      {selectedClient && (
        <aside className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-[#0A0A0A] border-l border-white/[0.1] shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-500">
           <div className="p-12 space-y-12 pb-24">
              <header className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">Client Node Secured</span>
                 </div>
                 <button onClick={() => setSelectedClient(null)} className="p-4 rounded-[20px] hover:bg-white/[0.05] text-zinc-500 hover:text-white transition-all"><X size={28} /></button>
              </header>

              {/* Identity Section */}
              <div className="text-center space-y-6">
                 <div className="w-32 h-32 rounded-[50px] bg-amber-500 mx-auto flex items-center justify-center text-5xl font-black text-black shadow-3xl shadow-amber-500/20">
                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                 </div>
                 <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{selectedClient.first_name} {selectedClient.last_name}</h2>
                    <div className="flex items-center justify-center gap-3 mt-3">
                       {selectedClient._ltv >= 500 && <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20"><Crown size={10} fill="currentColor" /> VIP</span>}
                       <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Joined {format(new Date(selectedClient.created_at), "yyyy")}</span>
                    </div>
                 </div>
              </div>

              {/* Quick Actions (Call/SMS/Map) */}
              <div className="grid grid-cols-3 gap-3">
                 <a href={`tel:${selectedClient.phone}`} className="flex flex-col items-center gap-2 p-6 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group">
                    <Phone size={20} className="text-emerald-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Call</span>
                 </a>
                 <a href={`sms:${selectedClient.phone}`} className="flex flex-col items-center gap-2 p-6 rounded-[32px] bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group">
                    <MessageSquare size={20} className="text-blue-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">Text</span>
                 </a>
                 <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedClient._lastAddress)}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-6 rounded-[32px] bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all group">
                    <Navigation size={20} className="text-amber-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Map</span>
                 </a>
              </div>

              {/* HUD GRID */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-8 rounded-[40px] border border-white/[0.04] bg-white/[0.01] space-y-2">
                    <span className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest"><DollarSign size={12} className="text-emerald-500" /> Revenue</span>
                    <span className="text-3xl font-black text-white tracking-tighter">${selectedClient._ltv.toFixed(0)}</span>
                 </div>
                 <div className="p-8 rounded-[40px] border border-white/[0.04] bg-white/[0.01] space-y-2">
                    <span className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest"><History size={12} className="text-blue-500" /> Frequency</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{selectedClient._bookingCount}x</span>
                 </div>
              </div>

              {/* Loyalty & Account Status */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-8 rounded-[40px] border border-amber-500/10 bg-amber-500/[0.02] space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-2 -top-2 opacity-[0.05] group-hover:rotate-12 transition-transform">
                       <Coins size={48} className="text-amber-500" />
                    </div>
                    <span className="flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">Loyalty Points</span>
                    <div className="flex items-center gap-2">
                       <span className="text-3xl font-black text-white tracking-tighter">{selectedClient.reward_points || 0}</span>
                       <span className="text-[10px] font-black text-zinc-500 uppercase">XP</span>
                    </div>
                 </div>
                 <div className="p-8 rounded-[40px] border border-white/[0.04] bg-white/[0.01] space-y-3">
                    <span className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Account Status</span>
                    {selectedClient.reward_points >= 100 ? (
                       <div className="flex items-center gap-2 text-emerald-500">
                          <ShieldCheck size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verified User</span>
                       </div>
                    ) : (
                       <div className="flex items-center gap-2 text-zinc-500">
                          <UserPlus size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Lead Profile</span>
                       </div>
                    )}
                    <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-tight">
                       {selectedClient.reward_points >= 100 ? "Has Signed Up Online" : "Admin-Created Profile"}
                    </p>
                 </div>
              </div>

              {/* Point Adjustment (New) */}
              <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.04] space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Point Override</h3>
                    <button 
                      onClick={handleUpdatePoints}
                      disabled={isAdjustingPoints || pointsInput === selectedClient.reward_points?.toString()}
                      className="text-[9px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 px-3 py-1 rounded-full transition-all disabled:opacity-30"
                    >
                      {isAdjustingPoints ? <Loader2 size={12} className="animate-spin" /> : "Apply Change"}
                    </button>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex-1 bg-black/40 rounded-2xl px-6 py-3 border border-white/[0.06] flex items-center gap-3">
                       <Coins size={14} className="text-zinc-500" />
                       <input 
                          type="number" 
                          value={pointsInput}
                          onChange={(e) => setPointsInput(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-sm font-black text-white w-full"
                       />
                    </div>
                    <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Total XP</div>
                 </div>
              </div>

              {/* Internal Notes (The "Intelligence" field) */}
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Client Intelligence</h3>
                    <button 
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes || editedNotes === selectedClient.notes}
                      className="text-[9px] font-black uppercase tracking-widest text-amber-500 disabled:opacity-30 flex items-center gap-2 hover:bg-amber-500/10 px-3 py-1 rounded-full transition-all"
                    >
                      {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                 </div>
                 <textarea 
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add personal notes, gate codes, or preferences..."
                    className="w-full h-32 bg-white/[0.02] border border-white/[0.04] rounded-[32px] p-6 text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-all resize-none font-medium"
                 />
              </div>

              {/* Win-Back (Conditional) */}
              {differenceInMonths(new Date(), new Date(selectedClient._lastService || 0)) >= 4 && (
                <div className="p-8 rounded-[40px] bg-rose-500/5 border border-rose-500/10 space-y-4 border-dashed">
                   <div className="flex items-center gap-3">
                      <Zap size={18} className="text-rose-500" fill="currentColor" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Retention Opportunity</p>
                   </div>
                   <p className="text-sm text-zinc-400 leading-relaxed">It&apos;s been over 4 months since their last visit. Send a win-back offer to secure another booking.</p>
                   <button 
                    onClick={() => handleWinBack(selectedClient)}
                    className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20"
                   >
                     Deploy Win-Back SMS
                   </button>
                </div>
              )}

              {/* Service History Timeline */}
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700 px-2">Deployment History</h3>
                 <div className="space-y-4">
                    {selectedClient.bookings?.sort((a: any, b: any) => b.booking_date.localeCompare(a.booking_date)).slice(0, 5).map((b: any) => (
                       <div key={b.id} className="flex items-start gap-4 p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.04]">
                          <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-500 shrink-0">
                             <Clock size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                                <p className="font-bold text-white tracking-tight">{b.services?.name || "Service"}</p>
                                <p className="text-xs font-black text-amber-500">${b.total_price}</p>
                             </div>
                             <p className="text-[10px] text-zinc-600 font-mono uppercase mt-1">
                                {(() => {
                                  const [y, m, d] = b.display_date.split("-");
                                  return `${m}/${d}/${y}`;
                                })()}
                             </p>
                          </div>
                       </div>
                    ))}
                    {selectedClient.bookings?.length === 0 && (
                      <p className="text-center text-zinc-700 text-xs py-8 italic">No previous deployments found</p>
                    )}
                 </div>
              </div>

              {/* Garage */}
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700 px-2">Garage Assets</h3>
                 <div className="space-y-3">
                    {selectedClient.vehicles?.map((v: any) => (
                       <div key={v.id} className="p-8 rounded-[40px] bg-[#080808] border border-white/[0.04] flex items-center justify-between shadow-2xl">
                          <div className="space-y-1">
                             <p className="font-black text-xl text-white tracking-tighter leading-none">{v.year} {v.make} {v.model}</p>
                             <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest bg-white/[0.03] px-2 py-1 rounded-md inline-block">{v.size} Platform</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-700"><Car size={24} /></div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* CTAs */}
              <div className="fixed bottom-0 right-0 w-full md:w-[500px] p-6 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/[0.1] z-[60]">
                 <button className="w-full flex items-center justify-center gap-3 p-6 rounded-[32px] bg-amber-500 hover:bg-amber-400 text-black transition-all group shadow-2xl shadow-amber-500/20">
                    <Zap size={24} className="group-hover:scale-110 transition-transform" fill="currentColor" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Initiate New Order</span>
                 </button>
              </div>
           </div>
        </aside>
      )}

      {/* CUSTOM TOAST */}
      {toast && (
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300",
          toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
