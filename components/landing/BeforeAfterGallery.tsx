"use client";

import React, { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export type BeforeAfterPair = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  /** Short caption shown below the slider — e.g. "2018 Jeep Grand Cherokee · Interior · Williston, VT" */
  caption: string;
  /** Optional service-type tag — shown as a pill above the caption */
  service?: string;
};

// Order matters for SEO — first pair gets priority loading; rest lazy-load.
const PAIRS: BeforeAfterPair[] = [
  {
    beforeSrc: "/2018-jeep-grand-cherokee-interior-detail-before-williston-vt.jpg",
    afterSrc:  "/2018-jeep-grand-cherokee-interior-detail-after-williston-vt.jpg",
    beforeAlt: "Heavily soiled 2018 Jeep Grand Cherokee interior — before mobile auto detail in Williston, VT",
    afterAlt:  "Restored 2018 Jeep Grand Cherokee interior with conditioned leather — after Arise & Shine VT mobile detail in Williston, VT",
    caption:   "2018 Jeep Grand Cherokee · Interior Detail · Williston, VT",
    service:   "Interior Detail",
  },
  {
    beforeSrc: "/2024-ford-bronco-exterior-detail-before-burlington-vt.jpg",
    afterSrc:  "/2024-ford-bronco-exterior-detail-after-burlington-vt.jpg",
    beforeAlt: "2024 Ford Bronco with dirt and road grime — before exterior mobile detail in Burlington, VT",
    afterAlt:  "Restored 2024 Ford Bronco paint and finish — after Arise & Shine VT exterior detail in Burlington, VT",
    caption:   "2024 Ford Bronco · Exterior Detail · Burlington, VT",
    service:   "Exterior Detail",
  },
  {
    beforeSrc: "/2024-ford-bronco-interior-detail-before-burlington-vt.jpg",
    afterSrc:  "/2024-ford-bronco-interior-detail-after-burlington-vt.jpg",
    beforeAlt: "2024 Ford Bronco interior with dust and debris — before mobile interior detail in Burlington, VT",
    afterAlt:  "Spotless 2024 Ford Bronco interior — after Arise & Shine VT mobile interior detail in Burlington, VT",
    caption:   "2024 Ford Bronco · Interior Detail · Burlington, VT",
    service:   "Interior Detail",
  },
  {
    beforeSrc: "/2021-subaru-outback-interior-detail-before-burlington-vt.jpg",
    afterSrc:  "/2021-subaru-outback-interior-detail-after-burlington-vt.jpg",
    beforeAlt: "2021 Subaru Outback interior with everyday mess — before mobile detail in Burlington, VT",
    afterAlt:  "Spotless 2021 Subaru Outback interior — after Arise & Shine VT mobile detail in Burlington, VT",
    caption:   "2021 Subaru Outback · Interior Detail · Burlington, VT",
    service:   "Interior Detail",
  },
];

const sectionViewport = { once: true, margin: "-100px" };
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/**
 * Single slider widget (one before/after pair).
 * Drag-to-reveal interaction handled via CSS variable + clip-path for GPU perf.
 */
function PairSlider({ pair, eager }: { pair: BeforeAfterPair; eager: boolean }) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const beforeLabelRef  = useRef<HTMLDivElement>(null);
  const afterLabelRef   = useRef<HTMLDivElement>(null);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (containerRef.current) containerRef.current.style.setProperty("--slider-pos", `${value}%`);
    if (beforeLabelRef.current) beforeLabelRef.current.style.opacity = String(Math.min(1, Math.max(0, (value - 15) / 15)));
    if (afterLabelRef.current)  afterLabelRef.current.style.opacity  = String(Math.min(1, Math.max(0, (85 - value) / 15)));
  }, []);

  return (
    <div className="relative max-w-5xl mx-auto group" ref={containerRef} style={{ "--slider-pos": "50%" } as React.CSSProperties}>
      <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-700" />

      <div className="relative aspect-[16/10] md:aspect-video rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
        <Image
          src={pair.beforeSrc}
          alt={pair.beforeAlt}
          fill
          priority={eager}
          loading={eager ? undefined : "lazy"}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover"
        />
        <Image
          src={pair.afterSrc}
          alt={pair.afterAlt}
          fill
          priority={eager}
          loading={eager ? undefined : "lazy"}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover transition-none"
          style={{
            clipPath: "inset(0 0 0 var(--slider-pos))",
            willChange: "clip-path",
          }}
        />

        {/* Slider divider line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-[10]"
          style={{ left: "var(--slider-pos)", willChange: "left" }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center scale-100 md:scale-110">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
              </div>
            </div>
          </div>
        </div>

        {/* Before/After labels */}
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

        {/* Invisible range input — handles touch + mouse drag uniformly */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          defaultValue={50}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-[20] touch-none"
          aria-label={`Compare before and after — ${pair.caption}`}
        />
      </div>
    </div>
  );
}

export function BeforeAfterGallery() {
  const [index, setIndex] = useState(0);
  const total   = PAIRS.length;
  const current = PAIRS[index];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      variants={sectionVariants}
      className="relative py-20 md:py-32 lg:py-40 px-4 sm:px-6 lg:px-8 border-t border-white/[0.03] overflow-hidden"
    >
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
            Slide to reveal the Arise &amp; Shine difference. Real cars, real work, all done in driveways across Vermont.
          </p>
        </div>

        {/* Active slider — `key={index}` forces a remount on pair change so
            the divider snaps back to the middle and the user sees the new
            "before" first. */}
        <PairSlider key={index} pair={current} eager={index === 0} />

        {/* Caption + service pill */}
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          {current.service && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
              {current.service}
            </span>
          )}
          <p className="text-sm md:text-base text-zinc-300 font-semibold">{current.caption}</p>
        </div>

        {/* Controls + dot indicators */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous before/after"
            className="w-10 h-10 rounded-full bg-zinc-900/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            {PAIRS.map((p, i) => (
              <button
                key={p.afterSrc}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${p.caption}`}
                aria-current={i === index}
                className={`transition-all rounded-full ${
                  i === index
                    ? "w-8 h-2 bg-[#D4AF37]"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next before/after"
            className="w-10 h-10 rounded-full bg-zinc-900/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Hint below controls */}
        <div className="mt-6 flex justify-center items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          <div className="w-8 h-px bg-white/5" />
          {index + 1} of {total} · Drag the divider to compare
          <div className="w-8 h-px bg-white/5" />
        </div>
      </div>
    </motion.section>
  );
}
