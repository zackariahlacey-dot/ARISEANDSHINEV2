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
    name: "Monthly Interior",
    category: "Elite Interior Care",
    price: "99",
    description: "Ensure your interior remains in pristine condition through every season.",
    benefits: [
      "Full Monthly Interior Detail",
      "Fixed Monthly Pricing",
      "Priority VIP Scheduling",
      "Complimentary Deodorization",
    ],
    glow: "amber" as const,
    icon: <Zap className="w-6 h-6 text-[#fbbf24]" />,
  },
  {
    name: "The Elite Monthly",
    category: "The Ultimate Maintenance",
    price: "199",
    description: "Comprehensive care for those who demand absolute perfection month after month.",
    benefits: [
      "Full Monthly Elite Detail",
      "Hyper Gloss Wax Maintenance",
      "24/7 Priority Concierge",
      "Seasonal Wax Upgrades",
    ],
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
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setActiveIndex(index);
  };

  return (
    <Section id="maintenance" spacing="large" className="relative overflow-hidden">
      <LightLeak color="violet" intensity="medium" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
      
      <div className="text-center mb-16 md:mb-32 relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[8px] md:text-[10px] font-black uppercase tracking-ultra mb-6"
        >
          Elite Membership
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-[100px] font-black text-white mb-6 uppercase tracking-tighter leading-[0.8] md:leading-[0.8]"
        >
          Automated <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-[#fbbf24] to-white/40">Excellence</span>
        </motion.h2>
        
        {/* Mobile Swipe Hint */}
        <div className="flex lg:hidden items-center justify-center gap-2 text-[#fbbf24] animate-pulse mb-4">
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">Discover Membership</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-2 gap-6 lg:gap-16 max-w-6xl mx-auto relative z-10 px-6 lg:px-4 overflow-x-auto lg:overflow-x-visible pb-12 lg:pb-0 no-scrollbar snap-x snap-mandatory"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 h-full snap-center group"
          >
            <GlassCard 
              glowColor={plan.glow} 
              className={cn(
                "p-8 md:p-20 flex flex-col h-full transition-all duration-1000 md:hover:translate-y-[-20px] border-white/5 prism-border",
                plan.featured && "border-[#fbbf24]/20 bg-[#fbbf24]/5 shadow-[0_0_100px_rgba(251,191,36,0.08)]"
              )}
            >
              <div className="mb-10 md:mb-16">
                <div className="flex items-center justify-between mb-8 md:mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-[#fbbf24]/50 transition-all duration-700">
                      {plan.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-ultra text-[#fbbf24] block mb-1">
                        {plan.category}
                      </span>
                      <h3 className="text-2xl md:text-5xl font-black text-white tracking-tighter">{plan.name}</h3>
                    </div>
                  </div>
                  {plan.featured && (
                    <div className="px-4 py-1.5 rounded-full bg-[#fbbf24] text-black text-[9px] font-black uppercase tracking-widest shadow-[0_0_20px_#fbbf24]">
                      Elite Tier
                    </div>
                  )}
                </div>
                <p className="text-white/40 leading-relaxed text-sm md:text-xl font-medium">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2 mb-10 md:mb-16">
                <span className="text-white/20 text-xl md:text-3xl font-medium">$</span>
                <span className="text-6xl md:text-[120px] font-black text-white group-hover:text-[#fbbf24] transition-colors duration-700 tracking-tighter leading-none">{plan.price}</span>
                <span className="text-white/40 text-xs md:text-lg uppercase tracking-widest font-black ml-2">/ Month</span>
              </div>

              <div className="space-y-5 md:space-y-8 mb-12 md:mb-20 flex-grow">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-5 group/item">
                    <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-[#fbbf24] opacity-40 group-hover/item:opacity-100 group-hover/item:border-[#fbbf24]/50 transition-all duration-500" />
                    <span className="text-sm md:text-xl text-white/70 font-medium group-hover/item:text-white transition-colors duration-500">{benefit}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "gold" : "outline"} 
                className="w-full py-6 md:py-9 text-xs md:text-xl tracking-ultra shadow-2xl"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the Elite Circle
              </PrismButton>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Pagination Dots for Mobile */}
      <div className="flex lg:hidden justify-center gap-2 mt-6 pb-12">
        {plans.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1 transition-all duration-500 rounded-full",
              activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-2 bg-white/10"
            )} 
          />
        ))}
      </div>
    </Section>
  );
}
