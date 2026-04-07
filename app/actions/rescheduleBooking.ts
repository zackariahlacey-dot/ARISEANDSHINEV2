"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendUpdatedBookingEmail } from "@/lib/email";
import { checkSlotConflict, getDurationMins, timeToMins } from "@/lib/availability";
import type { BookingSlot } from "@/lib/availability";

export type RescheduleResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Returns available time slots for a date, excluding the booking being rescheduled.
 */
export async function getAvailableSlotsForReschedule(
  bookingId: string,
  date: string
): Promise<string[]> {
  const supabase = createAdminClient();

  // Fetch the booking to get service + vehicle info
  const { data: booking } = await supabase
    .from("bookings")
    .select("service_name, vehicle_size")
    .eq("id", bookingId)
    .single();

  if (!booking) return [];

  const duration = getDurationMins(
    booking.service_name ?? "",
    booking.vehicle_size ?? "sedan"
  );

  // Fetch operating hours
  const d = new Date(date + "T12:00:00");
  const dow = d.getDay();
  const month = d.getMonth() + 1;

  const { data: ohRows } = await supabase.from("operating_hours").select("*");
  const operatingHours: any[] = ohRows ?? [];

  const overrideRow = operatingHours.find(
    (h: any) => h.month === month && h.day_of_week === dow
  );
  const defaultRow = operatingHours.find(
    (h: any) => (h.month == null || h.month === undefined) && h.day_of_week === dow
  );
  const row = overrideRow ?? defaultRow;

  const DEFAULT_HOURS: Record<number, { start: string; end: string } | null> = {
    0: null,
    1: { start: "13:00", end: "18:00" },
    2: { start: "13:00", end: "18:00" },
    3: { start: "13:00", end: "18:00" },
    4: { start: "13:00", end: "18:00" },
    5: { start: "13:00", end: "18:00" },
    6: null,
  };

  let dayStart: number;
  let dayEnd: number;

  if (row) {
    if (!row.is_open) return [];
    dayStart = timeToMins(row.start_time ?? "08:00");
    dayEnd = timeToMins(row.end_time ?? "18:00");
  } else {
    const def = DEFAULT_HOURS[dow];
    if (!def) return [];
    dayStart = timeToMins(def.start);
    dayEnd = timeToMins(def.end);
  }

  // Fetch existing bookings for this date, excluding the one being rescheduled
  const { data: existingData } = await supabase
    .from("bookings")
    .select("booking_time, service_name, vehicle_size, status")
    .eq("booking_date", date)
    .neq("status", "cancelled")
    .neq("id", bookingId);

  const existing: BookingSlot[] = (existingData ?? []).map((r: any) => ({
    booking_time: r.booking_time ?? "00:00",
    service_name: r.service_name ?? null,
    vehicle_size: r.vehicle_size ?? null,
    status: r.status ?? "confirmed",
  }));

  const OVERTIME_GRACE_MINS = 60;
  const slots: string[] = [];
  const interval = 60;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  for (let m = dayStart; m + duration <= dayEnd + OVERTIME_GRACE_MINS; m += interval) {
    if (date === todayStr && m <= now.getHours() * 60 + now.getMinutes()) continue;
    if (!checkSlotConflict(existing, m, duration)) {
      const h = Math.floor(m / 60);
      const mn = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`);
    }
  }

  return slots;
}

/**
 * Reschedules a booking to a new date + time.
 * Sends a confirmation email to the customer on success.
 */
export async function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newTime: string // "HH:MM" 24-hour
): Promise<RescheduleResult> {
  if (!bookingId?.trim() || !newDate || !newTime) {
    return { success: false, error: "Missing required fields." };
  }

  const supabase = createAdminClient();

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select(`
      id, status, booking_date, booking_time,
      service_name, vehicle_size,
      customer_name, customer_email,
      profiles:user_id (first_name, last_name, email)
    `)
    .eq("id", bookingId)
    .single();

  if (fetchErr || !booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.status === "cancelled") {
    return { success: false, error: "Cannot reschedule a cancelled booking." };
  }

  if (booking.status === "completed") {
    return { success: false, error: "Cannot reschedule a completed booking." };
  }

  // Verify the slot is still available (excluding this booking)
  const availableSlots = await getAvailableSlotsForReschedule(bookingId, newDate);
  if (!availableSlots.includes(newTime)) {
    return { success: false, error: "That time slot is no longer available. Please choose another." };
  }

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ booking_date: newDate, booking_time: newTime, reminder_email_sent_at: null })
    .eq("id", bookingId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Resolve customer email + name
  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const customerEmail =
    (booking.customer_email as string | null) ??
    ((profile as any)?.email ?? null);
  const customerName =
    (booking.customer_name as string | null) ??
    ([(profile as any)?.first_name, (profile as any)?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Customer");

  // Format time for email: "HH:MM" → "H:MM AM/PM"
  let formattedTime = newTime;
  try {
    const [h, m] = newTime.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    formattedTime = `${hour % 12 || 12}:${m} ${ampm}`;
  } catch { /* keep raw */ }

  if (customerEmail) {
    sendUpdatedBookingEmail({
      customerName,
      customerEmail,
      serviceName: (booking.service_name as string | null) ?? "Detailing Service",
      newDate,
      newTime: formattedTime,
    }).catch((err) => console.error("[rescheduleBooking] email error:", err));
  }

  return { success: true };
}
