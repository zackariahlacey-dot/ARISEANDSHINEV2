"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { Star, Quote, ShieldCheck } from "lucide-react";

const reviews = [
  {
    name: "James Anderson",
    vehicle: "Porsche 911 GT3",
    content: "Absolutely clinical attention to detail. My GT3 looks better than the day I took delivery. The mobile setup is incredibly professional.",
    rating: 5
  },
  {
    name: "Sarah Jenkins",
    vehicle: "Tesla Model Y",
    content: "Best interior detail I've ever had. They managed to get out stains that three other detailers couldn't touch. Highly recommend the monthly plan.",
    rating: 5
  },
  {
    name: "Robert Miller",
    vehicle: "Range Rover Sport",
    content: "The hyper gloss wax is no joke. The depth of shine on my black paint is incredible. Easy booking and excellent communication.",
    rating: 5
  },
  {
    name: "David Chen",
    vehicle: "Audi R8 V10",
    content: "Surgical precision. I wouldn't trust anyone else with my R8. The membership program is a game changer for keeping my collection pristine.",
    rating: 5
  },
  {
    name: "Elena Rodriguez",
    vehicle: "BMW M4 Competition",
    content: "The level of care is unmatched. They treat your car like a work of art. My M4 has never looked this aggressive and clean.",
    rating: 5
  },
  {
    name: "Marcus Thorne",
    vehicle: "Mercedes G-Wagon",
    content: "Incredible service. They handled my G-Wagon's massive surface area with ease. The attention to the wheel detail was impressive.",
    rating: 5
  }
];

export default function Testimonials() {
  // Duplicate for infinite scroll effect
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <Section id="testimonials" spacing="medium" className="relative overflow-hidden">
      <div className="text-center mb-16 md:mb-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-6"
        >
          Social Proof
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-7xl font-black text-white mb-4 uppercase tracking-tighter"
        >
          Client <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Voices</span>
        </motion.h2>
        <p className="text-white/40 max-w-2xl mx-auto text-sm md:text-lg">The standard of excellence, confirmed by Vermont's most discerning owners.</p>
      </div>

      {/* Infinite Marquee Container */}
      <div className="relative flex overflow-hidden py-10 mask-fade">
        <motion.div 
          className="flex gap-6 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            duration: 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {duplicatedReviews.map((review, index) => (
            <GlassCard 
              key={`${review.name}-${index}`} 
              glowColor="amber" 
              className="w-[300px] md:w-[450px] p-8 md:p-10 flex flex-col relative overflow-hidden group shrink-0"
            >
              <Quote className="absolute -right-4 -top-4 w-20 h-20 md:w-24 md:h-24 text-white/5 rotate-12 group-hover:text-[#fbbf24]/10 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-[#fbbf24] text-[#fbbf24]" />
                ))}
              </div>

              <p className="text-white/70 italic mb-8 flex-grow leading-relaxed text-sm md:text-base whitespace-normal">
                "{review.content}"
              </p>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm md:text-base">{review.name}</h4>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#fbbf24]/70 font-black">{review.vehicle}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#fbbf24] opacity-50" />
                </div>
              </div>
            </GlassCard>
          ))}
        </motion.div>
      </div>

      <style jsx global>{`
        .mask-fade {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
      `}</style>
    </Section>
  );
}
