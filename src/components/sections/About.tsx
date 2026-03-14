"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";

export default function About() {
  return (
    <Section id="about" spacing="none" className="relative overflow-hidden bg-[#020202] hidden md:block py-24 md:py-48 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 relative z-10">
        <div className="flex items-center gap-6 mb-8">
          <span className="text-variable">Index_06</span>
          <div className="h-[1px] flex-grow bg-white/5" />
          <span className="text-variable">Studio_Philosophy</span>
        </div>
        <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none italic">
          Precision <br /> <span className="text-white/10">DNA</span>
        </h2>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-24 items-start relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-12"
        >
          <div className="space-y-6">
            <p className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
              Engineering <span className="text-[#fbbf24]">Brilliance</span>
            </p>
            <p className="text-white/40 text-lg md:text-xl font-medium leading-relaxed">
              Arise & Shine was founded on a singular principle: that automotive care should be an exercise in clinical precision. We don't just clean vehicles; we restore their soul through a disciplined, systematic approach to surface engineering.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-12 border-t border-white/5">
            <div>
              <p className="text-3xl font-black text-white italic mb-2">100%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Manual_Process</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#fbbf24] italic mb-2">ZERO</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Compromise_Rate</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="aspect-[4/5] overflow-hidden studio-slab border-none bg-white/[0.01]">
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent z-10" />
            <img 
              src="/aasbanner.png" 
              alt="Studio Environment" 
              className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000"
            />
            
            <div className="absolute bottom-12 left-12 right-12 z-20">
              <div className="h-px w-full bg-[#fbbf24]/30 mb-6" />
              <p className="text-[10px] font-black text-[#fbbf24] uppercase tracking-[0.5em] mb-2">Master_Detailer</p>
              <p className="text-2xl font-black text-white uppercase tracking-tighter italic">Zachariah Lacey</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Art Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] select-none pointer-events-none">
        <span className="text-[200px] md:text-[500px] font-black text-white leading-none">CORE</span>
      </div>
    </Section>
  );
}
