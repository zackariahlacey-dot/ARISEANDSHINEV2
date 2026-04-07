"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Menu, X, Sparkles, Anchor, Truck } from "lucide-react";
import { LoyaltyHeaderButton } from "./LoyaltyHeaderButton";
import { BookingFlowSelector } from "./BookingFlowSelector";

const SERVICE_LINKS = [
  { href: "/detailing", label: "Auto Detailing", icon: Sparkles, desc: "Interior, Exterior & Full Detail" },
  { href: "/boat-detailing", label: "Boat Detailing", icon: Anchor, desc: "Marine interior, exterior & full detail" },
  { href: "/rv-detailing", label: "RV Detailing", icon: Truck, desc: "Per-foot pricing for motorhomes & trailers" },
];

type SiteHeaderProps = {
  onBookNow?: () => void;
};

export function SiteHeader({ onBookNow }: SiteHeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flowSelectorOpen, setFlowSelectorOpen] = useState(false);

  const handleBookNow = onBookNow ?? (() => setFlowSelectorOpen(true));

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

          {/* Desktop nav — flat links, no dropdown */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/" className={`hover:text-white transition-colors ${pathname === "/" ? "text-white" : ""}`}>Home</Link>
            {SERVICE_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`hover:text-white transition-colors ${pathname === href ? "text-[#D4AF37]" : ""}`}
              >
                {label}
              </Link>
            ))}
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

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/60 z-[54] md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* Mobile menu */}
      <div
        className={`md:hidden fixed inset-x-0 top-16 z-[55] flex justify-center px-4 transition-all duration-250 ease-out ${
          mobileOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden mt-2">
          <div className="p-2 flex flex-col items-center">
            <Link
              href="/"
              onClick={closeMobile}
              className={`w-full flex justify-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                pathname === "/" ? "text-[#D4AF37] bg-[#D4AF37]/8" : "text-zinc-200 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              Home
            </Link>

            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pt-4 pb-2 text-center">Services</p>
            <div className="w-full flex flex-col gap-1">
              {SERVICE_LINKS.map(({ href, label, icon: Icon, desc }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobile}
                    className={`flex flex-col items-center text-center gap-1 py-3 px-3 rounded-xl transition-colors ${
                      active ? "bg-[#D4AF37]/10" : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-zinc-800 text-zinc-400"}`}>
                      <Icon size={14} strokeWidth={1.75} />
                    </div>
                    <p className={`text-sm font-semibold ${active ? "text-[#D4AF37]" : "text-white"}`}>{label}</p>
                    <p className="text-[11px] text-zinc-500 leading-snug">{desc}</p>
                  </Link>
                );
              })}
            </div>

            <div className="w-full h-px bg-white/[0.06] my-2" />

            <Link href="/#why-us" onClick={closeMobile} className="w-full flex justify-center px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors">Why Us</Link>
            <Link href="/#contact" onClick={closeMobile} className="w-full flex justify-center px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors">Contact</Link>
          </div>

          <div className="px-3 pb-3 pt-1 border-t border-white/[0.07] flex flex-col gap-2 mt-1">
            <button
              type="button"
              onClick={() => { closeMobile(); handleBookNow(); }}
              className="btn-primary-gold-shimmer w-full bg-zinc-800 border border-[#D4AF37]/40 text-[#D4AF37] font-semibold py-3 rounded-xl text-sm hover:text-black transition-all duration-500 overflow-hidden"
            >
              <span className="relative z-[1]">Book Your Detail</span>
            </button>
            <a
              href="tel:8025855563"
              onClick={closeMobile}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]/70" />
              802-585-5563
            </a>
          </div>
        </div>
      </div>

      <BookingFlowSelector isOpen={flowSelectorOpen} onClose={() => setFlowSelectorOpen(false)} />
    </>
  );
}
