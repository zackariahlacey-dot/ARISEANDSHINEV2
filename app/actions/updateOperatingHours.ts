"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type OperatingHoursRow = {
  id?: string;
  day_of_week: number;
  month?: number | null;
  start_time: string;
  end_time: string;
  is_open: boolean;
};

export async function updateOperatingHours(
  rows: Omit<OperatingHoursRow, "id" | "month">[],
  month: number | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const query = supabase
    .from("operating_hours")
    .select("id, day_of_week, month");
  const { data: existing } =
    month == null
      ? await query.is("month", null)
      : await query.eq("month", month);
  const byDay = new Map(
    (existing ?? []).map((r) => [r.day_of_week, r as { id: string; day_of_week: number; month: number | null }])
  );

  for (const row of rows) {
    const rec = byDay.get(row.day_of_week);
    const payload = {
      day_of_week: row.day_of_week,
      month,
      start_time: row.start_time?.trim() || null,
      end_time: row.end_time?.trim() || null,
      is_open: row.is_open,
    };
    if (rec?.id) {
      const { error } = await supabase
        .from("operating_hours")
        .update({
          start_time: payload.start_time,
          end_time: payload.end_time,
          is_open: payload.is_open,
        })
        .eq("id", rec.id);
      if (error) {
        console.error("[updateOperatingHours]", error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase.from("operating_hours").insert(payload);
      if (error) {
        console.error("[updateOperatingHours] insert", error);
        return { success: false, error: error.message };
      }
    }
  }
  return { success: true };
}
