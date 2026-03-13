"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  withGrid?: boolean;
  spacing?: "none" | "small" | "medium" | "large";
}

export function Section({
  children,
  className,
  id,
  withGrid = false,
  spacing = "medium",
}: SectionProps) {
  const spacingStyles = {
    none: "py-0",
    small: "py-12 md:py-16",
    medium: "py-20 md:py-32",
    large: "py-32 md:py-48",
  };

  return (
    <section 
      id={id} 
      className={cn(
        "relative overflow-hidden bg-black",
        spacingStyles[spacing],
        className
      )}
    >
      {/* HUD Grid Overlay */}
      {withGrid && (
        <div className="hud-grid absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black" />
          
          {/* Scanning Line Effect */}
          <div className="animate-scan absolute inset-0 bg-linear-to-b from-transparent via-white/5 to-transparent h-1/4 w-full will-change-transform" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </section>
  );
}
