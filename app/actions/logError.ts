"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
const OWNER_EMAIL  = process.env.ADMIN_EMAIL  ?? "zackariahlacey@gmail.com";

export async function logError(opts: {
  type: "booking_attempt" | "webhook" | "cron" | "general";
  source: string;
  message: string;
  details?: Record<string, unknown>;
}) {
  // ── 1. Write to DB (best-effort) ───────────────────────────────────────────
  try {
    const supabase = createAdminClient();
    await supabase.from("error_logs").insert({
      type:    opts.type,
      source:  opts.source,
      message: opts.message,
      details: opts.details ?? null,
    });
  } catch { /* never throw */ }

  // ── 2. Email alert for failed booking attempts ─────────────────────────────
  if (opts.type === "booking_attempt") {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return;

      const resend = new Resend(resendKey);
      const d = opts.details ?? {};
      const name    = String(d.name    ?? "");
      const email   = String(d.email   ?? "Unknown email");
      const phone   = String(d.phone   ?? "");
      const service = String(d.service ?? "");
      const date    = String(d.date    ?? "");
      const time    = String(d.time    ?? "");

      const phoneHtml = phone
        ? `<p style="font-size:22px;font-weight:900;color:#f59e0b;margin:12px 0 4px;">${phone}</p>
           <a href="tel:+1${phone.replace(/\D/g,"")}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:900;font-size:13px;padding:10px 20px;border-radius:10px;text-decoration:none;margin-bottom:16px;">📞 Call Now</a>`
        : `<p style="color:#71717a;font-size:13px;margin:8px 0 16px;">No phone number captured</p>`;

      await resend.emails.send({
        from:    FROM_ADDRESS,
        to:      OWNER_EMAIL,
        subject: `⚠️ Failed booking attempt — ${name || email}`,
        html: `
          <div style="background:#0a0a0a;font-family:sans-serif;padding:32px;max-width:520px;margin:0 auto;border-radius:16px;border:1px solid #27272a;">
            <p style="font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#f59e0b;margin:0 0 8px;">Booking Error Alert</p>
            <h2 style="color:#fff;font-size:20px;font-weight:900;margin:0 0 24px;">Someone couldn't complete their booking</h2>

            <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
              <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 4px;">Customer</p>
              <p style="color:#e4e4e7;font-size:15px;font-weight:700;margin:0;">${name || "Unknown"}</p>
              <p style="color:#71717a;font-size:13px;margin:4px 0 0;">${email}</p>
            </div>

            <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
              <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 8px;">Phone</p>
              ${phoneHtml}
            </div>

            ${service || date ? `
            <div style="background:#18181b;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
              <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#52525b;margin:0 0 4px;">Wanted to Book</p>
              ${service ? `<p style="color:#e4e4e7;font-size:14px;font-weight:700;margin:0;">${service}</p>` : ""}
              ${date ? `<p style="color:#71717a;font-size:13px;margin:4px 0 0;">${date}${time ? ` at ${time}` : ""}</p>` : ""}
            </div>` : ""}

            <div style="background:#27180a;border:1px solid #78350f;border-radius:12px;padding:14px 18px;">
              <p style="font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#d97706;margin:0 0 4px;">Error</p>
              <p style="color:#fcd34d;font-size:13px;margin:0;">${opts.message} <span style="color:#71717a;">(${opts.source})</span></p>
            </div>

            <p style="color:#3f3f46;font-size:11px;text-align:center;margin-top:24px;">Arise And Shine Detailing · Admin Alert</p>
          </div>
        `,
      });
    } catch { /* never throw from logger */ }
  }
}
