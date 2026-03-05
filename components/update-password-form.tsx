"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls =
  "w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-[16px] md:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all";

const btnCls =
  "btn-shimmer w-full bg-white text-zinc-950 font-semibold rounded-lg py-3 text-sm hover:bg-zinc-100 transition-all hover:shadow-[0_0_24px_rgba(212,175,55,0.3)] active:scale-[0.98] flex items-center justify-center gap-2";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/protected");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 shadow-2xl rounded-2xl p-8 md:p-10">

        {/* Branding header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#D4AF37] mb-2">
            Arise And Shine VT
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Set New Password
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Choose a strong password for your account
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-zinc-400">
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="New password"
              required
              autoComplete="new-password"
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
            className={`${btnCls} ${isLoading ? "btn-loading" : "disabled:opacity-60 disabled:cursor-not-allowed"}`}
          >
            {isLoading ? "Processing…" : "Save New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
