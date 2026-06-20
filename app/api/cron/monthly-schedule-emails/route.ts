/**
 * Cron: Send monthly scheduling reminder emails to active subscribers.
 *
 * Runs daily at 10 AM UTC. On each run, finds subscribers whose signup_date
 * day-of-month matches today, and who haven't yet received a scheduling email
 * for the current month. Sends them a link to pick their preferred date.
 *
 * Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { signScheduleToken } from "@/lib/monthlyToken";
import { getMonthlyScheduleReminderHtml } from "@/emails/MonthlyScheduleReminder";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
const SITE   = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinedetailing.com").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase   = createAdminClient();
  const now        = new Date();
  const todayDay   = now.getDate(); // day-of-month: 1–31
  // Target month: the NEXT month (we send on anniversary day to pick NEXT month's date)
  // e.g. on April 8th, send email to pick May date
  const nextMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthStr   = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  // Active subscribers whose signup day matches today
  // Handle short months: if today is the last day of the month, also catch anyone
  // whose signup day doesn't exist this month (e.g. signed up on the 31st)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const matchDays = todayDay === lastDayOfMonth
    ? Array.from({ length: 31 - todayDay + 1 }, (_, i) => todayDay + i) // catch day 29–31 on short months
    : [todayDay];

  const { data: subs, error } = await supabase
    .from("monthly_subscriptions")
    .select("id, customer_name, customer_email, plan_name, signup_date")
    .eq("status", "active")
    .not("customer_email", "is", null);

  if (error || !subs) {
    console.error("[cron/monthly-schedule-emails] fetch error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Filter to subscribers whose signup day matches
  const dueSubs = subs.filter((s: any) => {
    if (!s.signup_date) return false;
    const signupDay = parseInt(s.signup_date.slice(8, 10), 10);
    return matchDays.includes(signupDay);
  });

  // Skip subscribers who already have a pick or reminder sent for this month
  const subIds = dueSubs.map((s: any) => s.id);
  let alreadySent = new Set<string>();
  if (subIds.length > 0) {
    const { data: picks } = await supabase
      .from("monthly_schedule_picks")
      .select("subscription_id")
      .eq("month", monthStr)
      .not("reminder_sent_at", "is", null)
      .in("subscription_id", subIds);
    alreadySent = new Set((picks ?? []).map((p: any) => p.subscription_id));
  }

  const toEmail = dueSubs.filter((s: any) => !alreadySent.has(s.id));

  let sent = 0, failed = 0;

  for (const sub of toEmail) {
    try {
      const token        = await signScheduleToken(sub.id, monthStr);
      const scheduleLink = `${SITE}/schedule/monthly?token=${token}`;
      const firstName    = (sub.customer_name ?? "there").split(" ")[0];
      const monthName    = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
        .toLocaleDateString("en-US", { month: "long" });

      const { error: emailErr } = await resend.emails.send({
        from:    FROM,
        to:      sub.customer_email,
        subject: `Pick your ${monthName} detail date — Arise And Shine Detailing`,
        html:    getMonthlyScheduleReminderHtml(firstName, sub.plan_name, monthStr, scheduleLink),
        replyTo: "contact@ariseandshinedetailing.com",
      });

      if (emailErr) {
        console.error(`[cron/monthly-schedule-emails] email error for ${sub.customer_email}:`, emailErr);
        failed++;
        continue;
      }

      // Record reminder sent (upsert pick row with just the timestamp)
      await supabase.from("monthly_schedule_picks").upsert({
        subscription_id:  sub.id,
        month:            monthStr,
        reminder_sent_at: new Date().toISOString(),
        status:           "pending",
      }, { onConflict: "subscription_id,month", ignoreDuplicates: false });

      sent++;
    } catch (err) {
      console.error(`[cron/monthly-schedule-emails] error for ${sub.id}:`, err);
      failed++;
    }
  }

  console.log(`[cron/monthly-schedule-emails] month=${monthStr} sent=${sent} failed=${failed} skipped=${dueSubs.length - toEmail.length}`);
  return NextResponse.json({ ok: true, month: monthStr, sent, failed });
}
