import { LOGO_URL } from "./ReviewRequest";

const esc = (s: string | number) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function getMonthlyPlanInviteHtml(firstName: string, inviteLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>You're invited to the Monthly Detail Club</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#09090b;min-width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:560px;width:100%;background-color:#0f0f11;border-radius:16px;overflow:hidden;border:1px solid #1f1f23;">

          <!-- Gold top bar -->
          <tr><td style="padding:0;line-height:0;font-size:0;">
            <div style="height:3px;background:linear-gradient(90deg,transparent 0%,#d4af37 30%,#f3e5ab 50%,#d4af37 70%,transparent 100%);"></div>
          </td></tr>

          <!-- Logo -->
          <tr><td align="center" style="padding:40px 32px 8px;">
            <img src="${LOGO_URL}" alt="Arise &amp; Shine VT" width="72" height="72"
              style="display:block;margin:0 auto;width:72px;height:72px;border-radius:50%;border:2px solid #1f1f23;" />
          </td></tr>

          <!-- Brand name -->
          <tr><td align="center" style="padding:0 32px 28px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#52525b;">
              ARISE &amp; SHINE &nbsp;&middot;&nbsp; VERMONT
            </p>
          </td></tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>

          <!-- Crown icon -->
          <tr><td align="center" style="padding:36px 32px 8px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#d4af37 0%,#aa771c 100%);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(212,175,55,0.35);">
              <span style="font-size:28px;line-height:1;">&#9813;</span>
            </div>
          </td></tr>

          <!-- Headline -->
          <tr><td align="center" style="padding:16px 40px 0;">
            <p style="margin:0;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#d4af37;">Member Exclusive</p>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#fafafa;letter-spacing:-0.4px;line-height:1.2;text-align:center;">
              Hi ${esc(firstName)}, you&rsquo;re invited<br/>
              <span style="color:#d4af37;">to the Monthly Detail Club</span>
            </h1>
          </td></tr>

          <!-- Body -->
          <tr><td align="center" style="padding:20px 48px 0;">
            <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.7;text-align:center;">
              Because you&rsquo;ve already experienced a fresh detail, you know how good it feels.
              The Monthly Detail Club keeps that feeling all year round &mdash; we come to you, on a schedule that works for you, for a flat monthly rate.
            </p>
          </td></tr>

          <!-- Plans preview -->
          <tr><td style="padding:28px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
              style="background-color:#0a0a0c;border-radius:12px;border:1px solid #1f1f23;overflow:hidden;">
              <tr><td style="padding:0;line-height:0;font-size:0;">
                <div style="height:2px;background:linear-gradient(90deg,transparent,#d4af37 50%,transparent);opacity:0.6;"></div>
              </td></tr>
              <tr><td style="padding:20px 20px 4px;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#d4af37;">Choose your plan</p>
              </td></tr>
              ${[
                ["Interior Refresh",  "$75/mo",  "Vacuum, wipe-down, interior glass"],
                ["Full Maintenance",  "$120/mo", "Exterior wash + Interior Refresh"],
              ].map(([name, price, desc]) => `
              <tr><td style="padding:12px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                  <tr>
                    <td style="vertical-align:top;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#fafafa;">${name}</p>
                      <p style="margin:2px 0 0;font-size:12px;color:#71717a;">${desc}</p>
                    </td>
                    <td style="text-align:right;vertical-align:top;white-space:nowrap;">
                      <p style="margin:0;font-size:15px;font-weight:900;color:#d4af37;">${price}</p>
                      <p style="margin:2px 0 0;font-size:10px;color:#52525b;">or $${parseInt(price.replace(/\D/g,"")) - 10} cash</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
              `).join("")}
              <tr><td style="padding:4px 20px 20px;">
                <p style="margin:0;font-size:11px;color:#52525b;">Cancel anytime &middot; $10 off if you pay cash on arrival</p>
              </td></tr>
            </table>
          </td></tr>

          <!-- CTA -->
          <tr><td align="center" style="padding:32px 40px 8px;">
            <table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
              <tr>
                <td align="center"
                  style="background-color:#d4af37;border-radius:10px;box-shadow:0 4px 20px rgba(212,175,55,0.35);">
                  <a href="${esc(inviteLink)}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:900;color:#000;text-decoration:none;text-transform:uppercase;letter-spacing:0.14em;line-height:1;white-space:nowrap;">
                    Choose My Plan &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td></tr>

          <tr><td align="center" style="padding:12px 48px 32px;">
            <p style="margin:0;font-size:11px;color:#3f3f46;line-height:1.6;text-align:center;">
              This invite link is valid for 7 days. Questions? Reply to this email or call 802-585-5563.
            </p>
          </td></tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>

          <!-- Footer -->
          <tr><td align="center" style="padding:24px 40px 32px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#71717a;">Arise &amp; Shine VT</p>
            <p style="margin:0 0 12px;font-size:11px;color:#3f3f46;letter-spacing:0.1em;text-transform:uppercase;">Premium Mobile Detailing &middot; Vermont</p>
            <table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
              <tr>
                <td style="padding:0 8px;"><a href="tel:8025855563" style="font-size:11px;color:#52525b;text-decoration:none;">802-585-5563</a></td>
                <td style="color:#3f3f46;font-size:11px;">&middot;</td>
                <td style="padding:0 8px;"><a href="https://www.ariseandshinevt.com" style="font-size:11px;color:#52525b;text-decoration:none;">ariseandshinevt.com</a></td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:0;line-height:0;font-size:0;">
            <div style="height:2px;background:linear-gradient(90deg,transparent,#d4af37 50%,transparent);opacity:0.4;"></div>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
