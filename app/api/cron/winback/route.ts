/**
 * Cron: Send win-back emails to lapsed customers.
 *
 * Runs daily at 10 AM ET (15:00 UTC). Finds customers whose most recent
 * completed booking was exactly 30, 60, or 90 days ago and sends a
 * tailored re-engagement email with a discount code.
 *
 * Customers with a future confirmed booking are skipped — they're already
 * coming back. Active monthly subscribers are also skipped.
 *
 * Secured by CRON_SECRET — Vercel automatically adds
 * `Authorization: Bearer <CRON_SECRET>` to scheduled invocations.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWinbackEmail } from "@/lib/email";

const WINBACK_DAYS = [30, 60, 90] as const;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Use noon to avoid DST edge cases

  // ── 1. Fetch all active monthly subscriber emails so we can skip them ──────
  const { data: activeSubs } = await supabase
    .from("monthly_subscriptions")
    .select("customer_email")
    .eq("status", "active");
  const subEmails = new Set(
    (activeSubs ?? []).map((s: any) => (s.customer_email as string).toLowerCase())
  );

  // ── 2. Fetch all non-cancelled bookings with customer snapshot ──────────────
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("booking_date, customer_name, customer_email")
    .not("status", "in", '("cancelled","no-show","blocked","pending_payment")')
    .not("customer_email", "is", null)
    .not("notes", "ilike", "%Personal Block%");

  if (error) {
    console.error("[cron/winback] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 3. Group by email: track last PAST booking and whether they have a
  //        future booking (in which case they don't need a win-back) ──────────
  const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD local

  type CustomerRecord = { name: string; lastPast: string; hasFuture: boolean };
  const byEmail = new Map<string, CustomerRecord>();

  for (const b of bookings ?? []) {
    const email = (b.customer_email as string).toLowerCase();
    const date  = b.booking_date as string;
    const name  = (b.customer_name as string | null) ?? "there";
    const isFuture = date > todayStr;

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, { name, lastPast: isFuture ? "" : date, hasFuture: isFuture });
    } else {
      if (isFuture) {
        existing.hasFuture = true;
      } else if (!existing.lastPast || date > existing.lastPast) {
        existing.lastPast = date;
        existing.name = name; // use most recent booking's name
      }
    }
  }

  // ── 4. Check which customers hit a win-back window today ──────────────────
  const results: { email: string; days: number; status: "sent" | "skipped" | "error" }[] = [];

  for (const [email, record] of byEmail) {
    if (record.hasFuture) continue;          // already booked again
    if (!record.lastPast) continue;          // no past booking on record
    if (subEmails.has(email)) continue;      // active monthly subscriber

    const lastDate = new Date(record.lastPast + "T12:00:00");
    const daysDiff = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const milestone = WINBACK_DAYS.find(d => daysDiff === d);
    if (!milestone) continue;

    try {
      await sendWinbackEmail({
        customerName:  record.name,
        customerEmail: email,
        daysSince:     milestone,
      });
      results.push({ email, days: milestone, status: "sent" });
      console.log(`[cron/winback] sent ${milestone}d email → ${email}`);
    } catch (err) {
      console.error(`[cron/winback] error for ${email}:`, err);
      results.push({ email, days: milestone, status: "error" });
    }
  }

  const sent   = results.filter(r => r.status === "sent").length;
  const errors = results.filter(r => r.status === "error").length;
  console.log(`[cron/winback] done — sent:${sent} errors:${errors}`);
  return NextResponse.json({ sent, errors, results });
}
