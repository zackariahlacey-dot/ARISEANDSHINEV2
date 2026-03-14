"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ShieldCheck, Zap, Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const plans = [
  {
    name: "Interior",
    price: "99",
    benefits: ["Monthly Detail", "Fixed Pricing", "Priority Access", "Deodorization"],
    color: "#8b5cf6"
  },
  {
    name: "Elite",
    price: "199",
    benefits: ["Full Monthly", "Wax Maintenance", "Concierge Line", "Surface Upgrades"],
    color: "#8b5cf6",
    featured: true
  },
];

export default function Maintenance({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / (scrollRef.current.offsetWidth * 0.8));
    setActiveIndex(index);
  };

  return (
    <Section id="maintenance" spacing="none" className="py-12 md:py-24 bg-black overflow-hidden relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 px-6 md:px-12 max-w-[1600px] mx-auto relative z-10">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Continuity Program</span>
          </div>
          <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">Prestige <span className="text-[#8b5cf6]">Vault</span></h2>
        </div>
        <div className="flex items-center gap-4 text-[#8b5cf6] animate-pulse">
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">Swipe to Sync</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 md:px-12 pb-12 relative z-10 max-w-[1600px] mx-auto"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-[500px] h-full snap-center group"
          >
            <div className={cn(
              "h-full p-8 md:p-16 rounded-[40px] border transition-all duration-700 flex flex-col relative overflow-hidden",
              plan.featured 
                ? "bg-white/[0.03] border-[#8b5cf6]/30 shadow-[0_0_60px_rgba(139,92,246,0.05)]" 
                : "bg-white/[0.01] border-white/5 hover:border-white/20"
            )}>
              {/* Technical Glow */}
              <div className="absolute inset-0 bg-[#8b5cf6] opacity-0 group-hover:opacity-[0.03] transition-opacity duration-1000 pointer-events-none" />

              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                  <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-[#8b5cf6] transition-colors duration-500">{plan.name} Plan</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Recursive Protocol</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl md:text-6xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform duration-700">${plan.price}</p>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Per Month</p>
                </div>
              </div>

              <div className="space-y-4 mb-12 flex-grow relative z-10">
                {plan.benefits.map(b => (
                  <div key={b} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-[#8b5cf6]/30 group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{b}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"}
                className="w-full py-6 md:py-8 text-[10px] tracking-[0.4em] font-black group/btn"
                onClick={() => onSelectService?.(plan.name)}
              >
                <span className="relative z-10 flex items-center gap-2">Sync Access <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" /></span>
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-4 px-6 relative z-10">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-1 transition-all duration-700 rounded-full", activeIndex === i ? "w-12 bg-[#8b5cf6]" : "w-3 bg-white/5")} />
        ))}
      </div>
    </Section>
  );
}
