"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "none" | "violet" | "amber";
}

export function GlassCard({
  children,
  className,
  glowColor = "none",
}: GlassCardProps) {
  const glowStyles = {
    none: "",
    violet: "after:absolute after:inset-0 after:bg-[#8b5cf6]/5 after:blur-3xl after:pointer-events-none",
    amber: "after:absolute after:inset-0 after:bg-[#fbbf24]/5 after:blur-3xl after:pointer-events-none",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "glass relative rounded-[32px] md:rounded-[40px] border border-white/10 overflow-hidden",
        glowStyles[glowColor],
        className
      )}
    >
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
