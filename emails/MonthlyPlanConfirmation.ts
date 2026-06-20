import { LOGO_URL } from "./ReviewRequest";

const esc = (s: string | number) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function getMonthlyPlanConfirmationHtml(
  firstName: string,
  planName: string,
  planPrice: number,
  paymentMethod: "stripe" | "cash",
  vehicleMake: string,
  vehicleModel: string,
): string {
  const paymentNote = paymentMethod === "cash"
    ? "You&rsquo;ll pay cash on arrival each visit &mdash; no card needed."
    : "Your card will be charged automatically each month.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>You&rsquo;re in — ${esc(planName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#09090b;min-width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:560px;width:100%;background-color:#0f0f11;border-radius:16px;overflow:hidden;border:1px solid #1f1f23;">

          <tr><td style="padding:0;line-height:0;font-size:0;">
            <div style="height:3px;background:linear-gradient(90deg,transparent 0%,#d4af37 30%,#f3e5ab 50%,#d4af37 70%,transparent 100%);"></div>
          </td></tr>

          <tr><td align="center" style="padding:40px 32px 8px;">
            <img src="${LOGO_URL}" alt="Arise And Shine Detailing" width="72" height="72"
              style="display:block;margin:0 auto;width:72px;height:72px;border-radius:50%;border:2px solid #1f1f23;" />
          </td></tr>

          <tr><td align="center" style="padding:0 32px 28px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#52525b;">
              ARISE AND SHINE DETAILING
            </p>
          </td></tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>

          <!-- Check icon -->
          <tr><td align="center" style="padding:36px 32px 8px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#d4af37 0%,#aa771c 100%);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(212,175,55,0.35);">
              <span style="font-size:30px;line-height:1;">&#10003;</span>
            </div>
          </td></tr>

          <!-- Headline -->
          <tr><td align="center" style="padding:16px 40px 0;">
            <p style="margin:0;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#d4af37;">Subscription Confirmed</p>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#fafafa;letter-spacing:-0.4px;line-height:1.2;text-align:center;">
              You&rsquo;re in, <span style="color:#d4af37;">${esc(firstName)}!</span>
            </h1>
          </td></tr>

          <!-- Body -->
          <tr><td align="center" style="padding:16px 48px 0;">
            <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.7;text-align:center;">
              Welcome to the Monthly Detail Club. Here&rsquo;s a summary of your plan.
            </p>
          </td></tr>

          <!-- Plan summary card -->
          <tr><td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
              style="background-color:#0a0a0c;border-radius:12px;border:1px solid #d4af37/20;overflow:hidden;">
              <tr><td style="padding:0;line-height:0;font-size:0;">
                <div style="height:2px;background:linear-gradient(90deg,transparent,#d4af37 50%,transparent);opacity:0.6;"></div>
              </td></tr>
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                  <tr>
                    <td><p style="margin:0;font-size:13px;color:#71717a;">Plan</p></td>
                    <td style="text-align:right;"><p style="margin:0;font-size:14px;font-weight:700;color:#fafafa;">${esc(planName)}</p></td>
                  </tr>
                  <tr><td colspan="2" style="padding:6px 0;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>
                  <tr>
                    <td><p style="margin:0;font-size:13px;color:#71717a;">Monthly rate</p></td>
                    <td style="text-align:right;"><p style="margin:0;font-size:18px;font-weight:900;color:#d4af37;">$${planPrice}/mo</p></td>
                  </tr>
                  <tr><td colspan="2" style="padding:6px 0;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>
                  <tr>
                    <td><p style="margin:0;font-size:13px;color:#71717a;">Vehicle</p></td>
                    <td style="text-align:right;"><p style="margin:0;font-size:14px;font-weight:600;color:#fafafa;">${esc(vehicleMake)} ${esc(vehicleModel)}</p></td>
                  </tr>
                  <tr><td colspan="2" style="padding:6px 0;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>
                  <tr>
                    <td><p style="margin:0;font-size:13px;color:#71717a;">Payment</p></td>
                    <td style="text-align:right;"><p style="margin:0;font-size:13px;color:#a1a1aa;">${esc(paymentMethod === "cash" ? "Cash on arrival" : "Card (auto-billed)")}</p></td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </td></tr>

          <!-- What's next -->
          <tr><td style="padding:24px 40px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#52525b;">What happens next</p>
            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="font-size:13px;color:#71717a;line-height:2;">
                  &#10003;&nbsp;<span style="color:#a1a1aa;">You&rsquo;ll receive a monthly email to pick your preferred date</span><br/>
                  &#10003;&nbsp;<span style="color:#a1a1aa;">${paymentNote}</span><br/>
                  &#10003;&nbsp;<span style="color:#a1a1aa;">We come to you &mdash; no drop-off needed</span><br/>
                  &#10003;&nbsp;<span style="color:#a1a1aa;">Cancel anytime by replying to any email</span>
                </td>
              </tr>
            </table>
          </td></tr>

          <tr><td align="center" style="padding:28px 48px 36px;">
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;text-align:center;">
              Questions? Reply to this email or call <a href="tel:8025855563" style="color:#d4af37;text-decoration:none;">802-585-5563</a>.
            </p>
          </td></tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>

          <tr><td align="center" style="padding:24px 40px 32px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#71717a;">Arise And Shine Detailing</p>
            <p style="margin:0;font-size:11px;color:#3f3f46;letter-spacing:0.1em;text-transform:uppercase;">Premium Mobile Detailing &middot; Vermont</p>
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
