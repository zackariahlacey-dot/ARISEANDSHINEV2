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
      
      <Section withGrid spacing="none" className="min-h-[90vh] md:min-h-screen flex items-center pt-16 md:pt-48 overflow-hidden bg-black">
        {/* Cinematic Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          {/* Mobile Optimized Leaks - Tighter and more localized */}
          <LightLeak color="violet" intensity="high" className="-top-1/4 -left-1/4 scale-125 opacity-20 md:opacity-30 md:scale-150 animate-pulse" />
          <LightLeak color="amber" intensity="medium" className="bottom-0 -right-1/4 scale-110 opacity-15 md:opacity-20 md:scale-125" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03)_0%,transparent_70%)]" />
        </div>

        <div className="text-center relative z-10 w-full px-6">
          {/* Elite Badge - Scaled for impact */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 md:mb-10"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse shadow-[0_0_10px_#fbbf24]" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/70">Vermont's Premier Detailer</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-6xl md:text-[130px] font-black tracking-tighter text-white mb-8 md:mb-10 leading-[0.85] drop-shadow-2xl">
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
            className="text-lg md:text-2xl text-white/40 max-w-4xl mx-auto mb-12 md:mb-16 leading-relaxed font-medium"
          >
            Surgical precision meets <br className="md:hidden" /> unrivaled brilliance. 
            <span className="hidden md:inline"> We redefine the standard of excellence for Vermont's most distinguished collections.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 max-w-xs md:max-w-none mx-auto"
          >
            <PrismButton 
              variant="gold" 
              className="w-full sm:w-auto text-[10px] md:text-lg py-5 md:py-6 px-10 md:px-12"
              onClick={onBookClick}
            >
              Secure Session
            </PrismButton>
            <PrismButton 
              variant="outline" 
              className="w-full sm:w-auto text-[10px] md:text-lg py-5 md:py-6 px-10 md:px-12 border-white/10"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Services
            </PrismButton>
          </motion.div>
        </div>

        {/* Floating Decorative Elements - Scaled for Mobile */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-[10%] w-48 md:w-96 h-48 md:h-96 glass rounded-full blur-3xl opacity-[0.03] pointer-events-none will-change-transform"
        />
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-4"
        >
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Scroll</span>
          <div className="w-[1px] h-10 md:h-12 bg-linear-to-b from-[#fbbf24]/40 to-transparent" />
        </motion.div>
      </Section>
    </>
  );
}
