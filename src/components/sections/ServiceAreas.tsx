"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { MapPin, Globe } from "lucide-react";

export default function ServiceAreas() {
  return (
    <Section id="areas" spacing="medium" className="relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4">
        <GlassCard glowColor="violet" className="p-10 md:p-20 text-center relative overflow-hidden">
          {/* Subtle Background Icon */}
          <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-[#fbbf24]/5 pointer-events-none" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-4 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.4em] mb-8"
            >
              <MapPin className="w-3 h-3" />
              <span>Mobile Studio</span>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none"
            >
              Proudly Serving <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">
                All of Vermont
              </span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white/40 max-w-xl mx-auto text-lg md:text-xl font-medium"
            >
              Elite on-site detailing. We bring the clinical studio experience directly to your doorstep, anywhere in the Green Mountain State.
            </motion.p>
          </div>

          {/* Hidden SEO Keywords for Search Engines */}
          <div className="sr-only">
            Mobile car detailing services available in Waterbury VT, Stowe, Montpelier, Burlington, South Burlington, Williston, Shelburne, Charlotte, Richmond, Waitsfield, Warren, Mad River Valley, Essex, Winooski, Colchester, and all other Vermont towns. We specialize in interior deep cleaning, paint correction, and Hyper Gloss Wax applications.
          </div>
        </GlassCard>
      </div>
    </Section>
  );
}
