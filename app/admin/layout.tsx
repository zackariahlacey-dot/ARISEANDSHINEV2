"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Calendar, DollarSign, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Schedule", href: "/admin/schedule", icon: Calendar },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Money HUD", href: "/admin/money", icon: DollarSign },
  { label: "Ops Lab", href: "/admin/testing", icon: FlaskConical },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden selection:bg-amber-500/30 font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-white/[0.06] bg-[#080808] flex-col shrink-0">
        <div className="p-8 border-b border-white/[0.06] bg-[#0a0a0a]/50">
          <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            ARISE <span className="text-amber-500">V2</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-2">Mission Control</p>
        </div>

        <nav className="flex-1 p-6 space-y-3">
          {TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-[24px] transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10" 
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                <tab.icon size={22} className={cn(isActive ? "text-black" : "text-zinc-500 group-hover:text-white transition-colors")} />
                <span className="font-black text-xs uppercase tracking-widest">{tab.label}</span>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-white/[0.06] bg-[#0a0a0a]/50">
           <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-20" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Ops Center Live</span>
           </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#080808]/90 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-4 z-[100] safe-area-bottom pb-safe">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 active:scale-90 relative",
                isActive ? "text-amber-500" : "text-zinc-500"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300",
                isActive && "bg-amber-500/10 scale-110"
              )}>
                <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tab.label.split(' ')[0]}</span>
              {isActive && (
                <div className="absolute -top-2 w-1 h-1 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto relative bg-[#050505] pb-20 md:pb-0 scroll-smooth">
        {/* Mobile Header Overlay */}
        <div className="md:hidden sticky top-0 left-0 right-0 h-14 bg-[#050505]/60 backdrop-blur-md flex items-center justify-between px-6 z-50 border-b border-white/[0.04]">
           <span className="text-sm font-black uppercase tracking-[0.3em]">AS <span className="text-amber-500">V2</span></span>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Live</span>
           </div>
        </div>
        
        <div className="min-h-full">
          {children}
        </div>
      </main>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
