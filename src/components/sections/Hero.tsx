"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#050505] relative">
      {/* Orbital Spotlights */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="orbital-glow w-[600px] h-[600px] bg-[#fbbf24] -top-48 -left-48" 
      />
      <motion.div 
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="orbital-glow w-[800px] h-[800px] bg-[#8b5cf6] -bottom-96 -right-48" 
      />

      <div className="text-center relative z-10 w-full px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-12"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.6em] text-[#fbbf24]/60 mb-6 block">The Gold Standard</span>
          <h1 className="text-6xl md:text-[140px] font-black tracking-tighter text-white leading-[0.8] mb-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            ARISE <br /> <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/20">SHINE VT</span>
          </h1>
          <p className="text-lg md:text-2xl text-white/40 max-w-3xl mx-auto font-medium leading-relaxed italic">
            "Every surface is a masterwork. Every session is a restoration of pride."
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8"
        >
          <PrismButton 
            variant="gold" 
            className="w-full sm:w-auto text-xs md:text-sm py-6 md:py-7 px-12 md:px-16 rounded-full"
            onClick={onBookClick}
          >
            Secure Session
          </PrismButton>
          <button 
            className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Browse Collections →
          </button>
        </motion.div>
      </div>

      {/* Floating Elements */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-20">
        <div className="w-px h-24 bg-linear-to-b from-white to-transparent" />
      </div>
    </Section>
  );
}
