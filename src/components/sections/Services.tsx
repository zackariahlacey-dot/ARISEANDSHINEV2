"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { Check, Crown, Sparkles, Shield, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior Detail", price: "150", icon: <Sparkles className="w-5 h-5 text-white/40" />, features: ["Steam Sanitization", "Full Extraction", "Leather Care", "Odor Removal"] },
  { id: "02", name: "Exterior Detail", price: "125", icon: <Shield className="w-5 h-5 text-white/40" />, features: ["Deionized Wash", "Clay Bar Prep", "Hand Wax", "Wheel Detail"] },
  { id: "03", name: "Elite Full Detail", price: "250", icon: <Crown className="w-5 h-5 text-[#fbbf24]" />, features: ["Total Restoration", "Hyper Gloss Wax", "Stain Removal", "Headlight Clarity"], featured: true },
];

export default function Services({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    setActiveIndex(index);
  };

  return (
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-[#030303] relative border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">The Detailing Collections</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8">
          Surgical <span className="text-white/20">Precision</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-medium">Meticulous care for Central Vermont's most distinguished vehicles.</p>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-8 md:gap-10 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-12 max-w-7xl mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.8 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-14 flex flex-col relative soft-glass transition-all duration-700",
              pkg.featured && "border-[#fbbf24]/20 shadow-[0_30px_60px_rgba(251,191,36,0.05)] bg-white/[0.03]"
            )}>
              <div className="flex justify-between items-start mb-12">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all">
                  {pkg.icon}
                </div>
                <span className="text-white/5 text-4xl font-black italic">{pkg.id}</span>
              </div>

              <div className="mb-10">
                <h3 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase tracking-tight">{pkg.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-5xl md:text-6xl font-black text-white group-hover:text-[#fbbf24] transition-colors duration-700 tracking-tighter">{pkg.price}</span>
                  <span className="text-white/20 text-sm font-black ml-1">+</span>
                </div>
              </div>

              <div className="space-y-4 mb-12 flex-grow">
                {pkg.features.map(f => (
                  <div key={f} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover/item:bg-[#fbbf24] transition-colors" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white/80 transition-colors">{f}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Schedule {pkg.name}
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex md:hidden justify-center gap-2 mt-12 pb-12">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-1 transition-all duration-500 rounded-full", activeIndex === i ? "w-8 bg-[#fbbf24]" : "w-2 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
