import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.1)_0%,transparent_60%)]"
      />
      <div className="w-full max-w-md relative z-10">
        <Suspense
          fallback={
            <div className="h-[340px] animate-pulse rounded-3xl bg-zinc-900/40 border border-[#D4AF37]/20" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
