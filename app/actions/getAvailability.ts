"use server";

import { createClient } from "@/lib/supabase/server";
import { todayInBusinessTz } from "@/lib/dates";
import { getExteriorBlockedDatesIfLinked } from "@/app/actions/linkedCalendar";

export type OperatingHour = {
  day_of_week: number;
  month: number | null;
  start_time: string;
  end_time: string;
  isClosed: boolean;
};

export type AvailabilityData = {
  operatingHours: OperatingHour[];
  /** Merged set of YYYY-MM-DD strings that are unavailable for booking:
   *  detailing's own blocked_dates table PLUS (when linked calendars are
   *  enabled) every day that has at least one active exterior job. */
  blockedDates: string[];
  /** True when the shared linked-calendar toggle is ON. Exposed so the
   *  UI can show a softened "Our crew is on another project" message
   *  on exterior-blocked days instead of the generic blocked-date copy. */
  linkedCalendar?: boolean;
  /** Subset of blockedDates that came from exterior_bookings (so the UI
   *  can distinguish "we blocked this" from "exterior booked this"). */
  exteriorBlockedDates?: string[];
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
    exteriorBlocks,
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
    // Linked calendars — when the shared toggle is ON, pull every
    // exterior-booked day in the next 120 days and merge into the
    // blocked-date list so customers can't book over an exterior job.
    // Failure is silent (function returns []), and the toggle defaults
    // to ON if the settings read itself fails — never accidentally
    // double-book the owner.
    getExteriorBlockedDatesIfLinked({ rangeStart: today, rangeDays: 120 }),
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

  const ownBlocked = (blockedData ?? []).map((r) => String(r.blocked_date));
  // Only include exterior dates that fall on or after today (the action
  // already filters, but defensive — keeps the contract clean).
  const exteriorBlocked = exteriorBlocks.dates.filter((d) => d >= today);
  // Merge + dedupe so the UI gets a single list to disable in the picker.
  const blockedDates = Array.from(new Set([...ownBlocked, ...exteriorBlocked])).sort();

  return {
    operatingHours,
    blockedDates,
    linkedCalendar: exteriorBlocks.linked,
    exteriorBlockedDates: exteriorBlocked,
  };
}
