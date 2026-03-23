"use client";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, label, value, sub, color = "text-amber-500", bg = "bg-amber-500/10", className }: {
  icon: LucideIcon; label: string; value: string | number; sub?: string; color?: string; bg?: string; className?: string;
}) {
  return (
    <div className={cn("p-4 rounded-2xl border border-white/[0.04] bg-[#0A0A0A] relative overflow-hidden group", className)}>
      <div className="absolute top-0 right-0 p-5 opacity-[0.02]"><Icon size={48} /></div>
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3", bg)}>
        <Icon className={color} size={16} />
      </div>
      <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">{label}</p>
      <p className="text-xl font-black tracking-tight text-white leading-none">{value}</p>
      {sub && <p className="text-[8px] font-bold text-zinc-600 mt-1.5 uppercase tracking-widest">{sub}</p>}
    </div>
  );
}
