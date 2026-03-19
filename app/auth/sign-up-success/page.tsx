"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Trophy, ArrowRight, Star, Sparkles, Gift } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import Image from "next/image";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReferral = searchParams.get("ref") === "true";

  useEffect(() => {
    // 1. Initial Confetti Burst
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#D4AF37", "#fcf6ba", "#ffffff"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#D4AF37", "#fcf6ba", "#ffffff"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // 2. Security Check: Redirect if not signed in after a delay
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // We'll give them time to see the success screen, 
        // but eventually they need to be signed in
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/20 via-zinc-950 to-zinc-950 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37] rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-zinc-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] rounded-[3rem] p-10 md:p-14 text-center flex flex-col items-center relative z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
          className="relative mb-10"
        >
          <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-2xl opacity-20 animate-pulse" />
          <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#AA771C] rounded-full flex items-center justify-center relative shadow-[0_0_30px_rgba(212,175,55,0.4)]">
            {isReferral ? <Gift className="w-12 h-12 text-black" strokeWidth={2.5} /> : <Trophy className="w-12 h-12 text-black" strokeWidth={2.5} />}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase italic tracking-tight leading-none">
            {isReferral ? (
              <>Referral <span className="text-[#D4AF37]">Reward</span></>
            ) : (
              <>Welcome <span className="text-[#D4AF37]">Bonus</span></>
            )}
          </h1>

          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="px-8 py-4 bg-zinc-950/60 border border-[#D4AF37]/30 rounded-2xl shadow-inner relative group">
              <div className="absolute -top-3 -right-3">
                <Sparkles className="w-6 h-6 text-[#D4AF37] animate-bounce" />
              </div>
              <span className="text-4xl md:text-5xl font-black text-[#D4AF37] tracking-tighter">
                {isReferral ? "10% OFF" : "+100 PTS"}
              </span>
            </div>
            
            <p className="text-zinc-400 text-sm md:text-lg font-medium leading-relaxed max-w-xs mx-auto">
              {isReferral 
                ? "Your referral discount has been applied to your account! Ready for your first shine?"
                : "We've added 100 loyalty points to your new account as a welcome gift. Enjoy the rewards!"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full space-y-4"
        >
          <button
            onClick={() => router.push("/protected")}
            className="btn-primary-gold-shimmer w-full bg-[#D4AF37] text-black hover:scale-[1.02] py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-[0_10px_40px_rgba(212,175,55,0.2)]"
          >
            GO TO DASHBOARD
            <ArrowRight size={22} strokeWidth={3} />
          </button>
          
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
            Arise & Shine VT • Premium Detailing
          </p>
        </motion.div>
      </motion.div>

      {/* Floating Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [-20, -100],
              x: Math.random() * 40 - 20
            }}
            transition={{ 
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            style={{
              position: 'absolute',
              left: `${15 + Math.random() * 70}%`,
              top: `${20 + Math.random() * 60}%`
            }}
          >
            <Star className="w-4 h-4 text-[#D4AF37]/30 fill-[#D4AF37]/10" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
