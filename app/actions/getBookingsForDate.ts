"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDurationMins, getAdditionalVehiclesDuration } from "@/lib/availability";

export type BookingOnDate = {
  booking_time: string;
  service_name: string | null;
  vehicle_size: string | null;
  /** Total occupied time including any additional vehicles in the same appointment. */
  total_duration_mins: number;
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
    .select("booking_time, service_name, vehicle_size, additional_vehicles_json, duration_override, services(name)")
    .eq("booking_date", date)
    .neq("status", "cancelled");

  if (error) {
    console.error("[getBookingsForDate]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    // Prefer the direct service_name column (present on monthly-plan and admin bookings
    // where service_id is null and the join returns nothing).
    const directName = (row as any).service_name as string | null | undefined;
    const s = row.services;
    const joinedName =
      s == null
        ? null
        : Array.isArray(s)
          ? (s[0] as { name?: string } | undefined)?.name ?? null
          : (s as { name?: string }).name ?? null;
    const serviceName = directName ?? joinedName;
    const vehicleSize = (row as any).vehicle_size ?? null;
    const override    = (row as any).duration_override;
    const primaryDur  = getDurationMins(serviceName ?? "", vehicleSize ?? "sedan");
    const addlDur     = getAdditionalVehiclesDuration((row as any).additional_vehicles_json);
    return {
      booking_time:        String(row.booking_time ?? ""),
      service_name:        serviceName,
      vehicle_size:        vehicleSize,
      total_duration_mins: override != null ? override : primaryDur + addlDur,
    };
  });
}
