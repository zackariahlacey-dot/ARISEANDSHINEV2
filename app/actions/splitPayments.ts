"use server";

/**
 * Split-tender payments — admin can carve a booking's total across
 * multiple emails, each with their own payment page + Stripe session.
 *
 * Flow:
 *   1. Admin picks split configuration in the booking detail modal:
 *        - Free-form: N rows of { email, amount }
 *        - By vehicle: pick a booking_vehicles row per email (amount
 *          auto-fills from that vehicle's line_total)
 *   2. createSplitPayments() inserts a row per portion, generates a
 *      URL-safe pay_token per row.
 *   3. sendSplitPaymentLinks() (or a per-row send) emails each
 *      recipient with their own /pay/split/[token] link.
 *   4. The customer pays via the split pay page → Stripe webhook
 *      stamps paid_at.
 *   5. Once every split for a booking is 'paid', the booking's
 *      aggregate paid_at is set so the admin card flips to "Paid".
 *
 * All DB access via the service-role client — anon RLS blocks writes.
 */

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Admin guard (mirrors adminAuditLog.ts pattern) ─────────────────────────
async function requireAdmin(): Promise<boolean> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdminRole = ((row as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const allowlist = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com")
    .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const emailMatch = !!user.email && allowlist.includes(user.email.toLowerCase());
  return isAdminRole || emailMatch;
}

// URL-safe short token — same alphabet family as gift-card codes.
function makePayToken(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(16);
  let out = "";
  for (let i = 0; i < buf.length; i++) out += chars[buf[i] % chars.length];
  return out;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ── Types ──────────────────────────────────────────────────────────────────
export type SplitInput = {
  recipientEmail:   string;
  recipientName?:   string | null;
  amount:           number;   // whole dollars
  vehiclePosition?: number | null;
};

export type SplitRow = {
  id:                     string;
  booking_id:             string;
  pay_token:              string;
  position:               number;
  recipient_email:        string;
  recipient_name:         string | null;
  amount:                 number;
  vehicle_position:       number | null;
  status:                 "pending" | "sent" | "paid" | "cancelled" | "refunded";
  stripe_session_id:      string | null;
  stripe_payment_intent_id: string | null;
  sent_at:                string | null;
  paid_at:                string | null;
  cancelled_at:           string | null;
  created_at:             string;
  updated_at:             string;
};

// ── Create splits ──────────────────────────────────────────────────────────

/**
 * Replace any existing UNPAID splits on this booking with a fresh set.
 * Paid + refunded rows are preserved so we never wipe payment history.
 * Amounts must sum to the booking's total_price (± 1 cent for rounding).
 */
export async function createSplitPayments(
  bookingId: string,
  splits: SplitInput[],
): Promise<{ ok: boolean; error?: string; splits?: SplitRow[] }> {
  if (!(await requireAdmin())) return { ok: false, error: "Admin only." };
  if (!bookingId) return { ok: false, error: "Booking required." };
  if (!Array.isArray(splits) || splits.length < 2) {
    return { ok: false, error: "At least two splits required." };
  }

  const cleaned = splits.map((s) => ({
    recipientEmail:   (s.recipientEmail ?? "").trim().toLowerCase(),
    recipientName:    s.recipientName?.trim() || null,
    amount:           Math.max(0, Math.round(Number(s.amount ?? 0) * 100) / 100),
    vehiclePosition:  s.vehiclePosition ?? null,
  }));

  for (const s of cleaned) {
    if (!isValidEmail(s.recipientEmail)) {
      return { ok: false, error: `Invalid email: ${s.recipientEmail || "(blank)"}` };
    }
    if (s.amount <= 0) {
      return { ok: false, error: "Every split must be greater than $0." };
    }
  }

  const supabase = createAdminClient();

  // Validate total matches the booking total.
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, total_price, status, paid_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (bErr || !booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "cancelled") return { ok: false, error: "Booking is cancelled." };

  const total = Number(booking.total_price ?? 0);
  const sum = cleaned.reduce((n, s) => n + s.amount, 0);
  // Allow 1c drift for rounded splits.
  if (Math.abs(sum - total) > 0.01) {
    return { ok: false, error: `Split total $${sum.toFixed(2)} doesn't match booking total $${total.toFixed(2)}.` };
  }

  // Remove any existing UNPAID splits — admin is redefining the split.
  await supabase
    .from("booking_split_payments")
    .delete()
    .eq("booking_id", bookingId)
    .in("status", ["pending", "sent", "cancelled"]);

  // Insert new rows.
  const rows = cleaned.map((s, i) => ({
    booking_id:       bookingId,
    pay_token:        makePayToken(),
    position:         i,
    recipient_email:  s.recipientEmail,
    recipient_name:   s.recipientName,
    amount:           s.amount,
    vehicle_position: s.vehiclePosition,
    status:           "pending" as const,
  }));

  const { data, error } = await supabase
    .from("booking_split_payments")
    .insert(rows)
    .select("*");

  if (error) return { ok: false, error: error.message };
  return { ok: true, splits: (data ?? []) as SplitRow[] };
}

// ── List splits for a booking ──────────────────────────────────────────────

export async function listSplitPayments(bookingId: string): Promise<SplitRow[]> {
  if (!(await requireAdmin())) return [];
  if (!bookingId) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_split_payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("position", { ascending: true });
  return (data ?? []) as SplitRow[];
}

// ── Delete a single split (only if not paid) ───────────────────────────────

export async function deleteSplitPayment(splitId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: "Admin only." };
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("booking_split_payments")
    .select("id, status")
    .eq("id", splitId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Split not found." };
  if (row.status === "paid") return { ok: false, error: "Cannot delete a paid split." };
  const { error } = await supabase
    .from("booking_split_payments")
    .delete()
    .eq("id", splitId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Send links (emails each recipient their own /pay/split/[token]) ────────

export async function sendSplitPaymentLinks(
  bookingId: string,
  opts?: { onlyPending?: boolean },
): Promise<{ ok: boolean; sent: number; errors: number; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, sent: 0, errors: 0, error: "Admin only." };

  const { Resend } = await import("resend");
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, sent: 0, errors: 0, error: "Resend not configured." };
  const resend = new Resend(resendKey);
  const FROM = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinedetailing.com").replace(/\/$/, "");

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, service_name, customer_name, booking_date, booking_time, vehicle_year, vehicle_make, vehicle_model")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, sent: 0, errors: 0, error: "Booking not found." };

  let query = supabase
    .from("booking_split_payments")
    .select("*")
    .eq("booking_id", bookingId)
    .neq("status", "paid")
    .neq("status", "cancelled")
    .order("position", { ascending: true });
  if (opts?.onlyPending) query = query.eq("status", "pending");
  const { data: splits } = await query;
  if (!splits || splits.length === 0) return { ok: true, sent: 0, errors: 0 };

  const veh = [booking.vehicle_year, booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ");
  const firstName = (booking.customer_name ?? "").split(" ")[0] || "there";
  let sent = 0, errors = 0;

  for (const row of splits as SplitRow[]) {
    const url = `${origin}/pay/split/${encodeURIComponent(row.pay_token)}`;
    const amt = row.amount.toFixed(2);
    const to = row.recipient_email;
    const recipientFirst = (row.recipient_name ?? "").split(" ")[0] || "there";
    const subject = `Your Arise And Shine Detailing invoice — $${amt}`;
    const html = renderSplitEmailHtml({
      recipientFirst,
      customerFirst: firstName,
      serviceName: booking.service_name ?? "Detailing Service",
      vehicle: veh,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      amount: row.amount,
      url,
    });
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
        replyTo: "contact@ariseandshinedetailing.com",
      });
      if (error) throw error;
      await supabase
        .from("booking_split_payments")
        .update({ status: row.status === "pending" ? "sent" : row.status, sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch (e) {
      console.error("[splitPayments] send failed for", to, e);
      errors++;
    }
  }
  return { ok: true, sent, errors };
}

function renderSplitEmailHtml(opts: {
  recipientFirst: string;
  customerFirst:  string;
  serviceName:    string;
  vehicle:        string;
  bookingDate:    string | null;
  bookingTime:    string | null;
  amount:         number;
  url:            string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dateStr = opts.bookingDate
    ? new Date(opts.bookingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#0f0f10;border:1px solid #1f1f22;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:26px 30px;text-align:center;border-bottom:1px solid #1f1f22;">
        <p style="color:#D4AF37;font-size:12px;font-weight:900;margin:0;letter-spacing:0.18em;text-transform:uppercase;">Arise And Shine Detailing</p>
        <p style="color:#71717a;font-size:10px;margin:4px 0 0;letter-spacing:0.15em;text-transform:uppercase;">Split Invoice</p>
      </td></tr>
      <tr><td style="padding:26px 30px 20px;">
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;">Hi ${esc(opts.recipientFirst)} 👋</p>
        <h1 style="color:#fff;font-size:22px;font-weight:900;line-height:1.3;margin:0 0 12px;">
          You're covering part of ${esc(opts.customerFirst)}'s detail.
        </h1>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 20px;">
          Your share is <strong style="color:#D4AF37;">$${opts.amount.toFixed(2)}</strong>. Click below to pay — takes about 30 seconds via Stripe. Receipt lands in this inbox.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a1d;border-radius:10px;margin:0 0 20px;">
          <tr><td style="padding:14px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:5px 0;font-size:10px;font-weight:900;color:#71717a;letter-spacing:0.15em;text-transform:uppercase;">Service</td>
                  <td style="padding:5px 0;font-size:13px;color:#e4e4e7;text-align:right;">${esc(opts.serviceName)}</td></tr>
              ${opts.vehicle ? `<tr><td style="padding:5px 0;font-size:10px;font-weight:900;color:#71717a;letter-spacing:0.15em;text-transform:uppercase;">Vehicle</td>
                  <td style="padding:5px 0;font-size:13px;color:#e4e4e7;text-align:right;">${esc(opts.vehicle)}</td></tr>` : ""}
              ${dateStr ? `<tr><td style="padding:5px 0;font-size:10px;font-weight:900;color:#71717a;letter-spacing:0.15em;text-transform:uppercase;">Date</td>
                  <td style="padding:5px 0;font-size:13px;color:#e4e4e7;text-align:right;">${esc(dateStr)}</td></tr>` : ""}
              <tr><td style="padding:8px 0 0;font-size:11px;font-weight:900;color:#D4AF37;letter-spacing:0.15em;text-transform:uppercase;">Your Share</td>
                  <td style="padding:8px 0 0;font-size:22px;font-weight:900;color:#D4AF37;text-align:right;">$${opts.amount.toFixed(2)}</td></tr>
            </table>
          </td></tr>
        </table>

        <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr><td style="background:#D4AF37;border-radius:10px;">
            <a href="${opts.url}" style="display:inline-block;padding:15px 32px;color:#0a0a0a;font-size:13px;font-weight:900;text-decoration:none;letter-spacing:0.10em;text-transform:uppercase;">Pay $${opts.amount.toFixed(2)} Securely →</a>
          </td></tr>
        </table>

        <p style="color:#52525b;font-size:11px;margin:16px 0 0;text-align:center;">Secure payment via Stripe. Card info never touches our servers.</p>
      </td></tr>
      <tr><td style="padding:18px 30px 24px;text-align:center;border-top:1px solid #1f1f22;">
        <p style="color:#52525b;font-size:11px;margin:0;">Questions? Reply to this email or call <a href="tel:8025855563" style="color:#D4AF37;text-decoration:none;">802-585-5563</a>.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
