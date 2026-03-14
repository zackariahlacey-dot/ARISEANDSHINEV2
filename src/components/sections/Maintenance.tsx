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
    name: "Interior",
    price: "99",
    description: "Ensure your interior remains in pristine condition through every season.",
    benefits: ["Monthly Detail", "Fixed Pricing", "Priority Access", "Deodorization"],
  },
  {
    id: "05",
    name: "Elite Full",
    price: "199",
    description: "Comprehensive care for those who demand absolute perfection month after month.",
    benefits: ["Full Monthly Detail", "Wax Maintenance", "Concierge Line", "Surface Upgrades"],
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
    <Section id="maintenance" spacing="none" className="py-20 md:py-32 bg-[#020202] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-16 flex items-end justify-between">
        <div className="space-y-4">
          <p className="text-[#8b5cf6] text-[10px] font-black uppercase tracking-[0.5em]">The Elite Circle</p>
          <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none">
            Automated <br /> <span className="text-white/20">Care</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Membership Plans</p>
          <div className="h-1 w-24 bg-[#8b5cf6] ml-auto rounded-full" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-6 lg:gap-px overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-0 max-w-6xl mx-auto lg:bg-white/10 border-white/10"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 bg-[#020202] snap-center group relative"
          >
            <div className={cn(
              "h-full p-8 md:p-20 flex flex-col transition-all duration-700",
              plan.featured ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"
            )}>
              <div className="flex justify-between items-start mb-12">
                <span className="text-4xl md:text-6xl font-black text-white/5 transition-colors group-hover:text-[#8b5cf6]/10 duration-700 leading-none">
                  {plan.id}
                </span>
                {plan.featured && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6] border border-[#8b5cf6]/30 px-4 py-1.5 rounded-full">
                    Concierge
                  </span>
                )}
              </div>

              <div className="mb-10">
                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter">{plan.name} Plan</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-5xl md:text-9xl font-black text-white group-hover:text-[#8b5cf6] transition-colors duration-700 tracking-tighter leading-none">{plan.price}</span>
                  <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-4 mb-16 flex-grow">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-[#8b5cf6]/30 group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80 transition-colors">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full relative z-10 py-6 md:py-8 text-[10px] tracking-[0.3em] font-black rounded-none border-x-0"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the {plan.name} Circle
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex lg:hidden justify-center gap-3 mt-12 pb-20">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-[2px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#8b5cf6]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
