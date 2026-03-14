"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", details: ["Steam Sanitization", "Deep Extraction", "Leather Care", "Odor Removal"] },
  { id: "02", name: "Exterior", price: "125", details: ["Deionized Wash", "Clay Bar Prep", "Hand Waxing", "Wheel Precision"] },
  { id: "03", name: "Elite Full", price: "250", details: ["Full Restoration", "Hyper Gloss Wax", "Stain Removal", "Headlight Clarity"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-[#050505] relative border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 text-center">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mb-8">
          <span className="text-[10px] luxury-text text-[#fbbf24] tracking-[0.5em]">The Detailing Menu</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-9xl font-black text-white leading-none mb-10 italic">
          Signature <span className="text-white/10">Collections</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/30 max-w-2xl mx-auto font-medium italic">Professional care for discerning automotive enthusiasts.</p>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-12 md:gap-px overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-0 max-w-[1600px] mx-auto md:bg-white/5"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 bg-[#050505] snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-1000 luxe-card",
              pkg.featured && "bg-white/[0.02] border-[#fbbf24]/10"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="text-sm luxury-text text-white/10 group-hover:text-[#fbbf24]/30 transition-colors duration-700">{pkg.id}</span>
                {pkg.featured && (
                  <span className="text-[9px] luxury-text text-[#fbbf24] border-b border-[#fbbf24]/30 pb-1">
                    Most Requested
                  </span>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 italic tracking-tighter">{pkg.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-8xl font-black text-white tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-700">{pkg.price}</span>
                </div>
              </div>

              <div className="space-y-5 mb-16 flex-grow border-t border-white/5 pt-10">
                {pkg.details.map((detail) => (
                  <div key={detail} className="flex items-center gap-4 group/item">
                    <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-[#fbbf24] transition-colors" />
                    <span className="text-xs md:text-sm font-medium text-white/40 group-hover/item:text-white transition-colors italic">{detail}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-7 text-[10px] luxury-text rounded-none border-x-0"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Reserve Session
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex md:hidden justify-center gap-4 mt-16 relative z-10">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-[1px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
