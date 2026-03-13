"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { MapPin } from "lucide-react";

const areas = [
  "Waterbury", "Stowe", "Montpelier", "Burlington", "South Burlington", 
  "Williston", "Shelburne", "Charlotte", "Richmond", "Waitsfield", 
  "Warren", "Mad River Valley", "Essex", "Winooski", "Colchester"
];

export default function ServiceAreas() {
  return (
    <Section id="areas" spacing="medium" className="relative overflow-hidden">
      <div className="text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter"
        >
          Serving <span className="text-[#fbbf24]">Vermont</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-white/40 max-w-2xl mx-auto"
        >
          We are a fully mobile detailing service. We bring the elite studio experience directly to your home or office across Central Vermont and the Champlain Valley.
        </motion.p>
      </div>

      <div className="max-w-5xl mx-auto">
        <GlassCard glowColor="violet" className="p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {areas.map((area, index) => (
              <motion.div
                key={area}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 group cursor-default"
              >
                <MapPin className="w-4 h-4 text-[#fbbf24] group-hover:scale-125 transition-transform" />
                <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">{area}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/20">
              Don't see your town? <span className="text-[#fbbf24]/50">Contact us for custom travel quotes.</span>
            </p>
          </div>
        </GlassCard>
      </div>
    </Section>
  );
}
