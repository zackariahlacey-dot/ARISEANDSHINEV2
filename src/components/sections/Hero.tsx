"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="none" className="min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden bg-black relative">
      {/* Precision Frame */}
      <div className="absolute inset-8 border border-white/5 pointer-events-none hidden md:block" />
      
      <div className="text-center relative z-10 w-full px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="flex items-center justify-center gap-6 mb-16">
            <span className="text-micro">Est. 2023</span>
            <div className="w-1 h-1 rounded-full bg-[#fbbf24]" />
            <span className="text-micro">Central Vermont</span>
          </div>

          <h1 className="text-7xl md:text-[180px] font-black tracking-tighter text-white leading-[0.8] mb-16">
            Arise <br /> 
            <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/10">Shine VT</span>
          </h1>

          <div className="max-w-2xl mx-auto border-y border-white/10 py-10 mb-16 relative">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border border-white/20 rotate-45" />
            <p className="text-xl md:text-2xl text-white/40 font-bold uppercase tracking-tight italic">
              Surgical precision for Vermont's <br /> most distinguished collections.
            </p>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border border-white/20 rotate-45" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-12"
        >
          <PrismButton 
            variant="gold" 
            className="w-full sm:w-auto text-[10px] font-black py-7 px-20 rounded-none uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(251,191,36,0.1)]"
            onClick={onBookClick}
          >
            RESERVE SESSION
          </PrismButton>
          <button 
            className="text-micro hover:text-white transition-colors border-b border-white/10 pb-1"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            THE CATALOGUE [→]
          </button>
        </motion.div>
      </div>

      {/* Boutique Metadata - Creative Detail */}
      <div className="absolute bottom-12 left-12 hidden lg:block text-left">
        <p className="text-micro mb-1">Status</p>
        <p className="text-[10px] font-black text-white uppercase">Studio_Ready</p>
      </div>
      <div className="absolute bottom-12 right-12 hidden lg:block text-right">
        <p className="text-micro mb-1">Navigation</p>
        <p className="text-[10px] font-black text-white uppercase italic">Scroll_to_explore</p>
      </div>
    </Section>
  );
}
