"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, Briefcase, Search, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/admin/Toast";
import { GlobalSearch } from "@/components/admin/GlobalSearch";

/**
 * Top-level admin nav, reorganised from 8 tabs into 4 conceptual groups:
 *   Today    — live ops dashboard
 *   Schedule — calendar + quick book + squeeze queue
 *   People   — clients + subscribers + plan requests
 *   Business — revenue + email + setup
 *
 * `subroutes` is the set of paths that should keep a parent tab active so
 * deep links (e.g. /admin/monthly → People) still highlight correctly.
 */
const TABS = [
  { label: "Today",    href: "/admin",          icon: Home,      subroutes: [] as string[] },
  { label: "Schedule", href: "/admin/schedule", icon: Calendar,  subroutes: ["/admin/squeeze", "/admin/recurring"] },
  { label: "People",   href: "/admin/clients",  icon: Users,     subroutes: ["/admin/monthly", "/admin/contractors"] },
  { label: "Fleet",    href: "/admin/fleet",    icon: Building2, subroutes: [] as string[] },
  { label: "Business", href: "/admin/money",    icon: Briefcase, subroutes: ["/admin/email", "/admin/settings"] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);

  // Dispatch a global keyboard shortcut hint by simulating ⌘/Ctrl+K from
  // the sidebar button — the GlobalSearch component listens for it.
  const triggerSearch = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  function isActive(tab: typeof TABS[0]) {
    if (tab.href === "/admin") return pathname === "/admin";
    if (pathname.startsWith(tab.href)) return true;
    return tab.subroutes.some(r => pathname.startsWith(r));
  }

  return (
    <ToastProvider>
      <GlobalSearch />
      <div className="flex h-[100dvh] bg-[#050505] text-white overflow-hidden selection:bg-amber-500/30">

        {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────── */}
        <aside className="hidden md:flex w-56 border-r border-white/[0.04] bg-[#080808] flex-col shrink-0">
          <div className="p-5 border-b border-white/[0.04]">
            <h1 className="text-base font-black uppercase tracking-tighter flex items-center gap-1.5">
              ARISE <span className="text-amber-500">&</span> SHINE
            </h1>
            <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-600 mt-1">Command Center</p>
          </div>
          {/* Search trigger */}
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={triggerSearch}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.12] transition-colors"
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold">
                <Search size={13} /> Search
              </span>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/[0.04] text-zinc-500">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
          </div>

          <nav className="flex-1 p-3 pt-2 space-y-0.5">
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
                  <span className="font-black text-[11px] uppercase tracking-widest">{tab.label}</span>
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
        <main
          className="flex-1 overflow-y-auto relative bg-[#050505] md:pb-0"
          style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        >
          {/* Mobile Header */}
          <div
            className="md:hidden sticky top-0 left-0 right-0 bg-[#050505]/90 backdrop-blur-xl flex items-center justify-between px-4 z-50 border-b border-white/[0.03]"
            style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))", paddingBottom: "0.25rem", minHeight: "2.75rem" }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              A<span className="text-amber-500">&</span>S
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
              {TABS.find(t => isActive(t))?.label ?? "Admin"}
            </span>
            <button
              type="button"
              onClick={triggerSearch}
              className="w-9 h-9 -mr-1.5 rounded-xl flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:bg-white/[0.05] active:bg-amber-500/15 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </div>
          {children}
        </main>

        {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-[#080808]/95 backdrop-blur-xl border-t border-white/[0.06] flex items-stretch justify-around z-[100]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)", paddingTop: "4px" }}
        >
          {TABS.map(tab => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  // Apple HIG touch target: ≥44pt — using min-h-[52px] for the
                  // visible area + top/bottom padding from the nav itself.
                  "flex flex-col items-center justify-center gap-0.5 px-2 transition-all active:scale-95 relative flex-1 min-h-[52px]",
                  active ? "text-amber-500" : "text-zinc-500"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-amber-500 rounded-full" />
                )}
                <div className={cn("p-1.5 rounded-lg transition-colors", active && "bg-amber-500/10")}>
                  <tab.icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
