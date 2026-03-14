"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { PrismButton } from "@/components/ui/PrismButton";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const packages = [
  { id: "01", name: "Interior", price: "150", specs: ["Steam Sanitization", "Deep Extraction", "Leather Conditioning", "Odor Neutralization"] },
  { id: "02", name: "Exterior", price: "125", specs: ["Deionized Wash", "Clay Bar Surface Prep", "Hand Wax Sealant", "Wheel Precision"] },
  { id: "03", name: "Elite Full", price: "250", specs: ["Total System Restoration", "Hyper Gloss Wax Sync", "Deep Stain Elimination", "Headlight Clarity"], featured: true },
];

export default function Services({ onSelectService }: { onSelectService?: (name: string) => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <Section id="services" spacing="none" className="py-24 md:py-48 bg-black relative border-y border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 flex flex-col md:flex-row items-end justify-between">
        <div className="space-y-6">
          <p className="text-micro text-[#fbbf24]">The Detailing Collections // Vol. 01</p>
          <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none">
            Our <br /> <span className="text-white/10">Catalogue</span>
          </h2>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-micro mb-4 italic">Professional_Index</p>
          <div className="flex gap-1 justify-end">
            {packages.map((_, i) => (
              <div key={i} className="w-12 h-0.5 bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto border-t border-white/5">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="boutique-strip relative group cursor-pointer overflow-hidden"
            onClick={() => onSelectService?.(pkg.name)}
          >
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              
              <div className="flex items-center gap-12 md:gap-24">
                <span className="text-micro text-white/10 group-hover:text-[#fbbf24] transition-colors duration-500">{pkg.id}</span>
                <div className="space-y-2">
                  <h3 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter group-hover:italic transition-all duration-700">{pkg.name}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {pkg.specs.slice(0, 2).map(s => (
                      <span key={s} className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12 md:gap-20">
                <div className="text-right">
                  <p className="text-micro mb-1">Session_Rate</p>
                  <p className="text-3xl md:text-5xl font-black text-white tracking-tighter">${pkg.price}</p>
                </div>
                <div className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center transition-all duration-700",
                  "group-hover:bg-[#fbbf24] group-hover:border-[#fbbf24] group-hover:rotate-90"
                )}>
                  <Plus className="w-6 h-6 text-white group-hover:text-black transition-colors" />
                </div>
              </div>

            </div>

            {/* Expandable Details on Desktop Hover */}
            <motion.div 
              initial={false}
              animate={{ height: hoveredIndex === index ? "auto" : 0, opacity: hoveredIndex === index ? 1 : 0 }}
              className="max-w-7xl mx-auto px-6 md:px-12 hidden md:block"
            >
              <div className="pb-20 grid grid-cols-4 gap-8">
                {pkg.specs.map(spec => (
                  <div key={spec} className="border-l border-[#fbbf24]/20 pl-6 py-2">
                    <p className="text-micro mb-1">Feature</p>
                    <p className="text-xs font-black text-white/60 uppercase tracking-widest">{spec}</p>
                  </div>
                ))}
                <div className="flex items-end justify-end">
                  <PrismButton variant="gold" className="text-[10px] py-4 px-10 rounded-none">Reserve_Session_Now</PrismButton>
                </div>
              </div>
            </motion.div>

            {/* Background Reveal Logic */}
            <div className="absolute inset-0 bg-white/[0.01] translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
