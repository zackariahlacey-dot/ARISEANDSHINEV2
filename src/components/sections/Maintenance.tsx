"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const plans = [
  {
    name: "Interior",
    category: "Elite Maintenance",
    price: "99",
    description: "Ensure your interior remains in pristine condition through every season.",
    benefits: ["Monthly Detail", "Fixed Pricing", "Priority Access", "Deodorization"],
    glow: "none" as const,
    icon: <Zap className="w-5 h-5" />,
  },
  {
    name: "Elite",
    category: "Signature Concierge",
    price: "199",
    description: "Comprehensive care for those who demand absolute perfection month after month.",
    benefits: ["Full Monthly Detail", "Wax Maintenance", "Concierge Line", "Surface Upgrades"],
    glow: "violet" as const,
    featured: true,
    icon: <ShieldCheck className="w-6 h-6 text-[#8b5cf6]" />,
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
    <Section id="maintenance" spacing="none" className="relative overflow-hidden pt-20 md:pt-48 bg-[#020202]">
      {/* Background Watermark */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0 overflow-hidden w-full text-center">
        <span className="text-[120px] md:text-[300px] font-black text-white/[0.02] leading-none uppercase tracking-tighter block translate-y-10">
          Membership
        </span>
      </div>

      <div className="text-center mb-24 relative z-10 px-4">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px w-12 bg-[#8b5cf6]/30" />
          <span className="text-[#8b5cf6] text-[10px] font-black uppercase tracking-[0.5em]">The Elite Circle</span>
          <div className="h-px w-12 bg-[#8b5cf6]/30" />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-9xl font-black text-white mb-8 uppercase tracking-tighter leading-none"
        >
          Automated <span className="text-transparent bg-clip-text bg-linear-to-b from-white/20 to-transparent">Excellence</span>
        </motion.h2>
        
        {/* Mobile Swipe Hint - Hidden on Desktop */}
        <div className="flex lg:hidden items-center justify-center gap-2 text-white/20 animate-pulse mb-4">
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">Explore Tiers</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Horizontal Scroll on Mobile ONLY, Static Grid on Desktop */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "flex lg:grid lg:grid-cols-2 gap-6 lg:gap-px lg:bg-white/[0.05] relative z-10 max-w-[1200px] mx-auto lg:border-y lg:border-white/[0.05]",
          "overflow-x-auto lg:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 lg:px-0 pb-12 lg:pb-0"
        )}
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 h-full snap-center bg-[#020202] relative group"
          >
            {/* Vertical Accent Line for Desktop Grid */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent hidden lg:block" />
            
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-1000",
              plan.featured && "bg-white/[0.01]"
            )}>
              {plan.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-[#8b5cf6]/50 to-transparent" />
              )}

              <div className="mb-12 relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[#8b5cf6] group-hover:border-[#8b5cf6]/30 transition-all duration-700">
                    {plan.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">{plan.category}</span>
                </div>
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase">{plan.name}</h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2 mb-12 relative z-10">
                <span className="text-white/20 text-xl font-medium">$</span>
                <span className="text-7xl md:text-9xl font-black text-white tracking-tighter group-hover:text-[#8b5cf6] transition-colors duration-700">{plan.price}</span>
                <span className="text-white/20 text-sm font-black uppercase tracking-widest ml-2">/ Month</span>
              </div>

              <div className="space-y-5 mb-16 flex-grow relative z-10">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-[#8b5cf6]/30 group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-[11px] md:text-xs text-white/50 uppercase font-black tracking-widest group-hover/item:text-white transition-colors">{benefit}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "violet" : "outline"} 
                className="w-full relative z-10 py-6 md:py-8 text-[10px] tracking-[0.3em] font-black rounded-none border-x-0"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the Circle
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination ONLY on Mobile */}
      <div className="flex lg:hidden justify-center gap-3 mt-12 pb-20">
        {plans.map((_, i) => (
          <div key={i} className={cn("h-[2px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#8b5cf6]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
