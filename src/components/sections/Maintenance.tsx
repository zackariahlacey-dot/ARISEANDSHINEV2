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
      
      <div className="text-center mb-12 md:mb-20 relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-6"
        >
          Elite Membership
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-8xl font-black text-white mb-6 uppercase tracking-tighter leading-[0.85]"
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
        className="flex lg:grid lg:grid-cols-2 gap-6 lg:gap-12 max-w-6xl mx-auto relative z-10 px-6 lg:px-4 overflow-x-auto lg:overflow-x-visible pb-12 lg:pb-0 no-scrollbar snap-x snap-mandatory"
      >
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            className="flex flex-col min-w-[85vw] lg:min-w-0 h-full snap-center"
          >
            <GlassCard 
              glowColor={plan.glow} 
              className={cn(
                "p-8 md:p-16 flex flex-col h-full border-white/5 relative group overflow-hidden transition-all duration-700",
                plan.featured && "border-[#fbbf24]/20 shadow-[0_0_80px_rgba(251,191,36,0.05)]"
              )}
            >
              <div className="mb-8 md:mb-12">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      {plan.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24] block mb-1">
                        {plan.category}
                      </span>
                      <h3 className="text-2xl md:text-4xl font-bold text-white tracking-tight">{plan.name}</h3>
                    </div>
                  </div>
                  {plan.featured && (
                    <div className="px-3 py-1 rounded-full bg-[#fbbf24] text-black text-[8px] font-black uppercase tracking-widest">
                      Best Value
                    </div>
                  )}
                </div>
                <p className="text-white/40 leading-relaxed text-sm md:text-lg">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2 mb-8 md:mb-12">
                <span className="text-white/20 text-xl md:text-2xl font-medium">$</span>
                <span className="text-6xl md:text-8xl font-black text-white group-hover:text-[#fbbf24] transition-colors duration-500">{plan.price}</span>
                <span className="text-white/40 text-xs md:text-sm uppercase tracking-widest font-bold">/ Month</span>
              </div>

              <div className="space-y-4 md:space-y-6 mb-10 md:mb-16 flex-grow">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-4 group/item">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-[#fbbf24] opacity-40 group-hover/item:opacity-100 transition-opacity" />
                    <span className="text-xs md:text-sm text-white/70 font-medium group-hover/item:text-white transition-colors">{benefit}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "gold" : "outline"} 
                className="w-full py-5 md:py-7 text-xs md:text-lg shadow-2xl"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the Elite Circle
              </PrismButton>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Pagination Dots for Mobile */}
      <div className="flex lg:hidden justify-center gap-2 mt-4 pb-12">
        {plans.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-1 transition-all duration-300 rounded-full",
              activeIndex === i ? "w-8 bg-[#fbbf24]" : "w-2 bg-white/10"
            )} 
          />
        ))}
      </div>
    </Section>
  );
}
