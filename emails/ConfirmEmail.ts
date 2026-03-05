/**
 * Premium user confirmation email. Midnight (#09090b) + Gold (#d4af37).
 * Logo, WELCOME TO THE SHINE heading, body copy, CONFIRM ACCOUNT button.
 */

const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

export type ConfirmEmailOptions = {
  /** Full confirmation URL (with Supabase token) for the button */
  confirmation_url: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getConfirmEmailHtml(options: ConfirmEmailOptions): string {
  const { confirmation_url } = options;
  const url = esc(confirmation_url);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Confirm your account — Arise And Shine VT</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid #d4af37;border-radius:12px;overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="Arise And Shine VT" width="150" height="150" style="display:block;margin:0 auto;width:150px;height:auto;max-width:150px;" />
            </td>
          </tr>
          <!-- Heading: WELCOME TO THE SHINE -->
          <tr>
            <td style="padding:0 32px 20px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#d4af37;letter-spacing:0.2em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Welcome to the Shine
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 28px;text-align:center;color:#e4e4e7;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;">
                Your journey toward a showroom-quality finish begins here. Please confirm your account to unlock your loyalty rewards and start booking.
              </p>
              <!-- Button: CONFIRM ACCOUNT -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 0;">
                <tr>
                  <td>
                    <a href="${url}" style="display:inline-block;background-color:#d4af37;color:#09090b;font-size:13px;font-weight:700;padding:16px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.15em;text-transform:uppercase;">Confirm Account</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;text-align:center;border-top:1px solid #3f3f46;">
              <p style="margin:0;font-size:13px;color:#a1a1aa;">Proudly serving all of Vermont</p>
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
