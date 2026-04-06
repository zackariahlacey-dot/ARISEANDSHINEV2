"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ClientBooking = {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: string;
  total_price: number;
  service_name: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_size: string | null;
  service_address: string | null;
};

export async function getClientBookings(userId: string): Promise<{
  upcoming: ClientBooking[];
  past: ClientBooking[];
}> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, status, total_price, service_name, vehicle_year, vehicle_make, vehicle_model, vehicle_size, service_address")
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false });

  const bookings: ClientBooking[] = (data ?? []).map((b: any) => ({
    id: b.id,
    booking_date: b.booking_date,
    booking_time: b.booking_time,
    status: b.status,
    total_price: Number(b.total_price) || 0,
    service_name: b.service_name,
    vehicle_year: b.vehicle_year,
    vehicle_make: b.vehicle_make,
    vehicle_model: b.vehicle_model,
    vehicle_size: b.vehicle_size,
    service_address: b.service_address,
  }));

  const upcoming = bookings.filter((b) => b.booking_date >= today).reverse();
  const past = bookings.filter((b) => b.booking_date < today);

  return { upcoming, past };
}
