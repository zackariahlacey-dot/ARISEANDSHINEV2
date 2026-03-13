"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glowColor?: "amber" | "violet" | "none";
}

export function GlassCard({
  children,
  className,
  glowColor = "none",
  ...props
}: GlassCardProps) {
  const glowStyles = {
    amber: "shadow-[0_0_40px_-15px_rgba(251,191,36,0.15)]",
    violet: "shadow-[0_0_40px_-15px_rgba(139,92,246,0.15)]",
    none: "",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-6",
        glowStyles[glowColor],
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      
      {/* Subtle Inner Glow */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-50" />
    </motion.div>
  );
}
