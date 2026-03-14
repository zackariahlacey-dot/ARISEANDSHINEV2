"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { MapPin, Globe } from "lucide-react";

export default function ServiceAreas() {
  return (
    <Section id="areas" spacing="none" className="py-24 md:py-48 bg-[#020202] relative overflow-hidden border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 relative z-10 text-right">
        <div className="flex items-center gap-6 mb-8 justify-end">
          <div className="h-[1px] flex-grow bg-white/5" />
          <span className="text-variable">Index_05</span>
          <div className="h-[1px] w-24 bg-white/5" />
          <span className="text-variable">Operational_Range</span>
        </div>
        <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none italic">
          Vermont <br /> <span className="text-white/10">Coverage</span>
        </h2>
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="p-12 md:p-24 text-center studio-slab border-none bg-white/[0.01] relative overflow-hidden">
          {/* Subtle Background Icon */}
          <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 text-[#fbbf24]/5 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-4 px-6 py-2 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-xs font-black uppercase tracking-[0.4em] mb-12"
            >
              <MapPin className="w-4 h-4" />
              <span>Full_Onsite_Sync</span>
            </motion.div>

            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-none italic"
            >
              Proudly Serving <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">
                All of Vermont
              </span>
            </motion.h3>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white/40 max-w-xl mx-auto text-lg md:text-2xl font-medium leading-relaxed"
            >
              Elite on-site detailing. We bring the clinical studio experience directly to your doorstep, anywhere in the Green Mountain State.
            </motion.p>
          </div>

          {/* Hidden SEO Keywords for Search Engines */}
          <div className="sr-only">
            Mobile car detailing services available in Waterbury VT, Stowe, Montpelier, Burlington, South Burlington, Williston, Shelburne, Charlotte, Richmond, Waitsfield, Warren, Mad River Valley, Essex, Winooski, Colchester, and all other Vermont towns. We specialize in interior deep cleaning, paint correction, and Hyper Gloss Wax applications.
          </div>
        </div>
      </div>

      {/* Floating Art Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] select-none pointer-events-none">
        <span className="text-[200px] md:text-[500px] font-black text-white leading-none">MAP</span>
      </div>
    </Section>
  );
}
