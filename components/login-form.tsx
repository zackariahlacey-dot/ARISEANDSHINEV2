"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const inputCls =
  "w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-lg px-4 py-3 outline-none transition-all placeholder:text-zinc-600";

const btnCls =
  "w-full bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all duration-300 py-3 rounded-lg font-semibold mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/protected";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-[#D4AF37]/20 shadow-[0_0_40px_rgba(212,175,55,0.05)] rounded-3xl p-8 text-center">
        <Image
          src="/e.png"
          alt="Arise and Shine VT Logo"
          width={64}
          height={64}
          className="mx-auto mb-6 object-contain drop-shadow-md"
        />
        <h2 className="text-2xl font-black tracking-tight text-white text-center">
          Welcome Back
        </h2>
        <p className="text-sm text-zinc-400 mt-1 text-center">
          Sign in to access your loyalty rewards
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5 mt-8 text-left">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-300 mb-1.5 block text-left">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-sm font-medium text-zinc-300 block text-left">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-zinc-500 hover:text-[#D4AF37] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            className={cn(btnCls, isLoading && "btn-loading")}
          >
            {isLoading ? "Processing…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="text-zinc-400 hover:text-[#D4AF37] transition-colors font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
