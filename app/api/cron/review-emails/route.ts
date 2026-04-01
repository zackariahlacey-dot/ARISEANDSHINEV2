/**
 * Cron: Send 24-hour review request emails
 *
 * Vercel calls this route on the schedule defined in vercel.json.
 * It finds every booking whose appointment ended at least 24 hours ago,
 * hasn't been cancelled/no-show, and hasn't received a review email yet,
 * then sends the review request and stamps review_email_sent_at.
 *
 * Secured by CRON_SECRET — Vercel automatically adds
 * `Authorization: Bearer <CRON_SECRET>` to scheduled invocations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getReviewRequestHtml } from "@/emails/ReviewRequest";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Arise & Shine VT <bookings@ariseandshinevt.com>";
const SUBJECT = "How's the shine holding up? ✨ — Arise & Shine VT";

export async function GET(req: NextRequest) {
  // ── Auth: only Vercel cron (or manual calls with the secret) ─────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // ── Find bookings whose appointment was >= 24 hours ago ──────────────────
  // We combine booking_date (date) + booking_time (time) into a timestamp and
  // compare against NOW() - 24h.  We also add an upper bound of 48h so we
  // don't chase bookings that somehow slipped past multiple cron runs.
  //
  // Supabase PostgREST doesn't support arbitrary SQL expressions in .filter(),
  // so we use an RPC or a generous date window and filter in JS.
  //
  // Strategy: fetch bookings from the last 3 days that haven't been emailed,
  // then evaluate the exact 24-hour threshold in JavaScript.

  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD

  const { data: bookings, error: fetchErr } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_date,
      booking_time,
      service_name,
      customer_name,
      customer_email,
      profiles:user_id (
        first_name,
        email
      )
    `)
    .gte("booking_date", threeDaysAgo)
    .lt("booking_date", now.toISOString().slice(0, 10)) // exclude today
    .is("review_email_sent_at", null)
    .not("status", "in", '("cancelled","no-show")');

  if (fetchErr) {
    console.error("[cron/review-emails] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, message: "No eligible bookings." });
  }

  const results: { bookingId: string; email: string; status: "sent" | "skipped" | "error" }[] = [];

  for (const booking of bookings) {
    // ── Resolve customer email ──────────────────────────────────────────────
    const profile = booking.profiles as { first_name?: string | null; email?: string | null } | null;
    const toEmail: string | null =
      (booking.customer_email as string | null) ??
      (profile?.email ?? null);

    if (!toEmail) {
      results.push({ bookingId: booking.id, email: "(none)", status: "skipped" });
      continue;
    }

    // ── Check 24-hour threshold exactly ────────────────────────────────────
    // booking_date is "YYYY-MM-DD", booking_time is "HH:MM:SS"
    const apptIso = `${booking.booking_date}T${booking.booking_time}`;
    const apptTime = new Date(apptIso);
    const hoursElapsed = (now.getTime() - apptTime.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed < 24) {
      results.push({ bookingId: booking.id, email: toEmail, status: "skipped" });
      continue;
    }

    // ── Build email ─────────────────────────────────────────────────────────
    const customerName =
      (booking.customer_name as string | null) ??
      (profile?.first_name ?? "Valued Customer");

    const serviceName = (booking.service_name as string | null) ?? undefined;

    const html = getReviewRequestHtml(customerName, serviceName);

    try {
      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: SUBJECT,
        html,
        replyTo: "contact@ariseandshinevt.com",
      });

      if (sendErr) throw sendErr;

      // ── Stamp sent timestamp ──────────────────────────────────────────────
      await supabase
        .from("bookings")
        .update({ review_email_sent_at: now.toISOString() })
        .eq("id", booking.id);

      results.push({ bookingId: booking.id, email: toEmail, status: "sent" });
      console.log(`[cron/review-emails] sent → ${toEmail} (booking ${booking.id})`);
    } catch (err) {
      console.error(`[cron/review-emails] send error for ${booking.id}:`, err);
      results.push({ bookingId: booking.id, email: toEmail, status: "error" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(`[cron/review-emails] done — sent:${sent} skipped:${skipped} errors:${errors}`);
  return NextResponse.json({ sent, skipped, errors, results });
}
