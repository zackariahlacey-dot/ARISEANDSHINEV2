"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, DollarSign, Settings, Crown, Zap, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/admin/Toast";

const TABS = [
  { label: "Today",    href: "/admin",           icon: Home,       exact: true  },
  { label: "Schedule", href: "/admin/schedule",   icon: Calendar,   exact: false },
  { label: "Clients",  href: "/admin/clients",    icon: Users,      exact: false },
  { label: "Monthly",  href: "/admin/monthly",    icon: Crown,      exact: false },
  { label: "Squeeze",  href: "/admin/squeeze",    icon: Zap,        exact: false },
  { label: "Email",    href: "/admin/email",      icon: Mail,       exact: false },
  { label: "Money",    href: "/admin/money",      icon: DollarSign, exact: false },
  { label: "Settings", href: "/admin/settings",   icon: Settings,   exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(tab: typeof TABS[0]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <ToastProvider>
      <div className="flex h-[100dvh] bg-[#050505] text-white overflow-hidden selection:bg-amber-500/30">

        {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────── */}
        <aside className="hidden md:flex w-56 border-r border-white/[0.04] bg-[#080808] flex-col shrink-0">
          <div className="p-5 border-b border-white/[0.04]">
            <h1 className="text-base font-black uppercase tracking-tighter flex items-center gap-1.5">
              ARISE <span className="text-amber-500">&</span> SHINE
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-600 mt-1">Command Center</p>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {TABS.map(tab => {
              const active = isActive(tab);
              return (
                <Link key={tab.href} href={tab.href} className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-150",
                  active
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10"
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                )}>
                  <tab.icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="font-black text-[10px] uppercase tracking-widest">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">Online</span>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto relative bg-[#050505] pb-20 md:pb-0">
          {/* Mobile Header */}
          <div className="md:hidden sticky top-0 left-0 right-0 h-11 bg-[#050505]/90 backdrop-blur-xl flex items-center justify-between px-4 z-50 border-b border-white/[0.03]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              A<span className="text-amber-500">&</span>S
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
              {TABS.find(t => isActive(t))?.label ?? "Admin"}
            </span>
            <div className="w-7 h-7" />
          </div>
          {children}
        </main>

        {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-[#080808]/95 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around z-[100]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
        >
          {TABS.map(tab => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-2 transition-all active:scale-90 relative",
                  active ? "text-amber-500" : "text-zinc-600"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-amber-500 rounded-full" />
                )}
                <div className={cn("p-1 rounded-lg transition-colors", active && "bg-amber-500/10")}>
                  <tab.icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                </div>
                <span className="text-[7px] font-black uppercase tracking-wider">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
