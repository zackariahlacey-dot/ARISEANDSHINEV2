"use client";
import { cn } from "@/lib/utils";

const S: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500 animate-pulse", label: "Confirmed" },
  completed: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500", label: "Completed" },
  cancelled: { bg: "bg-zinc-500/10 border-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500", label: "Cancelled" },
  "no-show": { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500", dot: "bg-rose-500", label: "No-Show" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = S[status] || S.confirmed;
  return (
    <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border inline-flex items-center gap-1", s.bg, s.text, className)}>
      <span className={cn("w-1 h-1 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
