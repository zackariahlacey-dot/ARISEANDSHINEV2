"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail } from "lucide-react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/protected");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-zinc-950/0 to-transparent">
      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-[#D4AF37]/20 shadow-[0_0_40px_rgba(212,175,55,0.05)] rounded-3xl p-8 text-center flex flex-col items-center">
        <Mail className="w-12 h-12 text-[#D4AF37] mb-6 shrink-0" />

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Check Your Email
        </h1>

        <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-8">
          We sent a verification link to your inbox. Click the link to confirm
          your account and we&apos;ll take you straight to your dashboard.
        </p>

        <div className="inline-flex items-center justify-center gap-3 bg-zinc-950/50 border border-white/5 rounded-full px-6 py-3 mt-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37] shrink-0" />
          <span className="text-sm font-medium text-zinc-300">
            Waiting for confirmation...
          </span>
        </div>
      </div>
    </div>
  );
}
