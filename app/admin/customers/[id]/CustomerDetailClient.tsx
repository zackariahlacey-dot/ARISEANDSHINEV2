"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Gift, Phone, Mail, Car, Calendar, DollarSign, Clock, FileText, Save, Loader2, CheckCircle2 } from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/updateCustomerProfile";

export type CustomerDetailData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  reward_points: number | null;
  notes: string | null;
  lifetimeValue: number;
  bookingCount: number;
  vehicles: any[];
  bookings: any[];
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

export function CustomerDetailClient({ customer: initialCustomer }: { customer: CustomerDetailData }) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [profileNotes, setProfileNotes] = useState(customer.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Unknown Customer";

  const handleSaveNotes = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const res = await updateCustomerProfile(customer.id, { notes: profileNotes });
    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert("Failed to save notes: " + res.error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Nav */}
      <Link 
        href="/admin/customers" 
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-white transition-colors"
      >
        <ChevronLeft size={14} /> Back to Customers
      </Link>

      {/* Header Profile Card */}
      <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-[#a8882a]"></div>
        
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-xl font-bold text-zinc-300">
              {(customer.first_name?.[0] || customer.phone?.[0] || "?").toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
                  <Phone size={12} /> {customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-blue-400 transition-colors">
                  <Mail size={12} /> {customer.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* High level stats */}
        <div className="flex gap-4 md:gap-8 bg-zinc-950/40 p-4 rounded-xl border border-white/[0.04]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">Lifetime</p>
            <p className="text-xl font-black text-white tabular-nums">${customer.lifetimeValue.toFixed(2)}</p>
          </div>
          <div className="w-px bg-white/[0.06]"></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">Points</p>
            <div className="flex items-center gap-1.5">
              <Gift size={14} className="text-amber-500" />
              <p className="text-xl font-black text-amber-400 tabular-nums">{(customer.reward_points ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Vehicles & Persistent Notes) */}
        <div className="space-y-6">
          {/* Persistent Customer Notes (NEW) */}
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#D4AF37]" />
                <h2 className="text-sm font-bold text-white">Customer Notes</h2>
              </div>
              <button 
                onClick={handleSaveNotes}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-all ${
                  saveSuccess ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
              </button>
            </div>
            <textarea
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              placeholder="Add persistent details (e.g. Gate codes, pet hair warnings, preferences)..."
              className="w-full bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-xs text-zinc-300 min-h-[120px] focus:outline-none focus:border-[#D4AF37]/30 transition-all resize-none leading-relaxed"
            />
            <p className="text-[10px] text-zinc-600 italic">These notes stay on the customer's profile forever.</p>
          </div>

          {/* Vehicles Card */}
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 mb-3">
              <Car size={16} className="text-zinc-400" />
              <h2 className="text-sm font-bold text-white">Garage ({customer.vehicles.length})</h2>
            </div>
            {customer.vehicles.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No vehicles on file.</p>
            ) : (
              <ul className="space-y-3">
                {customer.vehicles.map(v => (
                  <li key={v.id} className="bg-zinc-950/40 rounded-xl p-3 border border-white/[0.03]">
                    <p className="text-sm font-bold text-zinc-200 capitalize">{v.year} {v.make} {v.model}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{v.size}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column (Booking History) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-zinc-400" />
                <h2 className="text-sm font-bold text-white">Booking History ({customer.bookingCount})</h2>
              </div>
            </div>

            {customer.bookings.length === 0 ? (
              <p className="text-sm text-zinc-500 p-8 text-center">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {customer.bookings.map(b => (
                  <div key={b.id} className="p-5 hover:bg-white/[0.015] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-200">{b.service_name}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Calendar size={12}/> {b.booking_date}</span>
                          <span className="flex items-center gap-1"><Clock size={12}/> {fmt12(b.booking_time)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#D4AF37]">${(b.total_price ?? 0).toFixed(2)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          b.status === "completed" ? "bg-blue-500/10 text-blue-400" :
                          b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                          b.status === "cancelled" ? "bg-zinc-500/10 text-zinc-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                    {b.notes && (
                      <p className="text-[11px] text-zinc-400 mt-3 bg-zinc-950/40 p-2.5 rounded-lg border border-white/[0.03]">
                        <span className="font-semibold text-zinc-300">Booking Notes:</span> {b.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
