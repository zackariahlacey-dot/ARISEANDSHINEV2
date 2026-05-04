"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Phone, Menu, X, Sparkles, Anchor, Truck,
  LogIn, LogOut, LayoutDashboard, Gift, User,
  HelpCircle, MapPin, CalendarSearch, ChevronRight, Home, Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getAuthProfile, type AuthProfile } from "@/app/actions/getAuthProfile";
import { BookingFlowSelector } from "./BookingFlowSelector";
import { TrackAppointmentModal } from "./TrackAppointmentModal";
import { AnnouncementBar } from "./AnnouncementBar";
import { SqueezeMeInModal } from "./SqueezeMeInModal";

const ADMIN_EMAIL = "zackariahlacey@gmail.com";

const NAV_LINKS = [
  { href: "/",                 label: "Home"             },
  { href: "/detailing",        label: "Auto Detailing"   },
  { href: "/paint-correction", label: "Paint Correction" },
  { href: "/boat-detailing",   label: "Boat Detailing"   },
  { href: "/rv-detailing",     label: "RV Detailing"     },
  { href: "/about",            label: "About"            },
  { href: "/contact",          label: "Contact"          },
];

const SERVICE_LINKS = [
  { href: "/detailing",        label: "Auto Detailing",   icon: Sparkles, desc: "Cars, trucks & SUVs"        },
  { href: "/paint-correction", label: "Paint Correction", icon: Layers,   desc: "1-Step / 2-Step + ceramic"  },
  { href: "/boat-detailing",   label: "Boat Detailing",   icon: Anchor,   desc: "Marine interior & exterior" },
  { href: "/rv-detailing",     label: "RV Detailing",     icon: Truck,    desc: "Per-foot pricing"           },
];

const MORE_LINKS = [
  { href: "/about",        label: "About Us",     icon: User        },
  { href: "/faq",          label: "FAQ",          icon: HelpCircle  },
  { href: "/service-area", label: "Service Area", icon: MapPin      },
];

type SiteHeaderProps = {
  onBookNow?: () => void;
  trackOpen?: boolean;
  onTrackOpenChange?: (open: boolean) => void;
};

