/**
 * Cron: Send appointment reminder emails at 7 days, 3 days, and 1 day out.
 *
 * Runs daily at 9 AM ET (14:00 UTC). Each run checks for bookings at all three
 * horizons and sends the appropriate reminder if not already sent.
 *
 * Tracking columns on bookings:
 *   reminder_7day_sent_at  TIMESTAMPTZ
 *   reminder_3day_sent_at  TIMESTAMPTZ
 *   reminder_email_sent_at TIMESTAMPTZ  (day-before, existing)
 *
 * Secured by CRON_SECRET — Vercel automatically adds
 * `Authorization: Bearer <CRON_SECRET>` to scheduled invocations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email";

const REMINDER_WINDOWS = [
  { daysOut: 7 as const, column: "reminder_7day_sent_at" },
  { daysOut: 3 as const, column: "reminder_3day_sent_at" },
  { daysOut: 1 as const, column: "reminder_email_sent_at" },
] as const;

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const summary: Record<string, { sent: number; skipped: number; errors: number }> = {};

  for (const { daysOut, column } of REMINDER_WINDOWS) {
    const target = new Date(now);
    target.setUTCDate(target.getUTCDate() + daysOut);
    const targetStr = target.toISOString().slice(0, 10);

    const { data: bookings, error: fetchErr } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_date,
        booking_time,
        service_name,
        service_address,
        customer_name,
        customer_email,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq("booking_date", targetStr)
      .is(column, null)
      .not("status", "in", '("cancelled","no-show","blocked")');

    if (fetchErr) {
      console.error(`[cron/reminders] ${daysOut}d fetch error:`, fetchErr);
      summary[`${daysOut}d`] = { sent: 0, skipped: 0, errors: 1 };
      continue;
    }

    let sent = 0, skipped = 0, errors = 0;

    for (const booking of bookings ?? []) {
      const profile = booking.profiles as {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      } | null;

      const toEmail: string | null =
        (booking.customer_email as string | null) ?? (profile?.email ?? null);

      if (!toEmail) {
        skipped++;
        continue;
      }

      const customerName =
        (booking.customer_name as string | null) ??
        ([profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
        "Valued Customer");

      const rawTime = (booking.booking_time as string | null) ?? "";
      let formattedTime = rawTime;
      try {
        const [h, m] = rawTime.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        formattedTime = `${hour % 12 || 12}:${m} ${ampm}`;
      } catch { /* keep raw */ }

      try {
        await sendReminderEmail({
          customerName,
          customerEmail: toEmail,
          serviceName: (booking.service_name as string | null) ?? "Detailing Service",
          bookingDate: booking.booking_date as string,
          bookingTime: formattedTime,
          serviceAddress: (booking.service_address as string | null) ?? undefined,
        }, daysOut);

        await supabase
          .from("bookings")
          .update({ [column]: now.toISOString() })
          .eq("id", booking.id);

        sent++;
        console.log(`[cron/reminders] ${daysOut}d sent → ${toEmail} (booking ${booking.id})`);
      } catch (err) {
        console.error(`[cron/reminders] ${daysOut}d error for ${booking.id}:`, err);
        errors++;
      }
    }

    summary[`${daysOut}d`] = { sent, skipped, errors };
  }

  console.log("[cron/reminders] done —", JSON.stringify(summary));
  return NextResponse.json({ ok: true, summary });
}
