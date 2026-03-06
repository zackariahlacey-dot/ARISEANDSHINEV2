import { Resend } from "resend";
import { getAdminBookingAlertHtml } from "@/emails/AdminBookingAlert";

// ─── Config ───────────────────────────────────────────────────────────────────

const BUSINESS_EMAIL = "contact@ariseandshinevt.com";

/** Verified "from" sender — must use verified domain (ariseandshinevt.com) in Resend; production API key in RESEND_API_KEY */
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise And Shine VT <notifications@ariseandshinevt.com>";

/** Owner inbox for new booking notifications (zackariahlacey@gmail.com). Override with ADMIN_EMAIL in .env.local. From is always notifications@ariseandshinevt.com. */
const OWNER_EMAIL = process.env.ADMIN_EMAIL ?? "zackariahlacey@gmail.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingEmailData = {
  bookingId: string;
  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  // Service
  serviceName: string;
  servicePrice: number;
  // Schedule
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // e.g. "10:00 AM"
  // Vehicle
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleSize: string; // UI slug: compact | sedan | suv | truck
  // Loyalty
  rewardPointsEarned: number;
  // Optional
  serviceAddress?: string;
  notes?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VEHICLE_SIZE_LABELS: Record<string, string> = {
  compact: "Compact / Hatchback",
  sedan: "Sedan / Coupe",
  suv: "SUV / Crossover",
  truck: "Truck / Van",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const esc = (s: string | number) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ─── Shared styles ────────────────────────────────────────────────────────────

const base = `
  margin:0;padding:0;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  background-color:#f0f0f0;
  -webkit-text-size-adjust:100%;
`;

const LOGO_URL = "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

const logo = `
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px auto;">
    <tr>
      <td align="center">
        <img src="${LOGO_URL}" alt="Arise And Shine VT" width="150" height="150" style="display:block;margin:0 auto;width:150px;height:auto;max-width:150px;" />
      </td>
    </tr>
  </table>
  <p style="color:#ffffff;font-size:17px;font-weight:700;margin:0;letter-spacing:-0.3px;">Arise And Shine VT</p>
  <p style="color:#666666;font-size:12px;margin:5px 0 0;letter-spacing:0.2px;">Premium Mobile Auto Detailing</p>
`;

const footer = `
  <tr>
    <td style="padding:24px 16px;text-align:center;">
      <p style="font-size:12px;color:#999999;margin:0;">
        Arise And Shine VT &middot; Mobile Auto Detailing &middot; Serving all of Vermont
      </p>
      <p style="font-size:11px;color:#bbbbbb;margin:6px 0 0;">
        &copy; 2026 Arise And Shine VT. All rights reserved.
        &nbsp;&bull;&nbsp;
        <a href="mailto:${BUSINESS_EMAIL}" style="color:#999999;text-decoration:none;">${BUSINESS_EMAIL}</a>
      </p>
    </td>
  </tr>
`;

function detailRow(label: string, value: string, last = false): string {
  const border = last ? "" : "border-bottom:1px solid #eeeeee;";
  return `
    <tr>
      <td style="padding:14px 24px;${border}">
        <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0 0 3px;
                  letter-spacing:0.12em;text-transform:uppercase;">${label}</p>
        <p style="font-size:14px;font-weight:600;color:#111111;margin:0;">${value}</p>
      </td>
    </tr>
  `;
}

// ─── Customer Confirmation Email ──────────────────────────────────────────────

function customerEmailHtml(
  data: BookingEmailData,
  formattedDate: string,
  shortRef: string
): string {
  const firstName = esc(data.customerName.trim().split(/\s+/)[0] ?? "there");
  const steps = [
    `We'll send you a reminder the day before your appointment.`,
    `Our detailer will arrive at your location on <strong>${formattedDate}</strong>.`,
    `Sit back and relax while we restore your vehicle to showroom condition!`,
  ];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Arise And Shine VT Booking is Confirmed</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!--  ── HEADER ── -->
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;
                        padding:32px 40px;text-align:center;">
              ${logo}
            </td>
          </tr>

          <!--  ── CONFIRMATION HERO ── -->
          <tr>
            <td style="background-color:#111111;padding:36px 40px;text-align:center;
                        border-bottom:1px solid #1e1e1e;">
              <table cellpadding="0" cellspacing="0" border="0" align="center"
                     style="margin:0 auto 20px auto;">
                <tr>
                  <td width="64" height="64"
                      style="background-color:#16a34a;border-radius:50%;
                             text-align:center;vertical-align:middle;
                             font-size:30px;color:#ffffff;font-weight:900;
                             line-height:64px;">
                    &#10003;
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px;
                          letter-spacing:-0.5px;line-height:1.1;">
                Booking Confirmed!
              </h1>
              <p style="color:#999999;font-size:14px;margin:0;line-height:1.5;">
                See you on <strong style="color:#ffffff;">${esc(formattedDate)}</strong>
                at <strong style="color:#ffffff;">${esc(data.bookingTime)}</strong>.
              </p>
            </td>
          </tr>

          <!--  ── BODY ── -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">

              <!-- Greeting -->
              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">
                Hi ${firstName},
              </p>
              <p style="font-size:14px;color:#666666;margin:0 0 32px;line-height:1.7;">
                Thanks for choosing Arise And Shine VT! Your booking is locked in
                and we can't wait to take care of your vehicle. Here's a full summary
                of your appointment.
              </p>

              <!-- Booking details card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:14px;
                            overflow:hidden;margin-bottom:24px;">
                ${detailRow("Service", esc(data.serviceName))}
                ${detailRow("Date", esc(formattedDate))}
                ${detailRow("Time", esc(data.bookingTime))}
                ${data.serviceAddress ? detailRow("Service Location", `&#128205;&nbsp;${esc(data.serviceAddress)}`) : ""}
                ${detailRow(
                  "Vehicle",
                  `${esc(data.vehicleYear)} ${esc(data.vehicleMake)} ${esc(data.vehicleModel)}
                   <span style="font-size:12px;color:#999999;font-weight:400;">
                     &nbsp;&mdash;&nbsp;${esc(VEHICLE_SIZE_LABELS[data.vehicleSize] ?? data.vehicleSize)}
                   </span>`
                )}
                ${data.notes ? detailRow("Your Notes", esc(data.notes)) : ""}
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0;
                                    letter-spacing:0.12em;text-transform:uppercase;">
                            Total Due
                          </p>
                        </td>
                        <td align="right">
                          <p style="font-size:24px;font-weight:900;color:#111111;margin:0;">
                            $${esc(data.servicePrice)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Reward points banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#fffbeb;border:1px solid #fde68a;
                            border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;font-size:26px;">
                          &#127873;
                        </td>
                        <td>
                          <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 3px;">
                            You earned ${esc(data.rewardPointsEarned)} reward points!
                          </p>
                          <p style="font-size:12px;color:#b45309;margin:0;line-height:1.5;">
                            Points are added to your account and can be redeemed
                            for discounts on future services.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's next -->
              <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0 0 14px;
                         letter-spacing:0.12em;text-transform:uppercase;">
                What Happens Next
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:32px;">
                ${steps
                  .map(
                    (step, i) => `
                <tr>
                  <td style="vertical-align:top;padding-bottom:14px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="28" height="28"
                            style="background-color:#111111;border-radius:50%;
                                   text-align:center;vertical-align:middle;
                                   font-size:11px;font-weight:700;color:#ffffff;
                                   line-height:28px;min-width:28px;">
                          ${i + 1}
                        </td>
                        <td style="padding-left:14px;font-size:14px;color:#555555;
                                   vertical-align:middle;line-height:1.5;">
                          ${step}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>

              <!-- Help CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="font-size:14px;color:#555555;margin:0 0 14px;line-height:1.5;">
                      Need to reschedule or have questions about your booking?
                    </p>
                    <a href="mailto:${BUSINESS_EMAIL}"
                       style="display:inline-block;background-color:#111111;color:#ffffff;
                              font-size:13px;font-weight:700;padding:11px 28px;
                              border-radius:8px;text-decoration:none;letter-spacing:0.2px;">
                      Contact Us
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Ref number -->
              <p style="text-align:center;font-size:11px;color:#cccccc;margin:0;font-family:monospace;">
                Booking Ref: #${shortRef}
              </p>

            </td>
          </tr>

          ${footer}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Admin Notification Email ─────────────────────────────────────────────────

function adminEmailHtml(
  data: BookingEmailData,
  formattedDate: string,
  shortRef: string
): string {
  const adminRows: [string, string][] = [
    ["Name", `${esc(data.customerName)}`],
    ["Phone", esc(data.customerPhone)],
    ["Email", esc(data.customerEmail) || "Not provided"],
  ];

  const bookingRows: [string, string][] = [
    ["Service", esc(data.serviceName)],
    ["Date", esc(formattedDate)],
    ["Time", esc(data.bookingTime)],
    ...(data.serviceAddress
      ? ([["Location", `&#128205;&nbsp;${esc(data.serviceAddress)}`]] as [string, string][])
      : []),
    ["Total", `$${esc(data.servicePrice)}`],
    ["Ref", `#${shortRef}`],
  ];

  const vehicleRows: [string, string][] = [
    [
      "Vehicle",
      `${esc(data.vehicleYear)} ${esc(data.vehicleMake)} ${esc(data.vehicleModel)}`,
    ],
    ["Size", esc(VEHICLE_SIZE_LABELS[data.vehicleSize] ?? data.vehicleSize)],
    ...(data.notes ? [["Notes", esc(data.notes)] as [string, string]] : []),
  ];

  const infoTable = (rows: [string, string][]) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#f7f7f7;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      ${rows
        .map(
          ([label, value], i) => `
      <tr>
        <td style="padding:13px 20px;${i < rows.length - 1 ? "border-bottom:1px solid #eeeeee;" : ""}">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:11px;font-weight:700;color:#aaaaaa;
                          letter-spacing:0.1em;text-transform:uppercase;width:110px;
                          vertical-align:top;padding-top:1px;">
                ${label}
              </td>
              <td style="font-size:14px;font-weight:600;color:#111111;">
                ${value}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        )
        .join("")}
    </table>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Booking — Arise And Shine VT</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!--  ── HEADER ── -->
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;
                        padding:28px 40px;text-align:center;">
              ${logo}
            </td>
          </tr>

          <!--  ── ALERT BANNER ── -->
          <tr>
            <td style="background-color:#111111;padding:28px 40px;text-align:center;
                        border-bottom:1px solid #1e1e1e;">
              <table cellpadding="0" cellspacing="0" border="0" align="center"
                     style="margin:0 auto 16px auto;">
                <tr>
                  <td width="56" height="56"
                      style="background-color:#d97706;border-radius:50%;
                             text-align:center;vertical-align:middle;
                             font-size:24px;line-height:56px;">
                    &#128663;
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 6px;
                          letter-spacing:-0.4px;">
                New Booking Request
              </h1>
              <p style="color:#999999;font-size:13px;margin:0;">
                ${esc(data.serviceName)} &mdash; ${esc(formattedDate)} at ${esc(data.bookingTime)}
              </p>
            </td>
          </tr>

          <!--  ── BODY ── -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;">

              <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0 0 10px;
                         letter-spacing:0.12em;text-transform:uppercase;">
                Customer
              </p>
              ${infoTable(adminRows)}

              <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0 0 10px;
                         letter-spacing:0.12em;text-transform:uppercase;">
                Booking Details
              </p>
              ${infoTable(bookingRows)}

              <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0 0 10px;
                         letter-spacing:0.12em;text-transform:uppercase;">
                Vehicle
              </p>
              ${infoTable(vehicleRows)}

              <!-- Quick-action CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#fffbeb;border:1px solid #fde68a;
                            border-radius:12px;margin-top:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="font-size:13px;color:#92400e;font-weight:700;margin:0 0 4px;">
                      &#9888;&#65039; Action Required
                    </p>
                    <p style="font-size:13px;color:#b45309;margin:0;line-height:1.5;">
                      This booking is currently <strong>pending</strong>.
                      Confirm it in your dashboard, or contact the customer to confirm directly.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${footer}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Cancellation emails ─────────────────────────────────────────────────────

export type CancellationEmailData = {
  customerName: string;
  customerEmail: string;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string;
  serviceName: string;
};

function customerCancellationHtml(data: CancellationEmailData, formattedDate: string): string {
  const firstName = (data.customerName.trim().split(/\s+/)[0] ?? "there").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Cancelled — Arise And Shine VT</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="background-color:#111111;padding:36px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">Booking Cancelled</h1>
              <p style="color:#999999;font-size:14px;margin:0;">Your appointment for ${esc(formattedDate)} at ${esc(data.bookingTime)} has been cancelled.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;">
                This is to confirm that your <strong>${esc(data.serviceName)}</strong> appointment scheduled for
                <strong>${esc(formattedDate)}</strong> at <strong>${esc(data.bookingTime)}</strong> has been cancelled.
              </p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;">
                If you did not request this cancellation or have any questions, please contact us and we'll be happy to help.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;border-radius:12px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <a href="mailto:${BUSINESS_EMAIL}" style="display:inline-block;background-color:#111111;color:#ffffff;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Contact Arise And Shine VT</a>
                  </td>
                </tr>
              </table>
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function adminCancellationHtml(customerName: string, formattedDate: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Cancelled — Arise And Shine VT Admin</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">${logo}</td>
          </tr>
          <tr>
            <td style="background-color:#27272a;padding:28px 40px;border-radius:0 0 16px 16px;">
              <p style="color:#e4e4e7;font-size:16px;margin:0;line-height:1.6;">
                Booking for <strong style="color:#fafafa;">${esc(customerName)}</strong> on <strong style="color:#fafafa;">${esc(formattedDate)}</strong> has been successfully cancelled and the slot is now open.
              </p>
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends customer cancellation email and admin notification.
 * From: notifications@ariseandshinevt.com. Failures are logged but do not throw.
 */
export async function sendBookingCancellationEmails(data: CancellationEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping cancellation emails.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const formattedDate = formatDate(data.bookingDate);

  const [customerResult, adminResult] = await Promise.allSettled([
    data.customerEmail
      ? resend.emails.send({
          from: FROM_ADDRESS,
          to: data.customerEmail,
          subject: `Your Arise And Shine VT Booking Has Been Cancelled — ${formattedDate}`,
          html: customerCancellationHtml(data, formattedDate),
        })
      : Promise.resolve(null),
    resend.emails.send({
      from: FROM_ADDRESS,
      to: OWNER_EMAIL,
      subject: `Booking Cancelled — ${data.customerName} on ${formattedDate}`,
      html: adminCancellationHtml(data.customerName, formattedDate),
    }),
  ]);

  if (customerResult.status === "rejected") {
    console.error("[email] customer cancellation send failed:", customerResult.reason);
  }
  if (adminResult.status === "rejected") {
    console.error("[email] admin cancellation send failed:", adminResult.reason);
  }
}

// ─── Updated booking (reschedule) email ────────────────────────────────────────

export type UpdatedBookingEmailData = {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  newDate: string; // YYYY-MM-DD
  newTime: string; // e.g. "10:00 AM"
};

function updatedBookingHtml(data: UpdatedBookingEmailData, formattedDate: string): string {
  const firstName = (data.customerName.trim().split(/\s+/)[0] ?? "there").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Updated — Arise And Shine VT</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="background-color:#111111;padding:36px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">Booking Updated</h1>
              <p style="color:#999999;font-size:14px;margin:0;">Your appointment is now scheduled for ${esc(formattedDate)} at ${esc(data.newTime)}.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;">
                Your <strong>${esc(data.serviceName)}</strong> appointment has been rescheduled to
                <strong>${esc(formattedDate)}</strong> at <strong>${esc(data.newTime)}</strong>.
              </p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;">
                If you have any questions, reply to this email or contact us.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;border-radius:12px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <a href="mailto:${BUSINESS_EMAIL}" style="display:inline-block;background-color:#111111;color:#ffffff;font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;">Contact Arise And Shine VT</a>
                  </td>
                </tr>
              </table>
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends "Updated Booking" email to customer after reschedule.
 * From: notifications@ariseandshinevt.com
 */
export async function sendUpdatedBookingEmail(data: UpdatedBookingEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping updated booking email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const formattedDate = formatDate(data.newDate);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.customerEmail,
    subject: `Arise And Shine VT — Your booking has been updated: ${formattedDate} at ${data.newTime}`,
    html: updatedBookingHtml(data, formattedDate),
  });
  if (result.error) {
    console.error("[email] updated booking send failed:", result.error);
  }
}

// ─── Permanent deletion audit (admin only) ─────────────────────────────────────

export type DeletionAuditData = {
  customerName: string;
  bookingId: string;
  bookingDate: string;
};

function adminDeletionAuditHtml(data: DeletionAuditData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Permanently Deleted — Arise And Shine VT</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">${logo}</td>
          </tr>
          <tr>
            <td style="background-color:#27272a;padding:28px 40px;border-radius:0 0 16px 16px;">
              <p style="color:#e4e4e7;font-size:14px;margin:0 0 12px;line-height:1.6;">
                <strong style="color:#fafafa;">Arise And Shine VT</strong> — Security &amp; audit notification
              </p>
              <p style="color:#e4e4e7;font-size:16px;margin:0;line-height:1.6;">
                The booking record for <strong style="color:#fafafa;">${esc(data.customerName)}</strong> (Ref: #${esc(data.bookingId.slice(0, 8))}, ${esc(data.bookingDate)}) has been permanently removed from the database. This action was taken from the admin dashboard. The record has been wiped for security and audit purposes.
              </p>
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends admin audit email after a booking is permanently deleted.
 * To: zackariahlacey@gmail.com. From: Arise And Shine VT notifications.
 */
export async function sendBookingDeletionAuditEmail(data: DeletionAuditData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping deletion audit email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: OWNER_EMAIL,
    subject: `Arise And Shine VT — Booking permanently deleted: ${data.customerName}`,
    html: adminDeletionAuditHtml(data),
  });
  if (result.error) {
    console.error("[email] deletion audit send failed:", result.error);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends the customer confirmation email and admin alert in parallel.
 * Pass { skipCustomerEmail: true } when using the premium sendBookingEmail action for the customer.
 * Failures are logged but never throw — a failed email must not roll back a booking.
 */
export async function sendBookingEmails(
  data: BookingEmailData,
  options?: { skipCustomerEmail?: boolean }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping emails.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const formattedDate = formatDate(data.bookingDate);
  const shortRef = data.bookingId.slice(0, 8).toUpperCase();
  const skipCustomer = options?.skipCustomerEmail === true;

  const sends = await Promise.allSettled([
    // Customer confirmation (skipped when premium template is sent via sendBookingEmail)
    !skipCustomer && data.customerEmail
      ? resend.emails.send({
          from: FROM_ADDRESS,
          to: data.customerEmail,
          subject: `Your Arise And Shine VT Booking is Confirmed — ${formattedDate}`,
          html: customerEmailHtml(data, formattedDate, shortRef),
        })
      : Promise.resolve(null),

    // Owner notification: customer name, phone, car details, scheduled date
    resend.emails.send({
      from: FROM_ADDRESS,
      to: OWNER_EMAIL,
      subject: `New Booking Received: ${data.customerName} - ${data.serviceName}`,
      html: getAdminBookingAlertHtml({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        vehicleYear: data.vehicleYear,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        serviceName: data.serviceName,
        bookingDate: formattedDate,
        bookingTime: data.bookingTime,
        totalPrice: data.servicePrice,
      }),
    }),
  ]);

  for (const [label, result] of [
    ["customer", sends[0]],
    ["admin", sends[1]],
  ] as const) {
    if (result.status === "rejected") {
      console.error(`[email] ${label} send failed:`, result.reason);
    } else if (result.value && "error" in result.value && result.value.error) {
      console.error(`[email] ${label} resend error:`, result.value.error);
    }
  }
}
