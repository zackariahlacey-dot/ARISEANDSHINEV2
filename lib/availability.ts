/**
 * Unified availability / conflict detection.
 * Used by both the customer-facing BookingModal and the admin schedule page.
 */
import { SERVICE_DURATIONS } from "./constants";

export interface BookingSlot {
  booking_time: string;
  service_name: string | null;
  vehicle_size: string | null;
  status?: string | null;
}

/** Convert "HH:MM" or "HH:MM:SS" to total minutes from midnight. */
export function timeToMins(t: string): number {
  if (!t) return 0;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Format minutes-from-midnight to "H:MM AM/PM". */
export function minsToDisplay(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Convert "HH:MM" 24-hour to "H:MM AM/PM". */
export function to12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${period}`;
}

/** Convert "H:MM AM/PM" to "HH:MM:00" 24-hour. */
export function to24h(time12: string): string {
  if (!time12) return "00:00:00";
  const [timePart, period] = time12.split(" ");
  const [rawH, rawM = "00"] = timePart.split(":");
  let h = parseInt(rawH, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${rawM}:00`;
}

const SIZE_MAP: Record<string, string> = {
  compact: "compact",
  small: "compact",
  sedan: "sedan",
  medium: "sedan",
  suv: "suv",
  large: "suv",
  xl: "xl",
  extra_large: "xl",
};

/**
 * Get the duration (minutes) for a service + size combo.
 * Special-cases "Personal Block" — stores duration in vehicle_size field directly.
 */
export function getDurationMins(serviceName: string, vehicleSize: string): number {
  if (!serviceName) return 180;
  // Personal admin blocks store their duration (minutes) in the vehicle_size field
  if (serviceName === "Personal Block") {
    const mins = parseInt(vehicleSize ?? "60", 10);
    return isNaN(mins) ? 60 : mins;
  }
  const normalized = SIZE_MAP[vehicleSize?.toLowerCase()] ?? "sedan";
  return (SERVICE_DURATIONS as any)[serviceName]?.[normalized] ?? 180;
}

/**
 * True if a proposed new slot [newStart, newStart + newDuration) overlaps
 * with any existing booking in the list.
 */
export function checkSlotConflict(
  existingBookings: BookingSlot[],
  newStartMins: number,
  newDurationMins: number
): boolean {
  const newEnd = newStartMins + newDurationMins;
  for (const b of existingBookings) {
    if (b.status === "cancelled" || b.status === "no-show") continue;
    const bStart = timeToMins(b.booking_time);
    const bDur = getDurationMins(b.service_name ?? "", b.vehicle_size ?? "sedan");
    const bEnd = bStart + bDur;
    // True overlap: intervals touch or cross
    if (newStartMins < bEnd && newEnd > bStart) return true;
  }
  return false;
}

/**
 * Returns all available time slots (in "HH:MM" 24h format) for a given day.
 * Respects operating hours and existing bookings via overlap check.
 */
export function getAvailableSlots(
  existingBookings: BookingSlot[],
  serviceName: string,
  vehicleSize: string,
  dayStartMins: number = 7 * 60,  // 7 AM default
  dayEndMins: number = 19 * 60,   // 7 PM default
  intervalMins: number = 60
): string[] {
  const duration = getDurationMins(serviceName, vehicleSize);
  const slots: string[] = [];
  for (let m = dayStartMins; m + duration <= dayEndMins; m += intervalMins) {
    if (!checkSlotConflict(existingBookings, m, duration)) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  return slots;
}
