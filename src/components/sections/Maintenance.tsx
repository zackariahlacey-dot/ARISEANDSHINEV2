"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const plans = [
  {
    id: "04",
    name: "Interior Monthly",
    price: "99",
    description: "Ensure your interior remains in pristine condition through every season.",
    benefits: ["Full Monthly Detail", "Fixed Executive Rate", "Priority VIP Scheduling", "Complimentary Deodorization"],
  },
  {
    id: "05",
    name: "Elite Monthly",
    price: "199",
    description: "Comprehensive care for those who demand absolute perfection month after month.",
    benefits: ["Full Monthly Elite Detail", "Wax Maintenance Sync", "Concierge Direct Line", "Seasonal Surface Upgrades"],
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
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-[#030303] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#8b5cf6] text-[10px] font-black uppercase tracking-[0.5em]">The Continuity Circle</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8">
          Automated <span className="text-white/20">Care</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-medium">Concierge detailing programs designed for discerning owners.</p>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-8 md:gap-12 overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-12 max-w-6xl mx-auto relative z-10"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 h-full snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-16 flex flex-col relative soft-glass transition-all duration-700",
              plan.featured && "border-[#8b5cf6]/20 shadow-[0_30px_60px_rgba(139,92,246,0.05)] bg-white/[0.03]"
            )}>
              <div className="flex justify-between items-start mb-12">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all">
                  {plan.featured ? <ShieldCheck className="w-6 h-6 text-[#8b5cf6]" /> : <Zap className="w-6 h-6 text-white/40" />}
                </div>
                <span className="text-white/5 text-4xl font-black italic">{plan.id}</span>
              </div>

              <div className="mb-10">
                <h3 className="text-2xl md:text-4xl font-black text-white mb-4 uppercase tracking-tight">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-5xl md:text-8xl font-black text-white group-hover:text-[#8b5cf6] transition-colors duration-700 tracking-tighter">{plan.price}</span>
                  <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-4 mb-12 flex-grow">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover/item:bg-[#8b5cf6] transition-colors" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white/80 transition-colors">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full py-6 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the {plan.name}
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex lg:hidden justify-center gap-2 mt-12 pb-12">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-1 transition-all duration-500 rounded-full", activeIndex === i ? "w-8 bg-[#8b5cf6]" : "w-2 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
