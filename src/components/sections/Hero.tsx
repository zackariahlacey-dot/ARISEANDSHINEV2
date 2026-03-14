"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#050505] relative">
      {/* Editorial Spotlights */}
      <div className="soft-glow w-[800px] h-[800px] bg-[#fbbf24] -top-96 -left-48" />
      <div className="soft-glow w-[1000px] h-[1000px] bg-white -bottom-[500px] -right-48" />

      <div className="text-center relative z-10 w-full px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="h-px w-12 bg-white/10" />
            <span className="text-[10px] luxury-text text-white/40 tracking-[0.4em]">Established 2023</span>
            <div className="h-px w-12 bg-white/10" />
          </div>

          <h1 className="text-7xl md:text-[150px] font-black text-white leading-[0.8] mb-12 italic">
            Arise <br /> 
            <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/30">Shine VT</span>
          </h1>

          <p className="text-lg md:text-2xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed italic mb-16">
            Elite mobile detailing for Central Vermont's most <br className="hidden md:block" /> distinguished automotive collections.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-12"
        >
          <PrismButton 
            variant="gold" 
            className="w-full sm:w-auto text-xs font-black py-7 px-16 rounded-none uppercase tracking-[0.2em]"
            onClick={onBookClick}
          >
            Reserve Session
          </PrismButton>
          <button 
            className="text-[10px] luxury-text text-white/30 hover:text-white transition-colors border-b border-white/10 pb-1"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Browse Services
          </button>
        </motion.div>
      </div>

      {/* Minimal Scroll Accent */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-10">
        <div className="w-[1px] h-20 bg-linear-to-b from-white to-transparent" />
      </div>
    </Section>
  );
}
