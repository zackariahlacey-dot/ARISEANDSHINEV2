"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Monthly Interior",
    category: "Elite Interior Care",
    price: "99",
    description: "Ensure your interior remains in pristine, factory-fresh condition through every season.",
    benefits: [
      "Full Monthly Interior Detail",
      "Fixed Monthly Pricing",
      "Priority VIP Scheduling",
      "Complimentary Deodorization",
    ],
    glow: "amber" as const,
    icon: <Zap className="w-6 h-6 text-[#fbbf24]" />,
  },
  {
    name: "The Elite Monthly",
    category: "The Ultimate Maintenance",
    price: "199",
    description: "Comprehensive care for those who demand absolute perfection month after month.",
    benefits: [
      "Full Monthly Elite Detail",
      "Hyper Gloss Wax Maintenance",
      "24/7 Priority Concierge",
      "Seasonal Wax Upgrades",
    ],
    glow: "violet" as const,
    featured: true,
    icon: <ShieldCheck className="w-6 h-6 text-[#8b5cf6]" />,
  },
];

export default function Maintenance({ onSelectService }: { onSelectService?: (name: string) => void }) {
  return (
    <Section id="maintenance" spacing="large" className="relative overflow-hidden">
      {/* Super Premium Accents */}
      <LightLeak color="violet" intensity="medium" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
      
      <div className="text-center mb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[10px] font-bold uppercase tracking-[0.4em] mb-6"
        >
          Elite Membership
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter"
        >
          Arise <span className="text-[#fbbf24]">&</span> Shine <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-[#fbbf24] to-white/40">Maintenance</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-white/40 max-w-xl mx-auto text-lg"
        >
          Automated excellence. Never worry about the state of your vehicle again with our concierge maintenance programs.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto relative z-10">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <GlassCard 
              glowColor={plan.glow} 
              className={cn(
                "p-10 md:p-14 flex flex-col h-full border-white/5 relative group overflow-hidden",
                plan.featured && "border-[#fbbf24]/20 shadow-[0_0_50px_rgba(251,191,36,0.05)]"
              )}
            >
              {/* Decorative Background Icon */}
              <div className="absolute -right-8 -top-8 opacity-5 scale-[3] group-hover:opacity-10 transition-opacity duration-700">
                {plan.icon}
              </div>

              <div className="mb-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {plan.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">
                    {plan.category}
                  </span>
                </div>
                <h3 className="text-4xl font-bold text-white mb-4">{plan.name}</h3>
                <p className="text-white/40 leading-relaxed text-lg">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2 mb-12">
                <span className="text-white/20 text-xl font-medium">$</span>
                <span className="text-7xl font-black text-white">{plan.price}</span>
                <span className="text-white/40 text-sm uppercase tracking-widest font-bold">/ month</span>
              </div>

              <div className="space-y-5 mb-14 flex-grow">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#fbbf24] shadow-[0_0_10px_#fbbf24]" />
                    <span className="text-white/80 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <PrismButton 
                variant={plan.featured ? "luxury" : "outline"} 
                className="w-full py-6 text-lg"
                onClick={() => onSelectService?.(plan.name)}
              >
                Join the Elite
              </PrismButton>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
