"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "SEC_01", name: "Interior", price: "150", specs: ["Steam_Sanitization", "Full_Extraction", "Leather_Conditioning", "Odor_Neutralization"] },
  { id: "SEC_02", name: "Exterior", price: "125", specs: ["Deionized_Wash", "Clay_Bar_Prep", "Hand_Wax_Sealant", "Wheel_Precision"] },
  { id: "SEC_03", name: "Elite Full", price: "250", specs: ["Total_Restoration", "Hyper_Gloss_Wax", "Deep_Stain_Removal", "Headlight_Clarity"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-[#020202] relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 flex flex-col md:flex-row items-end justify-between border-b border-white/5 pb-12">
        <div className="space-y-4">
          <p className="font-mono-tech text-[#fbbf24]">System_Manifest // 01</p>
          <h2 className="text-5xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none">
            Signature <br /> <span className="text-white/10">Services</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="font-mono-tech mb-4">Precision_Index</p>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("w-8 h-1 rounded-full", i === 1 ? "bg-[#fbbf24]" : "bg-white/10")} />
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-12 md:gap-8 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-12 max-w-[1600px] mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center group"
          >
            <div className={cn(
              "h-full p-10 md:p-16 flex flex-col relative transition-all duration-700 glass-slab border-white/5",
              pkg.featured && "border-[#fbbf24]/20 bg-white/[0.02]"
            )}>
              <div className="flex justify-between items-start mb-16">
                <span className="font-mono-tech">{pkg.id}</span>
                {pkg.featured && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24] border-b border-[#fbbf24] pb-1">
                    Premium_Option
                  </span>
                )}
              </div>

              <div className="mb-12">
                <h3 className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter group-hover:text-[#fbbf24] transition-colors duration-500">{pkg.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium">$</span>
                  <span className="text-6xl md:text-8xl font-black text-white tracking-tighter">{pkg.price}</span>
                  <span className="text-white/20 text-sm font-black ml-2">+</span>
                </div>
              </div>

              <div className="space-y-4 mb-16 flex-grow border-t border-white/5 pt-8">
                {pkg.specs.map(spec => (
                  <div key={spec} className="flex items-center justify-between group/item">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 group-hover/item:text-white transition-colors">
                      {spec}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-[#fbbf24] transition-colors" />
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 md:py-8 text-[10px] font-black uppercase tracking-[0.3em] rounded-none border-x-0"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Sync_Session
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
