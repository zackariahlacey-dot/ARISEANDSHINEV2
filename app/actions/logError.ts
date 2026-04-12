"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function logError(opts: {
  type: "booking_attempt" | "webhook" | "cron" | "general";
  source: string;
  message: string;
  details?: Record<string, unknown>;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("error_logs").insert({
      type:    opts.type,
      source:  opts.source,
      message: opts.message,
      details: opts.details ?? null,
    });
  } catch {
    // Never let the logger throw — it's fire-and-forget
  }
}
