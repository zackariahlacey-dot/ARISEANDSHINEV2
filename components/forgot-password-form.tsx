"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";

const inputCls =
  "w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-[16px] md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all";

const btnCls =
  "btn-shimmer w-full bg-white text-zinc-950 font-semibold rounded-lg py-3 text-sm hover:bg-zinc-100 transition-all hover:shadow-[0_0_24px_rgba(212,175,55,0.3)] active:scale-[0.98] flex items-center justify-center gap-2";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 shadow-2xl rounded-2xl p-8 md:p-10">

        {success ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <MailCheck size={24} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37] mb-2">
                Arise And Shine VT
              </p>
              <h2 className="text-2xl font-black tracking-tight text-white">Check Your Email</h2>
              <p className="text-sm text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                If that address is registered, you&apos;ll receive a password reset link shortly.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="mt-2 text-sm text-zinc-400 hover:text-[#D4AF37] transition-colors font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Branding header */}
            <div className="mb-8">
              <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37] mb-2">
                Arise And Shine VT
              </p>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Reset Password
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-zinc-400">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`${btnCls} ${isLoading ? "btn-loading" : "disabled:opacity-60 disabled:cursor-not-allowed"}`}
              >
                {isLoading ? "Processing…" : "Send Reset Link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-zinc-400 hover:text-[#D4AF37] transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
