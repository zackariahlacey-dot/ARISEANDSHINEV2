"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#020202] relative">
      {/* Structural Accents */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Technical Metadata - Corner Creative Flair */}
      <div className="absolute top-32 left-12 hidden lg:block">
        <p className="font-mono-tech mb-2">Location_Coordinate</p>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">44.3378° N, 72.7562° W</p>
      </div>
      <div className="absolute top-32 right-12 hidden lg:block text-right">
        <p className="font-mono-tech mb-2">Established_Date</p>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Central Vermont_2023</p>
      </div>

      <div className="text-center relative z-10 w-full px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-4 mb-12">
            <div className="h-[1px] w-8 bg-[#fbbf24]" />
            <span className="font-mono-tech text-[#fbbf24]">The Detailing Authority</span>
            <div className="h-[1px] w-8 bg-[#fbbf24]" />
          </div>

          <h1 className="text-7xl md:text-[160px] font-black tracking-tighter text-white leading-[0.75] mb-12 uppercase drop-shadow-2xl">
            Arise <br /> 
            <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/10">Shine VT</span>
          </h1>

          <div className="max-w-2xl mx-auto precision-line pb-8 mb-12">
            <p className="text-lg md:text-xl text-white/40 font-bold uppercase tracking-tight leading-relaxed">
              Surgical precision for Vermont's <br /> most distinguished collections.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-10"
        >
          <PrismButton 
            variant="gold" 
            className="w-full sm:w-auto text-xs font-black py-6 px-16 rounded-none uppercase tracking-widest"
            onClick={onBookClick}
          >
            Secure Session
          </PrismButton>
          <button 
            className="font-mono-tech hover:text-white transition-colors"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explore_Catalog [→]
          </button>
        </motion.div>
      </div>

      {/* Vertical Structural Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 hidden lg:block -z-10" />
    </Section>
  );
}
