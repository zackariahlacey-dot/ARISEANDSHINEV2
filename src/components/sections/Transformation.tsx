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
    <Section id="transformations" spacing="none" className="py-24 md:py-48 bg-[#020202] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-32 relative z-10 text-right">
        <div className="flex items-center gap-6 mb-8 justify-end">
          <div className="h-[1px] flex-grow bg-white/5" />
          <span className="text-variable">Index_03</span>
          <div className="h-[1px] w-24 bg-white/5" />
          <span className="text-variable">Visual_Evidence</span>
        </div>
        <h2 className="text-6xl md:text-[140px] font-black text-white uppercase tracking-tighter leading-none italic">
          Elite <br /> <span className="text-white/10">Metamorphosis</span>
        </h2>
      </div>

      <div className="max-w-6xl mx-auto relative px-4 z-10">
        <div 
          ref={containerRef}
          className="relative h-[400px] md:h-[700px] overflow-hidden group cursor-ew-resize select-none border border-white/5"
          onMouseMove={handleMove}
          onTouchMove={handleMove}
        >
          {/* After Image */}
          <div className="absolute inset-0">
            <img 
              src="/JEEP INT AFTER.jpg" 
              alt="After Detail"
              className="w-full h-full object-cover grayscale-[0.2]"
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
            className="absolute top-0 bottom-0 w-1 bg-[#fbbf24] z-20 group-hover:w-1.5 transition-all shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center shadow-2xl">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-black rounded-full" />
                <div className="w-1 h-1 bg-black rounded-full" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-8 left-8 bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-2 z-10">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Historical_State</span>
          </div>
          <div className="absolute top-8 right-8 bg-[#fbbf24] border border-[#fbbf24] px-6 py-2 z-10">
            <span className="text-[10px] font-black text-black uppercase tracking-[0.4em]">Optimal_State</span>
          </div>
        </div>
      </div>

      {/* Floating Art Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] select-none pointer-events-none">
        <span className="text-[200px] md:text-[500px] font-black text-white leading-none">SHIFT</span>
      </div>
    </Section>
  );
}
