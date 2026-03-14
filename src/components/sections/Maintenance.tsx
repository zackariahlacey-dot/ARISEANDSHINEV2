"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const plans = [
  {
    id: "04",
    name: "Interior Monthly",
    price: "99",
    specs: ["Full Monthly Detail", "Fixed Executive Rate", "Priority VIP Scheduling", "Complimentary Deodorization"],
  },
  {
    id: "05",
    name: "Elite Monthly",
    price: "199",
    specs: ["Full Monthly Elite Detail", "Wax Maintenance Sync", "Concierge Direct Line", "Seasonal Surface Upgrades"],
    featured: true
  },
];

export default function Maintenance({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    setActiveIndex(index);
  };

  return (
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-[#050505] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 text-center">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mb-8">
          <span className="text-[10px] luxury-text text-[#8b5cf6] tracking-[0.5em]">The Continuity Circle</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-9xl font-black text-white leading-none mb-10 italic">
          Automated <span className="text-white/10">Care</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/30 max-w-2xl mx-auto font-medium italic">Concierge detailing programs designed for discerning owners.</p>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-12 md:gap-px overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-12 max-w-6xl mx-auto lg:bg-white/5"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 bg-[#050505] snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-1000 luxe-card",
              plan.featured && "bg-white/[0.02] border-[#8b5cf6]/10"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="text-sm luxury-text text-white/10 group-hover:text-[#8b5cf6]/30 transition-colors duration-700">{plan.id}</span>
                {plan.featured && (
                  <span className="text-[9px] luxury-text text-[#8b5cf6] border-b border-[#8b5cf6]/30 pb-1">
                    Signature Tier
                  </span>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 italic tracking-tighter">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-8xl font-black text-white tracking-tighter group-hover:text-[#8b5cf6] transition-colors duration-700">{plan.price}</span>
                  <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-5 mb-16 flex-grow border-t border-white/5 pt-10">
                {plan.specs.map((spec) => (
                  <div key={spec} className="flex items-center gap-4 group/item">
                    <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-[#8b5cf6] transition-colors" />
                    <span className="text-xs md:text-sm font-medium text-white/40 group-hover/item:text-white transition-colors italic">{spec}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full py-7 text-[10px] luxury-text rounded-none border-x-0"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the Circle
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex lg:hidden justify-center gap-4 mt-16 relative z-10">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-[1px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#8b5cf6]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
