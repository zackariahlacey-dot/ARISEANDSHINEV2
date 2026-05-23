"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDurationMins, getAdditionalVehiclesDuration, checkSlotConflict, timeToMins, to12h, isWholeDayBooking, WHOLE_DAY_THRESHOLD_MINS, type BookingSlot } from "@/lib/availability";
import { ymdInBusinessTz, todayInBusinessTz } from "@/lib/dates";

export type AvailableDay = {
  date: string;         // YYYY-MM-DD
  label: string;        // "Today", "Tomorrow", "Mon Apr 7"
  earliestSlot: string; // "9:00 AM"
  totalSlots: number;
};

// Jobs may finish up to this many minutes past closing — same constant as BookingModal.
const OVERTIME_GRACE_MINS = 30;

// 30-minute grid — must match SLOT_INTERVAL_MIN in BookingModal.tsx.
const SLOT_INTERVAL = 30;

/**
 * Fetch every active (non-cancelled) booking for one date.
 * Prefers the direct service_name column; falls back to the services(name) join
 * for older rows that were stored with only a service_id.
 */
async function fetchBookings(supabase: any, date: string): Promise<BookingSlot[]> {
  const { data } = await supabase
    .from("bookings")
    // duration_override is the admin's manual length-of-job override — when
    // present it must beat the service default so availability checks see
    // the real time the job will occupy on the calendar.
    .select("booking_time, service_name, vehicle_size, additional_vehicles_json, duration_override, status, services(name)")
    .eq("booking_date", date)
    .neq("status", "cancelled");

  return (data ?? []).map((r: any) => {
    const direct = r.service_name as string | null | undefined;
    const s = r.services;
    const joined =
      s == null ? null
      : Array.isArray(s) ? ((s[0] as any)?.name ?? null)
      : (s as any).name ?? null;
    const serviceName = direct ?? joined;
    const vehicleSize = r.vehicle_size ?? null;
    const override    = r.duration_override;
    const primaryDur  = getDurationMins(serviceName ?? "", vehicleSize ?? "sedan");
    const addlDur     = getAdditionalVehiclesDuration(r.additional_vehicles_json);
    return {
      booking_time:        r.booking_time ?? "00:00",
      service_name:        serviceName,
      vehicle_size:        vehicleSize,
      status:              r.status ?? "confirmed",
      // Admin override wins when set; otherwise sum the per-vehicle defaults.
      total_duration_mins: override != null ? override : primaryDur + addlDur,
    };
  });
}

/**
 * Return the open time slots (HH:MM strings) on a given day.
 * Uses identical boundaries to the BookingModal:
 *   - slots start at dayStart, increment by SLOT_INTERVAL
 *   - slots must START strictly before dayEnd  (m < dayEnd)
 *   - jobs may finish up to OVERTIME_GRACE_MINS past dayEnd
 */
