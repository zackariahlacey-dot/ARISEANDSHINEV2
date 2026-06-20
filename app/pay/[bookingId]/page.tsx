import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PayClient from "./PayClient";

export const metadata: Metadata = {
  title: "Pay Your Invoice — Arise And Shine Detailing",
  robots: { index: false, follow: false },
};

export default async function PayPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, service_name, total_price, customer_name, vehicle_year, vehicle_make, vehicle_model, booking_date, booking_time, status, payment_method")
    .eq("id", bookingId)
    .single();

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
    <PayClient
      booking={{
        id: booking.id,
        service_name: booking.service_name,
        total_price: Number(booking.total_price),
        customer_name: booking.customer_name,
        vehicle_year: booking.vehicle_year,
        vehicle_make: booking.vehicle_make,
        vehicle_model: booking.vehicle_model,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
      }}
    />
  );
}
