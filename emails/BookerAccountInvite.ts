import { getEmailLayoutHtml } from "@/emails/Layout";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getBookerAccountInviteHtml(params: {
  customerName: string;
  signUpUrl: string;
}): string {
  const first = params.customerName.trim().split(/\s+/)[0] || "there";
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${esc(first)},</p>
    <p style="margin:0 0 16px;">
      Your appointment is booked. Create a free account with the <strong>same email you used to book</strong>
      to see your appointments, rewards points, and referral perks in one place.
    </p>
    <p style="margin:0 0 16px;color:#a1a1aa;font-size:13px;">
      If you already have an account, sign in with that email instead — your booking is already tied to it.
    </p>
  `;
  return getEmailLayoutHtml({
    title: "Create your account — Arise And Shine VT",
    headline: "Link your booking to your account",
    bodyHtml,
    primaryButton: {
      label: "Create account",
      url: params.signUpUrl,
    },
  });
}
