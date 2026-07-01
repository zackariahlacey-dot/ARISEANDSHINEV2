import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Received — Arise And Shine Detailing",
  robots: { index: false, follow: false },
};

export default async function SplitSuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: split } = await supabase
    .from("booking_split_payments")
    .select("id, booking_id, amount, status, recipient_name")
    .eq("pay_token", token)
    .maybeSingle();
  if (!split) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto">
          <Check size={28} className="text-emerald-400" strokeWidth={3} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2">Payment Received</p>
          <h1 className="text-2xl font-black text-white">
            Thanks{split.recipient_name ? `, ${split.recipient_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            Your ${Number(split.amount).toFixed(2)} share is in. Stripe will email you a receipt in a moment.
          </p>
        </div>
        <div className="pt-4 border-t border-white/[0.05]">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-amber-500 transition-colors">
            <Sparkles size={13} /> Arise And Shine Detailing
          </Link>
        </div>
      </div>
    </div>
  );
}
