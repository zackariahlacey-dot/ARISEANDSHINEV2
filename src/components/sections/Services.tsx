"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", specs: ["Steam Sanitization", "Deep Extraction", "Leather Conditioning", "Odor Purge"], glow: "rgba(139, 92, 246, 0.03)" },
  { id: "02", name: "Exterior", price: "125", specs: ["Deionized Wash", "Clay Bar Prep", "Hand Wax Sealant", "Wheel Precision"], glow: "rgba(251, 191, 36, 0.03)" },
  { id: "03", name: "Elite Full", price: "250", specs: ["Total Restoration", "Hyper Gloss Sync", "Stain Removal", "Clarity Check"], featured: true, glow: "rgba(251, 191, 36, 0.05)" },
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
    <Section id="services" spacing="none" className="py-20 md:py-32 bg-[#020202] relative border-y border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">The Detailing Collections</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8 italic">
          Surgical <span className="text-white/20">Precision</span>
        </motion.h2>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-12 max-w-7xl mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center group"
          >
            <div 
              style={{ backgroundColor: pkg.glow }}
              className={cn(
                "h-full p-8 md:p-12 flex flex-col relative transition-all duration-700 border border-white/5 hover:border-white/10 rounded-none",
                pkg.featured && "border-[#fbbf24]/20 shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              )}
            >
              <div className="flex justify-between items-start mb-10">
                <span className="text-xs font-black text-white/10 uppercase tracking-widest">{pkg.id}</span>
                {pkg.featured && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#fbbf24] border border-[#fbbf24]/30 px-3 py-1">
                    Signature_Option
                  </span>
                )}
              </div>

              <div className="mb-10">
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tighter italic">{pkg.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-white/20 text-xl font-medium italic">$</span>
                  <span className="text-5xl md:text-7xl font-black text-white tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-700">{pkg.price}</span>
                </div>
              </div>

              <div className="space-y-3 mb-12 flex-grow">
                {pkg.specs.map(spec => (
                  <div key={spec} className="flex items-center gap-3 group/item">
                    <div className="w-1 h-1 rounded-full bg-[#fbbf24]/20 group-hover/item:bg-[#fbbf24] transition-colors" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors">{spec}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 text-[10px] font-black uppercase tracking-[0.3em] rounded-none group/btn"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Reserve {pkg.name} <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-all" />
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex md:hidden justify-center gap-3 mt-12 pb-12">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-[1px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
