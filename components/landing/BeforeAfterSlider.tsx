"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const BEFORE_IMAGE = "/JEEP INT BEFORE.jpg";
const AFTER_IMAGE = "/JEEP INT AFTER.jpg";

const sectionViewport = { once: true, margin: "-100px" };
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  },
};

export function BeforeAfterSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeLabelRef = useRef<HTMLDivElement>(null);
  const afterLabelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    
    // Update CSS variable for the whole section to use
    if (containerRef.current) {
      containerRef.current.style.setProperty("--slider-pos", `${value}%`);
    }

    // Update labels opacity manually for maximum performance
    if (beforeLabelRef.current) {
      const opacity = Math.min(1, Math.max(0, (value - 15) / 15));
      beforeLabelRef.current.style.opacity = opacity.toString();
    }
    if (afterLabelRef.current) {
      const opacity = Math.min(1, Math.max(0, (85 - value) / 15));
      afterLabelRef.current.style.opacity = opacity.toString();
    }
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      variants={sectionVariants}
      className="relative py-20 md:py-32 lg:py-40 px-4 sm:px-6 lg:px-8 border-t border-white/[0.03] overflow-hidden"
    >
      {/* Subtle background glow to anchor the section */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(212,175,55,0.02)_0%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-white/5 text-[#D4AF37] text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
            <Sparkles size={12} className="shrink-0" />
            The Transformation
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6">
            Visible <span className="text-zinc-500">Perfection.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Slide to reveal the Arise & Shine difference. We don&apos;t just clean; we restore your vehicle&apos;s soul through meticulous attention to detail.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto group" ref={containerRef} style={{ "--slider-pos": "50%" } as any}>
          {/* Premium Frame Decor */}
          <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
          
          <div className="relative aspect-[16/10] md:aspect-video rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
            {/* Images */}
            <Image
              src={BEFORE_IMAGE}
              alt="Interior before detail"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
            <Image
              ref={imageRef}
              src={AFTER_IMAGE}
              alt="Interior after detail"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover transition-none"
              style={{
                clipPath: "inset(0 0 0 var(--slider-pos))",
                willChange: "clip-path",
              }}
            />

            {/* Slider UI */}
            <div
              ref={handleRef}
              className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-[10]"
              style={{ 
                left: "var(--slider-pos)",
                willChange: "left",
              }}
            >
              {/* Central Handle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center group/handle transition-transform duration-300 scale-100 md:scale-110">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Labels */}
            <div className="absolute inset-0 pointer-events-none">
              <div 
                ref={beforeLabelRef}
                className="absolute top-6 left-6 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-opacity duration-300"
                style={{ opacity: 1 }}
              >
                Before
              </div>
              <div 
                ref={afterLabelRef}
                className="absolute top-6 right-6 px-4 py-2 rounded-full bg-[#D4AF37]/20 backdrop-blur-md border border-[#D4AF37]/30 text-[10px] font-black uppercase tracking-[0.2em] text-[#F3E5AB] transition-opacity duration-300"
                style={{ opacity: 1 }}
              >
                After
              </div>
            </div>

            {/* Invisible Range Input */}
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              defaultValue={50}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-[20] touch-none"
              aria-label="Compare before and after"
            />
          </div>

          {/* Hint below slider */}
          <div className="mt-8 flex justify-center items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            <div className="w-8 h-px bg-white/5" />
            Slide to Compare
            <div className="w-8 h-px bg-white/5" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
