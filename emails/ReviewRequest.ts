/**
 * Premium 'Midnight & Champagne' review request email template.
 * Matches the website's dark, luxury aesthetic.
 */

export const LOGO_URL = "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";
const REVIEW_LINK = "https://g.page/r/Cd76zEF6l465EAI/review";

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function getReviewRequestHtml(customerName: string): string {
  const firstName = customerName.trim().split(/\s+/)[0] || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>How's the shine holding up? ✨ — Arise And Shine VT</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid #d4af37;border-radius:12px;overflow:hidden;">
          
          <!-- Logo -->
          <tr>
            <td style="padding:40px 32px 20px;text-align:center;">
              <img src="${LOGO_URL}" alt="Arise And Shine VT" width="120" height="120" style="display:block;margin:0 auto;width:120px;height:auto;" />
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:0 40px 20px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#d4af37;letter-spacing:-0.5px;line-height:1.2;">How's the shine holding up? ✨</h1>
              <p style="margin:16px 0 0;font-size:16px;color:#fafafa;line-height:1.6;">Hi ${esc(firstName)},</p>
              <p style="margin:12px 0 0;font-size:16px;color:#a1a1aa;line-height:1.6;">
                It's been 24 hours since your detail with <strong>Arise And Shine VT</strong>. We hope you're still loving how your vehicle looks!
              </p>
            </td>
          </tr>

          <!-- Review CTA -->
          <tr>
            <td style="padding:20px 40px 40px;text-align:center;">
              <p style="margin:0 0 24px;font-size:15px;color:#fafafa;line-height:1.6;">
                If you have a moment, would you mind sharing your experience? Reviews help my small business grow more than anything else.
              </p>
              
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background-color:#d4af37;border-radius:8px;">
                    <a href="${REVIEW_LINK}" target="_blank" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:900;color:#000000;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;">
                      Leave a Google Review
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
                It only takes 30 seconds, but it means the world to me.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#27272a;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#fafafa;font-weight:700;">Arise And Shine VT</p>
              <p style="margin:6px 0 0;font-size:12px;color:#71717a;letter-spacing:0.05em;text-transform:uppercase;">Premium Mobile Detailing &middot; Vermont</p>
              <p style="margin:20px 0 0;font-size:12px;color:#52525b;">
                You received this because you recently booked a detail.
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
