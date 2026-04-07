"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDurationMins,
  checkSlotConflict,
  timeToMins,
  to12h,
  type BookingSlot,
} from "@/lib/availability";

export type AvailableDay = {
  date: string;         // YYYY-MM-DD
  label: string;        // "Today", "Tomorrow", "Mon Apr 7"
  earliestSlot: string; // "09:00 AM"
  totalSlots: number;
};

/** Fetch all non-cancelled bookings for a date (uses admin client to bypass RLS). */
async function getBookingsForDateRaw(supabase: any, date: string): Promise<BookingSlot[]> {
  const { data } = await supabase
    .from("bookings")
    .select("booking_time, service_name, vehicle_size, status")
    .eq("booking_date", date)
    .neq("status", "cancelled");
  return (data ?? []).map((r: any) => ({
    booking_time: r.booking_time ?? "00:00",
    service_name: r.service_name ?? null,
    vehicle_size: r.vehicle_size ?? null,
    status: r.status ?? "confirmed",
  }));
}

/**
 * Scans forward through the next `lookahead` days and returns the first
 * `count` days that have at least one open slot for the given service + size.
 */
export async function getNextAvailableDays(
  serviceName: string,
  vehicleSize: string,
  count: number = 3,
  lookahead: number = 21,
  customDurationMins?: number
): Promise<AvailableDay[]> {
  const supabase = createAdminClient();

  // Load operating hours and blocked dates in parallel
  const [ohResult, blockedResult] = await Promise.all([
    supabase.from("operating_hours").select("*"),
    supabase.from("blocked_dates").select("blocked_date"),
  ]);

  const operatingHours: any[] = ohResult.data ?? [];
  const blockedSet = new Set<string>((blockedResult.data ?? []).map((r: any) => r.blocked_date));

  const duration = customDurationMins ?? getDurationMins(serviceName, vehicleSize);
  const results: AvailableDay[] = [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // How many minutes a booking is allowed to run past the scheduled closing time.
  const OVERTIME_GRACE_MINS = 60;

  // Default hours used when no operating_hours rows exist in the DB yet.
  // Current schedule: Mon–Fri 1 PM – 6 PM, weekends closed.
  const DEFAULT_HOURS: Record<number, { start: string; end: string } | null> = {
    0: null,              // Sunday — closed
    1: { start: "13:00", end: "18:00" },
    2: { start: "13:00", end: "18:00" },
    3: { start: "13:00", end: "18:00" },
    4: { start: "13:00", end: "18:00" },
    5: { start: "13:00", end: "18:00" },
    6: null,              // Saturday — closed
  };

  for (let i = 0; i < lookahead && results.length < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    // Skip blocked dates
    if (blockedSet.has(dateStr)) continue;

    const dow = d.getDay(); // 0=Sun … 6=Sat

    // Find operating hours for this day (month-specific override first, then generic)
    const month = d.getMonth() + 1;
    const overrideRow = operatingHours.find(
      (h: any) => h.month === month && h.day_of_week === dow
    );
    const defaultRow = operatingHours.find(
      (h: any) => (h.month == null || h.month === undefined) && h.day_of_week === dow
    );
    const row = overrideRow ?? defaultRow;

    // Determine if day is open and what the hours are
    let dayStart: number;
    let dayEnd: number;

    if (row) {
      // DB row found — respect is_open flag (schema uses is_open, not isClosed)
      if (!row.is_open) continue;
      dayStart = timeToMins(row.start_time ?? "08:00");
      dayEnd   = timeToMins(row.end_time   ?? "18:00");
    } else {
      // No DB row — fall back to built-in defaults
      const def = DEFAULT_HOURS[dow];
      if (!def) continue; // closed by default (Sunday)
      dayStart = timeToMins(def.start);
      dayEnd   = timeToMins(def.end);
    }

    // Fetch existing bookings for this date
    const existingBookings = await getBookingsForDateRaw(supabase, dateStr);

    // Find all open slots (allow jobs that finish up to OVERTIME_GRACE_MINS past closing)
    const openSlots: string[] = [];
    const interval = 60;
    for (let m = dayStart; m + duration <= dayEnd + OVERTIME_GRACE_MINS; m += interval) {
      // If this is today, skip past slots
      if (dateStr === todayStr && m <= now.getHours() * 60 + now.getMinutes()) continue;

      if (!checkSlotConflict(existingBookings, m, duration)) {
        const h  = Math.floor(m / 60);
        const mn = m % 60;
        openSlots.push(`${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`);
      }
    }

    if (openSlots.length === 0) continue;

    // Human-readable label
    let label: string;
    if (dateStr === todayStr) {
      label = "Today";
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateStr === tomorrow.toISOString().slice(0, 10)) {
        label = "Tomorrow";
      } else {
        label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
    }

    results.push({
      date: dateStr,
      label,
      earliestSlot: to12h(openSlots[0]),
      totalSlots: openSlots.length,
    });
  }

  return results;
}
