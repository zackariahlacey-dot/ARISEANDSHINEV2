import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thank You — Arise & Shine VT",
  robots: { index: false, follow: false },
};

export default async function PaySuccessPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("service_name, customer_name, vehicle_year, vehicle_make, vehicle_model, booking_date")
    .eq("id", bookingId)
    .single();

  const firstName = booking?.customer_name?.split(" ")[0] ?? "there";
  const service = booking?.service_name ?? "detail";
  const vehicleStr = [booking?.vehicle_year, booking?.vehicle_make, booking?.vehicle_model]
    .filter(Boolean).join(" ");

  function fmtDate(d: string | null | undefined) {
    if (!d) return "";
    try {
      return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    } catch { return d; }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-md space-y-6 text-center">

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Arise &amp; Shine VT</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-8 space-y-3">
          <CheckCircle size={40} className="text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-black text-white">Payment Received!</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Thank you so much, {firstName} — your payment is confirmed.
            {vehicleStr ? ` We absolutely loved working on your ${vehicleStr}.` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-5 space-y-3 text-left">
          {service && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Service</span>
              <span className="text-zinc-200 font-bold">{service}</span>
            </div>
          )}
          {booking?.booking_date && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Date</span>
              <span className="text-zinc-200 font-bold">{fmtDate(booking.booking_date)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-xs text-zinc-600 leading-relaxed">
              A receipt has been sent to your email. If you have any questions, don&apos;t hesitate to reach out — we&apos;re always happy to help.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-zinc-600">Questions?</p>
          <div className="flex gap-3 justify-center">
            <a
              href="tel:8025855563"
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-white/[0.07] transition-all active:scale-95"
            >
              Call Us
            </a>
            <a
              href="mailto:contact@ariseandshinevt.com"
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-white/[0.07] transition-all active:scale-95"
            >
              Email Us
            </a>
          </div>
        </div>

        <Link
          href="/"
          className="inline-block text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-amber-500 transition-colors mt-4"
        >
          ← Back to Arise &amp; Shine VT
        </Link>

      </div>
    </div>
  );
}
