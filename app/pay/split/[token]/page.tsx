import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SplitPayClient from "./SplitPayClient";

export const metadata: Metadata = {
  title: "Pay Your Share — Arise And Shine Detailing",
  robots: { index: false, follow: false },
};

export default async function SplitPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Fetch by pay_token — non-guessable URL identifier issued when the
  // admin created the split. RLS is bypassed here because service-role
  // owns this table (admin-created splits are readable via token by
  // design — the token itself is the bearer credential).
  const { data: split } = await supabase
    .from("booking_split_payments")
    .select("id, booking_id, pay_token, recipient_email, recipient_name, amount, status, paid_at")
    .eq("pay_token", token)
    .maybeSingle();

  if (!split) notFound();

  if (split.status === "paid") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-3xl">✅</p>
          <p className="text-white font-bold text-lg">Already paid — thank you!</p>
          <p className="text-zinc-500 text-sm">
            This share of the invoice has already been settled.
            You can close this window.
          </p>
        </div>
      </div>
    );
  }

  if (split.status === "cancelled") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-zinc-400 font-bold">This payment link has been cancelled.</p>
          <p className="text-zinc-600 text-sm">If you have questions, call us at 802-585-5563.</p>
        </div>
      </div>
    );
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, service_name, customer_name, vehicle_year, vehicle_make, vehicle_model, booking_date, booking_time, status")
    .eq("id", split.booking_id)
    .maybeSingle();

  if (!booking) notFound();
  if (booking.status === "cancelled") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-zinc-400 font-bold">This booking has been cancelled.</p>
          <p className="text-zinc-600 text-sm">If you have questions, call us at 802-585-5563.</p>
        </div>
      </div>
    );
  }

  return (
    <SplitPayClient
      split={{
        pay_token:       split.pay_token,
        recipient_email: split.recipient_email,
        recipient_name:  split.recipient_name,
        amount:          Number(split.amount),
      }}
      booking={{
        id:            booking.id,
        service_name:  booking.service_name,
        customer_name: booking.customer_name,
        vehicle_year:  booking.vehicle_year,
        vehicle_make:  booking.vehicle_make,
        vehicle_model: booking.vehicle_model,
        booking_date:  booking.booking_date,
        booking_time:  booking.booking_time,
      }}
    />
  );
}
