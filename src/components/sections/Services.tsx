"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", specs: ["Steam_Sanitization", "Deep_Extraction", "Leather_Conditioning", "Odor_Neutralization"] },
  { id: "02", name: "Exterior", price: "125", specs: ["Deionized_Wash", "Clay_Bar_Prep", "Hand_Wax_Sealant", "Wheel_Precision"] },
  { id: "03", name: "Elite Full", price: "250", specs: ["Total_Restoration", "Hyper_Gloss_Sync", "Deep_Stain_Removal", "Headlight_Clarity"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-[#020202] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 relative z-10">
        <div className="flex items-center gap-6 mb-8">
          <span className="text-variable">Index_01</span>
          <div className="h-[1px] flex-grow bg-white/5" />
        </div>
        <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none">
          Studio <br /> <span className="text-white/10 italic">Services</span>
        </h2>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-0 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory max-w-[1600px] mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 bg-[#020202] snap-center group border-r border-white/5 last:border-r-0"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-1000 studio-slab border-none",
              pkg.featured && "bg-white/[0.02]"
            )}>
              <div className="mb-16">
                <p className="text-variable mb-4">Package_Standard</p>
                <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-700">{pkg.name}</h3>
              </div>

              <div className="relative mb-16">
                <span className="text-white/5 text-8xl md:text-[120px] font-black absolute -top-12 -left-4 pointer-events-none group-hover:text-[#fbbf24]/10 transition-colors duration-700">
                  {pkg.id}
                </span>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-white/20 text-2xl font-light italic">$</span>
                  <span className="text-7xl md:text-9xl font-black text-white tracking-tighter">{pkg.price}</span>
                </div>
              </div>

              <div className="space-y-4 mb-20 flex-grow border-t border-white/5 pt-10">
                {pkg.specs.map(spec => (
                  <div key={spec} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-white/20 group-hover/item:bg-[#fbbf24] group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors italic">
                      {spec}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-7 md:py-9 text-[10px] font-black uppercase tracking-[0.4em] rounded-none group/btn"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Sync_System <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-all" />
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination Mobile */}
      <div className="flex md:hidden justify-center gap-4 mt-16 relative z-10">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-[1px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
