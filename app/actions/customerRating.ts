"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createResend } from "@/lib/mailer";

const RATING_TOKEN_BYTES = 24;       // 32-char URL-safe token
const RATING_LINK_EXPIRY_DAYS = 30;
const COUPON_VALUE_DOLLARS = 15;
const COUPON_VALIDITY_DAYS = 60;
const LOW_RATING_THRESHOLD = 3;

function genToken(): string {
  const arr = new Uint8Array(RATING_TOKEN_BYTES);
  crypto.getRandomValues(arr);
  // URL-safe base64 (no padding)
  return Buffer.from(arr).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinedetailing.com").replace(/\/$/, "");
}

/**
 * Called from completeJob — creates the rating row with a one-time token.
 * Does NOT send the email yet; that happens 2 hours later via cron so the
 * customer enjoys their detail before being asked to rate it. Idempotent
 * per booking (unique on booking_id).
 */
export async function createRatingForBooking(bookingId: string): Promise<{ ok: boolean; error?: string; ratingId?: string }> {
  const admin = createAdminClient();

  // Pull booking context
  const { data: b } = await admin
    .from("bookings")
    .select("id, assigned_to, customer_name, customer_email, booking_date, service_name, job_completed_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  if (!(b as any).job_completed_at) return { ok: false, error: "Booking not completed." };

  // Idempotency: skip if already exists
  const { data: existing } = await admin
    .from("customer_ratings")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) return { ok: true, ratingId: (existing as any).id };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RATING_LINK_EXPIRY_DAYS);

  const { data: inserted, error } = await admin
    .from("customer_ratings")
    .insert({
      booking_id:    bookingId,
      contractor_id: (b as any).assigned_to,
      token:         genToken(),
      expires_at:    expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("[createRatingForBooking]", error);
    return { ok: false, error: error?.message ?? "Could not create rating record." };
  }
  return { ok: true, ratingId: inserted.id };
}

/**
 * Sends the rating-request email for a single rating row. Idempotent — once
 * email_sent_at is non-null, this becomes a no-op. Called by the cron job
 * after the 2-hour delay window.
 */
export async function sendRatingEmail(ratingId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("customer_ratings")
    .select("id, booking_id, token, email_sent_at, token_used_at, expires_at")
    .eq("id", ratingId)
    .maybeSingle();
  if (!r) return { ok: false, error: "Rating not found." };
  if ((r as any).email_sent_at) return { ok: true };
  if ((r as any).token_used_at) return { ok: true };

  const { data: b } = await admin
    .from("bookings")
    .select("customer_name, customer_email, booking_date, service_name, vehicle_year, vehicle_make, vehicle_model")
    .eq("id", (r as any).booking_id)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  const email = ((b as any).customer_email as string | null)?.trim();
  if (!email) {
    // No email — silently mark sent so we don't keep retrying
    await admin.from("customer_ratings").update({ email_sent_at: new Date().toISOString() }).eq("id", ratingId);
    return { ok: false, error: "Customer email missing." };
  }

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY missing." };
  }

  const resend = createResend();
  const link = `${siteOrigin()}/rate/${(r as any).token}`;
  const firstName = (((b as any).customer_name as string) ?? "there").trim().split(/\s+/)[0] ?? "there";
  const vehicle = `${(b as any).vehicle_year ?? ""} ${(b as any).vehicle_make ?? ""} ${(b as any).vehicle_model ?? ""}`.trim();

  const html = ratingEmailHtml({ firstName, vehicle, link, couponValue: COUPON_VALUE_DOLLARS });

  // Retry up to 3 times
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>",
        to: email,
        replyTo: "contact@ariseandshinedetailing.com",
        subject: `How did we do, ${firstName}? Plus $${COUPON_VALUE_DOLLARS} off your next detail`,
        html,
      });
      if (!(res as any)?.error) {
        await admin.from("customer_ratings").update({ email_sent_at: new Date().toISOString() }).eq("id", ratingId);
        return { ok: true };
      }
      lastError = JSON.stringify((res as any).error);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
  }
  console.error("[sendRatingEmail] permanently failed:", lastError);
  return { ok: false, error: lastError };
}

/**
 * Public rating submission. Token-gated, one-time use. On success:
 *   - locks the token (token_used_at = now)
 *   - stores stars/comments/recommend
 *   - generates a $15-off coupon valid 60 days
 *   - low ratings (≤3 overall) fire a red alert to admin
 *   - bumps contractor's rating_count and rating_overall_avg / rating_attitude_avg
 */
