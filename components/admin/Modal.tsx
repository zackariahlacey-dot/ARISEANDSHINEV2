"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, children, className }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-lg bg-[#0A0A0A] border border-white/[0.06] rounded-t-[28px] md:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-2 duration-300",
          className
        )}
      >
        {title && (
          <header className="shrink-0 p-4 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-zinc-500"><X size={18} /></button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
