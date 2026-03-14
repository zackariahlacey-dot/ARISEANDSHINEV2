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
        {/* Avant-Garde Background Blooms */}
        <div className="color-bloom bg-[#fbbf24] -top-[20%] -left-[10%] animate-pulse" />
        <div className="color-bloom bg-[#8b5cf6] -bottom-[30%] -right-[10%]" />
        
        <div className="relative z-10 w-full px-6 max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: The Statement */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-6 mb-8">
                <span className="text-variable">Index_00</span>
                <div className="h-[1px] w-24 bg-white/20" />
                <span className="text-variable">Protocol_VT_Mobile</span>
              </div>

              <h1 className="text-7xl md:text-[180px] font-black tracking-tight text-white leading-[0.75] mb-12 uppercase italic">
                Arise <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] via-white to-white/20">
                  Shine VT
                </span>
              </h1>

              <div className="max-w-xl">
                <p className="text-xl md:text-3xl text-white/40 font-light leading-relaxed mb-12 uppercase tracking-tighter">
                  Vermont's elite mobile detailing studio. <br />
                  <span className="font-black text-white italic">Clinical precision.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-8 items-center">
                <PrismButton 
                  variant="gold" 
                  className="w-full sm:w-auto text-xs font-black py-7 px-16 rounded-none uppercase tracking-widest shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                  onClick={onBookClick}
                >
                  RESERVE_SESSION
                </PrismButton>
                <button 
                  className="text-xs font-black text-white/20 hover:text-white uppercase tracking-[0.4em] transition-all border-b border-white/5 pb-1"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  BROWSE_SYSTEMS [→]
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Creative Metadata */}
          <div className="lg:col-span-4 hidden lg:flex flex-col items-end text-right space-y-20 pt-20">
            <div className="space-y-4">
              <p className="text-variable">Region</p>
              <p className="text-xl font-black text-white uppercase tracking-tighter italic">Central_Vermont</p>
            </div>
            <div className="space-y-4">
              <p className="text-variable">Standard</p>
              <p className="text-xl font-black text-[#fbbf24] uppercase tracking-tighter">Elite_Detailing</p>
            </div>
            <div className="space-y-4 opacity-20">
              <p className="text-variable">Manifest</p>
              <p className="text-[10px] font-bold text-white uppercase">AAS_v3.0_Studio</p>
            </div>
          </div>

        </div>

        {/* Floating Art Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] select-none pointer-events-none -z-10">
          <span className="text-[300px] md:text-[600px] font-black text-white leading-none">AAS</span>
        </div>
      </Section>
    </>
  );
}
