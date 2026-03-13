"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { LightLeak } from "@/components/ui/LightLeak";

export default function Transformation() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  return (
    <Section id="transformations" spacing="large" className="relative overflow-hidden">
      <LightLeak color="amber" intensity="low" className="-top-24 -right-24 opacity-20" />
      
      <div className="text-center mb-16 relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter"
        >
          Visual <span className="text-[#fbbf24]">Precision</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-white/40 max-w-2xl mx-auto"
        >
          Witness the difference of a professional detail. Interact with the slider to reveal the transformation.
        </motion.p>
      </div>

      <div className="max-w-5xl mx-auto relative px-4">
        <div 
          ref={containerRef}
          className="relative h-[400px] md:h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl cursor-ew-resize select-none"
          onMouseMove={handleMove}
          onTouchMove={handleMove}
        >
          {/* After Image (Always in Background) */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/JEEP INT AFTER.jpg')" }}
          />

          {/* Before Image (Clipped) */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: "url('/JEEP INT BEFORE.jpg')",
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
            }}
          />

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(251,191,36,0.5)] z-20 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border-2 border-[#fbbf24] flex items-center justify-center shadow-2xl">
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-[#fbbf24] rounded-full" />
                <div className="w-1 h-3 bg-[#fbbf24] rounded-full" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-6 left-6 z-30 px-4 py-2 rounded-full glass border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
            Before
          </div>
          <div className="absolute top-6 right-6 z-30 px-4 py-2 rounded-full glass border border-white/10 text-[10px] font-black uppercase tracking-widest text-[#fbbf24]">
            After
          </div>
        </div>

        {/* Caption */}
        <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-6">
          <span>Jeep Interior Restore</span>
          <span>Hyper Gloss Finish</span>
        </div>
      </div>
    </Section>
  );
}
