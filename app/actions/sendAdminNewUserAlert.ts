"use server";

import { Resend } from "resend";
import { getAdminNewUserAlertHtml } from "@/emails/AdminNewUserAlert";

/** Must match verified sender domain (ariseandshinevt.com) in Resend dashboard */
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zackariahlacey04@gmail.com";

/**
 * Sends an admin notification when a new user signs up.
 * Does not throw — logs errors so sign-up flow is never broken.
 */
export async function sendAdminNewUserAlert(name: string, email: string): Promise<void> {
  if (!name?.trim() || !email?.trim()) return;

  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    console.warn("[sendAdminNewUserAlert] RESEND_API_KEY is not set — skipping.");
    return;
  }

  try {
    const resend = new Resend(key);
    const html = getAdminNewUserAlertHtml({ name: name.trim(), email: email.trim() });
    const subject = `✨ New Lead: ${name.trim()} just signed up!`;

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    if (error) {
      console.error("[sendAdminNewUserAlert] Resend error:", error);
    }
  } catch (err) {
    console.error("[sendAdminNewUserAlert] Failed to send admin new user email:", err);
  }
}
