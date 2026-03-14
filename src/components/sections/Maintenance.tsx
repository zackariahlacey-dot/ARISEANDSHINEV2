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
    name: "Elite",
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
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-[#050505] relative overflow-hidden">
      <div className="text-center mb-24 relative z-10 px-4">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-8 bg-white/10" />
          <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.6em]">Continuity Program</span>
          <div className="h-px w-8 bg-white/10" />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none"
        >
          Automated <br /> <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/5">Care</span>
        </motion.h2>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-8 md:gap-12 overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-12 max-w-6xl mx-auto relative z-10"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 h-full snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative rounded-[40px] transition-all duration-1000 glass-frame",
              plan.featured && "border-[#8b5cf6]/20 bg-white/[0.02]"
            )}>
              <div className="mb-12">
                <span className="text-xs font-black text-[#8b5cf6]/40 uppercase tracking-[0.4em] block mb-4">{plan.id}</span>
                <h3 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">{plan.name} Plan</h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-[120px] font-black text-white tracking-tighter group-hover:text-[#8b5cf6] transition-colors duration-700 leading-none">{plan.price}</span>
                  <span className="text-white/20 text-xs md:text-lg uppercase tracking-widest font-black ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-5 mb-16 flex-grow">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                    <span className="text-xs md:text-lg font-bold uppercase tracking-widest text-white/80">{benefit}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full py-6 md:py-9 text-[10px] tracking-[0.4em] font-black rounded-full"
                onClick={() => onSelectService?.(plan.name)}
              >
                Sync Access
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex lg:hidden justify-center gap-2 mt-12 pb-20">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-1 transition-all duration-700 rounded-full", activeIndex === i ? "w-12 bg-[#8b5cf6]" : "w-2 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
