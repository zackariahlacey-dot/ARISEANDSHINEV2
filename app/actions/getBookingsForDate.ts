"use server";

import { createClient } from "@/lib/supabase/server";

export type BookingOnDate = {
  booking_time: string;
  service_name: string | null;
};

/**
 * Fetches all bookings for a given date with their service name,
 * for use in schedule step to prevent double-booking and compute overlap.
 */
export async function getBookingsForDate(
  date: string
): Promise<BookingOnDate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_time, services(name)")
    .eq("booking_date", date);

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
    };
  });
}
