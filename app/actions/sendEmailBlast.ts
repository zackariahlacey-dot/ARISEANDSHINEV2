"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

/** Must match verified sender domain (ariseandshinevt.com) in Resend dashboard */
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const REPLY_TO = "contact@ariseandshinevt.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zackariahlacey04@gmail.com";

/** Converts plain-text body to simple safe HTML (preserves newlines, escapes entities). */
function bodyToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function buildBlastHtml(subject: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 12px auto;">
                <tr>
                  <td width="40" height="40" style="background:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;font-size:11px;font-weight:900;color:#000000;">A&amp;S</td>
                </tr>
              </table>
              <p style="color:#ffffff;font-size:16px;font-weight:700;margin:0;">Arise And Shine VT</p>
              <p style="color:#666666;font-size:12px;margin:4px 0 0;">Premium Mobile Auto Detailing</p>
            </td>
          </tr>

          <!-- Subject banner -->
          <tr>
            <td style="background-color:#111111;padding:24px 40px;border-bottom:1px solid #1e1e1e;">
              <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.3px;line-height:1.2;">${subject}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 40px 40px;border-radius:0 0 16px 16px;">
              <p style="font-size:15px;color:#333333;line-height:1.75;margin:0 0 28px;">${bodyToHtml(body)}</p>

              <!-- Gold CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="https://ariseandshinevt.com"
                       style="display:inline-block;background-color:#D4AF37;color:#0a0a0a;
                              font-size:13px;font-weight:800;padding:12px 32px;
                              border-radius:9px;text-decoration:none;letter-spacing:0.3px;">
                      Book Your Detail
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px;text-align:center;">
              <p style="font-size:12px;color:#999999;margin:0;">
                Arise And Shine VT &middot; Mobile Auto Detailing &middot; Vermont
              </p>
              <p style="font-size:11px;color:#bbbbbb;margin:6px 0 0;">
                &copy; 2026 Arise And Shine VT &bull;
                <a href="mailto:contact@ariseandshinevt.com" style="color:#999999;text-decoration:none;">contact@ariseandshinevt.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface BlastPayload {
  subject: string;
  body: string;
  testOnly: boolean;
}

export interface BlastResult {
  success: boolean;
  sent?: number;
  skipped?: number;
  error?: string;
}

export async function sendEmailBlast(payload: BlastPayload): Promise<BlastResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY is not configured." };
  }
  if (!payload.subject.trim()) {
    return { success: false, error: "Subject line is required." };
  }
  if (!payload.body.trim()) {
    return { success: false, error: "Email body is required." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = buildBlastHtml(payload.subject.trim(), payload.body.trim());

  // ── Test mode: send only to admin ─────────────────────────────────────────
  if (payload.testOnly) {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      replyTo: REPLY_TO,
      subject: `[TEST] ${payload.subject.trim()}`,
      html,
    });

    if (error) {
      console.error("[sendEmailBlast test]", error);
      return { success: false, error: (error as { message?: string }).message ?? "Send failed." };
    }

    return { success: true, sent: 1, skipped: 0 };
  }

  // ── Full blast: fetch all profiles with an email ───────────────────────────
  const supabase = createAdminClient();
  const { data: profiles, error: dbErr } = await supabase
    .from("profiles")
    .select("email")
    .not("email", "is", null)
    .neq("email", "");

  if (dbErr) {
    console.error("[sendEmailBlast] profile fetch:", dbErr);
    return { success: false, error: "Could not fetch customer list." };
  }

  const emails = (profiles ?? [])
    .map((p) => p.email as string)
    .filter(Boolean);

  if (emails.length === 0) {
    return { success: false, error: "No customers with email addresses found." };
  }

  // Resend batch: max 100 per request — chunk if needed
  const CHUNK = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK);
    const messages = chunk.map((to) => ({
      from: FROM_ADDRESS,
      to,
      replyTo: REPLY_TO,
      subject: payload.subject.trim(),
      html,
    }));

    try {
      const result = await resend.batch.send(messages);
      const errCount =
        result.error ? chunk.length : 0;
      sent += chunk.length - errCount;
      failed += errCount;
      if (result.error) {
        console.error("[sendEmailBlast] batch error:", result.error);
      }
    } catch (err) {
      console.error("[sendEmailBlast] batch throw:", err);
      failed += chunk.length;
    }
  }

  if (sent === 0) {
    return { success: false, error: `All ${failed} emails failed to send.` };
  }

  return { success: true, sent, skipped: failed };
}
