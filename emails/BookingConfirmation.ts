/**
 * Premium 'Midnight & Champagne' booking confirmation email template.
 * Inline HTML for maximum email client compatibility.
 */

export const LOGO_URL = "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

export type BookingConfirmationDetails = {
  customerName: string;
  serviceName: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  bookingDate: string;
  bookingTime: string;
  travelFee: number; // rounded to nearest dollar
  totalPrice: number;
};

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getBookingConfirmationHtml(details: BookingConfirmationDetails): string {
  const formattedDate = formatDate(details.bookingDate);
  const vehicleLabel = `${details.vehicleYear} ${details.vehicleMake} ${details.vehicleModel}`;
  const travelFeeDisplay =
    details.travelFee > 0 ? `$${details.travelFee.toFixed(2)}` : "—";
  const firstName = details.customerName.trim().split(/\s+/)[0] || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Detail is Confirmed — Arise And Shine VT</title>
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
          <!-- Header -->
          <tr>
            <td style="padding:8px 32px 16px;text-align:center;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#d4af37;letter-spacing:-0.3px;">Your Detail is Confirmed</h1>
              <p style="margin:10px 0 0;font-size:15px;color:#fafafa;">Hi ${esc(firstName)}, here are your booking details.</p>
            </td>
          </tr>
          <!-- Summary table -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#27272a;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#71717a;letter-spacing:0.1em;text-transform:uppercase;">Service</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#fafafa;">${esc(details.serviceName)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#71717a;letter-spacing:0.1em;text-transform:uppercase;">Vehicle</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#fafafa;">${esc(vehicleLabel)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#71717a;letter-spacing:0.1em;text-transform:uppercase;">Date &amp; Time</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#fafafa;">${esc(formattedDate)} at ${esc(details.bookingTime)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #3f3f46;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#71717a;letter-spacing:0.1em;text-transform:uppercase;">Travel Fee</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#fafafa;">${travelFeeDisplay}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#71717a;letter-spacing:0.1em;text-transform:uppercase;">Total</p>
                    <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:#d4af37;">$${esc(details.totalPrice.toFixed(2))}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;text-align:center;border-top:1px solid #3f3f46;">
              <p style="margin:0;font-size:13px;color:#a1a1aa;">Questions? Call <a href="tel:8025855563" style="color:#d4af37;text-decoration:none;font-weight:600;">802-585-5563</a></p>
              <p style="margin:8px 0 0;font-size:12px;color:#71717a;">Serving all of Vermont</p>
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
