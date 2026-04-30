"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { AuthResponse } from "@supabase/supabase-js";
import { 
  checkUserExists, 
  sendOtpAction, 
  verifyOtpAction, 
  completeSignupAction 
} from "@/app/actions/authActions";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Eye, EyeOff, Mail, Lock, ShieldCheck,
  ArrowRight, Loader2, User, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const inputCls =
  "w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-zinc-600";

const btnCls =
  "btn-primary-gold-shimmer w-full bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] py-4 rounded-xl font-bold mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-500 ease-in-out";

type AuthState = "IDLE" | "SIGN_IN" | "SIGN_UP_DETAILS" | "SIGN_UP_VERIFY" | "SIGN_UP_PASSWORD";

export function SignUpForm({
  className,
  initialEmail,
  redirectAfter,
}: {
  className?: string;
  /** Prefill from booking invite link: /auth/sign-up?email=... */
  initialEmail?: string | null;
  /** After successful signup, redirect here instead of /protected (e.g. /?restore_booking=1) */
  redirectAfter?: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<AuthState>("IDLE");
  const [email, setEmail] = useState(() => initialEmail?.trim() || "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otp, setOtp] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then((result: AuthResponse) => {
      if (result.data.session) router.push("/protected");
    });
  }, [router]);

  useEffect(() => {
    const fromUrl = searchParams.get("email")?.trim();
    if (fromUrl) setEmail(fromUrl);
    else if (initialEmail?.trim()) setEmail(initialEmail.trim());
  }, [searchParams, initialEmail]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setIsLoading(true);
    setError(null);
    try {
      const { exists } = await checkUserExists(email);
      if (exists) {
        setState("SIGN_IN");
      } else {
        setState("SIGN_UP_DETAILS");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      router.push(redirectAfter ?? "/protected");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await sendOtpAction(email);
      if (res.success) {
        setState("SIGN_UP_VERIFY");
        setResendCooldown(60);
      } else {
        setError(res.error || "Failed to send code");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await verifyOtpAction(email, otp);
      if (res.success) {
        setState("SIGN_UP_PASSWORD");
      } else {
        setError(res.error || "Invalid code");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await completeSignupAction({
        email, code: otp, password, firstName, lastName,
      });
      if (res.success) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({ email, password });
        const qs = new URLSearchParams();
        if (redirectAfter) qs.set("redirect", redirectAfter);
        router.push(`/auth/sign-up-success${qs.size ? `?${qs}` : ""}`);
      } else {
        setError(res.error || "Signup failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setState("IDLE");
    setError(null);
    setPassword("");
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <motion.div 
        layout
        className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

        <div className="text-center mb-8 relative">
          <AnimatePresence mode="wait">
            {state !== "IDLE" && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={resetFlow}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
              >
                <ChevronLeft size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          <Image
            src="/e.png"
            alt="Arise and Shine VT"
            width={54}
            height={54}
            className="mx-auto mb-6 drop-shadow-2xl"
          />
          <motion.h2 layout className="text-2xl font-black tracking-tight text-white uppercase italic leading-tight">
            {state === "IDLE" && "Access Account"}
            {state === "SIGN_IN" && "Welcome Back"}
            {state === "SIGN_UP_DETAILS" && "New Account"}
            {state === "SIGN_UP_VERIFY" && "Check Email"}
            {state === "SIGN_UP_PASSWORD" && "Set Password"}
          </motion.h2>
          <motion.p layout className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-[0.3em] mt-2">
            {state === "IDLE" && "Arise & Shine VT"}
            {state === "SIGN_IN" && "Sign in to rewards"}
            {state === "SIGN_UP_DETAILS" && "Join loyalty rewards"}
            {state === "SIGN_UP_VERIFY" && `Sent to ${email}`}
            {state === "SIGN_UP_PASSWORD" && "Last step to join"}
          </motion.p>
        </div>

        <form onSubmit={(e) => {
          if (state === "IDLE") handleContinue(e);
          if (state === "SIGN_IN") handleLogin(e);
          if (state === "SIGN_UP_DETAILS") handleSendOtp(e);
          if (state === "SIGN_UP_VERIFY") handleVerifyOtp(e);
          if (state === "SIGN_UP_PASSWORD") handleCompleteSignup(e);
        }}>
          <div className="space-y-4">
            {/* Email field — Always visible but read-only when not IDLE */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  required
                  readOnly={state !== "IDLE"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(inputCls, "pl-11", state !== "IDLE" && "opacity-60 cursor-not-allowed")}
                />
              </div>
            </div>

            <AnimatePresence>
              {state === "SIGN_IN" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Password</label>
                      <Link href="/auth/forgot-password" className="text-[9px] text-[#D4AF37]/60 hover:text-[#D4AF37] uppercase font-bold tracking-widest">Forgot?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(inputCls, "pl-11 pr-12")}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {state === "SIGN_UP_DETAILS" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">First Name</label>
                      <input
                        type="text"
                        placeholder="John"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {state === "SIGN_UP_VERIFY" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-1.5 text-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Verification Code</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className={cn(inputCls, "pl-11 text-center text-xl tracking-[0.4em] font-black")}
                      />
                    </div>
                    <button 
                      type="button" 
                      disabled={resendCooldown > 0}
                      onClick={handleSendOtp}
                      className="text-[9px] font-bold text-[#D4AF37]/60 hover:text-[#D4AF37] uppercase tracking-widest disabled:opacity-40"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                    </button>
                  </div>
                </motion.div>
              )}

              {state === "SIGN_UP_PASSWORD" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Set Password</label>
                    <input
                      type="password"
                      placeholder="Min. 6 characters"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="Repeat password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-[10px] font-bold text-red-500 uppercase tracking-widest text-center"
            >
              {error}
            </motion.p>
          )}

          <button type="submit" disabled={isLoading} className={btnCls}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
              <span className="flex items-center gap-2">
                {state === "IDLE" && "Continue"}
                {state === "SIGN_IN" && "Sign In"}
                {state === "SIGN_UP_DETAILS" && "Verify Email"}
                {state === "SIGN_UP_VERIFY" && "Verify Code"}
                {state === "SIGN_UP_PASSWORD" && "Join Rewards"}
                <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Professional Detailing Service VT
        </p>
      </motion.div>
    </div>
  );
}
