/**
 * Admin notification when a new user signs up.
 * Midnight & Champagne theme: "New User Joined Arise And Shine VT" with Name and Email.
 */

import { getEmailLayoutHtml } from "./Layout";

export type AdminNewUserAlertOptions = {
  name: string;
  email: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getAdminNewUserAlertHtml(options: AdminNewUserAlertOptions): string {
  const { name, email } = options;

  const bodyHtml = `
    <p style="margin:0 0 16px;">A new user has signed up.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#27272a;border-radius:10px;padding:20px;">
      <tr>
        <td style="color:#e4e4e7;font-size:14px;">
          <p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Name</strong><br/><span style="color:#fafafa;">${esc(name)}</span></p>
          <p style="margin:0;"><strong style="color:#a1a1aa;">Email</strong><br/><span style="color:#d4af37;font-weight:600;">${esc(email)}</span></p>
        </td>
      </tr>
    </table>
  `;

  return getEmailLayoutHtml({
    title: "New User — Arise And Shine VT",
    headline: "New User Joined Arise And Shine VT",
    bodyHtml,
  });
}
