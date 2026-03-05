"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createProfileWithReferral } from "@/app/actions/createProfileWithReferral";
import { sendAdminNewUserAlert } from "@/app/actions/sendAdminNewUserAlert";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Ticket } from "lucide-react";

const inputCls =
  "w-full bg-zinc-950/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 text-white rounded-lg px-4 py-3 outline-none transition-all placeholder:text-zinc-600 text-center";

const btnCls =
  "w-full bg-zinc-900/80 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-zinc-950 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all duration-300 py-3 rounded-lg font-semibold mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed";

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Referral code from ?ref= URL param; shows promo banner and saves to profile */
  refCode?: string | null;
}

export function SignUpForm({ className, refCode, ...props }: SignUpFormProps) {
  const searchParams = useSearchParams();
  const referredByCode = searchParams.get("ref") ?? refCode ?? null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Generate unique referral code before sign-up so it's saved at account creation
    const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            new_referral_code: newReferralCode,
          },
        },
      });
      if (signUpError) throw signUpError;

      // Create profile with pre-generated code, name, and referral linkage (referred_by from ?ref=)
      if (data.user) {
        await createProfileWithReferral(
          data.user.id,
          email,
          referredByCode,
          firstName.trim(),
          lastName.trim(),
          newReferralCode
        );
      }

      // Notify admin of new sign-up (fire-and-forget; never block or break sign-up)
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "New User";
      sendAdminNewUserAlert(fullName, email).catch((err) =>
        console.error("[sign-up] Admin new user email failed:", err)
      );

      router.push("/auth/sign-up-success");
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
          Create Account
        </h2>
        <p className="text-sm text-zinc-400 mt-1 text-center">
          Join to earn reward points on every booking
        </p>

        {referredByCode && (
          <div className="flex items-start gap-3 mt-6 mb-4 bg-emerald-950/50 border border-emerald-700/40 rounded-xl px-4 py-3.5 text-left">
            <Ticket size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300 leading-snug">
              <span className="font-semibold text-emerald-200">
                Referral code applied!
              </span>{" "}
              🎉 You get{" "}
              <span className="font-semibold">10% off your first booking</span>.
            </p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-5 mt-6 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first-name" className="text-sm font-medium text-zinc-300 mb-1.5 block w-full text-center">
                First Name
              </label>
              <input
                id="first-name"
                type="text"
                placeholder="Jane"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="last-name" className="text-sm font-medium text-zinc-300 mb-1.5 block w-full text-center">
                Last Name
              </label>
              <input
                id="last-name"
                type="text"
                placeholder="Smith"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-300 mb-1.5 block w-full text-center">
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
            <label htmlFor="password" className="text-sm font-medium text-zinc-300 mb-1.5 block w-full text-center">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="repeat-password" className="text-sm font-medium text-zinc-300 mb-1.5 block w-full text-center">
              Confirm Password
            </label>
            <input
              id="repeat-password"
              type="password"
              required
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
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
            {isLoading ? "Processing…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-zinc-400 hover:text-[#D4AF37] transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
