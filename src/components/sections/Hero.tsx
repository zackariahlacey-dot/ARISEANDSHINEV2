"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDetailing",
    "name": "Arise & Shine VT",
    "image": "https://ariseandshinevt.com/aasbanner.png",
    "description": "Premium mobile car detailing in Vermont. Specializing in high-gloss Hyper Gloss Wax and interior restoration.",
    "url": "https://ariseandshinevt.com",
    "telephone": "802-585-5563",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Waterbury",
      "addressRegion": "VT",
      "postalCode": "05676",
      "addressCountry": "US"
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      <Section withGrid spacing="none" className="min-h-[90vh] md:min-h-screen flex items-center pt-16 md:pt-48 overflow-hidden bg-black relative">
        {/* Creative Layering */}
        <div className="absolute inset-0 z-0 technical-grid opacity-30" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]" />
        
        <div className="text-center relative z-10 w-full px-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-4 mb-8"
          >
            <div className="h-px w-8 md:w-16 bg-[#fbbf24]" />
            <span className="text-[10px] md:text-xs font-technical text-[#fbbf24] uppercase">Protocol: Vermont_Elite</span>
            <div className="h-px w-8 md:w-16 bg-[#fbbf24]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, skewX: 20 }}
            animate={{ opacity: 1, skewX: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-7xl md:text-[180px] font-black tracking-tighter text-white mb-8 md:mb-12 leading-[0.75] drop-shadow-[0_0_80px_rgba(251,191,36,0.15)] italic">
              <span className="block text-transparent bg-clip-text bg-linear-to-b from-white to-white/20">ARISE</span>
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] via-white to-[#8b5cf6] animate-shimmer">SHINE VT</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-3xl text-white/40 max-w-4xl mx-auto mb-12 md:mb-20 font-bold uppercase tracking-tight italic"
          >
            Surgical Precision. <span className="text-white">Unrivaled Brilliance.</span>
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-sm md:max-w-none mx-auto">
            <PrismButton 
              variant="gold" 
              className="w-full sm:w-auto text-xs md:text-lg py-6 md:py-8 px-12 md:px-20 group skew-x-[-12deg]"
              onClick={onBookClick}
            >
              <span className="skew-x-[12deg] relative z-10 flex items-center gap-3">
                Initialize Session <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
              </span>
            </PrismButton>
            <PrismButton 
              variant="outline" 
              className="w-full sm:w-auto text-xs md:text-lg py-6 md:py-8 px-12 md:px-20 border-white/10 skew-x-[-12deg]"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="skew-x-[12deg] text-white/40 group-hover:text-white transition-colors">Catalog</span>
            </PrismButton>
          </div>
        </div>

        {/* Cinematic Scan Line */}
        <div className="scan-line" />
        
        {/* Floating Detail Watermark */}
        <div className="absolute -bottom-10 -right-10 md:bottom-20 md:right-20 opacity-5 select-none pointer-events-none">
          <span className="text-[150px] md:text-[300px] font-black text-white leading-none italic uppercase">Detail</span>
        </div>
      </Section>
    </>
  );
}
