"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Menu, X, ChevronDown, Sparkles, Shield, Crown, Anchor, Truck } from "lucide-react";
import { LoyaltyHeaderButton } from "./LoyaltyHeaderButton";
import { BookingFlowSelector } from "./BookingFlowSelector";

const SERVICE_LINKS = [
  { href: "/detailing", label: "Auto Detailing", icon: Sparkles, desc: "Interior, Exterior & Full Detail" },
  { href: "/boat-detailing", label: "Boat Detailing", icon: Anchor, desc: "Marine interior, exterior & full detail" },
  { href: "/rv-detailing", label: "RV Detailing", icon: Truck, desc: "Per-foot pricing for motorhomes & trailers" },
  { href: "/maintenance-club", label: "Maintenance Club", icon: Crown, desc: "Monthly recurring plans" },
  { href: "/services", label: "All Services", icon: Shield, desc: "Browse everything we offer" },
];

type SiteHeaderProps = {
  onBookNow?: () => void;
};

export function SiteHeader({ onBookNow }: SiteHeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [flowSelectorOpen, setFlowSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleBookNow = onBookNow ?? (() => setFlowSelectorOpen(true));

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isServicesActive = SERVICE_LINKS.some((l) => pathname === l.href);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-50 py-3 md:h-16 transition-all duration-300 ${isScrolled || mobileOpen ? "bg-black/95 backdrop-blur-md border-b border-white/[0.06] shadow-2xl" : "bg-black/80 backdrop-blur-sm"}`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-full">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/e.png" alt="Arise And Shine VT Logo" width={40} height={40} className="object-contain drop-shadow-md shrink-0" priority />
            <span className="font-semibold tracking-tight text-sm hidden sm:block text-white">Arise And Shine VT</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/" className={`hover:text-white transition-colors ${pathname === "/" ? "text-white" : ""}`}>Home</Link>

            {/* Services dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setServicesDropdownOpen((o) => !o)}
                className={`flex items-center gap-1 hover:text-white transition-colors ${isServicesActive ? "text-[#D4AF37]" : ""}`}
              >
                Services
                <ChevronDown size={13} className={`transition-transform duration-200 ${servicesDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {servicesDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2">
                    {SERVICE_LINKS.map(({ href, label, icon: Icon, desc }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setServicesDropdownOpen(false)}
                        className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === href ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "hover:bg-white/[0.05] text-zinc-300 hover:text-white"}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${pathname === href ? "bg-[#D4AF37]/20" : "bg-zinc-800 group-hover:bg-zinc-700"} transition-colors`}>
                          <Icon size={14} className={pathname === href ? "text-[#D4AF37]" : "text-zinc-400 group-hover:text-zinc-200"} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{label}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="/#why-us" className="hover:text-white transition-colors">Why Us</a>
            <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 md:gap-3">
            <a href="tel:8025855563" className="hidden md:flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] text-sm font-medium transition-colors">
              <Phone className="w-4 h-4" />802-585-5563
            </a>
            <LoyaltyHeaderButton />
            <button
              type="button"
              onClick={handleBookNow}
              className="btn-primary-gold-shimmer hidden md:flex items-center justify-center h-10 px-6 rounded-xl font-semibold tracking-wide text-sm bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 overflow-hidden"
            >
              <span className="relative z-[1]">Book Now</span>
            </button>
            {/* Mobile: call + hamburger */}
            <a href="tel:8025855563" className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-colors" aria-label="Call">
              <Phone className="w-4 h-4" />
            </a>
            <button onClick={() => setMobileOpen((o) => !o)} className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 transition-colors" aria-label="Menu">
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen overlay */}
      <div
        className={`md:hidden fixed inset-0 z-[45] flex flex-col transition-all duration-300 ease-in-out ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(9,9,11,0.97)", backdropFilter: "blur(16px)" }}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col items-center justify-center flex-1 gap-1 px-8 pt-20 pb-10 overflow-y-auto">
          <Link href="/" onClick={closeMobile} className="w-full text-center text-3xl font-black tracking-tight py-3 text-zinc-100 hover:text-[#D4AF37] transition-colors">
            Home
          </Link>

          {/* Services group */}
          <div className="w-full mt-2 mb-1">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600 mb-2">Services</p>
            {SERVICE_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={`flex items-center justify-center gap-2 w-full text-center text-2xl font-black tracking-tight py-2.5 transition-colors ${pathname === href ? "text-[#D4AF37]" : "text-zinc-200 hover:text-[#D4AF37]"}`}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </Link>
            ))}
          </div>

          <Link href="/#why-us" onClick={closeMobile} className="w-full text-center text-3xl font-black tracking-tight py-3 text-zinc-100 hover:text-[#D4AF37] transition-colors mt-2">
            Why Us
          </Link>
          <Link href="/#contact" onClick={closeMobile} className="w-full text-center text-3xl font-black tracking-tight py-3 text-zinc-100 hover:text-[#D4AF37] transition-colors">
            Contact
          </Link>

          <div className="w-16 h-px bg-white/10 my-4" />
          <LoyaltyHeaderButton />

          <button
            type="button"
            onClick={() => { closeMobile(); handleBookNow(); }}
            className="btn-primary-gold-shimmer w-full max-w-xs bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] font-bold py-4 rounded-xl text-base hover:text-black transition-all duration-500 mt-3"
          >
            <span className="relative z-[1]">Book Your Detail</span>
          </button>

          <a href="tel:8025855563" onClick={closeMobile} className="flex items-center gap-2 text-zinc-400 hover:text-[#D4AF37] text-sm font-medium mt-3">
            <Phone className="w-4 h-4" />Call 802-585-5563
          </a>
        </div>

        {/* Subtle gold glow */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-48" style={{ background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
      </div>

      <BookingFlowSelector isOpen={flowSelectorOpen} onClose={() => setFlowSelectorOpen(false)} />
    </>
  );
}
