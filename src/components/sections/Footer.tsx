"use client";

import { Section } from "@/components/ui/Section";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Section spacing="none" className="py-24 md:py-32 border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24 text-center md:text-left">
          {/* Brand */}
          <div className="space-y-8 flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 md:w-10 md:h-10 overflow-hidden rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#fbbf24]/50 transition-all">
                <img 
                  src="/e.png" 
                  alt="Logo" 
                  className="w-6 h-6 md:w-7 md:h-7 object-contain"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-white md:text-2xl uppercase italic">
                ARISE <span className="text-[#fbbf24]">&</span> SHINE
              </span>
            </Link>
            <p className="text-white/30 text-xs font-medium leading-relaxed max-w-[250px] uppercase italic tracking-tighter">
              Surgical precision for Vermont's most distinguished automotive collections.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-6">
            <p className="text-variable">Navigation</p>
            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
              <Link href="#services" className="hover:text-[#fbbf24] transition-colors">Services_Grid</Link>
              <Link href="#maintenance" className="hover:text-[#fbbf24] transition-colors">Concierge_Sync</Link>
              <Link href="#transformations" className="hover:text-[#fbbf24] transition-colors">Visual_Evidence</Link>
              <Link href="/auth" className="hover:text-[#fbbf24] transition-colors">Member_Portal</Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <p className="text-variable">Contact_Node</p>
            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
              <a href="tel:802-585-5563" className="hover:text-white transition-colors">802.585.5563</a>
              <a href="mailto:contact@ariseandshinevt.com" className="hover:text-white transition-colors lowercase">contact@ariseandshinevt.com</a>
              <p className="mt-2 text-white/10 italic">Waterbury_Vermont_US</p>
            </div>
          </div>

          {/* Prestige */}
          <div className="space-y-6">
            <p className="text-variable">System_Status</p>
            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
              <span className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                Studio_Online
              </span>
              <span className="flex items-center gap-2 text-white/20">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                Central_VT_Node
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">
            © {currentYear} Arise & Shine VT // All Rights Reserved
          </p>
          <div className="flex items-center gap-4">
            <div className="h-px w-8 bg-white/10" />
            <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black italic">
              Built_with_Precision
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
