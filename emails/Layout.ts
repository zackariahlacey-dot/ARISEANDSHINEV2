/**
 * Reusable Arise & Shine email layout for marketing and notification emails.
 * Theme: #09090b background, #18181b card, #d4af37 gold border.
 */

export const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

const PHONE = "802-585-5563";
const PHONE_LINK = "tel:8025855563";

export type EmailLayoutOptions = {
  /** Page title (e.g. for <title>) */
  title?: string;
  /** Main headline inside the card */
  headline: string;
  /** HTML string for the body section */
  bodyHtml: string;
  /** Optional primary CTA button */
  primaryButton?: {
    label: string;
    url: string;
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Returns full HTML for an email using the Arise & Shine layout.
 */
export function getEmailLayoutHtml(options: EmailLayoutOptions): string {
  const { title = "Arise And Shine VT", headline, bodyHtml, primaryButton } = options;
  const safeHeadline = esc(headline);

  const buttonHtml = primaryButton
    ? `
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0;">
      <tr>
        <td>
          <a href="${esc(primaryButton.url)}" style="display:inline-block;background-color:#d4af37;color:#09090b;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">${esc(primaryButton.label)}</a>
        </td>
      </tr>
    </table>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid #d4af37;border-radius:12px;overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding:28px 32px 16px;text-align:center;">
              <img src="${LOGO_URL}" alt="Arise And Shine VT" width="150" height="150" style="display:block;margin:0 auto;width:150px;height:auto;max-width:150px;" />
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding:8px 32px 16px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#d4af37;letter-spacing:-0.3px;">${safeHeadline}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 24px;color:#e4e4e7;font-size:15px;line-height:1.6;">
              ${bodyHtml}
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;text-align:center;border-top:1px solid #3f3f46;">
              <p style="margin:0;font-size:13px;color:#a1a1aa;">Proudly serving all of Vermont</p>
              <p style="margin:10px 0 0;font-size:13px;">
                <a href="${PHONE_LINK}" style="color:#d4af37;text-decoration:none;font-weight:600;">${PHONE}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
