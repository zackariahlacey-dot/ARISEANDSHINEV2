"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#050505] relative">
      {/* Cinematic Atmosphere */}
      <div className="atmosphere-glow bg-[#fbbf24] -top-48 -left-48 opacity-[0.05]" />
      <div className="atmosphere-glow bg-[#8b5cf6] -bottom-48 -right-48 opacity-[0.05]" />
      
      <div className="text-center relative z-10 w-full px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Vermont's Premier Mobile Detailing</span>
          </div>

          <h1 className="text-6xl md:text-[140px] font-black tracking-tight text-white leading-[0.85] mb-12 uppercase italic">
            Arise <br /> 
            <span className="text-reveal">Shine VT</span>
          </h1>

          <p className="text-lg md:text-2xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed mb-16 italic">
            "Surgical precision meets unrivaled brilliance. We bring the elite detailing studio directly to your home or office."
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-10"
        >
          <PrismButton 
            variant="gold" 
            className="w-full sm:w-auto text-sm font-bold py-7 px-16 rounded-full shadow-[0_20px_50px_rgba(251,191,36,0.1)]"
            onClick={onBookClick}
          >
            Reserve Session
          </PrismButton>
          <button 
            className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors border-b border-white/10 pb-1"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explore Services
          </button>
        </motion.div>
      </div>

      {/* Floating Graphic Element */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-10">
        <div className="w-[1px] h-24 bg-linear-to-b from-white to-transparent" />
      </div>
    </Section>
  );
}
