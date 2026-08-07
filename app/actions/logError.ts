"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createResend } from "@/lib/mailer";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
const OWNER_EMAIL  = process.env.ADMIN_EMAIL  ?? "zackariahlacey@gmail.com";

/** Error types that trigger an owner email. `general` is intentionally
 *  excluded — those are logged to DB only so internal cleanups don't spam
 *  the inbox. Add to this set if a new type needs immediate visibility. */
const EMAIL_ALERT_TYPES = new Set([
  "booking_attempt",
  "payment_failure",
  "webhook",
  "cron",
]);

/** De-dupe window: skip the email if the same (type+source+message) was
 *  emailed within this many minutes. Prevents Stripe retry storms or a
 *  bad cron from carpet-bombing the inbox while still surfacing every
 *  distinct failure quickly. */
const DEDUPE_WINDOW_MIN = 10;

export type LogErrorInput = {
  type: "booking_attempt" | "payment_failure" | "webhook" | "cron" | "general";
  source: string;
  message: string;
  details?: Record<string, unknown>;
};

export async function logError(opts: LogErrorInput) {
  // ── 1. Write to DB (best-effort) ───────────────────────────────────────────
  let insertedId: string | null = null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("error_logs")
      .insert({
        type:    opts.type,
        source:  opts.source,
        message: opts.message,
        details: opts.details ?? null,
      })
      .select("id")
      .single();
    insertedId = (data as { id?: string } | null)?.id ?? null;
  } catch { /* never throw from logger */ }

  // ── 2. Email alert (rate-limited per type+source+message) ──────────────────
  if (!EMAIL_ALERT_TYPES.has(opts.type)) return;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  try {
    // De-dupe: skip if this same error was just emailed in the last window.
    // Best-effort — if the lookup fails, we still send (better to over-alert
    // than miss a brand-new failure).
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MIN * 60_000).toISOString();
    const { data: recent } = await supabase
      .from("error_logs")
      .select("id, emailed_at")
      .eq("type", opts.type)
      .eq("source", opts.source)
      .eq("message", opts.message)
      .gte("created_at", cutoff)
      .not("emailed_at", "is", null)
      .neq("id", insertedId ?? "00000000-0000-0000-0000-000000000000")
      .limit(1);
    if (recent && recent.length > 0) return;

    const resend = createResend();
    const html =
      opts.type === "booking_attempt"
        ? renderBookingAttemptHtml(opts)
        : renderGenericAlertHtml(opts);
    const subject =
      opts.type === "booking_attempt"
        ? `⚠️ Failed booking attempt — ${String(opts.details?.name ?? opts.details?.email ?? "unknown")}`
        : `⚠️ ${labelForType(opts.type)} — ${opts.source}`;

    await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      OWNER_EMAIL,
      subject,
      html,
    });

    // Stamp emailed_at so the dedupe check above stops further sends.
    if (insertedId) {
      try {
        await supabase
          .from("error_logs")
          .update({ emailed_at: new Date().toISOString() })
          .eq("id", insertedId);
      } catch { /* fail-quiet — column may not exist on older schemas */ }
    }
  } catch { /* never throw from logger */ }
}

// ── Email renderers ─────────────────────────────────────────────────────────

