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
    specs: ["Full_Monthly_Sync", "Fixed_Executive_Rate", "Priority_Node_Access", "Odor_Purge_Active"],
  },
  {
    id: "05",
    name: "Elite Full",
    price: "199",
    specs: ["Full_System_Restore", "Wax_Maintenance_Sync", "Concierge_Direct_Line", "Surface_Sync_v2"],
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
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-black relative studio-grid overflow-hidden border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 flex flex-col md:flex-row items-end justify-between border-l-4 border-[#8b5cf6] pl-8">
        <div className="space-y-4">
          <p className="mono-label">Continuity_Protocol // 02</p>
          <h2 className="text-6xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none">
            Automated <br /> <span className="text-white/10">Care</span>
          </h2>
        </div>
        <div className="hidden md:flex gap-6 text-right">
          <div>
            <p className="mono-label">System_Stability</p>
            <p className="text-xs font-black text-white">100%_SECURE</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="mono-label">Priority_Sync</p>
            <p className="text-xs font-black text-[#8b5cf6]">ACTIVE</p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-0 border border-white/10 overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-0 max-w-6xl mx-auto relative z-10"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 bg-black snap-center group border-r border-white/10 last:border-r-0"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col transition-all duration-500 cyber-card border-none",
              plan.featured && "bg-white/[0.02]"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="text-5xl md:text-7xl font-black text-white/5 group-hover:text-[#8b5cf6]/10 transition-colors duration-700 leading-none">
                  {plan.id}
                </span>
                {plan.featured && (
                  <div className="bg-[#8b5cf6] px-3 py-1 text-[8px] font-black text-black uppercase tracking-widest">
                    Prestige_Node
                  </div>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter group-hover:text-[#8b5cf6] transition-colors">{plan.name} Plan</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-8xl font-black text-white tracking-tighter">{plan.price}</span>
                  <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
                </div>
              </div>

              <div className="space-y-3 mb-16 flex-grow border-t border-white/5 pt-10">
                {plan.specs.map((spec) => (
                  <div key={spec} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-[#8b5cf6]/30 group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors">
                      {spec}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full py-6 md:py-8 text-[10px] font-black uppercase tracking-[0.4em] rounded-none border-2 group/btn"
                onClick={() => onSelectService?.(plan.name)}
              >
                INITIALIZE_SYNC <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-all" />
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
