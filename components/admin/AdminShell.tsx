"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Users,
  Megaphone,
  DollarSign,
  Package,
  Menu,
  X,
  Plus,
  LogOut,
  ChevronRight,
  TrendingUp,
  Crown,
  Search,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { globalSearch, type SearchResult } from "@/app/actions/globalSearch";

// ── Search Component ─────────────────────────────────────────────────────────

function AdminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await globalSearch(query);
      setResults(res);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search customers, dates..."
          className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/30 transition-all"
        />
        {loading && <Loader2 size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => {
                  router.push(r.href);
                  setIsOpen(false);
                  setQuery("");
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'customer' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {r.type === 'customer' ? <Users size={14} /> : <CalendarDays size={14} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">{r.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{r.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav Groups ───────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    title: "Insights",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & stats" },
      { href: "/admin/financials", label: "Financials", icon: DollarSign, description: "Revenue & payouts" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/planner", label: "Planner", icon: CalendarClock, description: "Mobile schedule view" },
      { href: "/admin/today", label: "Today's Jobs", icon: LayoutDashboard, description: "Mobile day-of view" },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, description: "Schedule & manage" },
    ],
  },
  {
    title: "CRM & Marketing",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users, description: "Profiles & loyalty" },
      { href: "/admin/customers/memberships", label: "Memberships", icon: Crown, description: "Recurring plans" },
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone, description: "Coupons & promos" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/schedule", label: "Schedule", icon: CalendarClock, description: "Hours & availability" },
      { href: "/admin/services", label: "Services", icon: Package, description: "Pricing & packages" },
    ],
  },
];

interface AdminShellProps {
  children: React.ReactNode;
  adminEmail: string;
  onNewBooking?: () => void;
}

export function AdminShell({ children, adminEmail }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (confirmed) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  const currentPage =
    NAV_GROUPS.flatMap((g) => g.items).find((item) => pathname.startsWith(item.href))?.label ??
    "Admin";

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#a8882a] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-zinc-950">A&S</span>
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-none">Arise And Shine VT</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-none">Mission Control</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <Icon
                      size={17}
                      className={`shrink-0 ${isActive ? "text-[#D4AF37]" : "text-zinc-500 group-hover:text-zinc-300"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold leading-none ${
                          isActive ? "text-[#D4AF37]" : ""
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 leading-none truncate">
                        {item.description}
                      </p>
                    </div>
                    {isActive && (
                      <ChevronRight size={13} className="text-[#D4AF37]/60 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: admin info + sign out */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#D4AF37]">
              {adminEmail.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-zinc-300 leading-none truncate">
              {adminEmail}
            </p>
            <p className="text-[9px] text-zinc-600 mt-0.5 leading-none">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200"
        >
          <LogOut size={13} className="shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* ── Desktop sidebar (fixed, always visible lg+) ─────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-zinc-900/60 backdrop-blur-md border-r border-white/[0.06] z-30">
        <Sidebar />
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-zinc-900 border-r border-white/[0.06] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-sm font-bold text-white">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">
                {currentPage}
              </h1>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-none hidden sm:block">
                Arise And Shine VT · Admin
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <AdminSearch />
          </div>

          <div className="flex items-center gap-2">
            {/* Admin badge — desktop */}
            <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
              <div className="w-4 h-4 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#D4AF37]">
                  {adminEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">{adminEmail}</span>
            </div>

            {/* New Booking CTA */}
            <Link
              href="/admin/bookings?new=true"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c9a430] text-zinc-950 text-xs font-bold transition-colors"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">New Booking</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          <div className="bg-zinc-950/80 backdrop-blur-xl border-t border-white/[0.08] px-2 py-3 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {[
              { href: "/admin/planner", label: "Today", icon: CalendarClock },
              { href: "/admin/bookings", label: "Plan", icon: CalendarDays },
              { href: "/admin/customers", label: "CRM", icon: Users },
              { href: "/admin/dashboard", label: "Stats", icon: TrendingUp },
            ].map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${
                    isActive ? "text-[#D4AF37]" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-[#D4AF37]/10" : ""}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Safe area for iPhone home bar */}
          <div className="bg-zinc-950/80 backdrop-blur-xl h-safe-bottom" />
        </div>
      </div>
    </div>
  );
}
