"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { LightLeak } from "@/components/ui/LightLeak";
import { Mail, Lock, Loader2, ArrowLeft, ShieldCheck, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const inputWrapperClasses = "relative group";
  const labelClasses = "block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2 px-1 group-focus-within:text-[#fbbf24] transition-colors";
  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-4 text-white focus:outline-none focus:border-[#fbbf24]/50 focus:bg-white/[0.05] transition-all placeholder:text-white/10 disabled:opacity-50";
  const iconClasses = "absolute left-4 top-[38px] w-4 h-4 text-white/20 group-focus-within:text-[#fbbf24] transition-colors";

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 gradient-mesh opacity-20 pointer-events-none" />
      <LightLeak color="violet" intensity="medium" className="-top-1/4 -left-1/4 opacity-30" />
      <LightLeak color="amber" intensity="low" className="bottom-0 -right-1/4 opacity-20" />

      {/* Left Panel: Brand & Mission */}
      <div className="hidden md:flex md:w-1/2 p-12 lg:p-24 flex-col justify-between relative z-10 border-r border-white/5">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#fbbf24]/50 transition-colors">
            <img src="/e.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white uppercase">ARISE <span className="text-[#fbbf24]">&</span> SHINE</span>
        </Link>

        <div className="max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/5 mb-8">
              <ShieldCheck className="w-3 h-3 text-[#fbbf24]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#fbbf24]">Identity Verified</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter mb-8">
              Entrance to the <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#fbbf24] to-white">Elite Circle.</span>
            </h1>
            <p className="text-white/40 text-lg lg:text-xl font-medium leading-relaxed border-l-2 border-[#fbbf24]/30 pl-8 italic">
              "Membership is not just a status—it's a commitment to automotive perfection and enduring brilliance."
            </p>
          </motion.div>
        </div>

        <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
          <span>Est. 2023</span>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <span>Vermont Born</span>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex-grow flex items-center justify-center p-6 lg:p-12 relative z-10">
        <Link href="/" className="md:hidden absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          <div className="text-center md:text-left mb-10">
            <UserCircle2 className="w-12 h-12 text-[#fbbf24] mb-6 mx-auto md:mx-0 opacity-50" />
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
              Member <span className="text-[#fbbf24]">{isLogin ? "Authentication" : "Registration"}</span>
            </h2>
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">
              {isLogin ? "Secure access to your prestige dashboard" : "Initialize your detailing legacy"}
            </p>
          </div>

          <GlassCard glowColor={isLogin ? "amber" : "violet"} className="p-8 md:p-10 border-white/5">
            <form onSubmit={handleAuth} className="space-y-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold tracking-tight">
                  {error}
                </div>
              )}

              <div className={inputWrapperClasses}>
                <label className={labelClasses}>Direct Identifier</label>
                <Mail className={iconClasses} />
                <input 
                  required 
                  disabled={loading}
                  type="email" 
                  placeholder="alex@prestige.com" 
                  className={inputClasses}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={inputWrapperClasses}>
                <label className={labelClasses}>Security Cipher</label>
                <Lock className={iconClasses} />
                <input 
                  required 
                  disabled={loading}
                  type="password" 
                  placeholder="••••••••" 
                  className={inputClasses}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <PrismButton variant="luxury" disabled={loading} className="w-full py-5 text-sm font-black uppercase tracking-[0.3em] group relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Initialize Session" : "Create Account"}
                      <ShieldCheck className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </PrismButton>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-[#fbbf24] transition-colors"
              >
                {isLogin ? "Request Membership Access" : "Existing Member? Authenticate"}
              </button>
            </div>
          </GlassCard>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.5em]">
              Protected by Vizulux Security
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
