"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function LegalModal({ isOpen, onClose, title, children }: LegalModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 sm:px-6 pb-4 sm:pb-0"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-md shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-7 py-6 max-h-[70vh] modal-scroll text-sm text-zinc-400 leading-relaxed space-y-5">
          {children}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-7 py-4 border-t border-white/[0.07] flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/[0.06] border border-white/[0.08] px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.10] hover:text-zinc-100 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formatted legal section helpers ────────────────────────────────────────

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-zinc-100 mb-2">{title}</h3>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item) => (
        <li key={item} className="relative before:content-['–'] before:absolute before:-left-4 before:text-[#D4AF37]">
          {item}
        </li>
      ))}
    </ul>
  );
}
