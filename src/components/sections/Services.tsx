"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { Check, Sparkles, Shield, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const packages = [
  {
    name: "Interior Detail",
    category: "Elite Interior Care",
    price: "150",
    description: "Deep restorative cleaning of all interior surfaces, vacuuming, and conditioning.",
    features: [
      "Steam Sanitization",
      "Full Vacuum & Extraction",
      "Leather/Fabric Conditioning",
      "Odor Neutralization",
    ],
    glow: "violet" as const,
    icon: <Sparkles className="w-6 h-6 text-[#8b5cf6]" />
  },
  {
    name: "Exterior Detail",
    category: "Surface Precision",
    price: "125",
    description: "Professional hand wash, clay bar treatment, and Hyper Gloss Spray Wax.",
    features: [
      "Deionized Hand Wash",
      "Clay Bar Surface Prep",
      "Hand-Applied Wax",
      "Wheel & Rim Detail",
    ],
    glow: "amber" as const,
    icon: <Shield className="w-6 h-6 text-[#fbbf24]" />
  },
  {
    name: "Elite Detail",
    category: "Total Transformation",
    price: "250",
    description: "The ultimate bumper-to-bumper restoration experience including Hyper Gloss Wax.",
    features: [
      "Interior + Exterior Full Detail",
      "Hyper Gloss Spray Wax",
      "Deep Stain Extraction",
      "Headlight Restoration",
    ],
    glow: "violet" as const,
    featured: true,
    icon: <Crown className="w-6 h-6 text-[#fbbf24]" />
  },
];

export default function Services({ onSelectService }: { onSelectService?: (name: string) => void }) {
  return (
    <Section id="services" spacing="medium" className="relative overflow-hidden">
      {/* Background Color Depth */}
      <LightLeak color="amber" intensity="low" className="-top-24 -right-24 opacity-10" />
      <LightLeak color="violet" intensity="low" className="bottom-0 -left-24 opacity-10" />

      <div className="text-center mb-16 md:mb-24 relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-6"
        >
          Signature Detailing
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-8xl font-black text-white mb-6 uppercase tracking-tighter leading-[0.85]"
        >
          Surgical <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Precision</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-white/40 max-w-2xl mx-auto text-base md:text-xl"
        >
          Meticulous care for Vermont's finest vehicles.
        </motion.p>
      </div>

      {/* Horizontal Scroll on Mobile, Grid on Desktop */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-x-visible pb-8 md:pb-0 px-6 md:px-4 no-scrollbar snap-x snap-mandatory relative z-10">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.8 }}
            className="flex flex-col min-w-[85vw] md:min-w-0 h-full snap-center"
          >
            <GlassCard 
              glowColor={pkg.glow} 
              className={cn(
                "h-full p-8 md:p-14 flex flex-col relative group transition-all duration-700 md:hover:translate-y-[-12px] border-white/5",
                pkg.featured && "border-[#fbbf24]/20 bg-[#fbbf24]/5 shadow-[0_0_80px_rgba(251,191,36,0.05)]"
              )}
            >
              <div className="mb-8 md:mb-12 relative z-10">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    {pkg.icon}
                  </div>
                  {pkg.featured && (
                    <div className="px-3 py-1 rounded-full bg-[#fbbf24] text-black text-[8px] font-black uppercase tracking-widest animate-pulse">
                      Most Popular
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#fbbf24] opacity-70 block mb-2">
                  {pkg.category}
                </span>
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">{pkg.name}</h3>
                <p className="text-white/40 text-xs md:text-sm leading-relaxed">{pkg.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-8 md:mb-12 relative z-10">
                <span className="text-white/20 text-xl font-medium">$</span>
                <span className="text-5xl md:text-7xl font-black text-white group-hover:text-[#fbbf24] transition-colors duration-500">{pkg.price}</span>
                <span className="text-white/40 text-sm uppercase tracking-widest ml-1 font-black">+</span>
              </div>

              <div className="space-y-4 md:space-y-5 mb-10 md:mb-16 flex-grow relative z-10">
                {pkg.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-4 group/item">
                    <div className="mt-1 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 md:group-hover/item:border-[#fbbf24]/50 transition-colors">
                      <Check className="w-3 h-3 text-[#fbbf24] opacity-40 group-hover/item:opacity-100" />
                    </div>
                    <span className="text-xs md:text-sm text-white/60 font-medium md:group-hover:text-white transition-colors">{feature}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={pkg.featured ? "gold" : "outline"} 
                className="w-full relative z-10 py-5 md:py-6 text-xs md:text-sm"
                onClick={() => onSelectService?.(pkg.name)}
              >
                Schedule {pkg.name}
              </PrismButton>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
