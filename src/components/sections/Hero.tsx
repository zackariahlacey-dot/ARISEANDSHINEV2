"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex flex-col items-center justify-center pt-24 overflow-hidden bg-black relative luxe-grid">
      {/* Structural Accents */}
      <div className="absolute top-0 left-0 w-full h-[25vh] border-b border-white/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 w-px h-full border-l border-white/5 pointer-events-none" />

      <div className="relative z-10 w-full px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Metadata Sidebar - Refined Terminology */}
          <div className="lg:col-span-3 space-y-16 hidden lg:block border-l-2 border-[#fbbf24] pl-8 py-6">
            <div>
              <p className="label-mono mb-2">Studio_Location</p>
              <p className="text-[11px] font-black text-white uppercase tracking-tighter">Central Vermont // US</p>
            </div>
            <div>
              <p className="label-mono mb-2">Service_Standard</p>
              <p className="text-[11px] font-black text-[#fbbf24] uppercase tracking-wider">Elite Automotive Care</p>
            </div>
            <div>
              <p className="label-mono mb-2">Creative_Direction</p>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Vizulux_Prestige_Build</p>
            </div>
          </div>

          {/* Main Hero Monolith */}
          <div className="lg:col-span-9">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-2 h-2 rounded-full bg-[#fbbf24] shadow-[0_0_20px_#fbbf24]" />
                <span className="text-xs font-black uppercase tracking-[0.5em] text-white/40">Studio_Active</span>
              </div>

              <h1 className="text-7xl md:text-[170px] font-black tracking-tight text-white mb-14 drop-shadow-[0_0_80px_rgba(255,255,255,0.05)]">
                ARISE <br /> <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-[#fbbf24] to-white/30">SHINE VT</span>
              </h1>

              <div className="max-w-2xl border-t border-white/10 pt-10 mb-16">
                <p className="text-xl md:text-3xl text-white/40 font-bold uppercase tracking-tighter leading-[0.85]">
                  Surgical precision for <br /> 
                  <span className="text-white">discerning collections.</span> <br />
                  <span className="text-white/20 italic">The gold standard of Vermont.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-10 items-center">
                <PrismButton 
                  variant="gold" 
                  className="text-xs font-black py-7 px-16 rounded-none border-2 border-[#fbbf24] shadow-[0_20px_50px_rgba(251,191,36,0.1)]"
                  onClick={onBookClick}
                >
                  RESERVE_SESSION
                </PrismButton>
                <button 
                  className="label-mono hover:text-white transition-colors border-b border-white/10 pb-1"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  VIEW_COLLECTIONS [→]
                </button>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Floating Prestige Watermark */}
      <div className="absolute -bottom-16 left-0 w-full opacity-[0.02] select-none pointer-events-none text-center">
        <span className="text-[150px] md:text-[350px] font-black text-white leading-none tracking-tighter">PRESTIGE</span>
      </div>
    </Section>
  );
}