export function SiteHeader({ onBookNow, trackOpen: trackOpenProp, onTrackOpenChange }: SiteHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const [isScrolled,       setIsScrolled]      = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [flowSelectorOpen, setFlowSelectorOpen] = useState(false);
  const [trackOpenLocal,   setTrackOpenLocal]   = useState(false);
  const [squeezeOpen,      setSqueezeOpen]      = useState(false);

  const trackOpen    = trackOpenProp    ?? trackOpenLocal;
  const setTrackOpen = onTrackOpenChange ?? setTrackOpenLocal;
  const [profile,          setProfile]          = useState<AuthProfile | undefined>(undefined);
  const [authLoading,      setAuthLoading]      = useState(true);

  const handleBookNow = onBookNow ?? (() => setFlowSelectorOpen(true));
  const isLoggedIn    = !!profile;
  const isAdmin       = profile?.email?.toLowerCase() === ADMIN_EMAIL;

  // ── Auth ──────────────────────────────────────────────────────────────────
  // onAuthStateChange fires immediately on mount with INITIAL_SESSION — no
  // separate getUser() call needed, and no lock race condition.
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (!session?.user) {
          setProfile(null);
          setAuthLoading(false);
          return;
        }
        try {
          const p = await getAuthProfile();
          setProfile(p ?? null);
        } catch {
          setProfile(null);
        } finally {
          setAuthLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mobileOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow            = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow            = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow            = "";
    };
  }, [mobileOpen]);

  // ── Close on resize ───────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <AnnouncementBar />

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <header
        className={`fixed top-8 inset-x-0 z-50 h-16 transition-all duration-500 ${
          isScrolled || mobileOpen
            ? "bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
            : "bg-transparent"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/e.png" alt="Arise And Shine VT" width={34} height={34} className="object-contain drop-shadow-md shrink-0" priority />
            <span className="font-semibold tracking-wide text-[13px] hidden sm:block text-white/90 whitespace-nowrap">
              Arise And Shine VT
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-[13px]">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={`relative py-1 whitespace-nowrap transition-colors duration-200 ${
                pathname === href
                  ? "text-[#D4AF37] after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-[#D4AF37] after:rounded-full"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}>
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setTrackOpen(true)}
              className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap px-1">
              Track
            </button>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <a href="tel:8025855563" aria-label="Call us"
              className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-[#D4AF37] transition-colors">
              <Phone className="w-3.5 h-3.5" />
            </a>
            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Auth — always visible; shows Sign In while loading */}
            {!authLoading && isLoggedIn ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href="/admin"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-[11px] font-bold uppercase tracking-wider">
                    <LayoutDashboard size={11} />
                    Admin
                  </Link>
                )}
                {pathname === "/protected" ? (
                  <Link href="/"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] text-[12px] text-zinc-300 hover:text-white transition-all">
                    <Home size={13} className="text-zinc-400" />
                    <span>Home</span>
                  </Link>
                ) : (
                  <Link href="/protected"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] text-[12px] text-zinc-300 hover:text-white transition-all">
                    <Gift size={13} className="text-amber-400/80" />
                    <span>Dashboard</span>
                    {profile!.loyaltyDiscountPct > 0 && (
                      <span className="text-[10px] text-amber-400/70 font-bold">· {profile!.loyaltyDiscountPct}% off</span>
                    )}
                  </Link>
                )}
              </div>
            ) : (
              <Link href="/auth/login?redirect=/"
                className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-100 transition-colors whitespace-nowrap">
                <LogIn size={13} />
                Sign In
              </Link>
            )}

            <button type="button" onClick={handleBookNow}
              className="btn-primary-gold-shimmer ml-1 flex items-center justify-center h-9 px-5 rounded-lg font-semibold tracking-wide text-[13px] bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 overflow-hidden">
              <span className="relative z-[1]">Book Now</span>
            </button>
          </div>

          {/* Mobile: sign in/out + call + hamburger */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {/* Auth button — always visible; shows Sign In while loading */}
            {!authLoading && isLoggedIn ? (
              pathname === "/protected" ? (
                <Link href="/" aria-label="Home"
                  className="flex items-center gap-1.5 h-9 px-2.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all duration-200">
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold">Home</span>
                </Link>
              ) : (
                <Link href="/protected" aria-label="Dashboard"
                  className="flex items-center gap-1.5 h-9 px-2.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all duration-200">
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold">Dashboard</span>
                </Link>
              )
            ) : (
              <Link href="/auth/login?redirect=/" aria-label="Sign in"
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all duration-200">
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold">Sign In</span>
              </Link>
            )}
            <a href="tel:8025855563" aria-label="Call"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900/80 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-colors">
              <Phone className="w-4 h-4" />
            </a>
            <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen(o => !o)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900/80 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-colors">
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile overlay + drawer ───────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        onClick={closeMobile}
        aria-hidden
        className={`md:hidden fixed inset-0 z-[998] bg-black/70 backdrop-blur-lg transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer slides in from the right */}
      <div
        inert={!mobileOpen || undefined}
        className={`md:hidden fixed top-0 right-0 bottom-0 z-[999] w-[min(340px,90vw)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background:   "linear-gradient(180deg,#111113 0%,#0d0d10 100%)",
          borderLeft:   "1px solid rgba(255,255,255,0.06)",
          boxShadow:    "-20px 0 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/e.png" alt="" width={26} height={26} className="object-contain" />
            <span className="text-[13px] font-semibold text-white/70 tracking-wide">Arise And Shine VT</span>
          </div>
          <button type="button" onClick={closeMobile} aria-label="Close menu"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Auth card */}
        <div className="px-4 pt-4 pb-3 shrink-0">
          {!authLoading && (
            isLoggedIn ? (
              <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
                    <User size={14} className="text-[#D4AF37]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-tight">Signed in</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{profile!.loyaltyDiscountPct}% loyalty discount</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {pathname === "/protected" ? (
                    <Link href="/" onClick={closeMobile}
                      className="text-[12px] font-semibold text-zinc-300 hover:text-white transition-colors">
                      Home
                    </Link>
                  ) : (
                    <Link href="/protected" onClick={closeMobile}
                      className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                      Dashboard
                    </Link>
                  )}
                  <button type="button" onClick={() => { closeMobile(); handleSignOut(); }} title="Sign out"
                    className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <LogOut size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login?redirect=/" onClick={closeMobile}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.12] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <User size={14} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-tight">Sign In</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Rewards & booking history</p>
                  </div>
                </div>
                <LogIn size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            )
          )}
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

          {/* Services */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600 mb-2 px-1">Services</p>
            <div className="space-y-1">
              {/* Home link */}
              <Link href="/" onClick={closeMobile}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-200 ${
                  pathname === "/"
                    ? "bg-[#D4AF37]/[0.09] border-[#D4AF37]/20"
                    : "border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]"
                }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  pathname === "/" ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-white/[0.05] text-zinc-500 group-hover:text-zinc-300 group-hover:bg-white/[0.08]"
                }`}>
                  <Sparkles size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold leading-tight ${pathname === "/" ? "text-[#D4AF37]" : "text-white/90"}`}>Home</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">Back to the main page</p>
                </div>
                <ChevronRight size={13} className={`shrink-0 ${pathname === "/" ? "text-[#D4AF37]/50" : "text-zinc-700 group-hover:text-zinc-500"}`} />
              </Link>
              {SERVICE_LINKS.map(({ href, label, icon: Icon, desc }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={closeMobile}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-200 ${
                      active
                        ? "bg-[#D4AF37]/[0.09] border-[#D4AF37]/20"
                        : "border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]"
                    }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      active ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-white/[0.05] text-zinc-500 group-hover:text-zinc-300 group-hover:bg-white/[0.08]"
                    }`}>
                      <Icon size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-semibold leading-tight ${active ? "text-[#D4AF37]" : "text-white/90"}`}>{label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">{desc}</p>
                    </div>
                    <ChevronRight size={13} className={`shrink-0 ${active ? "text-[#D4AF37]/50" : "text-zinc-700 group-hover:text-zinc-500"}`} />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* More links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600 mb-2 px-1">More</p>
            <div className="space-y-1">
              {MORE_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={closeMobile}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      active ? "text-[#D4AF37] bg-[#D4AF37]/[0.07]" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                    }`}>
                    <Icon size={15} strokeWidth={1.75} className="shrink-0" />
                    <span className="text-[13px] font-medium">{label}</span>
                  </Link>
                );
              })}

              <button type="button" onClick={() => { closeMobile(); setTrackOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200">
                <CalendarSearch size={15} strokeWidth={1.75} className="shrink-0" />
                <span className="text-[13px] font-medium">Track My Appointment</span>
              </button>

              {isAdmin && (
                <Link href="/admin" onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-400 hover:bg-amber-500/20 transition-all duration-200">
                  <LayoutDashboard size={15} strokeWidth={1.75} className="shrink-0" />
                  <span className="text-[13px] font-bold">Admin Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Drawer footer CTAs */}
        <div className="px-4 pt-3 pb-6 border-t border-white/[0.05] space-y-2.5 shrink-0">
          <button type="button" onClick={() => { closeMobile(); handleBookNow(); }}
            className="btn-primary-gold-shimmer w-full flex items-center justify-center bg-zinc-900 border border-[#D4AF37]/50 text-[#D4AF37] font-semibold py-3.5 rounded-xl text-[13px] hover:text-black transition-all duration-500 overflow-hidden">
            <span className="relative z-[1]">Book Your Detail</span>
          </button>
          <a href="tel:8025855563" onClick={closeMobile}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] text-[13px] font-medium transition-all duration-200">
            <Phone className="w-3.5 h-3.5 text-[#D4AF37]/60" />
            802-585-5563
          </a>
        </div>
      </div>

      <BookingFlowSelector
        isOpen={flowSelectorOpen}
        onClose={() => setFlowSelectorOpen(false)}
        onSqueeze={() => { setFlowSelectorOpen(false); setSqueezeOpen(true); }}
      />
      <TrackAppointmentModal isOpen={trackOpen} onClose={() => setTrackOpen(false)} />
      <SqueezeMeInModal isOpen={squeezeOpen} onClose={() => setSqueezeOpen(false)} />
    </>
  );
}
