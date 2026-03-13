"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LightLeakProps {
  color?: "amber" | "violet";
  className?: string;
  intensity?: "low" | "medium" | "high";
}

export function LightLeak({
  color = "violet",
  className,
  intensity = "medium",
}: LightLeakProps) {
  const intensityStyles = {
    low: "opacity-30 scale-75",
    medium: "opacity-60 scale-100",
    high: "opacity-100 scale-125",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.1, 1],
      }}
      transition={{ 
        duration: 8, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className={cn(
        "pointer-events-none absolute -z-10 h-[500px] w-[500px] blur-[120px] filter",
        color === "amber" ? "light-leak-amber" : "light-leak-violet",
        intensityStyles[intensity],
        className
      )}
    />
  );
}
