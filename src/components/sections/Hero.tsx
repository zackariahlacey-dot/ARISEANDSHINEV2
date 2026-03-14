"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#030303] relative">
      {/* Organic Mesh Atmosphere */}
      <div className="mesh-gradient" />
      
      <div className="text-center relative z-10 w-full px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Vermont's Premier Mobile Detailing</span>
          </div>

          <h1 className="text-6xl md:text-[130px] font-black tracking-tight text-white leading-[0.85] mb-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            ARISE <br /> <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] via-white to-white/40">SHINE VT</span>
          </h1>

          <p className="text-lg md:text-2xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
            Professional interior restoration and high-gloss paint protection. We bring the studio experience to your doorstep.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <PrismButton 
            variant="gold" 
            className="w-full sm:w-auto text-sm font-bold py-6 px-12 rounded-2xl shadow-[0_20px_40px_rgba(251,191,36,0.15)]"
            onClick={onBookClick}
          >
            Schedule Your Session
          </PrismButton>
          <button 
            className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors py-4 px-8"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explore Services
          </button>
        </motion.div>
      </div>

      {/* Subtle Bottom Accent */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20">
        <span className="text-[8px] font-bold uppercase tracking-[0.5em]">Scroll to Discover</span>
        <div className="w-px h-12 bg-linear-to-b from-white to-transparent" />
      </div>
    </Section>
  );
}
