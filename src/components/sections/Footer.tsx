"use client";

import { Section } from "@/components/ui/Section";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Section id="contact" spacing="small" className="border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
        {/* Brand */}
        <div className="space-y-4">
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
          <p className="text-white/40 text-sm max-w-xs">
            Vermont's premier automotive detailing studio. Elevating the standard of vehicle care one detail at a time.
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="text-white font-bold uppercase tracking-widest text-xs">Contact Us</h4>
          <div className="space-y-2 text-white/60 text-sm">
            <p className="flex items-center gap-2 hover:text-[#fbbf24] transition-colors">
              <span className="text-white/20">T:</span> 
              <a href="tel:802-585-5563">802-585-5563</a>
            </p>
            <p className="flex items-center gap-2 hover:text-[#fbbf24] transition-colors">
              <span className="text-white/20">E:</span> 
              <a href="mailto:contact@ariseandshinevt.com">contact@ariseandshinevt.com</a>
            </p>
            <p className="text-white/40 pt-2">Waterbury, Vermont</p>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-4">
          <h4 className="text-white font-bold uppercase tracking-widest text-xs">Navigation</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-white/60">
            <Link href="#services" className="hover:text-white transition-colors">Services</Link>
            <Link href="#maintenance" className="hover:text-white transition-colors">Maintenance</Link>
            <Link href="#about" className="hover:text-white transition-colors">About</Link>
            <Link href="#booking" className="hover:text-white transition-colors">Book Now</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </div>

      <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20 uppercase tracking-[0.2em]">
        <p>© {currentYear} Arise & Shine VT. All rights reserved.</p>
        <p>Built with Precision in Vermont</p>
      </div>
    </Section>
  );
}
