import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";

// Next.js 15: searchParams is async
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const refCode = params?.ref ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.1)_0%,transparent_60%)]"
      />
      <div className="w-full max-w-md relative z-10">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-[#D4AF37]/20 rounded-3xl p-8 flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
            </div>
          }
        >
          <SignUpForm refCode={refCode} />
        </Suspense>
      </div>
    </div>
  );
}
