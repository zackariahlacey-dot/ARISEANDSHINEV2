"use client";

import { Section } from "@/components/ui/Section";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Section spacing="small" className="border-t border-white/5 bg-black">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 text-center md:text-left">
        {/* Brand */}
        <div className="space-y-6 flex flex-col items-center md:items-start">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 overflow-hidden">
              <img 
                src="/e.png" 
                alt="Arise & Shine VT Logo" 
                className="w-full h-full object-contain brightness-110 contrast-125"
              />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white">
              ARISE <span className="text-[#fbbf24]">&</span> SHINE
            </span>
          </Link>
          <p className="text-white/40 text-xs leading-relaxed max-w-[200px]">
            Surgical precision meets unrivaled brilliance. Vermont's elite mobile detailing studio.
          </p>
        </div>

        {/* Links */}
        <div className="space-y-4">
          <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Navigation</h4>
          <div className="flex flex-col gap-3 text-xs font-bold uppercase tracking-widest text-white/30">
            <Link href="#services" className="hover:text-[#fbbf24] transition-colors">Services</Link>
            <Link href="#maintenance" className="hover:text-[#fbbf24] transition-colors">Maintenance</Link>
            <Link href="#testimonials" className="hover:text-[#fbbf24] transition-colors">Client Voices</Link>
            <Link href="#booking" className="hover:text-[#fbbf24] transition-colors">Reserve Session</Link>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Contact</h4>
          <div className="flex flex-col gap-3 text-xs font-bold uppercase tracking-widest text-white/30">
            <a href="tel:802-585-5563" className="hover:text-white transition-colors">802-585-5563</a>
            <a href="mailto:contact@ariseandshinevt.com" className="hover:text-white transition-colors lowercase">contact@ariseandshinevt.com</a>
            <p className="mt-2 text-[8px] text-white/10 italic">Based in Waterbury, VT</p>
          </div>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Prestige</h4>
          <div className="flex flex-col gap-3 text-xs font-bold uppercase tracking-widest text-white/30">
            <Link href="/auth" className="hover:text-[#fbbf24] transition-colors">Member Portal</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">
          © {currentYear} Arise & Shine VT. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[#fbbf24]" />
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">
            Built with Precision in Vermont
          </p>
        </div>
      </div>
    </Section>
  );
}
