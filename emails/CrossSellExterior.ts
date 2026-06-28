/**
 * Cross-sell email — invites a recent detailing customer to book a
 * service on our sister exterior site with a 15% off coupon. Fired
 * by /api/cron/cross-sell-to-exterior 14 days after a completed
 * detailing job. Mirrors the dark-luxury look used across the brand.
 *
 * The button URL embeds the coupon code as ?coupon=CODE — the
 * exterior site's existing capture component (mirror of our
 * CrossSellCouponCapture) reads it on landing, persists to
 * localStorage, and applies on checkout.
 */

const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";
const EXTERIOR_SITE = "https://ariseandshineexteriors.com";

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function getCrossSellExteriorHtml(opts: {
  firstName: string;
  couponCode: string;
  discountPct: number;
  expiresAtIso: string;
}): string {
  const firstName   = opts.firstName?.trim().split(/\s+/)[0] || "there";
  const code        = esc(opts.couponCode);
  const pct         = Math.max(0, Math.min(100, Math.round(opts.discountPct)));
  const url         = `${EXTERIOR_SITE}?coupon=${encodeURIComponent(opts.couponCode)}`;
  const expiresStr  = (() => {
    try {
      const d = new Date(opts.expiresAtIso);
      return d.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York",
      });
    } catch { return ""; }
  })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>Your car shines — let&rsquo;s make your home match</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#0f0f10;border-radius:14px;overflow:hidden;border:1px solid #1f1f22;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 24px;text-align:center;border-bottom:1px solid #1f1f22;">
              <img src="${LOGO_URL}" alt="" width="36" height="36" style="display:block;margin:0 auto 10px;border:0;" />
              <p style="color:#D4AF37;font-size:13px;font-weight:900;margin:0;letter-spacing:0.18em;text-transform:uppercase;">Arise And Shine</p>
              <p style="color:#71717a;font-size:10px;margin:4px 0 0;letter-spacing:0.16em;text-transform:uppercase;">Detailing &middot; Exteriors</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <p style="color:#a1a1aa;font-size:13px;margin:0 0 6px;">Hi ${esc(firstName)} 👋</p>
              <h1 style="color:#ffffff;font-size:26px;font-weight:900;line-height:1.25;margin:0 0 14px;letter-spacing:-0.01em;">
                Your car shines —<br/>let&rsquo;s make your home match.
              </h1>
              <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 14px;">
                Hope your detail&rsquo;s still looking sharp. Now that your car&rsquo;s
                dialed in, let&rsquo;s give the house the same treatment. Same owner,
                same care, same Vermont crew &mdash; just our exterior cleaning side.
              </p>
            </td>
          </tr>

          <!-- Coupon box -->
          <tr>
            <td style="padding:0 32px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a1d;border:1px dashed #D4AF37;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;text-align:center;">
                    <p style="color:#71717a;font-size:10px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 6px;">Your 15% Off Code</p>
                    <p style="color:#D4AF37;font-size:24px;font-weight:900;font-family:'SF Mono','Menlo','Courier New',monospace;letter-spacing:0.12em;margin:0;">${code}</p>
                    ${pct > 0 ? `<p style="color:#a1a1aa;font-size:11px;margin:6px 0 0;">${pct}% off your first exterior wash</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:18px 32px 24px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#F59E0B 0%,#EA580C 100%);border-radius:10px;">
                    <a href="${url}"
                       style="display:inline-block;padding:15px 30px;color:#0a0a0a;font-size:14px;font-weight:900;text-decoration:none;letter-spacing:0.10em;text-transform:uppercase;">
                      Save ${pct || 15}% On Exterior Cleaning &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ${expiresStr ? `<p style="color:#52525b;font-size:11px;margin:14px 0 0;">Code expires ${esc(expiresStr)}.</p>` : ""}
            </td>
          </tr>

          <!-- What we clean -->
          <tr>
            <td style="padding:12px 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141416;border:1px solid #1f1f22;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="color:#71717a;font-size:10px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;margin:0 0 10px;">Pick What You Want</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:4px 0;color:#e4e4e7;font-size:13px;line-height:1.7;">
                          &middot; Soft wash siding &mdash; safe for paint &amp; stucco<br/>
                          &middot; Roof &mdash; algae &amp; black streaks gone<br/>
                          &middot; Driveway &amp; walkways &mdash; oil + grime lifted<br/>
                          &middot; Gutters &mdash; cleared inside &amp; out<br/>
                          &middot; Windows &mdash; streak-free inside &amp; out
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px 28px;text-align:center;border-top:1px solid #1f1f22;">
              <p style="color:#52525b;font-size:11px;margin:0;">
                Questions? Call <a href="tel:8025855563" style="color:#D4AF37;text-decoration:none;">802-585-5563</a> or just reply to this email.
              </p>
              <p style="color:#3f3f46;font-size:10px;margin:6px 0 0;">
                You&rsquo;re getting this because you&rsquo;re a recent detailing customer. One-time offer per customer.
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
