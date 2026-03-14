"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface PrismButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "luxury" | "outline" | "gold" | "violet";
}

export function PrismButton({
  children,
  className,
  variant = "primary",
  ...props
}: PrismButtonProps) {
  const variantStyles = {
    primary: "text-white bg-black/80",
    luxury: "text-[#fbbf24] bg-black/80",
    outline: "text-white border border-white/10 hover:bg-white/5",
    gold: "text-black bg-[#fbbf24] border-2 border-[#fbbf24] shadow-[0_0_20px_rgba(251,191,36,0.3)]",
    violet: "text-white bg-transparent border-2 border-[#8b5cf6] hover:bg-[#8b5cf6]/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-xl px-8 py-3 text-sm font-black uppercase tracking-widest transition-all",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Gloss Overlay for solid buttons */}
      {(variant === "gold" || variant === "violet") && (
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      
      {variant !== "gold" && variant !== "violet" && (
        <div className={cn(
          "prism-border absolute inset-0 rounded-lg",
          variantStyles[variant]
        )} />
      )}
      
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
