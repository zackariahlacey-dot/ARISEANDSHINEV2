/**
 * Custom sign-up confirmation email (Resend). Midnight & Champagne theme.
 * Confirm button points to the supplied confirmation URL (e.g. from Supabase generateLink).
 */

import { getEmailLayoutHtml } from "./Layout";

export type ConfirmationEmailOptions = {
  /** Full URL for the Confirm button (e.g. Supabase verify link or /auth/confirm?token_hash=...&type=signup) */
  confirmUrl: string;
  /** Optional: user's first name for copy */
  firstName?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getConfirmationEmailHtml(options: ConfirmationEmailOptions): string {
  const { confirmUrl, firstName } = options;
  const greeting = firstName ? `Hi ${esc(firstName)},` : "Hi,";

  const bodyHtml = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 20px;">Thanks for signing up for Arise And Shine VT. Click the button below to confirm your email and get started.</p>
  `;

  return getEmailLayoutHtml({
    title: "Confirm your email — Arise And Shine VT",
    headline: "Confirm your email",
    bodyHtml,
    primaryButton: {
      label: "Confirm",
      url: confirmUrl,
    },
  });
}
