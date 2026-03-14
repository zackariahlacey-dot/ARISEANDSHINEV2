"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";

export default function About() {
  return (
    <Section id="about" spacing="none" className="relative overflow-hidden bg-[#050505] hidden md:block py-24 md:py-48 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">The Master Detailer</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-10 italic">
          Precision <span className="text-white/10">DNA</span>
        </motion.h2>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-24 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-12"
        >
          <div className="space-y-8 text-center md:text-left">
            <p className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
              Engineering <span className="text-[#fbbf24]">Brilliance</span>
            </p>
            <p className="text-white/40 text-lg md:text-xl font-medium leading-relaxed italic">
              "Arise & Shine was founded on a singular principle: that automotive care should be an exercise in clinical precision. We don't just clean vehicles; we restore their soul through a disciplined, systematic approach to surface engineering."
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-12 border-t border-white/5">
            <div>
              <p className="text-4xl font-black text-white italic mb-2 tracking-tighter">100%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Manual_Process</p>
            </div>
            <div>
              <p className="text-4xl font-black text-[#fbbf24] italic mb-2 tracking-tighter">ZERO</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Compromise_Rate</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="aspect-[4/5] overflow-hidden glass-panel rounded-[40px] border-none bg-white/[0.01]">
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent z-10" />
            <img 
              src="/aasbanner.png" 
              alt="Studio Environment" 
              className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000"
            />
            
            <div className="absolute bottom-12 left-12 right-12 z-20">
              <div className="h-px w-12 bg-[#fbbf24] mb-6" />
              <p className="text-[10px] font-black text-[#fbbf24] uppercase tracking-[0.5em] mb-2">Master_Detailer</p>
              <p className="text-3xl font-black text-white uppercase tracking-tighter italic">Zachariah Lacey</p>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
