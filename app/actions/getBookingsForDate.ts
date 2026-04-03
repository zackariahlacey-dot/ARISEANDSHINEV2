"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type BookingOnDate = {
  booking_time: string;
  service_name: string | null;
  vehicle_size: string | null;
};

/**
 * Fetches all bookings for a given date with their service name and vehicle
 * size, for use in schedule step to prevent double-booking and compute overlap.
 */
export async function getBookingsForDate(
  date: string
): Promise<BookingOnDate[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_time, vehicle_size, services(name)")
    .eq("booking_date", date)
    .neq("status", "cancelled");

  if (error) {
    console.error("[getBookingsForDate]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const s = row.services;
    const serviceName =
      s == null
        ? null
        : Array.isArray(s)
          ? (s[0] as { name?: string } | undefined)?.name ?? null
          : (s as { name?: string }).name ?? null;
    return {
      booking_time: String(row.booking_time ?? ""),
      service_name: serviceName,
      vehicle_size: (row as any).vehicle_size ?? null,
    };
  });
}