function openSlotsForDay(
  existingBookings: BookingSlot[],
  duration: number,
  dayStart: number,
  dayEnd: number,
  skipBeforeMins: number | null  // for today: skip slots at or before current time
): string[] {
  const slots: string[] = [];
  for (
    let m = dayStart;
    m < dayEnd && m + duration <= dayEnd + OVERTIME_GRACE_MINS;
    m += SLOT_INTERVAL
  ) {
    if (skipBeforeMins !== null && m <= skipBeforeMins) continue;
    if (!checkSlotConflict(existingBookings, m, duration)) {
      const h  = Math.floor(m / 60);
      const mn = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`);
    }
  }
  return slots;
}

/**
 * Scan forward up to `lookahead` days and return the first `count` days
 * that have at least one genuinely open slot for the given service and size.
 */
export async function getNextAvailableDays(
  serviceName: string,
  vehicleSize: string,
  count: number = 3,
  lookahead: number = 21,
  customDurationMins?: number
): Promise<AvailableDay[]> {
  const supabase = createAdminClient();

  const [ohResult, blockedResult] = await Promise.all([
    supabase.from("operating_hours").select("*"),
    supabase.from("blocked_dates").select("blocked_date"),
  ]);

  const operatingHours: any[] = ohResult.data ?? [];
  const blockedDates = new Set<string>(
    (blockedResult.data ?? []).map((r: any) => r.blocked_date as string)
  );

  const duration = customDurationMins ?? getDurationMins(serviceName, vehicleSize);
  const now = new Date();

  // Business-tz today — toLocaleDateString without a timeZone falls back to
  // server-local (UTC on Vercel) which silently shifts the date after 7 PM ET.
  const todayStr = todayInBusinessTz();

  const results: AvailableDay[] = [];

  for (let i = 0; i < lookahead && results.length < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = ymdInBusinessTz(d);

    if (blockedDates.has(dateStr)) continue;

    // Build a noon-local Date from the YYYY-MM-DD string so getDay / getMonth
    // line up with the business calendar (not the server's UTC clock).
    const localNoon = new Date(`${dateStr}T12:00:00`);
    const dow = localNoon.getDay(); // 0 = Sun … 6 = Sat
    const month = localNoon.getMonth() + 1;
    const row =
      operatingHours.find((h: any) => h.month === month && h.day_of_week === dow) ??
      operatingHours.find((h: any) => (h.month == null) && h.day_of_week === dow);

    let dayStart: number;
    let dayEnd: number;

    if (row) {
      if (!row.is_open) continue;
      dayStart = timeToMins(row.start_time ?? "09:30");
      dayEnd   = timeToMins(row.end_time   ?? "18:00");
    } else if (operatingHours.length === 0) {
      // No hours configured yet — use sensible defaults (Mon–Fri 9:30 AM–6 PM).
      if (dow === 0 || dow === 6) continue;
      dayStart = timeToMins("09:30");
      dayEnd   = timeToMins("18:00");
    } else {
      // Hours ARE configured for other days but not this one — treat as closed.
      continue;
    }

    const existingBookings = await fetchBookings(supabase, dateStr);

    // For today skip time slots that have already passed.
    const skipBefore = dateStr === todayStr
      ? now.getHours() * 60 + now.getMinutes()
      : null;

    // Whole-day booking blocks the entire day — any existing booking on a
    // day disqualifies it, and the day's open hours must fit 8+ hours.
    const customerIsWholeDay = isWholeDayBooking(duration);
    // Drop days that already host a whole-day reservation, regardless of
    // the customer's own duration — those days are fully blocked.
    const dayHasWholeDayBooking = existingBookings.some(b => isWholeDayBooking(b.total_duration_mins));
    if (dayHasWholeDayBooking) continue;

    let slots: string[];
    if (customerIsWholeDay) {
      // Whole-day bookings start at open time, and only on days with
      // enough operating hours to fit. If anything else is on the day
      // already, skip — no room left for a whole-day reservation.
      if (existingBookings.length > 0) continue;
      if (dayEnd - dayStart < WHOLE_DAY_THRESHOLD_MINS) continue;
      const startsBeforeNow = skipBefore !== null && dayStart <= skipBefore;
      if (startsBeforeNow) continue;
      const h = Math.floor(dayStart / 60);
      const mn = dayStart % 60;
      slots = [`${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`];
    } else {
      slots = openSlotsForDay(existingBookings, duration, dayStart, dayEnd, skipBefore);
    }
    if (slots.length === 0) continue;

    // Build human-readable label.
    let label: string;
    if (dateStr === todayStr) {
      label = "Today";
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateStr === tomorrow.toLocaleDateString("en-CA")) {
        label = "Tomorrow";
      } else {
        label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
    }

    results.push({
      date:         dateStr,
      label,
      earliestSlot: to12h(slots[0]),
      totalSlots:   slots.length,
    });
  }

  return results;
}
