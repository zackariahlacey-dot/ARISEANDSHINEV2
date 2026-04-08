import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string; redirect?: string; email?: string }>;
}) {
  const params = await searchParams;

  // When arriving from "Create Account" in the booking flow, bounce straight to sign-up
  // while preserving the redirect URL and pre-filling the email.
  if (params.signup === "true") {
    const qs = new URLSearchParams();
    if (params.redirect) qs.set("redirect", params.redirect);
    if (params.email) qs.set("email", params.email);
    redirect(`/auth/sign-up${qs.size ? `?${qs}` : ""}`);
  }

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
