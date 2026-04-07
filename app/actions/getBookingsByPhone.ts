"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientBooking } from "./getClientBookings";

/** Look up bookings by phone number. Returns upcoming + past (most recent first). */
export async function getBookingsByPhone(phone: string): Promise<{
  found: boolean;
  upcoming: ClientBooking[];
  past: ClientBooking[];
}> {
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 10) return { found: false, upcoming: [], past: [] };

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // First find the profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", digits)
    .maybeSingle();

  // Also search by customer_phone on bookings (guest bookings without a profile)
  const conditions = profile
    ? `user_id.eq.${profile.id},customer_phone.eq.${digits}`
    : `customer_phone.eq.${digits}`;

  const { data } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, status, total_price, service_id, service_name, vehicle_year, vehicle_make, vehicle_model, vehicle_size, service_address, stripe_checkout_session_id, customer_phone, user_id")
    .or(conditions)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false });

  if (!data || data.length === 0) return { found: false, upcoming: [], past: [] };

  const bookings: ClientBooking[] = data.map((b: any) => ({
    id: b.id,
    booking_date: b.booking_date,
    booking_time: b.booking_time,
    status: b.status,
    total_price: Number(b.total_price) || 0,
    service_id: b.service_id ?? null,
    service_name: b.service_name,
    vehicle_year: b.vehicle_year,
    vehicle_make: b.vehicle_make,
    vehicle_model: b.vehicle_model,
    vehicle_size: b.vehicle_size,
    service_address: b.service_address,
    stripe_checkout_session_id: b.stripe_checkout_session_id ?? null,
  }));

  const upcoming = bookings.filter((b) => b.booking_date >= today).reverse();
  const past = bookings.filter((b) => b.booking_date < today);

  return { found: true, upcoming, past };
}
