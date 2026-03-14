"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";

export default function Hero({ onBookClick }: { onBookClick?: () => void }) {
  return (
    <Section withGrid spacing="large" className="min-h-screen flex items-center pt-32 md:pt-48 overflow-hidden">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 z-0">
        <LightLeak color="violet" intensity="high" className="-top-1/4 -left-1/4 scale-150 opacity-30 animate-pulse" />
        <LightLeak color="amber" intensity="medium" className="bottom-0 -right-1/4 scale-125 opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="text-center relative z-10 w-full">
        {/* Elite Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
        >
          <div className="w-2 h-2 rounded-full bg-[#fbbf24] animate-pulse shadow-[0_0_10px_#fbbf24]" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70">Vermont's Premier Detailer</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-5xl md:text-[120px] font-black tracking-tighter text-white mb-8 leading-[0.9] drop-shadow-2xl">
            Arise <span className="text-[#fbbf24]">&</span> <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] via-[#8b5cf6] to-[#f472b6] bg-[length:200%_auto] animate-shimmer">
              Shine VT
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-lg md:text-2xl text-white/50 max-w-4xl mx-auto mb-14 leading-relaxed font-medium"
        >
          Surgical precision meets unrivaled brilliance. We redefine the standard of automotive excellence for Vermont's most distinguished collections.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <PrismButton 
            variant="luxury" 
            className="w-full sm:w-auto text-lg py-5 px-10 group"
            onClick={onBookClick}
          >
            <span className="relative z-10">Secure Your Session</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </PrismButton>
          <PrismButton 
            variant="outline" 
            className="w-full sm:w-auto text-lg py-5 px-10 border-white/10 hover:border-white/30"
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Explore Services
          </PrismButton>
        </motion.div>
      </div>

      {/* Floating Decorative Elements */}
      <motion.div 
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-[10%] w-64 h-64 glass rounded-full blur-3xl opacity-10 pointer-events-none will-change-transform"
      />
      <motion.div 
        animate={{ 
          y: [0, 20, 0],
          rotate: [0, -5, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 left-[5%] w-80 h-80 bg-[#8b5cf6]/20 rounded-full blur-3xl opacity-10 pointer-events-none will-change-transform"
      />

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/20">Scroll</span>
        <div className="w-[1px] h-12 bg-linear-to-b from-white/40 to-transparent" />
      </motion.div>
    </Section>
  );
}
