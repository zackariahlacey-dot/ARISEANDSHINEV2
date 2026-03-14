"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const reviews = [
  { name: "James Anderson", vehicle: "Porsche 911 GT3", content: "Absolutely clinical attention to detail. My GT3 looks better than the day I took delivery. The mobile setup is incredibly professional.", rating: 5 },
  { name: "Sarah Jenkins", vehicle: "Tesla Model Y", content: "Best interior detail I've ever had. They managed to get out stains that three other detailers couldn't touch. Highly recommend the monthly plan.", rating: 5 },
  { name: "Robert Miller", vehicle: "Range Rover Sport", content: "The hyper gloss wax is no joke. The depth of shine on my black paint is incredible. Easy booking and excellent communication.", rating: 5 },
  { name: "David Chen", vehicle: "Audi R8 V10", content: "Surgical precision. I wouldn't trust anyone else with my R8. The membership program is a game changer for keeping my collection pristine.", rating: 5 },
  { name: "Elena Rodriguez", vehicle: "BMW M4 Competition", content: "The level of care is unmatched. They treat your car like a work of art. My M4 has never looked this aggressive and clean.", rating: 5 },
  { name: "Marcus Thorne", vehicle: "Mercedes G-Wagon", content: "Incredible service. They handled my G-Wagon's massive surface area with ease. The attention to the wheel detail was impressive.", rating: 5 }
];

export default function Testimonials() {
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <Section id="testimonials" spacing="none" className="py-24 md:py-48 bg-[#050505] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.5em]">The Discerning Voices</span>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8 italic">
          Client <span className="text-white/10">Voices</span>
        </motion.h2>
        <p className="text-lg md:text-xl text-white/30 max-w-2xl mx-auto font-medium italic">The standard of excellence, confirmed by Vermont's elite owners.</p>
      </div>

      <div className="relative flex overflow-hidden py-10 mask-fade z-10">
        <motion.div 
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            duration: 40, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {duplicatedReviews.map((review, index) => (
            <div 
              key={`${review.name}-${index}`} 
              className="w-[350px] md:w-[500px] p-10 md:p-16 flex flex-col relative overflow-hidden group shrink-0 glass-panel rounded-[40px] border-none bg-white/[0.01]"
            >
              <Quote className="absolute -right-4 -top-4 w-24 h-24 text-white/[0.02] rotate-12 group-hover:text-[#fbbf24]/5 transition-colors duration-700" />
              
              <div className="flex gap-1 mb-10">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-[#fbbf24] text-[#fbbf24]" />
                ))}
              </div>

              <p className="text-white/60 italic mb-12 flex-grow leading-relaxed text-sm md:text-xl whitespace-normal font-medium">
                "{review.content}"
              </p>

              <div className="border-t border-white/5 pt-8">
                <p className="text-white font-black text-xl tracking-tighter uppercase mb-1">{review.name}</p>
                <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{review.vehicle}</p>
              </div>
            </div>
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
