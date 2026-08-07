import { LOGO_URL } from "./ReviewRequest";

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function getMonthlyAppointmentConfirmationHtml(params: {
  firstName: string;
  planName: string;
  date: string;        // e.g. "Wednesday, May 15, 2026"
  time: string;        // e.g. "2:00 PM"
  serviceAddress: string;
  paymentMethod: "cash" | "stripe";
  reschedulePath: string; // e.g. "/protected" or a schedule URL
}): string {
  const { firstName, planName, date, time, serviceAddress, paymentMethod, reschedulePath } = params;
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinedetailing.com").replace(/\/$/, "");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>Appointment confirmed — Arise And Shine Detailing</title>
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
          <tr><td align="center" style="padding:36px 32px 8px;">
            <img src="${LOGO_URL}" alt="Arise And Shine Detailing" width="64" height="64"
              style="display:block;margin:0 auto;width:64px;height:64px;border-radius:50%;border:2px solid #1f1f23;" />
          </td></tr>

          <!-- Brand name -->
          <tr><td align="center" style="padding:0 32px 24px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#52525b;">
              ARISE AND SHINE DETAILING
            </p>
          </td></tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>

          <!-- Checkmark icon -->
          <tr><td align="center" style="padding:32px 32px 8px;">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,#d4af37,#aa771c);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;line-height:56px;text-align:center;">
              ✓
            </div>
          </td></tr>

          <!-- Headline -->
          <tr><td align="center" style="padding:8px 40px 0;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#fafafa;letter-spacing:-0.3px;line-height:1.25;text-align:center;">
              You&rsquo;re confirmed,<br/>
              <span style="color:#d4af37;">${esc(firstName)}!</span>
            </h1>
          </td></tr>

          <tr><td align="center" style="padding:10px 48px 0;">
            <p style="margin:0;font-size:14px;color:#71717a;line-height:1.7;text-align:center;">
              Here&rsquo;s your <strong style="color:#a1a1aa;">${esc(planName)}</strong> appointment summary.
            </p>
          </td></tr>

          <!-- Appointment details card -->
          <tr><td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
              style="background-color:#0a0a0c;border-radius:12px;border:1px solid #1f1f23;overflow:hidden;">
              <tr><td style="padding:0;line-height:0;font-size:0;">
                <div style="height:2px;background:linear-gradient(90deg,transparent,#d4af37 50%,transparent);opacity:0.5;"></div>
              </td></tr>
              <tr><td style="padding:20px 24px;">
                <!-- Date -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-bottom:12px;">
                      <p style="margin:0 0 2px;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#52525b;">Date</p>
                      <p style="margin:0;font-size:16px;font-weight:900;color:#fafafa;">${esc(date)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;border-top:1px solid #1f1f23;padding-top:12px;">
                      <p style="margin:0 0 2px;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#52525b;">Time</p>
                      <p style="margin:0;font-size:16px;font-weight:900;color:#d4af37;">${esc(time)}</p>
                    </td>
                  </tr>
                  ${serviceAddress ? `
                  <tr>
                    <td style="border-top:1px solid #1f1f23;padding-top:12px;">
                      <p style="margin:0 0 2px;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#52525b;">Location</p>
                      <p style="margin:0;font-size:13px;color:#a1a1aa;">${esc(serviceAddress)}</p>
                    </td>
                  </tr>` : ""}
                </table>
              </td></tr>
            </table>
          </td></tr>

          <!-- Payment reminder (cash only) -->
          ${paymentMethod === "cash" ? `
          <tr><td style="padding:16px 40px 0;">
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;text-align:center;">
              💵 <strong style="color:#a1a1aa;">Cash plan</strong> &mdash; please have payment ready at arrival.
            </p>
          </td></tr>` : `
          <tr><td style="padding:16px 40px 0;">
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;text-align:center;">
              💳 Your card will be billed automatically. No action needed.
            </p>
          </td></tr>`}

          <!-- Reschedule CTA -->
          <tr><td align="center" style="padding:24px 40px 0;">
            <table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
              <tr>
                <td align="center" style="border:1px solid #2a2a2e;border-radius:8px;">
                  <a href="${SITE}${reschedulePath}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;padding:12px 28px;font-size:12px;font-weight:700;color:#71717a;text-decoration:none;text-transform:uppercase;letter-spacing:0.12em;line-height:1;">
                    Need to reschedule? →
                  </a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Spacer -->
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1f1f23;"></div></td></tr>

          <!-- Footer -->
          <tr><td align="center" style="padding:24px 40px 32px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#71717a;">Arise And Shine Detailing</p>
            <p style="margin:0 0 14px;font-size:11px;color:#3f3f46;letter-spacing:0.1em;text-transform:uppercase;">
              Premium Mobile Detailing &middot; Chittenden County, VT
            </p>
            <table border="0" cellspacing="0" cellpadding="0" align="center" role="presentation">
              <tr>
                <td style="padding:0 10px;">
                  <a href="#" style="font-size:11px;color:#52525b;text-decoration:none;"></a>
                </td>
                <td style="color:#3f3f46;font-size:11px;">&middot;</td>
                <td style="padding:0 10px;">
                  <a href="${SITE}" style="font-size:11px;color:#52525b;text-decoration:none;">ariseandshinedetailing.com</a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Gold bottom bar -->
          <tr><td style="padding:0;line-height:0;font-size:0;">
            <div style="height:2px;background:linear-gradient(90deg,transparent 0%,#d4af37 50%,transparent 100%);opacity:0.4;"></div>
          </td></tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`.trim();
}
