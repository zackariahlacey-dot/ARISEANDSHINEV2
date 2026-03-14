"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight, Check, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", specs: ["Steam+", "Extrct", "Leather", "Odor-"] },
  { id: "02", name: "Exterior", price: "125", specs: ["Deion+", "Clay", "Wax", "Wheel"] },
  { id: "03", name: "Elite Full", price: "250", specs: ["Full+", "Gloss", "Stain-", "Clarity"], featured: true },
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
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-[#020202] relative border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 technical-grid opacity-20" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 flex flex-col md:flex-row items-end justify-between relative z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-[10px] font-technical text-white/40">Manifest: Service_Grid_v3</span>
          </div>
          <h2 className="text-6xl md:text-9xl font-black text-white uppercase tracking-tighter leading-none italic">
            Detaling <br /> <span className="text-transparent bg-clip-text bg-linear-to-b from-[#fbbf24] to-transparent">Systems</span>
          </h2>
        </div>
        <div className="hidden md:block text-right skew-x-[-12deg] border-r-4 border-[#fbbf24] pr-8 py-4 bg-white/5">
          <p className="text-white font-black text-xl italic leading-none">HIGH PERFORMANCE</p>
          <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.4em] mt-2">Surface Engineering</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-3 gap-8 md:gap-px overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory px-6 md:px-0 max-w-7xl mx-auto relative z-10"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 bg-[#020202] snap-center group relative skew-x-[-4deg]"
          >
            <div className={cn(
              "h-full p-10 md:p-16 flex flex-col transition-all duration-700 glass-prism",
              pkg.featured ? "border-[#fbbf24]/30" : "border-white/5"
            )}>
              <div className="flex justify-between items-start mb-16 skew-x-[4deg]">
                <span className="text-5xl md:text-7xl font-black text-white/5 leading-none italic group-hover:text-[#fbbf24]/10 transition-colors duration-700">
                  {pkg.id}
                </span>
                {pkg.featured && (
                  <div className="w-10 h-10 rounded-full bg-[#fbbf24] flex items-center justify-center shadow-[0_0_30px_#fbbf24]">
                    <Target className="w-5 h-5 text-black" />
                  </div>
                )}
              </div>

              <div className="mb-12 skew-x-[4deg]">
                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter italic">{pkg.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white/20 text-xl font-medium italic">$</span>
                  <span className="text-6xl md:text-[100px] font-black text-white tracking-tighter leading-none italic group-hover:text-[#fbbf24] transition-colors duration-700">
                    {pkg.price}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-16 flex-grow skew-x-[4deg]">
                {pkg.specs.map(spec => (
                  <div key={spec} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 group-hover:border-[#fbbf24]/20 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] shadow-[0_0_10px_#fbbf24]" />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                      {spec}
                    </span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"}
                className="w-full py-6 md:py-8 text-[10px] tracking-[0.4em] font-black rounded-none border-x-0 skew-x-[4deg]"
                onClick={() => onSelectService?.(pkg.name)}
              >
                EXECUTE_PROTOCOL
              </PrismButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex md:hidden justify-center gap-3 mt-16 relative z-10">
        {packages.map((_, i) => (
          <div key={i} className={cn("h-[2px] transition-all duration-700", activeIndex === i ? "w-12 bg-[#fbbf24]" : "w-4 bg-white/10")} />
        ))}
      </div>
    </Section>
  );
}
