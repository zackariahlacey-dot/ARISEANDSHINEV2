"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { LightLeak } from "@/components/ui/LightLeak";
import { Shield, Sparkles, Trophy, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  { 
    title: "Artisanal Approach", 
    desc: "Every stroke is intentional. Every surface is respected.",
    icon: <Sparkles className="w-5 h-5 text-[#fbbf24]" />
  },
  { 
    title: "Elite Chemistry", 
    desc: "Only the world's most advanced formulas touch your paint.",
    icon: <Trophy className="w-5 h-5 text-[#8b5cf6]" />
  },
  { 
    title: "Surgical Focus", 
    desc: "We see what others miss. Precision is our baseline.",
    icon: <Shield className="w-5 h-5 text-[#fbbf24]" />
  },
];

export default function About() {
  return (
    <Section id="about" spacing="large" className="relative overflow-hidden bg-[#050505]">
      {/* Visual Accents */}
      <LightLeak color="violet" intensity="medium" className="-top-1/4 -left-1/4 opacity-30" />
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* Left Column: The Large Typography & Context */}
          <div className="lg:col-span-7 space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">The Philosophy</span>
              </div>
              
              <h2 className="text-5xl md:text-[90px] font-black text-white leading-[0.85] tracking-tighter mb-10">
                Precision detailing for <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] via-white to-white/40">
                  Vermont's finest
                </span> <br />
                vehicles.
              </h2>

              <p className="text-xl md:text-2xl text-white/40 max-w-2xl leading-relaxed font-medium italic border-l-4 border-[#fbbf24]/30 pl-8">
                "We don't just clean cars; we restore the emotional connection between driver and machine."
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-500">
                    {feature.icon}
                  </div>
                  <h4 className="text-white font-bold text-sm mb-2">{feature.title}</h4>
                  <p className="text-white/30 text-xs leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: The Visual Masterpiece */}
          <div className="lg:col-span-5 relative mt-12 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative aspect-[4/5] rounded-[40px] overflow-hidden border border-white/10"
            >
              <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-amber-500/10" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                <motion.span 
                  animate={{ opacity: [0.05, 0.1, 0.05] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="text-[180px] font-black text-white select-none leading-none tracking-tighter"
                >
                  AS
                </motion.span>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
                  <div className="h-px w-24 bg-[#fbbf24] mx-auto mb-6" />
                  <p className="text-white font-black tracking-[0.8em] uppercase text-xs mb-2">Established</p>
                  <p className="text-[#fbbf24] font-black text-5xl tracking-tighter">2023</p>
                </div>
              </div>

              {/* Floating Interaction UI */}
              <div className="absolute bottom-8 left-8 right-8 p-6 glass border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#fbbf24] flex items-center justify-center">
                    <MousePointer2 className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Experience</p>
                    <p className="text-white/40 text-[9px] uppercase tracking-widest">The Arise Standard</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-right">
                  <p className="text-[#fbbf24] text-xs font-black">100%</p>
                  <p className="text-white/20 text-[8px] uppercase tracking-widest">Hand Crafted</p>
                </div>
              </div>
            </motion.div>

            {/* Decorative Orbs */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#fbbf24]/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#8b5cf6]/20 rounded-full blur-3xl" />
          </div>

        </div>
      </div>
    </Section>
  );
}
