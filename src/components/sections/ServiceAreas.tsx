"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { MapPin, Globe } from "lucide-react";

export default function ServiceAreas() {
  return (
    <Section id="areas" spacing="none" className="py-24 md:py-48 bg-[#050505] relative overflow-hidden border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">Mobile Coverage</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8 italic">
          Serving <span className="text-white/10">Vermont</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/30 max-w-2xl mx-auto font-medium italic">Elite on-site detailing. We bring the clinical studio experience to you.</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="p-12 md:p-24 text-center glass-panel rounded-[40px] border-none bg-white/[0.01] relative overflow-hidden">
          <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 text-[#fbbf24]/5 pointer-events-none" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-4 px-6 py-2 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-xs font-black uppercase tracking-[0.4em] mb-12"
            >
              <MapPin className="w-4 h-4" />
              <span>Full_Onsite_Service</span>
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
              We bring the clinical studio experience directly to your doorstep, anywhere in the Green Mountain State. Special custom travel quotes available for outside VT.
            </motion.p>
          </div>

          <div className="sr-only">
            Mobile car detailing services available in Waterbury VT, Stowe, Montpelier, Burlington, South Burlington, Williston, Shelburne, Charlotte, Richmond, Waitsfield, Warren, Mad River Valley, Essex, Winooski, Colchester, and all other Vermont towns. We specialize in interior deep cleaning, paint correction, and Hyper Gloss Wax applications.
          </div>
        </div>
      </div>
    </Section>
  );
}
