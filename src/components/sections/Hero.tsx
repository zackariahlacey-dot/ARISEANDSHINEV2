"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  // SEO Schema for Local Business
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDetailing",
    "name": "Arise & Shine VT",
    "image": "https://ariseandshinevt.com/aasbanner.png",
    "description": "Elite mobile detailing in Vermont. High-gloss protection and surgical interior restoration.",
    "url": "https://ariseandshinevt.com",
    "telephone": "802-585-5563",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Waterbury",
      "addressRegion": "VT",
      "postalCode": "05676",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 44.3378,
      "longitude": -72.7562
    },
    "priceRange": "$$"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Section withGrid spacing="none" className="min-h-[85vh] md:min-h-screen flex items-center pt-20 md:pt-48 overflow-hidden">
        {/* Cinematic Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          <LightLeak color="violet" intensity="high" className="-top-1/4 -left-1/4 scale-150 opacity-30 animate-pulse" />
          <LightLeak color="amber" intensity="medium" className="bottom-0 -right-1/4 scale-125 opacity-20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
        </div>

        <div className="text-center relative z-10 w-full px-4">
          {/* Elite Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6 md:mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse shadow-[0_0_10px_#fbbf24]" />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/70 whitespace-nowrap">Vermont's Premier Detailer</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl md:text-[130px] font-black tracking-tighter text-white mb-6 md:mb-8 leading-[0.9] md:leading-[0.85] drop-shadow-2xl">
              <span className="block overflow-hidden h-fit">
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  ARISE <span className="text-[#fbbf24]">&</span>
                </motion.span>
              </span>
              <span className="block overflow-hidden h-fit">
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] via-white to-[#8b5cf6] bg-[length:200%_auto] animate-shimmer block"
                >
                  SHINE VT
                </motion.span>
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-base md:text-2xl text-white/50 max-w-4xl mx-auto mb-10 md:mb-14 leading-relaxed font-medium"
          >
            Surgical precision meets unrivaled brilliance. We redefine the standard of excellence for Vermont's most distinguished collections.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
          >
            <PrismButton 
              variant="gold" 
              className="w-full sm:w-auto text-xs md:text-lg py-4 md:py-6 px-8 md:px-12 group"
              onClick={onBookClick}
            >
              <span className="relative z-10">Secure Your Session</span>
            </PrismButton>
            <PrismButton 
              variant="outline" 
              className="w-full sm:w-auto text-xs md:text-lg py-4 md:py-6 px-8 md:px-12 border-white/10 hover:border-white/30"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore Services
            </PrismButton>
          </motion.div>
        </div>

        {/* Floating Decorative Elements */}
        <motion.div 
          animate={{ 
            y: [0, -30, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-[15%] w-64 md:w-96 h-64 md:h-96 glass rounded-full blur-3xl opacity-[0.02] md:opacity-[0.03] pointer-events-none will-change-transform"
        />
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-4"
        >
          <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.5em] text-white/20">Scroll</span>
          <div className="w-[1px] h-8 md:h-12 bg-linear-to-b from-[#fbbf24]/40 to-transparent" />
        </motion.div>
      </Section>
    </>
  );
}
