"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", specs: ["Steam_Restore", "Full_Extraction", "Leather_Sync", "Odor_Purge"] },
  { id: "02", name: "Exterior", price: "125", specs: ["Deionized_Wash", "Clay_Profile", "Sealant_Sync", "Wheel_Detail"] },
  { id: "03", name: "Elite Full", price: "250", specs: ["Total_System_Restore", "Hyper_Gloss_Sync", "Deep_Clean", "Clarity_Check"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-black relative studio-grid border-y border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 flex flex-col md:flex-row items-end justify-between border-l-4 border-[#fbbf24] pl-8">
        <div className="space-y-4">
          <p className="mono-label">Core_Processing // 01</p>
          <h2 className="text-6xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none">
            Detailing <br /> <span className="text-white/10">Protocols</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="mono-label mb-4">Manual_Operation_Active</p>
          <div className="h-12 w-12 border-2 border-white/10 rounded-full flex items-center justify-center animate-spin-slow">
            <div className="w-1 h-4 bg-[#fbbf24]" />
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-0 border border-white/10 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-0 max-w-7xl mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 bg-black snap-center group border-r border-white/10 last:border-r-0"
          >
            <div className={cn(
              "h-full p-10 md:p-16 flex flex-col transition-all duration-500 cyber-card border-none",
              pkg.featured && "bg-white/[0.02]"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="text-5xl md:text-7xl font-black text-white/5 group-hover:text-[#fbbf24]/10 transition-colors duration-700 leading-none">
                  {pkg.id}
                </span>
                {pkg.featured && (
                  <div className="bg-[#fbbf24] px-3 py-1 text-[8px] font-black text-black uppercase tracking-widest">
                    Featured_System
                  </div>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter group-hover:text-[#fbbf24] transition-colors">{pkg.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-8xl font-black text-white tracking-tighter">{pkg.price}</span>
                </div>
              </div>

              <div className="space-y-3 mb-16 flex-grow border-t border-white/5 pt-10">
                {pkg.specs.map(spec => (
                  <div key={spec} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-[1px] bg-[#fbbf24]/30 group-hover/item:w-4 transition-all duration-500" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors">
                      {spec}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 md:py-8 text-[10px] font-black uppercase tracking-[0.4em] rounded-none border-2 group/btn"
                onClick={() => onSelectService?.(pkg.name)}
              >
                EXECUTE_SYNC <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-all" />
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex md:hidden justify-center gap-4 mt-16 relative z-10">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-[2px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
