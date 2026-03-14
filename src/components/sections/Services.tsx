"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { Check, Sparkles, Shield, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", features: ["Steam Sanitization", "Full Extraction", "Leather Care", "Odor Removal"] },
  { id: "02", name: "Exterior", price: "125", features: ["Deionized Wash", "Clay Bar Prep", "Hand Wax", "Wheel Detail"] },
  { id: "03", name: "Elite Full", price: "250", features: ["Full Restore", "Hyper Gloss Wax", "Stain Removal", "Clarity Check"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-[#050505] relative overflow-hidden">
      <div className="text-center mb-24 relative z-10 px-4">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-8 bg-white/10" />
          <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.6em]">Premium Detailing</span>
          <div className="h-px w-8 bg-white/10" />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none"
        >
          Signature <br /> <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/5">Collections</span>
        </motion.h2>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-8 md:gap-12 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-12 max-w-7xl mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-16 flex flex-col relative rounded-[40px] transition-all duration-1000 glass-frame",
              pkg.featured && "border-[#fbbf24]/20 bg-white/[0.02]"
            )}>
              <div className="mb-12">
                <span className="text-xs font-black text-[#fbbf24]/40 uppercase tracking-[0.4em] block mb-4">{pkg.id}</span>
                <h3 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-8xl font-black text-white tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-700">{pkg.price}</span>
                </div>
              </div>

              <div className="space-y-5 mb-16 flex-grow">
                {pkg.features.map(f => (
                  <div key={f} className="flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-white/80">{f}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 md:py-8 text-[10px] tracking-[0.4em] font-black rounded-full"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Schedule {pkg.name}
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex md:hidden justify-center gap-2 mt-12 pb-20">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-1 transition-all duration-700 rounded-full", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-2 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
