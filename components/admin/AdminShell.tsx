"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Megaphone,
  DollarSign,
  Menu,
  X,
  Plus,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: CalendarDays,
    description: "Schedule & manage",
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: Users,
    description: "CRM & loyalty",
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: Megaphone,
    description: "Coupons & promos",
  },
  {
    href: "/admin/financials",
    label: "Financials",
    icon: DollarSign,
    description: "Revenue & payouts",
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
    NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ??
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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
