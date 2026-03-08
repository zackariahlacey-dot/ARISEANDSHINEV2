export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { ScheduleManager } from "./ScheduleManager";
import type { OperatingHoursRow } from "./ScheduleManager";
import type { BlockedDateRow } from "./ScheduleManager";

export default async function AdminSchedulePage() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: hoursData },
    { data: blockedData },
  ] = await Promise.all([
    supabase
      .from("operating_hours")
      .select("id, day_of_week, month, start_time, end_time, is_open")
      .order("month", { ascending: true, nullsFirst: true })
      .order("day_of_week", { ascending: true }),
    supabase
      .from("blocked_dates")
      .select("id, blocked_date, reason")
      .gte("blocked_date", today)
      .order("blocked_date", { ascending: true }),
  ]);

  const initialHours: OperatingHoursRow[] = (hoursData ?? []).map((r) => ({
    id: r.id,
    day_of_week: Number(r.day_of_week),
    month: r.month != null ? Number(r.month) : null,
    start_time: r.start_time ?? "",
    end_time: r.end_time ?? "",
    is_open: Boolean(r.is_open),
  }));

  const initialBlocked: BlockedDateRow[] = (blockedData ?? []).map((r) => ({
    id: r.id,
    blocked_date: String(r.blocked_date),
    reason: r.reason ?? null,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-black text-white">Availability & Schedule</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Set weekly operating hours and block specific dates (e.g. vacation, holidays).
        </p>
      </div>
      <ScheduleManager
        initialHours={initialHours}
        initialBlocked={initialBlocked}
      />
    </div>
  );
}
