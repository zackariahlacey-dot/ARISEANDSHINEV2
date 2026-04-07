/**
 * Cron: Send day-before appointment reminder emails.
 *
 * Runs daily at 9 AM ET (14:00 UTC). Finds every booking scheduled for
 * tomorrow that hasn't received a reminder yet, then sends the email and
 * stamps reminder_email_sent_at.
 *
 * Secured by CRON_SECRET — Vercel automatically adds
 * `Authorization: Bearer <CRON_SECRET>` to scheduled invocations.
 *
 * Prerequisite migration:
 *   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ;
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Tomorrow's date in YYYY-MM-DD (Eastern: offset the UTC date by -5 or -4 hours)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

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
    .eq("booking_date", tomorrowStr)
    .is("reminder_email_sent_at", null)
    .not("status", "in", '("cancelled","no-show")');

  if (fetchErr) {
    console.error("[cron/reminders] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, message: `No eligible bookings for ${tomorrowStr}.` });
  }

  const results: { bookingId: string; email: string; status: "sent" | "skipped" | "error" }[] = [];

  for (const booking of bookings) {
    const profile = booking.profiles as {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    } | null;

    const toEmail: string | null =
      (booking.customer_email as string | null) ?? (profile?.email ?? null);

    if (!toEmail) {
      results.push({ bookingId: booking.id, email: "(none)", status: "skipped" });
      continue;
    }

    // Resolve customer name: snapshot first, then profile, then fallback
    const customerName =
      (booking.customer_name as string | null) ??
      ([profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      "Valued Customer");

    // Format booking_time from "HH:MM:SS" to "H:MM AM/PM"
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
      });

      await supabase
        .from("bookings")
        .update({ reminder_email_sent_at: now.toISOString() })
        .eq("id", booking.id);

      results.push({ bookingId: booking.id, email: toEmail, status: "sent" });
      console.log(`[cron/reminders] sent → ${toEmail} (booking ${booking.id})`);
    } catch (err) {
      console.error(`[cron/reminders] send error for ${booking.id}:`, err);
      results.push({ bookingId: booking.id, email: toEmail, status: "error" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(`[cron/reminders] done — sent:${sent} skipped:${skipped} errors:${errors}`);
  return NextResponse.json({ sent, skipped, errors, results });
}
