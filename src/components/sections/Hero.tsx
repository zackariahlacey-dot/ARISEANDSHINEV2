"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex flex-col items-center justify-center pt-24 overflow-hidden bg-black relative studio-grid">
      {/* Structural Dividers */}
      <div className="absolute top-0 left-0 w-full h-[30vh] border-b border-white/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 w-px h-full border-l border-white/5 pointer-events-none" />

      <div className="relative z-10 w-full px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Metadata Sidebar - Creative Flair */}
          <div className="lg:col-span-3 space-y-12 hidden lg:block border-l-2 border-[#fbbf24] pl-6 py-4">
            <div>
              <p className="mono-label mb-2">Location_Node</p>
              <p className="text-xs font-black text-white uppercase">Central Vermont_US</p>
            </div>
            <div>
              <p className="mono-label mb-2">Service_Tier</p>
              <p className="text-xs font-black text-[#fbbf24] uppercase tracking-wider">Elite Mobile Restoration</p>
            </div>
            <div>
              <p className="mono-label mb-2">Version_Manifest</p>
              <p className="text-[10px] font-bold text-white/20 uppercase">AAS_v3.0_Studio_Build</p>
            </div>
          </div>

          {/* Main Monolith Typography */}
          <div className="lg:col-span-9">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.2, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-3 h-3 bg-[#fbbf24] animate-pulse-fast shadow-[0_0_15px_#fbbf24]" />
                <span className="text-sm font-black uppercase tracking-[0.4em] text-white/40">Active Session</span>
              </div>

              <h1 className="text-7xl md:text-[180px] font-black tracking-tight text-white mb-12 drop-shadow-[0_0_100px_rgba(251,191,36,0.1)]">
                ARISE <br /> <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-[#fbbf24] to-white/20">SHINE</span>
              </h1>

              <div className="max-w-xl border-t border-white/10 pt-8 mb-16">
                <p className="text-lg md:text-2xl text-white/40 font-bold uppercase tracking-tighter leading-[0.9]">
                  Surgical precision. <br /> 
                  <span className="text-white">Unrivaled brilliance.</span> <br />
                  <span className="text-white/20">Mobile automotive studio.</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-6 items-center">
                <PrismButton 
                  variant="gold" 
                  className="text-xs font-black py-6 px-12 rounded-none border-2 border-[#fbbf24]"
                  onClick={onBookClick}
                >
                  INITIALIZE_BOOKING
                </PrismButton>
                <button 
                  className="mono-label hover:text-white transition-colors border-b border-white/10 pb-1"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  EXPLORE_CORE_SYSTEMS [→]
                </button>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Background Graphic */}
      <div className="absolute -bottom-20 left-0 w-full opacity-[0.03] select-none pointer-events-none">
        <span className="text-[200px] md:text-[400px] font-black text-white leading-none tracking-tighter">PRESTIGE</span>
      </div>
    </Section>
  );
}
