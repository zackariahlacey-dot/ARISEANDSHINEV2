"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ShieldCheck, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const plans = [
  {
    id: "04",
    name: "Interior_Monthly",
    price: "99",
    specs: ["Full Monthly Detail", "Fixed Executive Rate", "Priority VIP Scheduling", "Complimentary Deodorization"],
  },
  {
    id: "05",
    name: "Elite_Monthly",
    price: "199",
    specs: ["Full Monthly Elite Detail", "Wax Maintenance Sync", "Concierge Direct Line", "Seasonal Surface Upgrades"],
    featured: true
  },
];

export default function Maintenance({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <Section id="maintenance" spacing="none" className="py-24 md:py-48 bg-black relative border-b border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 flex flex-col md:flex-row items-end justify-between">
        <div className="space-y-6">
          <p className="text-micro text-[#8b5cf6]">Protocol Continuity // Vol. 02</p>
          <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none">
            Automated <br /> <span className="text-white/10">Care</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-micro mb-4 italic">Membership_Index</p>
          <div className="flex gap-1 justify-end">
            {plans.map((_, i) => (
              <div key={i} className={cn("w-12 h-0.5", i === 0 ? "bg-white/10" : "bg-[#8b5cf6]/30")} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto border-t border-white/5">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="boutique-strip relative group cursor-pointer overflow-hidden"
            onClick={() => onSelectService?.(plan.name)}
          >
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              
              <div className="flex items-center gap-12 md:gap-24">
                <span className="text-micro text-white/10 group-hover:text-[#8b5cf6] transition-colors duration-500">{plan.id}</span>
                <div className="space-y-2">
                  <h3 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter group-hover:italic transition-all duration-700">{plan.name}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {plan.specs.slice(0, 2).map(s => (
                      <span key={s} className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12 md:gap-20">
                <div className="text-right">
                  <p className="text-micro mb-1">Monthly_Rate</p>
                  <p className="text-3xl md:text-5xl font-black text-white tracking-tighter">${plan.price}</p>
                </div>
                <div className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center transition-all duration-700",
                  "group-hover:bg-[#8b5cf6] group-hover:border-[#8b5cf6] group-hover:rotate-90"
                )}>
                  <Plus className="w-6 h-6 text-white group-hover:text-black transition-colors" />
                </div>
              </div>

            </div>

            {/* Expandable Details on Desktop Hover */}
            <motion.div 
              initial={false}
              animate={{ height: hoveredIndex === index ? "auto" : 0, opacity: hoveredIndex === index ? 1 : 0 }}
              className="max-w-7xl mx-auto px-6 md:px-12 hidden md:block"
            >
              <div className="pb-20 grid grid-cols-4 gap-8">
                {plan.specs.map(spec => (
                  <div key={spec} className="border-l border-[#8b5cf6]/20 pl-6 py-2">
                    <p className="text-micro mb-1">Benefit</p>
                    <p className="text-xs font-black text-white/60 uppercase tracking-widest">{spec}</p>
                  </div>
                ))}
                <div className="flex items-end justify-end">
                  <PrismButton variant="luxury" className="text-[10px] py-4 px-10 rounded-none bg-[#8b5cf6]/10 border-[#8b5cf6]/20">Join_The_Circle</PrismButton>
                </div>
              </div>
            </motion.div>

            {/* Background Reveal Logic */}
            <div className="absolute inset-0 bg-white/[0.01] translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
