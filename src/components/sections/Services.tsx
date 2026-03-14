"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { Check, Sparkles, Shield, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  {
    name: "Interior",
    category: "Sanctuary Restore",
    price: "150",
    description: "Deep restorative cleaning of all interior surfaces, vacuuming, and conditioning.",
    features: ["Steam Sanitization", "Full Extraction", "Leather Care", "Odor Removal"],
    glow: "none" as const,
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    name: "Exterior",
    category: "Surface Precision",
    price: "125",
    description: "Professional hand wash, clay bar treatment, and Hyper Gloss Spray Wax.",
    features: ["Deionized Wash", "Clay Bar Prep", "Hand Wax", "Wheel Detail"],
    glow: "none" as const,
    icon: <Shield className="w-5 h-5" />
  },
  {
    name: "Elite Full",
    category: "Total Transformation",
    price: "250",
    description: "The ultimate bumper-to-bumper restoration experience including Hyper Gloss Wax.",
    features: ["Full Interior/Exterior", "Hyper Gloss Wax", "Stain Extraction", "Headlight Clarity"],
    glow: "amber" as const,
    featured: true,
    icon: <Crown className="w-5 h-5" />
  },
];

export default function Services({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / (scrollRef.current.offsetWidth * 0.8));
    setActiveIndex(index);
  };

  return (
    <Section id="services" spacing="none" className="relative overflow-hidden pt-20 md:pt-48 bg-[#020202]">
      {/* Background Watermark */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0 overflow-hidden w-full text-center">
        <span className="text-[120px] md:text-[300px] font-black text-white/[0.02] leading-none uppercase tracking-tighter block translate-y-10">
          Precision
        </span>
      </div>

      <div className="text-center mb-16 md:mb-24 relative z-10 px-4">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px w-12 bg-[#fbbf24]/30" />
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">The Signature Series</span>
          <div className="h-px w-12 bg-[#fbbf24]/30" />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-9xl font-black text-white mb-8 uppercase tracking-tighter leading-none"
        >
          Signature <span className="text-transparent bg-clip-text bg-linear-to-b from-white/20 to-transparent">Detailing</span>
        </motion.h2>
        
        {/* Mobile Swipe Hint - Hidden on Desktop */}
        <div className="flex md:hidden items-center justify-center gap-2 text-[#fbbf24] animate-pulse mb-4">
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">Swipe to Initialize</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Horizontal Scroll on Mobile ONLY, Static Grid on Desktop */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "flex md:grid md:grid-cols-3 gap-6 md:gap-px md:bg-white/[0.05] relative z-10 max-w-[1400px] mx-auto md:border-y md:border-white/[0.05]",
          "overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-0 pb-12 md:pb-0"
        )}
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center bg-[#020202] relative group"
          >
            {/* Vertical Accent Line for Desktop Grid */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent hidden md:block" />
            
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-1000",
              pkg.featured && "bg-white/[0.01]"
            )}>
              {pkg.featured && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-[#fbbf24]/50 to-transparent" />
              )}

              <div className="mb-12 relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[#fbbf24] group-hover:border-[#fbbf24]/30 transition-all duration-700">
                    {pkg.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">{pkg.category}</span>
                </div>
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase">{pkg.name}</h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">{pkg.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-12 relative z-10">
                <span className="text-white/20 text-xl font-medium">$</span>
                <span className="text-7xl md:text-9xl font-black text-white tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-700">{pkg.price}</span>
                <span className="text-white/20 text-sm font-black ml-2">+</span>
              </div>

              <div className="space-y-5 mb-16 flex-grow relative z-10">
                {pkg.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-[#fbbf24]/30 group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-[11px] md:text-xs text-white/50 uppercase font-black tracking-widest group-hover/item:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"} 
                className="w-full relative z-10 py-6 md:py-8 text-[10px] tracking-[0.3em] font-black rounded-none border-x-0"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Book {pkg.name}
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination ONLY on Mobile */}
      <div className="flex md:hidden justify-center gap-3 mt-12 pb-20">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-[2px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
