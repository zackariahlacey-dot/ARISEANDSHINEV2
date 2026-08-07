"use server";

import { createResend } from "@/lib/mailer";
import { createAdminClient } from "@/lib/supabase/admin";

/** Must match verified sender domain (ariseandshinedetailing.com) in Resend dashboard */
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise And Shine Detailing <notifications@ariseandshinedetailing.com>";
const REPLY_TO = "contact@ariseandshinedetailing.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com";

/** Recipient with email + profile data for personalization */
export type BlastRecipient = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  reward_points: number | null;
};

/** Replace personalization tags in text. Case-insensitive for tag names. */
function replacePersonalizationTags(
  text: string,
  recipient: BlastRecipient
): string {
  const firstname = recipient.first_name?.trim() || "Customer";
  const lastname = recipient.last_name?.trim() ?? "";
  const points = recipient.reward_points != null ? String(recipient.reward_points) : "0";
  return text
    .replace(/\{firstname\}/gi, firstname)
    .replace(/\{lastname\}/gi, lastname)
    .replace(/\{points\}/gi, points);
}

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
              <p style="color:#ffffff;font-size:16px;font-weight:700;margin:0;">Arise And Shine Detailing</p>
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
                    <a href="https://ariseandshinedetailing.com"
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
                Arise And Shine Detailing &middot; Mobile Auto Detailing &middot; Vermont
              </p>
              <p style="font-size:11px;color:#bbbbbb;margin:6px 0 0;">
                &copy; 2026 Arise And Shine Detailing &bull;
                <a href="mailto:contact@ariseandshinedetailing.com" style="color:#999999;text-decoration:none;">contact@ariseandshinedetailing.com</a>
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

  const resend = createResend();

  // ── Test mode: send only to admin (with sample personalization) ───────────
  if (payload.testOnly) {
    const sampleRecipient: BlastRecipient = {
      email: ADMIN_EMAIL,
      first_name: "Valued",
      last_name: "Customer",
      reward_points: 250,
    };
    const testSubject = replacePersonalizationTags(payload.subject.trim(), sampleRecipient);
    const testBody = replacePersonalizationTags(payload.body.trim(), sampleRecipient);
    const testHtml = buildBlastHtml(testSubject, testBody);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      replyTo: REPLY_TO,
      subject: `[TEST] ${testSubject}`,
      html: testHtml,
    });

    if (error) {
      console.error("[sendEmailBlast test]", error);
      return { success: false, error: (error as { message?: string }).message ?? "Send failed." };
    }

    return { success: true, sent: 1, skipped: 0 };
  }

  // ── Full blast: fetch auth users (emails) + profiles, merge, personalize ───
  const supabaseAdmin = createAdminClient();

  // 1. List all auth users (paginated)
  const authUsers: { id: string; email?: string }[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (authErr) {
      console.error("[sendEmailBlast] auth listUsers:", authErr);
      return { success: false, error: "Could not fetch user list." };
    }
    const users = authData?.users ?? [];
    authUsers.push(...users.map((u) => ({ id: u.id, email: u.email ?? undefined })));
    if (users.length < perPage) break;
    page++;
  }

  // 2. Fetch all profiles
  const { data: profiles, error: dbErr } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, reward_points");

  if (dbErr) {
    console.error("[sendEmailBlast] profile fetch:", dbErr);
    return { success: false, error: "Could not fetch customer list." };
  }

  const profileMap = new Map<string, { first_name: string | null; last_name: string | null; reward_points: number | null }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      reward_points: p.reward_points ?? null,
    });
  }

  // 3. Merge: recipients with email + profile data
  const recipients: BlastRecipient[] = authUsers
    .filter((u) => u.email && u.email.trim().length > 0)
    .map((u) => {
      const profile = profileMap.get(u.id);
      return {
        email: u.email!,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        reward_points: profile?.reward_points ?? null,
      };
    });

  if (recipients.length === 0) {
    return { success: false, error: "No customers with email addresses found." };
  }

  // 4. Build personalized emails and send in batches (Resend batch limit)
  const CHUNK = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    const messages = chunk.map((recipient) => {
      const personalizedSubject = replacePersonalizationTags(payload.subject.trim(), recipient);
      const personalizedBody = replacePersonalizationTags(payload.body.trim(), recipient);
      const personalizedHtml = buildBlastHtml(personalizedSubject, personalizedBody);
      return {
        from: FROM_ADDRESS,
        to: recipient.email,
        replyTo: REPLY_TO,
        subject: personalizedSubject,
        html: personalizedHtml,
      };
    });

    try {
      const result = await resend.batch.send(messages);
      const errCount = result.error ? chunk.length : 0;
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
