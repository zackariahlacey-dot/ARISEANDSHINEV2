"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const packages = [
  {
    name: "Interior Detail",
    category: "Interior Care",
    price: "150",
    description: "Deep restorative cleaning of all interior surfaces.",
    features: [
      "Steam Sanitization",
      "Full Vacuum & Extraction",
      "Leather/Fabric Conditioning",
      "Odor Neutralization",
    ],
    glow: "violet" as const,
  },
  {
    name: "Exterior Detail",
    category: "Surface Precision",
    price: "125",
    description: "Hand-wash and paint protection for a mirror finish.",
    features: [
      "Deionized Hand Wash",
      "Clay Bar Surface Prep",
      "Hand-Applied Wax",
      "Wheel & Rim Detail",
    ],
    glow: "amber" as const,
  },
  {
    name: "Elite Detail",
    category: "Complete Transformation",
    price: "250",
    description: "The ultimate bumper-to-bumper restoration experience.",
    features: [
      "Interior + Exterior Full Detail",
      "Hyper Gloss Spray Wax",
      "Headlight Restoration",
    ],
    glow: "violet" as const,
    featured: true,
  },
];

export default function Services({ onSelectService }: { onSelectService?: (name: string) => void }) {
  return (
    <Section id="services" spacing="medium" className="relative overflow-hidden">
      {/* Background Color Depth */}
      <LightLeak color="amber" intensity="low" className="-top-24 -right-24 opacity-10" />
      <LightLeak color="violet" intensity="low" className="bottom-0 -left-24 opacity-10" />

      <div className="text-center mb-16 relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter"
        >
          Signature <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Detailing</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-white/40 max-w-2xl mx-auto"
        >
          Meticulous care for your vehicle, focused on precision and longevity.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="flex flex-col h-full"
          >
            <GlassCard 
              glowColor={pkg.glow} 
              className={cn(
                "h-full p-8 flex flex-col relative group transition-all duration-500 hover:translate-y-[-4px]",
                pkg.featured && "border-[#fbbf24]/30"
              )}
            >
              {pkg.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#fbbf24] text-black text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-lg z-20">
                  Gold Standard
                </div>
              )}
              
              <div className="mb-6 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fbbf24] block mb-2 opacity-70">
                  {pkg.category}
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{pkg.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8 relative z-10">
                <span className="text-white/40 text-sm font-medium">$</span>
                <span className="text-5xl font-black text-white group-hover:text-[#fbbf24] transition-colors">{pkg.price}</span>
                <span className="text-white/40 text-xs uppercase tracking-widest ml-1">+</span>
              </div>

              <div className="space-y-4 mb-10 flex-grow relative z-10">
                {pkg.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#fbbf24] mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-white/70">{feature}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "luxury" : "outline"} 
                className="w-full relative z-10"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Book {pkg.name}
              </PrismButton>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
