"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { Star, Quote } from "lucide-react";

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
  }
];

export default function Testimonials() {
  return (
    <Section id="testimonials" spacing="medium" className="relative">
      <div className="text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter"
        >
          Client <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Voices</span>
        </motion.h2>
        <p className="text-white/40 max-w-2xl mx-auto">The standard of excellence, confirmed by Vermont's most discerning owners.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {reviews.map((review, index) => (
          <motion.div
            key={review.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard glowColor="amber" className="p-8 h-full flex flex-col relative overflow-hidden group">
              <Quote className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:text-[#fbbf24]/10 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#fbbf24] text-[#fbbf24]" />
                ))}
              </div>

              <p className="text-white/70 italic mb-8 flex-grow leading-relaxed">"{review.content}"</p>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-white font-bold">{review.name}</h4>
                <p className="text-[10px] uppercase tracking-widest text-[#fbbf24]/70 font-black">{review.vehicle}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
