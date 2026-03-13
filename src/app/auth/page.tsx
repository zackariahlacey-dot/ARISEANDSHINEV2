"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Section } from "@/components/ui/Section";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrismButton } from "@/components/ui/PrismButton";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-xl px-11 py-4 text-white focus:outline-none focus:border-[#fbbf24]/50 focus:bg-white/[0.05] transition-all placeholder:text-white/10";

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 gradient-mesh opacity-20 pointer-events-none" />
      
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors z-20">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return Home</span>
      </Link>

      <Section spacing="none" className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-3 mb-8">
              <img src="/e.png" alt="Logo" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-black tracking-tighter text-white uppercase">ARISE <span className="text-[#fbbf24]">&</span> SHINE</span>
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Member <span className="text-[#fbbf24]">Portal</span>
            </h1>
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-4">
              {isLogin ? "Access your elite dashboard" : "Join the inner circle"}
            </p>
          </div>

          <GlassCard glowColor={isLogin ? "amber" : "violet"} className="p-8 border-white/5">
            <form onSubmit={handleAuth} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold tracking-tight">
                  {error}
                </div>
              )}

              <div className="relative group">
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2 px-1">Email Address</label>
                <Mail className="absolute left-4 top-[38px] w-4 h-4 text-white/20 group-focus-within:text-[#fbbf24] transition-colors" />
                <input 
                  required 
                  type="email" 
                  placeholder="alex@premium.com" 
                  className={inputClasses}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative group">
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2 px-1">Password</label>
                <Lock className="absolute left-4 top-[38px] w-4 h-4 text-white/20 group-focus-within:text-[#fbbf24] transition-colors" />
                <input 
                  required 
                  type="password" 
                  placeholder="••••••••" 
                  className={inputClasses}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <PrismButton variant="luxury" disabled={loading} className="w-full py-4 text-sm font-black uppercase tracking-[0.3em]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isLogin ? "Initialize Session" : "Create Account")}
              </PrismButton>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-[#fbbf24] transition-colors"
              >
                {isLogin ? "Request Membership Access" : "Existing Member? Authenticate"}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </Section>
    </main>
  );
}
