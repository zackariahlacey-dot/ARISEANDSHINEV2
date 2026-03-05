"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfirmationEmailHtml } from "@/emails/ConfirmationEmail";
import { sendAdminNewUserAlert } from "@/app/actions/sendAdminNewUserAlert";

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise And Shine VT <onboarding@resend.dev>";

const CONFIRM_REDIRECT_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinevt.com";

/**
 * After signUp: generate a signup confirmation link via Supabase Admin, send custom
 * Resend confirmation email, and notify admin. Never throws — log errors so sign-up never breaks.
 * Password is required for generateLink(type: 'signup') and is not stored.
 */
export async function sendSignUpConfirmationEmails(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<void> {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "New User";

  try {
    const supabase = createAdminClient();

    // Generate signup confirmation link; Supabase will redirect to our confirm page with token_hash & type
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: email.trim(),
      password,
      options: {
        redirectTo: `${CONFIRM_REDIRECT_BASE}/auth/confirm?next=/protected`,
      },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[sendSignUpConfirmationEmails] generateLink failed:", linkError ?? "no hashed_token");
      sendAdminNewUserAlert(fullName, email).catch(() => {});
      return;
    }

    // Point Confirm button to our confirm route (user requested: ariseandshinevt.com/auth/confirm?token_hash=...&type=signup)
    const tokenHash = encodeURIComponent(linkData.properties.hashed_token);
    const confirmUrl = `${CONFIRM_REDIRECT_BASE}/auth/confirm?token_hash=${tokenHash}&type=signup&next=/protected`;

    // Send custom confirmation email via Resend
    const key = process.env.RESEND_API_KEY;
    if (key?.trim()) {
      const resend = new Resend(key);
      const html = getConfirmationEmailHtml({
        confirmUrl,
        firstName: firstName.trim() || undefined,
      });
      const { error: sendError } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: email.trim(),
        subject: "Confirm your email — Arise And Shine VT",
        html,
      });
      if (sendError) console.error("[sendSignUpConfirmationEmails] Resend error:", sendError);
    } else {
      console.warn("[sendSignUpConfirmationEmails] RESEND_API_KEY not set — skipping confirmation email.");
    }

    // Admin notification
    sendAdminNewUserAlert(fullName, email).catch((err) =>
      console.error("[sendSignUpConfirmationEmails] Admin alert failed:", err)
    );
  } catch (err) {
    console.error("[sendSignUpConfirmationEmails]", err);
    sendAdminNewUserAlert(fullName, email).catch(() => {});
  }
}
