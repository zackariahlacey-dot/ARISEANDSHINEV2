"use server";

import { createClient } from "@/lib/supabase/server";
import { todayInBusinessTz } from "@/lib/dates";

export type OperatingHour = {
  day_of_week: number;
  month: number | null;
  start_time: string;
  end_time: string;
  isClosed: boolean;
};

export type AvailabilityData = {
  operatingHours: OperatingHour[];
  blockedDates: string[];
};

/**
 * Fetches operating_hours and blocked_dates (from today onward) for the booking form.
 * Use createClient() so RLS applies; ensure these tables are readable by anon or authenticated.
 */
export async function getAvailability(): Promise<AvailabilityData> {
  const supabase = await createClient();
  // Business-tz today — UTC would shift the cutoff to tomorrow after 7 PM ET
  // and silently drop today's blocked-date entry from the list.
  const today = todayInBusinessTz();

  const [
    { data: hoursData },
    { data: blockedData },
  ] = await Promise.all([
    supabase
      .from("operating_hours")
      .select("day_of_week, month, start_time, end_time, is_open")
      .order("month", { ascending: true, nullsFirst: true })
      .order("day_of_week", { ascending: true }),
    supabase
      .from("blocked_dates")
      .select("blocked_date")
      .gte("blocked_date", today)
      .order("blocked_date", { ascending: true }),
  ]);

  const operatingHours: OperatingHour[] = (hoursData ?? []).map((r) => {
    const isOpen = (r as { is_open?: boolean }).is_open;
    const isClosed = typeof isOpen === "boolean" ? !isOpen : true;
    return {
      day_of_week: Number(r.day_of_week),
      month: r.month != null ? Number(r.month) : null,
      start_time: String(r.start_time ?? "").slice(0, 8),
      end_time: String(r.end_time ?? "").slice(0, 8),
      isClosed,
    };
  });

  const blockedDates = (blockedData ?? []).map((r) => String(r.blocked_date));

  return { operatingHours, blockedDates };
}
