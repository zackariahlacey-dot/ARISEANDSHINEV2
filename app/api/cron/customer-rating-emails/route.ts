/**
 * Cron: send the post-detail customer rating + $15-coupon email.
 *
 * Fires the rating email roughly 2 hours after the contractor marks a
 * job Complete. We snapshot the rating row + token at completion time;
 * this cron just delivers the email when the delay window has elapsed.
 *
 * Vercel hits this on the schedule defined in vercel.json. Secured by
 * CRON_SECRET — Vercel automatically attaches Authorization: Bearer
 * <CRON_SECRET> on scheduled invocations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRatingEmail } from "@/app/actions/customerRating";

const DELAY_HOURS = 2;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - DELAY_HOURS * 60 * 60 * 1000).toISOString();

  // Ratings that haven't been emailed yet AND were created at least 2 hours ago.
  // Cap to a small batch per run so a backlog doesn't blow past Vercel function
  // timeout limits.
  const { data: due, error } = await admin
    .from("customer_ratings")
    .select("id, booking_id")
    .is("email_sent_at", null)
    .is("token_used_at", null)
    .lt("created_at", cutoff)
    .gt("expires_at", new Date().toISOString())
    .limit(25);

  if (error) {
    console.error("[cron/customer-rating-emails] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, message: "No ratings due." });
  }

  const results: { id: string; status: "sent" | "error"; error?: string }[] = [];
  for (const r of due as { id: string; booking_id: string }[]) {
    const result = await sendRatingEmail(r.id);
    results.push({
      id: r.id,
      status: result.ok ? "sent" : "error",
      error: result.ok ? undefined : result.error,
    });
  }

  const sent  = results.filter(r => r.status === "sent").length;
  const errors = results.filter(r => r.status === "error").length;
  console.log(`[cron/customer-rating-emails] sent:${sent} errors:${errors}`);
  return NextResponse.json({ sent, errors, results });
}
