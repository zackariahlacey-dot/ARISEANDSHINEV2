"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientBooking } from "./getClientBookings";

/** Look up bookings by email + vehicle make + model. Returns upcoming + past (most recent first). */
export async function getBookingsByEmailAndVehicle(
  email: string,
  make: string,
  model: string
): Promise<{ found: boolean; upcoming: ClientBooking[]; past: ClientBooking[] }> {
  const trimEmail = email.trim().toLowerCase();
  const trimMake = make.trim();
  const trimModel = model.trim();

  if (!trimEmail || !trimMake || !trimModel) {
    return { found: false, upcoming: [], past: [] };
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, booking_time, status, total_price, service_id, service_name, vehicle_year, vehicle_make, vehicle_model, vehicle_size, service_address, stripe_checkout_session_id, customer_phone, user_id, additional_vehicles_json, addons_json"
    )
    .ilike("customer_email", trimEmail)
    .ilike("vehicle_make", `%${trimMake}%`)
    .ilike("vehicle_model", `%${trimModel}%`)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false });

  if (!data || data.length === 0) return { found: false, upcoming: [], past: [] };

  const bookings: ClientBooking[] = data.map((b: any) => {
    const raw = Array.isArray(b.additional_vehicles_json) ? b.additional_vehicles_json : [];
    const additional = raw.map((av: any) => ({
      vehicleYear:  av.vehicleYear  ?? av.vy ?? null,
      vehicleMake:  av.vehicleMake  ?? av.vm ?? null,
      vehicleModel: av.vehicleModel ?? av.vd ?? null,
      vehicleSize:  av.vehicleSize  ?? av.sz ?? null,
      serviceName:  av.serviceName  ?? av.sn ?? null,
      servicePrice: Number(av.servicePrice ?? av.sp ?? 0),
    }));
    return {
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
      additional_vehicles: additional,
      addons: (Array.isArray(b.addons_json) ? b.addons_json : []).map((a: any) => ({
        id:    String(a.id ?? ""),
        label: String(a.label ?? a.name ?? a.id ?? ""),
        price: Number(a.price ?? 0),
      })).filter((a: { id: string; label: string }) => a.id && a.label),
    };
  });

  const upcoming = bookings.filter((b) => b.booking_date >= today).reverse();
  const past = bookings.filter((b) => b.booking_date < today);

  return { found: true, upcoming, past };
}
