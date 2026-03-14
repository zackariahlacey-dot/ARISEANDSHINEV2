"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDetailing",
    "name": "Arise & Shine VT",
    "image": "https://ariseandshinevt.com/aasbanner.png",
    "description": "Vermont's premier mobile detailing studio. Specializing in surgical interior restoration, high-gloss paint protection, and elite concierge automotive care. We bring the clinical studio experience to your location.",
    "url": "https://ariseandshinevt.com",
    "telephone": "802-585-5563",
    "priceRange": "$$",
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
    "areaServed": {
      "@type": "State",
      "name": "Vermont"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Elite Detailing Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Surgical Interior Restoration"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Hyper Gloss Paint Protection"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Elite Full Transformation"
          }
        }
      ]
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Section withGrid spacing="none" className="min-h-screen flex items-center justify-center pt-24 overflow-hidden bg-[#020202] relative">
        {/* Atmospheric Atmosphere */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.03)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#fbbf24]/10 to-transparent" />
        
        <div className="relative z-10 w-full px-6 max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 mb-10">
              <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse shadow-[0_0_10px_#fbbf24]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">Vermont's Elite Mobile Detailing</span>
            </div>

            <h1 className="text-6xl md:text-[150px] font-black tracking-tight text-white leading-[0.8] mb-10 uppercase italic">
              Arise <br /> 
              <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-white/80 to-white/20">Shine VT</span>
            </h1>

            <div className="max-w-3xl mx-auto mb-16">
              <p className="text-xl md:text-4xl font-black text-white/40 uppercase tracking-tighter leading-none mb-6">
                Mobile Studio. <span className="text-white">Clinical Precision.</span>
              </p>
              <p className="text-sm md:text-lg text-white/30 font-medium max-w-xl mx-auto leading-relaxed">
                Elite on-site restoration for Vermont's most distinguished automotive collections. We bring the studio to you.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <PrismButton 
                variant="gold" 
                className="w-full sm:w-auto text-xs font-black py-7 px-16 rounded-none uppercase tracking-widest shadow-[0_20px_50px_rgba(251,191,36,0.1)]"
                onClick={onBookClick}
              >
                Reserve Session
              </PrismButton>
              <button 
                className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-[0.4em] transition-all border-b border-white/5 pb-1"
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Browse Systems [→]
              </button>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Watermark */}
        <div className="absolute -bottom-10 right-10 opacity-[0.02] select-none pointer-events-none hidden md:block">
          <span className="text-[250px] font-black text-white italic uppercase leading-none">Vermont</span>
        </div>
      </Section>
    </>
  );
}
