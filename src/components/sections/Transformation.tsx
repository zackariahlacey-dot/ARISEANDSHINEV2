"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";

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
    <Section id="transformations" spacing="none" className="py-24 md:py-48 bg-[#050505] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">The Masterwork Gallery</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8 italic">
          Elite <span className="text-white/10">Metamorphosis</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/30 max-w-2xl mx-auto font-medium italic">Witness the clinical precision of our restoration process.</p>
      </div>

      <div className="max-w-6xl mx-auto relative px-4 z-10">
        <div 
          ref={containerRef}
          className="relative h-[400px] md:h-[700px] overflow-hidden rounded-[40px] group cursor-ew-resize select-none border border-white/5 shadow-2xl"
          onMouseMove={handleMove}
          onTouchMove={handleMove}
        >
          {/* After Image */}
          <div className="absolute inset-0">
            <img 
              src="/JEEP INT AFTER.jpg" 
              alt="After Detail"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Before Image (Clipped) */}
          <div 
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img 
              src="/JEEP INT BEFORE.jpg" 
              alt="Before Detail"
              className="w-full h-full object-cover grayscale"
            />
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white/20 z-20 group-hover:bg-[#fbbf24] transition-colors"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-black rounded-full" />
                <div className="w-1 h-1 bg-black rounded-full" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 z-10">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">Historical</span>
          </div>
          <div className="absolute top-8 right-8 bg-[#fbbf24]/80 backdrop-blur-xl px-6 py-2 rounded-full z-10">
            <span className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Restored</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
