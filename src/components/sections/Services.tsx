"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { Check, Sparkles, Shield, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  {
    name: "Interior",
    price: "150",
    features: ["Steam Sanitization", "Full Extraction", "Leather Care", "Odor Removal"],
    color: "#8b5cf6",
    glow: "violet"
  },
  {
    name: "Exterior",
    price: "125",
    features: ["Deionized Wash", "Clay Bar Prep", "Hand Wax", "Wheel Detail"],
    color: "#fbbf24",
    glow: "amber"
  },
  {
    name: "Elite Full",
    price: "250",
    features: ["Full Restore", "Hyper Gloss Wax", "Stain Removal", "Clarity Check"],
    color: "#fbbf24",
    featured: true,
    glow: "amber"
  },
];

export default function Services({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / (scrollRef.current.offsetWidth * 0.8));
    setActiveIndex(index);
  };

  return (
    <Section id="services" spacing="none" className="py-12 md:py-24 bg-black overflow-hidden border-y border-white/5 relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 px-6 md:px-12 max-w-[1600px] mx-auto relative z-10">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#fbbf24] shadow-[0_0_10px_#fbbf24]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Technical Specs</span>
          </div>
          <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">Detailing <span className="text-[#fbbf24]">Core</span></h2>
        </div>
        <div className="flex items-center gap-4 text-[#fbbf24] animate-pulse">
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">Swipe to Initialize</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 md:px-12 pb-12 relative z-10 max-w-[1600px] mx-auto"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-[400px] h-full snap-center group"
          >
            <div className={cn(
              "h-full p-8 md:p-12 rounded-[32px] border transition-all duration-700 flex flex-col relative overflow-hidden",
              pkg.featured 
                ? "bg-white/[0.03] border-[#fbbf24]/30 shadow-[0_0_60px_rgba(251,191,36,0.05)]" 
                : "bg-white/[0.01] border-white/5 hover:border-white/20"
            )}>
              {/* Animated Glow on Hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none",
                pkg.glow === 'violet' ? "bg-[#8b5cf6]" : "bg-[#fbbf24]"
              )} />

              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-[#fbbf24] transition-colors duration-500">{pkg.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", pkg.color === '#fbbf24' ? "bg-[#fbbf24]" : "bg-[#8b5cf6]")} />
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Active System</span>
                  </div>
                </div>
                <p className="text-3xl md:text-5xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform duration-700">${pkg.price}</p>
              </div>

              <div className="space-y-4 mb-12 flex-grow relative z-10">
                {pkg.features.map(f => (
                  <div key={f} className="flex items-center gap-4 group/item">
                    <Check className="w-4 h-4 text-[#fbbf24] opacity-20 group-hover/item:opacity-100 transition-opacity" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{f}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 text-[10px] tracking-[0.4em] font-black relative overflow-hidden group/btn"
                onClick={() => onSelectService?.(pkg.name)}
              >
                <span className="relative z-10 flex items-center gap-2">Initialize {pkg.name} <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" /></span>
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-4 px-6 relative z-10">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-1 transition-all duration-700 rounded-full", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-3 bg-white/5")} />
        ))}
      </div>
    </Section>
  );
}
