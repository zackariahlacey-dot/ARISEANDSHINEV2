"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllClients, updateCustomerProfile } from "@/app/actions/adminActions";
import { sendStripePaymentLink } from "@/app/actions/sendStripePaymentLink";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/admin/Modal";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Users, Search, Filter, Phone, MessageSquare, Mail, Navigation,
  Car, Calendar, Star, Crown, AlertTriangle, ShieldCheck, CreditCard,
  History, Settings, PenTool, Save, CheckCircle2, ChevronRight, Loader2, Link
} from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";

type SortOptions = "az" | "ltv" | "recent";

export default function ClientsPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async () => await getAllClients(),
  });

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOptions>("recent");
  const [activeClient, setActiveClient] = useState<any>(null);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let result = clients.filter((c: any) => {
      const q = search.toLowerCase();
      const nameMatch = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(q);
      const phoneMatch = c.phone?.includes(q);
      const vehicleMatch = c.vehicles?.some((v: any) => `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q));
      return nameMatch || phoneMatch || vehicleMatch;
    });

    return result.sort((a: any, b: any) => {
      if (sort === "az") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      if (sort === "ltv") return (b._ltv || 0) - (a._ltv || 0);
      if (sort === "recent") {
        if (!a._lastService) return 1;
        if (!b._lastService) return -1;
        return new Date(b._lastService).getTime() - new Date(a._lastService).getTime();
      }
      return 0;
    });
  }, [clients, search, sort]);

  if (isLoading) {
    return <div className="h-[80dvh] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={28} /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* ── HEADER & SEARCH ── */}
      <div className="shrink-0 p-3 md:p-6 border-b border-white/[0.03] space-y-4">
        <header>
          <h1 className="text-xl font-black uppercase tracking-tighter">Client CRM</h1>
          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">{clients?.length || 0} Total Entries</p>
        </header>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5 focus-within:ring-1 ring-amber-500/50 transition-all">
            <Search size={14} className="text-zinc-600 shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search names, phones, or vehicles..."
              className="bg-transparent border-none text-xs w-full placeholder:text-zinc-700 text-white outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-1 shrink-0 p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            {(["recent", "ltv", "az"] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  sort === s ? "bg-amber-500 text-black shadow-md" : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                )}>
                {s === "recent" ? "New" : s === "ltv" ? "VIP" : "A-Z"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIST ── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-2 pb-24 md:pb-6">
        {filteredClients.map((client: any) => {
          const ltv = client._ltv || 0;
          const isVip = ltv >= 500;
          const monthsSinceLast = client._lastService ? differenceInMonths(new Date(), new Date(client._lastService)) : 0;
          const isAtRisk = monthsSinceLast >= 4;

          return (
            <button key={client.id} onClick={() => setActiveClient(client)}
              className="w-full relative overflow-hidden p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.04] hover:border-amber-500/30 transition-all flex items-center gap-4 text-left group active:scale-[0.98]">
              
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-[14px] bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-sm font-black text-amber-500">
                  {(client.first_name?.[0] || "?")}{(client.last_name?.[0] || "")}
                </div>
                {isVip && <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-[#0A0A0A]"><Crown size={10} className="text-black" /></div>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm truncate">{client.first_name} {client.last_name}</p>
                  {isAtRisk && <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase tracking-wider">At Risk</span>}
                </div>
                {client.phone && <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{client.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}</p>}
                <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-2">
                  <span className="flex items-center gap-1"><CreditCard size={10} />${ltv.toFixed(0)}</span>
                  <span className="flex items-center gap-1"><History size={10} />{client._bookingCount} jobs</span>
                </div>
              </div>

              <ChevronRight size={16} className="text-zinc-800 group-hover:text-amber-500 shrink-0 transition-colors" />
            </button>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="py-20 text-center space-y-2 text-zinc-600">
            <Users size={32} className="mx-auto text-zinc-800" />
            <p className="text-[10px] font-black uppercase tracking-widest">No clients found</p>
          </div>
        )}
      </div>

      {/* ── CLIENT PROFILE MODAL ── */}
      <Modal open={!!activeClient} onClose={() => setActiveClient(null)} className="h-[92dvh] md:max-h-[85dvh] max-w-2xl flex flex-col">
        {activeClient && <ClientProfile client={activeClient} />}
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CLIENT PROFILE COMPONENT
   ═══════════════════════════════════════════════════════ */
function ClientProfile({ client }: { client: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [points, setPoints] = useState(client.reward_points?.toString() || "0");
  const [notes, setNotes] = useState(client.notes || "");
  const [saving, setSaving] = useState(false);
  const [sendingPaymentLinkId, setSendingPaymentLinkId] = useState<string | null>(null);

  const handleSendPaymentLink = async (b: any) => {
    setSendingPaymentLinkId(b.id);
    try {
      const vehicle = client.vehicles?.[0];
      const result = await sendStripePaymentLink(b.id, {
        serviceName: b.services?.name ?? "Detail Service",
        totalPrice: Number(b.total_price),
        vehicleYear: vehicle?.year ?? "",
        vehicleMake: vehicle?.make ?? "",
        vehicleModel: vehicle?.model ?? "",
        vehicleSize: vehicle?.size ?? "",
        bookingDate: b.booking_date,
        bookingTime: b.booking_time?.substring(0, 5) ?? "",
        customerEmail: client.email ?? "",
        customerName: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
      });
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        await navigator.clipboard.writeText(result.url);
        toast("Payment link copied!");
      }
    } catch {
      toast("Failed to create payment link", "error");
    } finally {
      setSendingPaymentLinkId(null);
    }
  };

  // Mutations
  const updatePoints = useMutation({
    mutationFn: async () => await updateCustomerProfile(client.id, { reward_points: parseInt(points) || 0 }),
    onSuccess: () => { toast("Points updated"); queryClient.invalidateQueries({ queryKey: ["admin", "clients"] }); }
  });

  const updateNotes = useMutation({
    mutationFn: async () => await updateCustomerProfile(client.id, { notes }),
    onSuccess: () => { toast("Notes saved"); queryClient.invalidateQueries({ queryKey: ["admin", "clients"] }); }
  });

  const ltv = client._ltv || 0;
  const isVip = ltv >= 500;
  const addr = client._lastAddress;

  const winBackText = `Hi ${client.first_name}, it's been a while since we detailed your vehicle! We'd love to see you again. Get 10% off your next detail by booking here: https://ariseandshinevt.com`;
  const copyWinBack = () => { navigator.clipboard.writeText(winBackText); toast("SMS Copied!"); };

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white">
      {/* PROFILE HEADER */}
      <div className="shrink-0 relative overflow-hidden pt-8 pb-4 px-4 text-center border-b border-white/[0.04]">
        {/* BG Blurs */}
        <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[80px] opacity-20 pointer-events-none", isVip ? "bg-amber-500" : "bg-blue-500")} />
        
        <div className="relative z-10">
          <div className={cn("w-20 h-20 mx-auto rounded-full bg-zinc-900 border-4 flex items-center justify-center text-2xl font-black shadow-2xl relative", isVip ? "border-amber-500/20 text-amber-500" : "border-white/[0.04] text-white")}>
            {(client.first_name?.[0] || "?")}{(client.last_name?.[0] || "")}
            {isVip && <div className="absolute -bottom-2 right-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center border-4 border-[#080808]"><Crown size={14} className="text-black" /></div>}
          </div>
          <h2 className="text-xl font-black mt-3">{client.first_name} {client.last_name}</h2>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">
            {client.phone?.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3") || "No phone"} • {client.email || "No email"}
          </p>
        </div>

        {/* Action Row */}
        <div className="flex justify-center gap-2 mt-6">
          {client.phone && <a href={`tel:${client.phone}`} className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-blue-500 hover:scale-110 transition-all"><Phone size={18} /></a>}
          {client.phone && <a href={`sms:${client.phone}`} className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-emerald-500 hover:scale-110 transition-all"><MessageSquare size={18} /></a>}
          <a href={`/admin/email?client=${client.id}`} className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-amber-500 hover:scale-110 transition-all"><Mail size={18} /></a>
          {addr && addr !== "No address recorded" && <a href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`} target="_blank" className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-violet-500 hover:scale-110 transition-all"><Navigation size={18} /></a>}
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-6 px-6 border-b border-white/[0.04]">
        {(["overview", "history"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn("py-4 text-[10px] font-black uppercase tracking-widest relative transition-colors", activeTab === t ? "text-amber-500" : "text-zinc-500")}>
            {t}
            {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">LTV Revenue</p>
                <p className="text-xl font-black mt-1 text-emerald-500">${ltv.toFixed(0)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Total Bookings</p>
                <p className="text-xl font-black mt-1">{client._bookingCount}</p>
              </div>
            </div>

            {/* Loyalty Points */}
            <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Star size={16} fill="currentColor" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Loyalty Points</h3>
              </div>
              <div className="flex gap-2">
                <input type="number" value={points} onChange={e => setPoints(e.target.value)}
                  className="flex-1 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 text-sm font-mono text-white focus:ring-1 ring-amber-500/50 outline-none" />
                <button onClick={() => updatePoints.mutate()} disabled={updatePoints.isPending}
                  className="px-6 py-3 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                  {updatePoints.isPending ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                </button>
              </div>
            </div>

            {/* Win-Back */}
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-rose-500 flex items-center gap-2"><AlertTriangle size={14} /> SMS Win-Back</h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed font-mono p-3 bg-black/50 rounded-lg">{winBackText}</p>
              <button onClick={copyWinBack} className="w-full py-3 rounded-xl border border-rose-500/30 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 active:scale-95 transition-all">Copy to Clipboard</button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Client Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                className="w-full bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 text-sm text-zinc-300 focus:ring-1 ring-amber-500/50 outline-none resize-none" placeholder="Gate codes, preferences, pets..." />
              <button onClick={() => updateNotes.mutate()} disabled={updateNotes.isPending}
                className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                {updateNotes.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Notes"}
              </button>
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Vehicles Box */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3 ml-1">Garage</h3>
              {client.vehicles?.length > 0 ? (
                <div className="space-y-2">
                  {client.vehicles.map((v: any) => (
                    <div key={v.id} className="p-3 rounded-xl bg-black border border-white/[0.03] flex items-center gap-3">
                      <Car size={16} className="text-zinc-500" />
                      <span className="text-sm font-bold uppercase tracking-wider">{v.year} {v.make} {v.model} ({v.size})</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[10px] text-zinc-600">No vehicles on file</p>}
            </div>

            {/* Booking Listing */}
            <div className="space-y-2">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2 ml-1">Service History</h3>
              {client.bookings?.map((b: any) => (
                <div key={b.id} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-500">
                      {format(new Date(b.booking_date + "T12:00:00"), "MMM d, yyyy")} • {b.booking_time.substring(0,5)}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 mt-2">
                    <span className="text-xs font-bold text-zinc-300">{b.services?.name || "Service"}</span>
                    <span className="text-xs font-black text-emerald-500">${Number(b.total_price).toFixed(0)}</span>
                  </div>
                  <button
                    onClick={() => handleSendPaymentLink(b)}
                    disabled={sendingPaymentLinkId === b.id}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {sendingPaymentLinkId === b.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Link size={12} />
                    )}
                    Send Payment Link
                  </button>
                </div>
              ))}
              {(!client.bookings || client.bookings.length === 0) && (
                <div className="p-8 text-center border border-dashed border-white/[0.06] rounded-2xl">
                  <Calendar size={24} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600">No past bookings</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
