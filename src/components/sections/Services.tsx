"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "SEC_01", name: "Interior", price: "150", details: ["Steam_Sanitization", "Deep_Extraction", "Leather_Conditioning", "Odor_Purge"] },
  { id: "SEC_02", name: "Exterior", price: "125", details: ["Deionized_Wash", "Clay_Bar_Prep", "Hand_Wax_Sealant", "Wheel_Precision"] },
  { id: "SEC_03", name: "Elite Full", price: "250", details: ["Total_Restoration", "Hyper_Gloss_Sync", "Stain_Elimination", "Headlight_Clarity"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-black relative luxe-grid border-y border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 flex flex-col md:flex-row items-end justify-between border-l-4 border-[#fbbf24] pl-10">
        <div className="space-y-4">
          <p className="label-mono">Detailing_Collections // 01</p>
          <h2 className="text-6xl md:text-[120px] font-black text-white uppercase tracking-tighter leading-none">
            The <br /> <span className="text-white/10">Studio_Grid</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="label-mono mb-4">Precision_Index</p>
          <div className="flex gap-2 justify-end">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("w-10 h-1", i === 1 ? "bg-[#fbbf24]" : "bg-white/10")} />
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-0 border border-white/10 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-0 max-w-[1600px] mx-auto relative z-10 bg-black"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center group border-r border-white/10 last:border-r-0"
          >
            <div className={cn(
              "h-full p-10 md:p-20 flex flex-col relative transition-all duration-700 elite-slab border-none",
              pkg.featured && "bg-white/[0.02]"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="label-mono">{pkg.id}</span>
                {pkg.featured && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24] border border-[#fbbf24]/30 px-4 py-1.5">
                    Elite_Standard
                  </span>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-500">{pkg.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-7xl md:text-9xl font-black text-white tracking-tighter">{pkg.price}</span>
                </div>
              </div>

              <div className="space-y-4 mb-16 flex-grow border-t border-white/5 pt-10">
                {pkg.details.map(detail => (
                  <div key={detail} className="flex items-center justify-between group/item">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors">
                      {detail}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-[#fbbf24] transition-colors shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-7 md:py-9 text-[10px] font-black uppercase tracking-[0.4em] rounded-none border-2 group/btn"
                onClick={() => onSelectService?.(pkg.name)}
              >
                BOOK_SESSION <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-all" />
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
