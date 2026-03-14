"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ShieldCheck, Zap, ArrowRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const plans = [
  {
    id: "04",
    name: "Interior",
    price: "99",
    specs: ["Full_Monthly_Sync", "Fixed_Executive_Rate", "Priority_Node_Access", "Odor_Purge_System"],
  },
  {
    id: "05",
    name: "Elite Full",
    price: "199",
    specs: ["Total_System_Restore", "Wax_Maintenance_Sync", "Concierge_Direct_Line", "Surface_Upgrade_v2"],
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
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-[#020202] relative overflow-hidden border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 relative z-10 text-right">
        <div className="flex items-center gap-6 mb-8 justify-end">
          <div className="h-[1px] flex-grow bg-white/5" />
          <span className="text-variable">Index_02</span>
        </div>
        <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none">
          Automated <br /> <span className="text-[#8b5cf6] italic">Care</span>
        </h2>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-0 overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory max-w-[1400px] mx-auto relative z-10"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 bg-[#020202] snap-center group border-r border-white/5 last:border-r-0"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-1000 studio-slab border-none",
              plan.featured && "bg-white/[0.02]"
            )}>
              <div className="mb-16">
                <p className="text-variable mb-4">Protocol_Continuity</p>
                <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter group-hover:text-[#8b5cf6] transition-colors duration-700">{plan.name} Plan</h3>
              </div>

              <div className="relative mb-16">
                <span className="text-white/5 text-8xl md:text-[120px] font-black absolute -top-12 -left-4 pointer-events-none group-hover:text-[#8b5cf6]/10 transition-colors duration-700">
                  {plan.id}
                </span>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-white/20 text-2xl font-light italic">$</span>
                  <span className="text-7xl md:text-9xl font-black text-white tracking-tighter">{plan.price}</span>
                  <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-4 mb-20 flex-grow border-t border-white/5 pt-10">
                {plan.specs.map((spec) => (
                  <div key={spec} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-white/20 group-hover/item:bg-[#8b5cf6] group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors italic">
                      {spec}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full py-7 md:py-9 text-[10px] font-black uppercase tracking-[0.4em] rounded-none group/btn"
                onClick={() => onSelectService?.(plan.name)}
              >
                Sync_Membership <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-all" />
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination Mobile */}
      <div className="flex lg:hidden justify-center gap-4 mt-16 relative z-10 pb-12">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-[1px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#8b5cf6]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
