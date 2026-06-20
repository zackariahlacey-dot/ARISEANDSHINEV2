import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getRatingByToken } from "@/app/actions/customerRating";
import { RatingForm } from "@/components/rating/RatingForm";

async function RatingPage({ token }: { token: string }) {
  const result = await getRatingByToken(token);
  if (!result.ok) notFound();
  const r = result.rating;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-md mx-auto px-4 pt-10 pb-20">

        <div className="text-center mb-6">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#D4AF37]/70 mb-2">Arise And Shine Detailing</p>
          <h1 className="text-2xl font-black tracking-tight">How did we do, {r.customerFirstName}?</h1>
          {r.vehicleLabel && (
            <p className="text-[12px] text-zinc-400 mt-1">Your {r.vehicleLabel}</p>
          )}
        </div>

        {r.expired ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
            <p className="text-sm font-black text-zinc-300">This rating link has expired</p>
            <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
              Sorry — rating links are valid for 30 days. Send us a note at <a href="mailto:contact@ariseandshinedetailing.com" className="text-[#D4AF37]">contact@ariseandshinedetailing.com</a> and we&apos;ll still love your feedback.
            </p>
          </div>
        ) : r.alreadyUsed ? (
          <AlreadyRated couponCode={r.couponCode} />
        ) : (
          <RatingForm
            token={token}
            contractorFirstName={r.contractorFirstName}
          />
        )}

      </div>
    </div>
  );
}

function AlreadyRated({ couponCode }: { couponCode: string | null }) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
      <p className="text-sm font-black text-emerald-300">Thanks — we got your rating!</p>
      <p className="text-[11px] text-zinc-400 mt-1.5">Rating links can only be used once.</p>
      {couponCode && (
        <div className="mt-4 inline-block rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] px-5 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/70 mb-1">Your $15 off coupon</p>
          <p className="text-lg font-black tracking-wider text-white tabular-nums">{couponCode}</p>
          <p className="text-[10px] text-zinc-500 mt-1">Use at checkout. Single use.</p>
        </div>
      )}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
        </div>
      }
    >
      <Resolver params={params} />
    </Suspense>
  );
}

async function Resolver({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RatingPage token={token} />;
}
