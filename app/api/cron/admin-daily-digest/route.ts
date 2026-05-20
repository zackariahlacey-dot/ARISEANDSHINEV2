/**
 * Cron: daily admin digest email.
 *
 * Fires once a day (8 PM Eastern by default — see vercel.json) and sends
 * the owner a single email summarizing the day's activity instead of the
 * stream of per-event notifications that would otherwise pile up.
 *
 * Contents:
 *   - Today's job count and gross
 *   - Bookings created today (new sales)
 *   - Completions awaiting photo review
 *   - Customer ratings submitted today (highlighting low ratings)
 *   - Contractor activity (joined / activated / paused)
 *   - Tomorrow's unassigned jobs (so you can move them tonight)
 *   - Failed payment confirmation emails
 *
 * Admin-only — never reaches a customer.
 * Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const FROM = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";

function ownerEmail(): string {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .split(",")[0].trim();
}

function localDate(d: Date): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY missing" });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStr = localDate(now);
  const tomorrowStr = localDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  // ── Today's bookings (scheduled for today, any status) ──────────────────
  const { data: todaysJobs } = await admin
    .from("bookings")
    .select("id, status, total_price, customer_name, service_name, booking_time, job_completed_at, photo_review_status, assigned_to")
    .eq("booking_date", todayStr)
    .neq("status", "cancelled")
    .order("booking_time", { ascending: true });

  const completedToday = (todaysJobs ?? []).filter((b: any) => b.job_completed_at);
  const grossToday = (todaysJobs ?? []).reduce((s, b: any) => s + Number(b.total_price ?? 0), 0);

  // ── Bookings created today (new sales) ──────────────────────────────────
  const { data: newToday } = await admin
    .from("bookings")
    .select("id, customer_name, service_name, total_price, booking_date, created_at")
    .gte("created_at", startOfDayIso)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  // ── Pending photo reviews ───────────────────────────────────────────────
  const { data: pendingPhotos } = await admin
    .from("bookings")
    .select("id, customer_name, service_name, job_completed_at, assigned_to")
    .not("job_completed_at", "is", null)
    .eq("photo_review_status", "pending")
    .order("job_completed_at", { ascending: true })
    .limit(20);

  // ── Ratings submitted today ─────────────────────────────────────────────
  const { data: ratings } = await admin
    .from("customer_ratings")
    .select("id, booking_id, overall_stars, attitude_stars, comments, token_used_at")
    .gte("token_used_at", startOfDayIso)
    .order("token_used_at", { ascending: false });
  const lowRatings = (ratings ?? []).filter((r: any) => (r.overall_stars ?? 5) <= 3);

  // ── Tomorrow's unassigned ───────────────────────────────────────────────
  const { data: unassignedTomorrow } = await admin
    .from("bookings")
    .select("id, customer_name, service_name, booking_time")
    .eq("booking_date", tomorrowStr)
    .is("assigned_to", null)
    .neq("status", "cancelled")
    .order("booking_time", { ascending: true });

  // ── Failed payment emails ───────────────────────────────────────────────
  const { data: failedEmails } = await admin
    .from("bookings")
    .select("id, customer_name, total_price, payment_received_email_failed_at, payment_received_email_last_error")
    .not("stripe_checkout_session_id", "is", null)
    .is("payment_received_email_sent_at", null)
    .not("payment_received_email_failed_at", "is", null)
    .gte("payment_received_email_failed_at", startOfDayIso)
    .order("payment_received_email_failed_at", { ascending: false });

  // ── Contractor activity today (from audit log) ──────────────────────────
  const { data: contractorActivity } = await admin
    .from("admin_audit_log")
    .select("id, action, created_at, payload")
    .gte("created_at", startOfDayIso)
    .in("action", [
      "invite_contractor",
      "contractor_active",
      "contractor_paused",
      "contractor_terminated",
      "contractor_signed_payment",
      "contractor_signed_restrictions",
      "contractor_signed_liability",
      "set_contractor_tier",
    ])
    .order("created_at", { ascending: false });

  // Bail entirely if there's nothing meaningful to report
  const hasContent = (todaysJobs?.length ?? 0) > 0
    || (newToday?.length ?? 0) > 0
    || (pendingPhotos?.length ?? 0) > 0
    || (ratings?.length ?? 0) > 0
    || (unassignedTomorrow?.length ?? 0) > 0
    || (failedEmails?.length ?? 0) > 0
    || (contractorActivity?.length ?? 0) > 0;
  if (!hasContent) {
    return NextResponse.json({ skipped: true, reason: "no activity today" });
  }

  const html = digestHtml({
    todayLabel: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    grossToday,
    completedCount: completedToday.length,
    todayJobs: (todaysJobs ?? []) as any[],
    newToday: (newToday ?? []) as any[],
    pendingPhotos: (pendingPhotos ?? []) as any[],
    ratings: (ratings ?? []) as any[],
    lowRatings,
    unassignedTomorrow: (unassignedTomorrow ?? []) as any[],
    failedEmails: (failedEmails ?? []) as any[],
    contractorActivity: (contractorActivity ?? []) as any[],
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: ownerEmail(),
      subject: `Arise & Shine — ${now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${(todaysJobs ?? []).length} job${(todaysJobs ?? []).length === 1 ? "" : "s"} · $${grossToday.toFixed(0)} gross`,
      html,
    });
    if (error) {
      console.error("[cron/admin-daily-digest] send error:", error);
      return NextResponse.json({ sent: false, error: error.message }, { status: 500 });
    }
  } catch (err) {
    console.error("[cron/admin-daily-digest]", err);
    return NextResponse.json({ sent: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}

function digestHtml(data: {
  todayLabel: string;
  grossToday: number;
  completedCount: number;
  todayJobs: any[];
  newToday: any[];
  pendingPhotos: any[];
  ratings: any[];
  lowRatings: any[];
  unassignedTomorrow: any[];
  failedEmails: any[];
  contractorActivity: any[];
}): string {
  const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const stat = (label: string, value: string, accent = "#d4af37") =>
    `<td style="padding:14px 8px;border-radius:10px;background:#1a1a1a;border:1px solid #2a2a2a;width:33%;text-align:center;">
      <p style="margin:0 0 4px;font-size:9px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#888;">${esc(label)}</p>
      <p style="margin:0;font-size:20px;font-weight:900;color:${accent};">${esc(value)}</p>
    </td>`;

  const sectionHeader = (title: string, count: number) =>
    `<tr><td style="padding:22px 0 8px;border-bottom:1px solid #2a2a2a;">
      <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#d4af37;">${esc(title)} <span style="color:#666;font-weight:700;">· ${count}</span></p>
    </td></tr>`;

  const emptyRow = (msg: string) =>
    `<tr><td style="padding:10px 0;font-size:12px;color:#666;font-style:italic;">${esc(msg)}</td></tr>`;

  const bookingRow = (label: string, sub: string, money?: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #1f1f1f;">
      <div style="display:flex;justify-content:space-between;gap:12px;">
        <div style="flex:1;min-width:0;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#fff;">${esc(label)}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#888;">${esc(sub)}</p>
        </div>
        ${money ? `<p style="margin:0;font-size:13px;font-weight:800;color:#d4af37;white-space:nowrap;">${esc(money)}</p>` : ""}
      </div>
    </td></tr>`;

  const lowRatingBlock = data.lowRatings.length > 0
    ? `<tr><td style="padding:14px;background:#3a1212;border:2px solid #b91c1c;border-radius:10px;margin-top:10px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:900;color:#fca5a5;">⚠️ ${data.lowRatings.length} low rating${data.lowRatings.length === 1 ? "" : "s"} today</p>
        ${data.lowRatings.map((r: any) => `
          <p style="margin:6px 0 0;font-size:12px;color:#fecaca;">
            ${r.overall_stars}★ overall — ${esc(((r.comments as string | null) ?? "(no comment)").slice(0, 120))}
          </p>
        `).join("")}
      </td></tr>` : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:24px 12px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;">

          <tr><td style="padding:24px 28px;text-align:center;background:#000;border-bottom:1px solid #2a2a2a;">
            <p style="margin:0;color:#d4af37;font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">Arise &amp; Shine VT</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:18px;font-weight:900;">Daily Digest — ${esc(data.todayLabel)}</h1>
          </td></tr>

          <tr><td style="padding:24px 28px;">

            <!-- Top stats -->
            <table width="100%" cellpadding="0" cellspacing="6">
              <tr>
                ${stat("Jobs Today",     String(data.todayJobs.length))}
                ${stat("Completed",      String(data.completedCount), "#10b981")}
                ${stat("Gross",          `$${data.grossToday.toFixed(0)}`)}
              </tr>
            </table>

            ${lowRatingBlock}

            <!-- New bookings -->
            ${sectionHeader("New bookings", data.newToday.length)}
            ${data.newToday.length === 0 ? emptyRow("None today.") :
              data.newToday.slice(0, 10).map((b: any) =>
                bookingRow(
                  b.customer_name ?? "—",
                  `${b.service_name ?? "Detail"} · ${b.booking_date}`,
                  `$${Number(b.total_price ?? 0).toFixed(0)}`
                )
              ).join("")}

            <!-- Pending photo reviews -->
            ${sectionHeader("Photo reviews waiting", data.pendingPhotos.length)}
            ${data.pendingPhotos.length === 0 ? emptyRow("Nothing waiting.") :
              data.pendingPhotos.slice(0, 10).map((b: any) =>
                bookingRow(
                  b.customer_name ?? "—",
                  `${b.service_name ?? "Detail"} · completed ${new Date(b.job_completed_at as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                )
              ).join("")}

            <!-- Ratings -->
            ${sectionHeader("Customer ratings today", data.ratings.length)}
            ${data.ratings.length === 0 ? emptyRow("No ratings submitted today.") :
              data.ratings.slice(0, 10).map((r: any) =>
                bookingRow(
                  `${r.overall_stars}★ overall · ${r.attitude_stars}★ attitude`,
                  ((r.comments as string | null) ?? "(no comment)").slice(0, 90)
                )
              ).join("")}

            <!-- Tomorrow unassigned -->
            ${sectionHeader("Unassigned tomorrow", data.unassignedTomorrow.length)}
            ${data.unassignedTomorrow.length === 0 ? emptyRow("Everything's assigned.") :
              data.unassignedTomorrow.slice(0, 10).map((b: any) =>
                bookingRow(
                  b.customer_name ?? "—",
                  `${b.service_name ?? "Detail"} · ${b.booking_time ?? ""}`
                )
              ).join("")}

            <!-- Failed payment emails -->
            ${data.failedEmails.length > 0 ? sectionHeader("⚠️ Payment emails that failed today", data.failedEmails.length) : ""}
            ${data.failedEmails.length > 0 ? data.failedEmails.slice(0, 10).map((b: any) =>
              bookingRow(b.customer_name ?? "—", b.payment_received_email_last_error ?? "unknown error", `$${Number(b.total_price ?? 0).toFixed(0)}`)
            ).join("") : ""}

            <!-- Contractor activity -->
            ${data.contractorActivity.length > 0 ? sectionHeader("Contractor activity today", data.contractorActivity.length) : ""}
            ${data.contractorActivity.length > 0 ? data.contractorActivity.slice(0, 10).map((a: any) =>
              bookingRow(
                a.action.replace(/_/g, " "),
                new Date(a.created_at).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })
              )
            ).join("") : ""}

            <tr><td style="padding:22px 0 0;border-top:1px solid #2a2a2a;text-align:center;">
              <a href="${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinevt.com").replace(/\/$/, "")}/admin" style="display:inline-block;padding:12px 28px;background:#d4af37;color:#000;font-size:12px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;border-radius:8px;">Open admin</a>
              <p style="margin:14px 0 0;font-size:10px;color:#555;">You're receiving this because you're the owner. To turn off, set ADMIN_DIGEST_DISABLED=true.</p>
            </td></tr>

          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}
