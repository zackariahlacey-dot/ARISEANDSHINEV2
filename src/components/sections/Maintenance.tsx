"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const plans = [
  {
    id: "PRT_04",
    name: "Interior",
    price: "99",
    specs: ["Monthly_Detailing", "Fixed_Executive_Rate", "Priority_Scheduling", "Odor_Elimination"],
  },
  {
    id: "PRT_05",
    name: "Elite",
    price: "199",
    specs: ["Full_Monthly_Service", "Wax_Maintenance_Sync", "Concierge_Direct_Line", "Surface_Upgrades"],
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
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-[#020202] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 flex flex-col md:flex-row items-end justify-between border-b border-white/5 pb-12">
        <div className="space-y-4">
          <p className="font-mono-tech text-[#8b5cf6]">Protocol_Continuity // 02</p>
          <h2 className="text-5xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none">
            Automated <br /> <span className="text-white/10">Excellence</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="font-mono-tech mb-4">Membership_Status</p>
          <div className="flex gap-2">
            {[1, 2].map(i => (
              <div key={i} className={cn("w-12 h-1 rounded-full", i === 1 ? "bg-[#8b5cf6]" : "bg-white/10")} />
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-12 md:gap-8 overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-12 max-w-[1200px] mx-auto relative z-10"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 bg-[#020202] snap-center group relative"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-700 glass-slab border-white/5",
              plan.featured && "border-[#8b5cf6]/20 bg-white/[0.02]"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="font-mono-tech">{plan.id}</span>
                {plan.featured && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6] border-b border-[#8b5cf6] pb-1">
                    Signature_Circle
                  </span>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter group-hover:text-[#8b5cf6] transition-colors duration-500">{plan.name} Plan</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-7xl md:text-9xl font-black text-white tracking-tighter">{plan.price}</span>
                  <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-4 mb-16 flex-grow border-t border-white/5 pt-8">
                {plan.specs.map((spec) => (
                  <div key={spec} className="flex items-center justify-between group/item">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors">
                      {spec}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-[#8b5cf6] transition-colors" />
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full relative z-10 py-6 md:py-8 text-[10px] font-black uppercase tracking-[0.3em] rounded-none border-x-0"
                onClick={() => onSelectService?.(plan.name)}
              >
                Sync_Membership
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
