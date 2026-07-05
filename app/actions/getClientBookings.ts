"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AdditionalVehicle = {
  vehicleYear: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleSize: string | null;
  serviceName: string | null;
  servicePrice: number;
};

export type BookingAddon = {
  id: string;
  label: string;
  price: number;
};

export type ClientBooking = {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: string;
  total_price: number;
  service_id: string | null;
  service_name: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_size: string | null;
  service_address: string | null;
  stripe_checkout_session_id: string | null;
  /** Extra vehicles included on the same booking (multi-vehicle discount).
   *  Pulled from the `additional_vehicles_json` snapshot the booking was
   *  created with, so the customer always sees what they actually paid for. */
  additional_vehicles: AdditionalVehicle[];
  /** Add-ons picked at booking time (July 2026 lineup). */
  addons: BookingAddon[];
};

export async function getClientBookings(userId: string): Promise<{
  upcoming: ClientBooking[];
  past: ClientBooking[];
}> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, status, total_price, service_id, service_name, vehicle_year, vehicle_make, vehicle_model, vehicle_size, service_address, stripe_checkout_session_id, additional_vehicles_json, addons_json")
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false });

  const bookings: ClientBooking[] = (data ?? []).map((b: any) => {
    // additional_vehicles_json stores the snapshot from booking time. Newer
    // rows use the full shape; older Stripe-compact rows use { sn, sz, sp }
    // shorthand keys. Normalize both into a single display shape.
    const raw = Array.isArray(b.additional_vehicles_json) ? b.additional_vehicles_json : [];
    const additional: AdditionalVehicle[] = raw.map((av: any) => ({
      vehicleYear:  av.vehicleYear  ?? av.vy ?? null,
      vehicleMake:  av.vehicleMake  ?? av.vm ?? null,
      vehicleModel: av.vehicleModel ?? av.vd ?? null,
      vehicleSize:  av.vehicleSize  ?? av.sz ?? null,
      serviceName:  av.serviceName  ?? av.sn ?? null,
      servicePrice: Number(av.servicePrice ?? av.sp ?? 0),
    }));

    // Normalize addons_json into a display shape. Older bookings may not
    // have this column populated — fall back to an empty list.
    const rawAddons = Array.isArray(b.addons_json) ? b.addons_json : [];
    const addons: BookingAddon[] = rawAddons.map((a: any) => ({
      id:    String(a.id ?? ""),
      label: String(a.label ?? a.name ?? a.id ?? ""),
      price: Number(a.price ?? 0),
    })).filter((a: BookingAddon) => a.id && a.label);

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
      addons,
    };
  });

  const upcoming = bookings.filter((b) => b.booking_date >= today).reverse();
  const past = bookings.filter((b) => b.booking_date < today);

  return { upcoming, past };
}