export async function submitRating(args: {
  token: string;
  overallStars: number;
  attitudeStars: number;
  comments?: string;
  recommend?: boolean;
}): Promise<{ ok: boolean; error?: string; couponCode?: string }> {
  const admin = createAdminClient();

  const { data: r } = await admin
    .from("customer_ratings")
    .select("id, booking_id, contractor_id, token, token_used_at, expires_at")
    .eq("token", args.token)
    .maybeSingle();
  if (!r) return { ok: false, error: "Rating link not found." };
  if ((r as any).token_used_at) return { ok: false, error: "This rating link has already been used." };
  if (new Date((r as any).expires_at) < new Date()) return { ok: false, error: "This rating link has expired." };

  const overall  = Math.max(1, Math.min(5, Math.round(Number(args.overallStars))));
  const attitude = Math.max(1, Math.min(5, Math.round(Number(args.attitudeStars))));
  if (isNaN(overall) || isNaN(attitude)) return { ok: false, error: "Invalid star ratings." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;

  // Generate the $15-off coupon (unique per rating submission).
  // The existing coupons table doesn't carry an expires_at column today —
  // we limit to one use via max_uses, which auto-deactivates the code after
  // its first redemption. If you later add an expiry column, this is where
  // it would be stamped.
  const couponCode = `THANKS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  try {
    await admin.from("coupons").insert({
      code: couponCode,
      discount_amount: COUPON_VALUE_DOLLARS,
      discount_percentage: null,
      is_active: true,
      max_uses: 1,
    });
  } catch (err) {
    console.error("[submitRating] coupon insert (non-fatal):", err);
  }

  // Lock the rating
  const { error: updateErr } = await admin
    .from("customer_ratings")
    .update({
      token_used_at:  new Date().toISOString(),
      overall_stars:  overall,
      attitude_stars: attitude,
      comments:       args.comments?.trim() || null,
      recommend:      args.recommend ?? null,
      submitted_ip:   ip,
      coupon_code:    couponCode,
    })
    .eq("id", (r as any).id);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Bump contractor's rating cache (best-effort, racy but fine for stats)
  const contractorId = (r as any).contractor_id as string | null;
  if (contractorId) {
    try {
      const { data: agg } = await admin
        .from("customer_ratings")
        .select("overall_stars, attitude_stars")
        .eq("contractor_id", contractorId)
        .not("token_used_at", "is", null);
      const submitted = (agg ?? []).filter((x: any) => x.overall_stars != null);
      const n = submitted.length;
      const overallAvg = n > 0 ? submitted.reduce((s: number, x: any) => s + Number(x.overall_stars), 0) / n : null;
      const attitudeAvg = n > 0 ? submitted.reduce((s: number, x: any) => s + Number(x.attitude_stars ?? 0), 0) / n : null;
      await admin
        .from("profiles")
        .update({
          rating_count: n,
          rating_overall_avg:  overallAvg,
          rating_attitude_avg: attitudeAvg,
        })
        .eq("id", contractorId);
    } catch (err) {
      console.error("[submitRating] rating cache update:", err);
    }
  }

  // Low-rating red alert
  if (overall <= LOW_RATING_THRESHOLD) {
    try {
      await sendLowRatingAlert({ ratingId: (r as any).id, overall, attitude, comments: args.comments });
    } catch (err) {
      console.error("[submitRating] low-rating alert:", err);
    }
  }

  return { ok: true, couponCode };
}

/** Returns rating data for the public submission page. */
export async function getRatingByToken(token: string): Promise<
  | { ok: true; rating: { id: string; bookingId: string; expired: boolean; alreadyUsed: boolean; couponCode: string | null; customerFirstName: string; vehicleLabel: string; contractorFirstName: string | null } }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("customer_ratings")
    .select("id, booking_id, contractor_id, token_used_at, expires_at, coupon_code")
    .eq("token", token)
    .maybeSingle();
  if (!r) return { ok: false, error: "Rating link not found." };

  const expired = new Date((r as any).expires_at) < new Date();
  const alreadyUsed = !!(r as any).token_used_at;

  const { data: b } = await admin
    .from("bookings")
    .select("customer_name, vehicle_year, vehicle_make, vehicle_model")
    .eq("id", (r as any).booking_id)
    .maybeSingle();
  const customerFirstName = (((b as any)?.customer_name as string) ?? "there").trim().split(/\s+/)[0] ?? "there";
  const vehicleLabel = `${(b as any)?.vehicle_year ?? ""} ${(b as any)?.vehicle_make ?? ""} ${(b as any)?.vehicle_model ?? ""}`.trim();

  let contractorFirstName: string | null = null;
  if ((r as any).contractor_id) {
    const { data: cp } = await admin
      .from("profiles")
      .select("first_name")
      .eq("id", (r as any).contractor_id)
      .maybeSingle();
    contractorFirstName = ((cp as any)?.first_name as string) ?? null;
  }

  return {
    ok: true,
    rating: {
      id: (r as any).id,
      bookingId: (r as any).booking_id,
      expired,
      alreadyUsed,
      couponCode: (r as any).coupon_code ?? null,
      customerFirstName,
      vehicleLabel,
      contractorFirstName,
    },
  };
}

// ─── Low-rating admin alert ──────────────────────────────────────────────────

async function sendLowRatingAlert(args: { ratingId: string; overall: number; attitude: number; comments?: string }) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();
  const { data: r } = await admin
    .from("customer_ratings")
    .select("booking_id, contractor_id")
    .eq("id", args.ratingId)
    .maybeSingle();
  if (!r) return;

  const [bookingRes, contractorRes] = await Promise.all([
    admin
      .from("bookings")
      .select("customer_name, customer_phone, customer_email, service_name, booking_date")
      .eq("id", (r as any).booking_id)
      .maybeSingle(),
    (r as any).contractor_id
      ? admin
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", (r as any).contractor_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const b = bookingRes.data as any;
  const c = contractorRes.data as any;
  const ownerEmail = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com").split(",")[0].trim();
  const resend = createResend();

  const contractorName = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : "Unassigned";
  const subject = `⚠️ Low rating · ${args.overall}★ · ${b?.customer_name ?? "—"} · ${contractorName}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;border:2px solid #ef4444;">
        <tr><td style="background:#ef4444;padding:16px 20px;">
          <p style="color:#fff;font-size:16px;font-weight:900;margin:0;">⚠️ Low Rating Submitted</p>
        </td></tr>
        <tr><td style="padding:20px;">
          <p style="font-size:13px;color:#333;margin:0 0 12px;">A customer just submitted a <strong>${args.overall}-star</strong> rating. You may want to reach out.</p>
          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;color:#222;">
            <tr><td style="border-bottom:1px solid #eee;"><strong>Customer</strong></td><td style="border-bottom:1px solid #eee;">${b?.customer_name ?? "—"}</td></tr>
            <tr><td style="border-bottom:1px solid #eee;"><strong>Phone</strong></td><td style="border-bottom:1px solid #eee;">${b?.customer_phone ?? "—"}</td></tr>
            <tr><td style="border-bottom:1px solid #eee;"><strong>Service</strong></td><td style="border-bottom:1px solid #eee;">${b?.service_name ?? "—"}</td></tr>
            <tr><td style="border-bottom:1px solid #eee;"><strong>Date</strong></td><td style="border-bottom:1px solid #eee;">${b?.booking_date ?? "—"}</td></tr>
            <tr><td style="border-bottom:1px solid #eee;"><strong>Contractor</strong></td><td style="border-bottom:1px solid #eee;">${contractorName}</td></tr>
            <tr><td style="border-bottom:1px solid #eee;"><strong>Overall ★</strong></td><td style="border-bottom:1px solid #eee;">${args.overall}/5</td></tr>
            <tr><td style="border-bottom:1px solid #eee;"><strong>Attitude ★</strong></td><td style="border-bottom:1px solid #eee;">${args.attitude}/5</td></tr>
          </table>
          ${args.comments ? `<p style="margin-top:14px;font-size:13px;color:#333;"><strong>Comments:</strong></p><p style="margin:4px 0 0;padding:10px 12px;background:#fff5f5;border-radius:8px;font-size:13px;color:#333;white-space:pre-line;">${args.comments.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ""}
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>",
    to: ownerEmail,
    subject,
    html,
  }).catch(err => console.error("[sendLowRatingAlert]", err));
}

// ─── Email HTML ──────────────────────────────────────────────────────────────

function ratingEmailHtml({ firstName, vehicle, link, couponValue }: { firstName: string; vehicle: string; link: string; couponValue: number }): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="background:#0a0a0a;padding:28px 32px;border-radius:14px 14px 0 0;text-align:center;">
          <p style="color:#d4af37;font-size:13px;font-weight:900;margin:0;letter-spacing:0.18em;text-transform:uppercase;">Arise And Shine Detailing</p>
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0 0;">How did we do, ${firstName}?</h1>
        </td></tr>
        <tr><td style="background:#fff;padding:28px 32px;border-radius:0 0 14px 14px;">
          <p style="font-size:14px;color:#333;line-height:1.65;margin:0 0 16px;">
            Hope your <strong>${vehicle || "vehicle"}</strong> is still looking great. We'd love a quick 30-second rating — it helps us know we're doing right by you and lets us spot the contractors who go above and beyond.
          </p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;background:#d4af37;color:#000;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;padding:14px 32px;border-radius:8px;text-decoration:none;">Rate your detail</a>
          </p>
          <div style="background:#fef9e7;border:1px solid #f0d060;border-radius:10px;padding:14px 18px;margin:18px 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#7a5300;line-height:1.55;">
              <strong style="font-size:14px;color:#92700a;">$${couponValue} off your next detail</strong><br/>
              ...as a thank-you when you finish the rating. Code lands on the confirmation screen.
            </p>
          </div>
          <p style="font-size:11px;color:#888;margin:20px 0 0;text-align:center;">
            This link is unique to your appointment and works once. Need anything? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}
