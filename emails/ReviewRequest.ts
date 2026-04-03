/**
 * 24-Hour Review Request Email
 * Dark luxury aesthetic matching the Arise & Shine VT brand.
 */

export const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";
const REVIEW_LINK = "https://g.page/r/Cd76zEF6l465EAI/review";

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type MaintenancePlan = {
  planName: string;
  price: string;
  slug: "interior" | "full";
};

function getMaintenancePlan(serviceName?: string): MaintenancePlan | null {
  if (!serviceName) return null;
  const name = serviceName.toLowerCase();
  // Only upsell for straight interior or full detail — not boat/RV/paint/ultimate
  if (name.includes("interior detail") && !name.includes("boat") && !name.includes("rv")) {
    return { planName: "Interior Maintenance Plan", price: "$75/mo", slug: "interior" };
  }
  if (name.includes("full detail") && !name.includes("boat") && !name.includes("rv")) {
    return { planName: "Full Detail Maintenance Plan", price: "$125/mo", slug: "full" };
  }
  return null;
}

export function getReviewRequestHtml(
  customerName: string,
  serviceName?: string
): string {
  const firstName = customerName.trim().split(/\s+/)[0] || "there";
  const service = serviceName ? esc(serviceName) : "your detail";
  const plan = getMaintenancePlan(serviceName);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>How's the shine holding up? — Arise &amp; Shine VT</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#09090b;min-width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:560px;width:100%;background-color:#0f0f11;border-radius:16px;overflow:hidden;border:1px solid #1f1f23;">

          <!-- Gold top bar -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <div style="height:3px;background:linear-gradient(90deg,transparent 0%,#d4af37 30%,#f3e5ab 50%,#d4af37 70%,transparent 100%);"></div>
            </td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:40px 32px 8px;">
              <img
                src="${LOGO_URL}"
                alt="Arise &amp; Shine VT"
                width="72"
                height="72"
                style="display:block;margin:0 auto;width:72px;height:72px;border-radius:50%;border:2px solid #1f1f23;"
              />
            </td>
          </tr>

          <!-- Brand name -->
          <tr>
            <td align="center" style="padding:0 32px 28px;">
              <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#52525b;">
                ARISE &amp; SHINE &nbsp;&middot;&nbsp; VERMONT
              </p>
            </td>
          </tr>

          <!-- Divider line -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#1f1f23;"></div>
            </td>
          </tr>

          <!-- Stars -->
          <tr>
            <td align="center" style="padding:32px 32px 8px;">
              <p style="margin:0;font-size:28px;letter-spacing:4px;line-height:1;">
                <span style="color:#d4af37;">&#9733;</span><span style="color:#d4af37;">&#9733;</span><span style="color:#d4af37;">&#9733;</span><span style="color:#d4af37;">&#9733;</span><span style="color:#d4af37;">&#9733;</span>
              </p>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding:4px 40px 0;">
              <h1 style="margin:0;font-size:26px;font-weight:900;color:#fafafa;letter-spacing:-0.4px;line-height:1.25;text-align:center;">
                How&rsquo;s the shine<br/>
                <span style="color:#d4af37;">holding up?</span>
              </h1>
            </td>
          </tr>

          <!-- Personalized body copy -->
          <tr>
            <td align="center" style="padding:20px 48px 0;">
              <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.7;text-align:center;">
                Hi <strong style="color:#fafafa;">${esc(firstName)}</strong> — it&rsquo;s been 24 hours since your
                <strong style="color:#fafafa;">${service}</strong> with us.
                We hope your vehicle is turning heads!
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:14px 48px 0;">
              <p style="margin:0;font-size:15px;color:#71717a;line-height:1.7;text-align:center;">
                Reviews are the lifeblood of a small local business.
                If we delivered a result you&rsquo;re proud of,
                a quick Google review means <em style="color:#a1a1aa;">everything</em> to us.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:32px 40px 8px;">
              <table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
                <tr>
                  <td align="center"
                    style="background-color:#d4af37;border-radius:10px;box-shadow:0 4px 20px rgba(212,175,55,0.35);">
                    <a
                      href="${REVIEW_LINK}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:900;color:#000000;text-decoration:none;text-transform:uppercase;letter-spacing:0.14em;line-height:1;white-space:nowrap;">
                      &#9733;&nbsp; Leave a Google Review
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sub-copy below button -->
          <tr>
            <td align="center" style="padding:16px 48px 36px;">
              <p style="margin:0;font-size:12px;color:#3f3f46;line-height:1.6;text-align:center;">
                It takes less than 30 seconds &mdash; and it helps us keep doing what we love.
              </p>
            </td>
          </tr>

          ${plan ? `
          <!-- Maintenance Club upsell (Interior or Full Detail customers only) -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
                style="background-color:#0a0a0c;border-radius:12px;border:1px solid #1f1f23;overflow:hidden;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;">
                    <div style="height:2px;background:linear-gradient(90deg,transparent 0%,#d4af37 40%,#f3e5ab 50%,#d4af37 60%,transparent 100%);opacity:0.6;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 24px 8px;">
                    <p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#d4af37;">
                      Member Exclusive
                    </p>
                    <p style="margin:0;font-size:17px;font-weight:900;color:#fafafa;line-height:1.3;letter-spacing:-0.2px;">
                      Keep that shine going — every month.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 24px 0;">
                    <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.7;">
                      Since you booked a <strong style="color:#fafafa;">${esc(serviceName ?? "")}</strong>, you qualify for our
                      <strong style="color:#fafafa;">${esc(plan.planName)}</strong> — the same service,
                      on a recurring schedule so your vehicle stays in showroom condition year-round.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="font-size:12px;color:#71717a;vertical-align:top;line-height:1.9;">
                          &#10003;&nbsp;<span style="color:#a1a1aa;">Only <strong style="color:#fafafa;">${esc(plan.price)}</strong> — billed monthly</span><br/>
                          &#10003;&nbsp;<span style="color:#a1a1aa;">Deep-clean included on first visit</span><br/>
                          &#10003;&nbsp;<span style="color:#a1a1aa;">We come to you, no scheduling stress</span><br/>
                          &#10003;&nbsp;<span style="color:#a1a1aa;">Cancel any time</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px 24px;">
                    <table border="0" cellspacing="0" cellpadding="0" role="presentation">
                      <tr>
                        <td style="background-color:#18181b;border-radius:8px;border:1px solid rgba(212,175,55,0.35);">
                          <a
                            href="https://www.ariseandshinevt.com/maintenance-club"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:700;color:#d4af37;text-decoration:none;letter-spacing:0.06em;line-height:1;">
                            Join The Maintenance Club &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer after upsell -->
          <tr><td style="height:32px;"></td></tr>
          ` : ""}

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#1f1f23;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 40px 36px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#71717a;letter-spacing:0.05em;">
                Arise &amp; Shine VT
              </p>
              <p style="margin:0 0 14px;font-size:11px;color:#3f3f46;letter-spacing:0.1em;text-transform:uppercase;">
                Premium Mobile Detailing &middot; Chittenden County, VT
              </p>
              <table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
                <tr>
                  <td style="padding:0 10px;">
                    <a href="tel:8025855563" style="font-size:11px;color:#52525b;text-decoration:none;">
                      802-585-5563
                    </a>
                  </td>
                  <td style="color:#3f3f46;font-size:11px;">&middot;</td>
                  <td style="padding:0 10px;">
                    <a href="https://www.ariseandshinevt.com" style="font-size:11px;color:#52525b;text-decoration:none;">
                      ariseandshinevt.com
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:10px;color:#27272a;line-height:1.6;">
                You received this because you recently booked a detail with us.<br/>
                Reply to this email if you have any questions or concerns.
              </p>
            </td>
          </tr>

          <!-- Gold bottom bar -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <div style="height:2px;background:linear-gradient(90deg,transparent 0%,#d4af37 50%,transparent 100%);opacity:0.4;"></div>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
`.trim();
}
