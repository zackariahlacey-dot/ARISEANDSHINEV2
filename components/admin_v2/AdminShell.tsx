"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Calendar, 
  Users, 
  LayoutDashboard, 
  Settings, 
  Briefcase,
  Search,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin_v2", icon: LayoutDashboard },
  { label: "Bookings", href: "/admin_v2/bookings", icon: Calendar },
  { label: "Customers", href: "/admin_v2/customers", icon: Users },
  { label: "Services", href: "/admin_v2/services", icon: Briefcase },
  { label: "Settings", href: "/admin_v2/settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/[0.06] bg-[#050505] hidden md:flex flex-col">
        <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-xs">
            AS
          </div>
          <span className="font-bold tracking-tight text-white uppercase text-sm">Arise & Shine <span className="text-zinc-500 font-normal">V2</span></span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-white/[0.08] text-white shadow-[0_0_15px_rgba(255,255,255,0.03)]" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                )}
              >
                <item.icon size={18} className={cn(isActive ? "text-amber-500" : "text-zinc-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Admin Account</p>
            <p className="text-[10px] text-zinc-500 truncate">admin@ariseandshinevt.com</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A]">
        {/* Top Header */}
        <header className="h-16 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-md relative group">
            <Search size={16} className="absolute left-3 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
            <input 
              placeholder="Search bookings or customers..." 
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] transition-all"
            />
            <div className="absolute right-3 flex items-center gap-1">
              <span className="px-1 py-0.5 rounded border border-white/[0.08] bg-zinc-900 text-[10px] text-zinc-500 font-mono">⌘</span>
              <span className="px-1 py-0.5 rounded border border-white/[0.08] bg-zinc-900 text-[10px] text-zinc-500 font-mono">K</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full border border-black" />
             </button>
             <div className="h-8 w-[1px] bg-white/[0.06] mx-1" />
             <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-medium text-zinc-400">System Online</span>
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </section>
      </main>
    </div>
  );
}
