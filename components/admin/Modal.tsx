"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, children, className, mobileBottomOffset }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string;
  /** Extra padding from bottom on mobile so the sheet sits higher (e.g. "pb-14") */
  mobileBottomOffset?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-end md:items-center justify-center",
        mobileBottomOffset ?? ""
      )}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          // Base
          "relative w-full max-w-lg bg-[#0C0C0C] border border-white/[0.07]",
          // Mobile: full-width bottom sheet
          "rounded-t-[24px] max-h-[94dvh]",
          // Desktop: centered card
          "md:rounded-2xl md:max-h-[88vh]",
          // Layout
          "flex flex-col shadow-2xl",
          // Animation
          "animate-in slide-in-from-bottom-6 duration-250 ease-out",
          className
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="shrink-0 flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Optional title header */}
        {title && (
          <header className="shrink-0 px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 active:scale-90 transition-all"
            >
              <X size={16} />
            </button>
          </header>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Top close pill when no title */}
          {!title && (
            <div className="hidden md:flex justify-end px-4 pt-3">
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 hover:bg-white/[0.09] transition-all"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="px-4 pb-6 pt-3 md:px-6 md:pb-8 md:pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
