import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailableSlots, timeToMins } from "@/lib/availability";
import { ymdInBusinessTz, todayInBusinessTz } from "@/lib/dates";

export type NextAvailableSlot = {
  /** "Today" / "Tomorrow" / "Thu, May 28" */
  dateStr: string;
  /** "2:00 PM" */
  timeStr: string;
  /** Raw YYYY-MM-DD for any downstream linking. */
  isoDate: string;
};

/**
 * Walks forward up to 30 days from today (business tz) to find the next
 * operating day with at least one bookable slot. Returns null if completely
 * booked out — caller can fall back to "Booking out 30+ days".
 */
export async function getNextAvailableSlot(): Promise<NextAvailableSlot | null> {
  const supabase = createAdminClient();
  const today    = new Date();
  const todayStr = todayInBusinessTz();
  const endDate  = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  const endDateStr = ymdInBusinessTz(endDate);

  const [opRes, blockedRes, bookingsRes] = await Promise.all([
    supabase.from("operating_hours").select("day_of_week, start_time, end_time, is_open, month"),
    supabase.from("blocked_dates").select("blocked_date").gte("blocked_date", todayStr).lte("blocked_date", endDateStr),
    supabase.from("bookings")
      .select("booking_date, booking_time, service_name, vehicle_size, status, duration_override")
      .gte("booking_date", todayStr)
      .lte("booking_date", endDateStr)
      .neq("status", "cancelled"),
  ]);

  const allOpHours = opRes.data ?? [];
  const blockedSet = new Set((blockedRes.data ?? []).map((b: { blocked_date: string }) => b.blocked_date));

  const byDate = new Map<string, Array<Record<string, unknown>>>();
  for (const b of (bookingsRes.data ?? [])) {
    const arr = byDate.get(b.booking_date) ?? [];
    arr.push(b);
    byDate.set(b.booking_date, arr);
  }

  // 1-hour buffer so we don't dangle a slot that's already running.
  const nowMins = today.getHours() * 60 + today.getMinutes() + 60;

  for (let offset = 0; offset < 30; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = ymdInBusinessTz(d);
    const [, mm] = dateStr.split("-").map((n) => parseInt(n, 10));
    const localNoon = new Date(`${dateStr}T12:00:00`);
    const dow = localNoon.getDay();

    if (blockedSet.has(dateStr)) continue;

    const opHours =
      allOpHours.find((h) => h.day_of_week === dow && h.month === mm) ??
      allOpHours.find((h) => h.day_of_week === dow && h.month == null) ??
      null;

    if (!opHours || !opHours.is_open) continue;

    const dayStart       = opHours.start_time ? timeToMins(opHours.start_time) : 7 * 60;
    const dayEnd         = opHours.end_time   ? timeToMins(opHours.end_time)   : 19 * 60;
    const effectiveStart = offset === 0 ? Math.max(dayStart, nowMins) : dayStart;

    const existing = (byDate.get(dateStr) ?? []).map((b) => ({
      ...b,
      total_duration_mins: (b as { duration_override?: number }).duration_override ?? undefined,
    })) as Parameters<typeof getAvailableSlots>[0];

    const slots = getAvailableSlots(existing, "Exterior Detail", "sedan", effectiveStart, dayEnd);
    if (slots.length === 0) continue;

    const dateLabel =
      offset === 0 ? "Today" :
      offset === 1 ? "Tomorrow" :
      d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });

    const [h, m] = slots[0].split(":");
    const hour    = parseInt(h, 10);
    const timeStr = `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;

    return { dateStr: dateLabel, timeStr, isoDate: dateStr };
  }

  return null;
}
