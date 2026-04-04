"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, children, className, mobileBottomOffset, fullScreen }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string;
  /** Extra padding from bottom on mobile so the sheet sits higher (e.g. "pb-14") */
  mobileBottomOffset?: string;
  /** Use entire viewport — best for dense forms (e.g. admin client + booking) */
  fullScreen?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex justify-center",
        fullScreen
          ? "items-stretch p-0"
          : cn("items-end md:items-center", mobileBottomOffset ?? "")
      )}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          "relative flex flex-col shadow-2xl pointer-events-auto",
          fullScreen
            ? "z-[1] flex-1 min-h-0 h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 bg-[#0C0C0C] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
            : cn(
                "w-full max-w-lg bg-[#0C0C0C] border border-white/[0.07]",
                "rounded-t-[24px] max-h-[94dvh]",
                "md:rounded-2xl md:max-h-[88vh]",
                "animate-in slide-in-from-bottom-6 duration-250 ease-out"
              ),
          className
        )}
      >
        {/* Drag handle (mobile only) — hidden in fullscreen */}
        {!fullScreen && (
        <div className="shrink-0 flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        )}

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
        <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain", fullScreen && "flex flex-col")}>
          {/* Top close pill when no title */}
          {!title && (
            <div className={cn("flex justify-end px-4 pt-2 shrink-0", fullScreen ? "flex" : "hidden md:flex")}>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.08] text-zinc-300 hover:bg-white/[0.12] active:scale-95 transition-all"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className={cn("px-4 pb-6 pt-2 md:px-6 md:pb-8", fullScreen && "flex-1 min-h-0")}>{children}</div>
        </div>
      </div>
    </div>
  );
}
