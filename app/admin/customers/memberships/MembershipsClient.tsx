"use client";

import { useState } from "react";
import { 
  Crown, 
  Search, 
  X, 
  Calendar, 
  CreditCard, 
  Phone, 
  Mail, 
  ChevronRight,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export type MembershipRow = {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  email: string;
  planName: string;
  price: number;
  nextBilling: string;
  status: string;
};

export function MembershipsClient({ initialMemberships }: { initialMemberships: MembershipRow[] }) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [search, setSearch] = useState("");

  const filtered = memberships.filter(m => 
    m.customerName.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.planName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Crown className="text-[#D4AF37]" /> Membership Club
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Manage recurring maintenance plan customers</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/30 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-zinc-900/40 border border-white/[0.06] rounded-3xl">
            <p className="text-zinc-500 font-medium">No active memberships found.</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="bg-zinc-900/60 border border-white/[0.06] rounded-[24px] p-5 flex flex-col gap-5 relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Crown size={40} className="text-[#D4AF37]" />
              </div>

              <div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-base font-black text-white">{m.customerName}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                    {m.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">{m.planName}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500">
                    <CreditCard size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-600 leading-none mb-1">Billing</p>
                    <p className="text-xs font-bold text-zinc-300">${m.price}/mo &bull; Next: {m.nextBilling}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500">
                    <Phone size={14} />
                  </div>
                  <a href={`tel:${m.phone}`} className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">{m.phone}</a>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-2">
                <Link 
                  href={`/admin/customers/${m.userId}`}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/5 text-center text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Profile
                </Link>
                <button 
                  className="flex-1 py-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-center text-xs font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-all"
                >
                  Manage
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
