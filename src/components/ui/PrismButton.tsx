"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface PrismButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "luxury" | "outline";
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
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-lg px-8 py-3 text-sm font-medium tracking-wide transition-all",
        className
      )}
      {...props}
    >
      <div className={cn(
        "prism-border absolute inset-0 rounded-lg",
        variantStyles[variant]
      )} />
      
      {/* Gloss Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