function labelForType(t: LogErrorInput["type"]): string {
  switch (t) {
    case "booking_attempt": return "Booking error";
    case "payment_failure": return "Payment failure";
    case "webhook":         return "Webhook error";
    case "cron":            return "Cron job error";
    default:                return "Site error";
  }
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Pretty-print details JSON, masking obviously-secret-shaped keys. */
function fmtDetails(d: Record<string, unknown> | undefined): string {
  if (!d) return "<em style='color:#52525b;'>(no details)</em>";
  const entries = Object.entries(d);
  if (entries.length === 0) return "<em style='color:#52525b;'>(empty)</em>";
  return entries
    .map(([k, v]) => {
      const isSecret = /key|secret|token|password/i.test(k);
      const val = isSecret ? "•••" : (typeof v === "object" ? JSON.stringify(v) : String(v));
      return `<div style="display:flex;gap:8px;align-items:baseline;margin:4px 0;">
        <span style="font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#71717a;min-width:90px;">${esc(k)}</span>
        <span style="font-size:13px;color:#e4e4e7;word-break:break-all;">${esc(val)}</span>
      </div>`;
    })
    .join("");
}

function renderGenericAlertHtml(opts: LogErrorInput): string {
  const typeLabel = labelForType(opts.type);
  const accent = opts.type === "payment_failure" ? "#ef4444" : "#f59e0b";
  const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: true });
  return `
    <div style="background:#0a0a0a;font-family:sans-serif;padding:32px;max-width:560px;margin:0 auto;border-radius:16px;border:1px solid #27272a;">
      <p style="font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:${accent};margin:0 0 8px;">${esc(typeLabel)}</p>
      <h2 style="color:#fff;font-size:20px;font-weight:900;margin:0 0 4px;">${esc(opts.message)}</h2>
      <p style="color:#71717a;font-size:12px;margin:0 0 24px;">${esc(opts.source)} · ${esc(when)} ET</p>

      <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 10px;">Details</p>
        ${fmtDetails(opts.details)}
      </div>

      <div style="background:${opts.type === "payment_failure" ? "#2a0a0a" : "#27180a"};border:1px solid ${accent};border-radius:12px;padding:12px 16px;">
        <p style="font-size:11px;color:${accent};margin:0;">
          Logged to error_logs · de-duped for ${DEDUPE_WINDOW_MIN} min.
          Review the table in Supabase for full payload &amp; history.
        </p>
      </div>

      <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:24px;">Arise And Shine Detailing · Admin Alert</p>
    </div>
  `;
}

function renderBookingAttemptHtml(opts: LogErrorInput): string {
  const d = opts.details ?? {};
  const name    = String(d.name    ?? "");
  const email   = String(d.email   ?? "Unknown email");
  const phone   = String(d.phone   ?? "");
  const service = String(d.service ?? "");
  const date    = String(d.date    ?? "");
  const time    = String(d.time    ?? "");

  const phoneHtml = phone
    ? `<p style="font-size:22px;font-weight:900;color:#f59e0b;margin:12px 0 4px;">${esc(phone)}</p>
       <a href="tel:+1${phone.replace(/\D/g,"")}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:900;font-size:13px;padding:10px 20px;border-radius:10px;text-decoration:none;margin-bottom:16px;">📞 Call Now</a>`
    : `<p style="color:#71717a;font-size:13px;margin:8px 0 16px;">No phone number captured</p>`;

  return `
    <div style="background:#0a0a0a;font-family:sans-serif;padding:32px;max-width:520px;margin:0 auto;border-radius:16px;border:1px solid #27272a;">
      <p style="font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#f59e0b;margin:0 0 8px;">Booking Error Alert</p>
      <h2 style="color:#fff;font-size:20px;font-weight:900;margin:0 0 24px;">Someone couldn't complete their booking</h2>

      <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 4px;">Customer</p>
        <p style="color:#e4e4e7;font-size:15px;font-weight:700;margin:0;">${esc(name) || "Unknown"}</p>
        <p style="color:#71717a;font-size:13px;margin:4px 0 0;">${esc(email)}</p>
      </div>

      <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 8px;">Phone</p>
        ${phoneHtml}
      </div>

      ${service || date ? `
      <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 4px;">Wanted to Book</p>
        ${service ? `<p style="color:#e4e4e7;font-size:14px;font-weight:700;margin:0;">${esc(service)}</p>` : ""}
        ${date ? `<p style="color:#71717a;font-size:13px;margin:4px 0 0;">${esc(date)}${time ? ` at ${esc(time)}` : ""}</p>` : ""}
      </div>` : ""}

      <div style="background:#27180a;border:1px solid #78350f;border-radius:12px;padding:14px 18px;">
        <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#d97706;margin:0 0 4px;">Error</p>
        <p style="color:#fcd34d;font-size:13px;margin:0;">${esc(opts.message)} <span style="color:#71717a;">(${esc(opts.source)})</span></p>
      </div>

      <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:24px;">Arise And Shine Detailing · Admin Alert</p>
    </div>
  `;
}
