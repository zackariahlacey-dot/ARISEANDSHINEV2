import { Resend } from "resend";
import { getAdminBookingAlertHtml } from "@/emails/AdminBookingAlert";
import { getEmailLayoutHtml } from "@/emails/Layout";
import { getReviewRequestHtml } from "@/emails/ReviewRequest";
import { getTier, detailsToNextTier } from "@/lib/loyalty";

// ─── Config ───────────────────────────────────────────────────────────────────

const BUSINESS_EMAIL = "contact@ariseandshinevt.com";

/** Verified "from" sender — must use verified domain (ariseandshinevt.com) in Resend; production API key in RESEND_API_KEY */
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const REPLY_TO = "contact@ariseandshinevt.com";

/** Owner inbox for new booking notifications. Override with ADMIN_EMAIL env var. */
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
  /** Original card price — when > servicePrice, both prices are shown for
   *  pay-at-arrival bookings (cash discount applied). */
  cardPrice?: number;
  // Schedule
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // e.g. "10:00 AM"
  // Vehicle
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleSize: string; // UI slug: compact | sedan | suv | truck
  // Optional / Admin specific
  serviceAddress?: string;
  distanceMiles?: number;
  paymentMethod?: "pay_at_arrival" | "pay_now";
  notes?: string;
  additionalVehicles?: Array<{
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    serviceName: string;
    servicePrice: number;
    selectedAddons?: { id: string; label: string; price: number }[];
  }>;
  addonsJson?: { id: string; label: string; price: number }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGoogleCalendarUrl(data: BookingEmailData): string {
  const [year, month, day] = data.bookingDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  // Parse time "10:00 AM"
  const match = data.bookingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
    date.setHours(hours, minutes);
  }

  const start = date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  // Base 3 hours per vehicle, each additional vehicle adds ~1 hour
  const addlCount = (data.additionalVehicles?.length ?? 0);
  const durationMs = (3 + addlCount) * 60 * 60 * 1000;
  const end = new Date(date.getTime() + durationMs).toISOString().replace(/-|:|\.\d\d\d/g, "");
  
  const addlVehicleCount = data.additionalVehicles?.length ?? 0;
  const title = `Detailing: ${data.customerName} (${data.serviceName}${addlVehicleCount > 0 ? ` +${addlVehicleCount} more` : ""})`;
  const addlLines = (data.additionalVehicles ?? []).map((av, i) =>
    `Vehicle ${i + 2}: ${av.vehicleYear} ${av.vehicleMake} ${av.vehicleModel} — ${av.serviceName} ($${av.servicePrice})`
  ).join("\n");
  const details = `Vehicle 1: ${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}\n${addlLines ? addlLines + "\n" : ""}Phone: ${data.customerPhone}\nService: ${data.serviceName}\nTotal: $${data.servicePrice}`;
  const location = data.serviceAddress ?? "Customer Location";

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

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
  background-color:#09090b;
  -webkit-text-size-adjust:100%;
`;

const LOGO_URL = "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

const logo = `
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px auto;">
    <tr>
      <td align="center">
        <img src="${LOGO_URL}" alt="Arise And Shine VT" width="120" height="120" style="display:block;margin:0 auto;width:120px;height:auto;max-width:120px;" />
      </td>
    </tr>
  </table>
  <p style="color:#d4af37;font-size:17px;font-weight:900;margin:0;letter-spacing:0.05em;text-transform:uppercase;">Arise And Shine VT</p>
  <p style="color:#a1a1aa;font-size:11px;margin:5px 0 0;letter-spacing:0.2em;text-transform:uppercase;">Premium Mobile Auto Detailing</p>
`;

const footer = `
  <tr>
    <td style="padding:32px 16px;text-align:center;background-color:#18181b;border-top:1px solid #27272a;">
      <p style="font-size:12px;color:#fafafa;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.1em;">
        Arise And Shine VT
      </p>
      <p style="font-size:11px;color:#71717a;margin:6px 0 0;text-transform:uppercase;letter-spacing:0.05em;">
        Mobile Auto Detailing &middot; Serving all of Vermont
      </p>
      <div style="margin:20px 0;height:1px;background-color:#27272a;width:60px;display:inline-block;"></div>
      <p style="font-size:11px;color:#52525b;margin:0;">
        &copy; 2026 Arise And Shine VT. All rights reserved.
        <br/>
        <a href="mailto:${BUSINESS_EMAIL}" style="color:#d4af37;text-decoration:none;font-weight:700;">${BUSINESS_EMAIL}</a>
      </p>
    </td>
  </tr>
`;

function detailRow(label: string, value: string, last = false): string {
  const border = last ? "" : "border-bottom:1px solid #27272a;";
  return `
    <tr>
      <td style="padding:16px 24px;${border}">
        <p style="font-size:10px;font-weight:900;color:#71717a;margin:0 0 4px;
                  letter-spacing:0.15em;text-transform:uppercase;">${label}</p>
        <p style="font-size:15px;font-weight:600;color:#fafafa;margin:0;line-height:1.4;">${value}</p>
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

  const calendarUrl = getGoogleCalendarUrl(data);

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
              <p style="color:#999999;font-size:14px;margin:0 0 20px;line-height:1.5;">
                See you on <strong style="color:#ffffff;">${esc(formattedDate)}</strong>
                at <strong style="color:#ffffff;">${esc(data.bookingTime)}</strong>.
              </p>
              <a href="${calendarUrl}" style="display:inline-block;background-color:#ffffff;color:#111111;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;text-decoration:none;letter-spacing:0.2px;">
                📅 Add to Google Calendar
              </a>
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
                  "Vehicle 1",
                  `${esc(data.vehicleYear)} ${esc(data.vehicleMake)} ${esc(data.vehicleModel)}
                   <span style="font-size:12px;color:#999999;font-weight:400;">
                     &nbsp;&mdash;&nbsp;${esc(VEHICLE_SIZE_LABELS[data.vehicleSize] ?? data.vehicleSize)}
                   </span>`
                )}
                ${(data.additionalVehicles ?? []).map((av, i) => detailRow(
                  `Vehicle ${i + 2}`,
                  `${esc(av.vehicleYear)} ${esc(av.vehicleMake)} ${esc(av.vehicleModel)}
                   <span style="font-size:12px;color:#999999;font-weight:400;">
                     &nbsp;&mdash;&nbsp;${esc(av.serviceName)} &nbsp;
                     <span style="color:#16a34a;">$${esc(av.servicePrice)} (−$25 multi-vehicle)</span>
                   </span>`
                )).join("")}
${data.addonsJson?.length ? `
                <tr>
                  <td style="padding:12px 24px;border-top:1px solid #27272a;">
                    <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0 0 8px;
                              letter-spacing:0.12em;text-transform:uppercase;">Add-Ons</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${data.addonsJson.map((a: { label: string; price: number }) => `<tr>
                        <td style="font-size:13px;color:#e4e4e7;padding:2px 0;">+ ${esc(a.label)}</td>
                        <td align="right" style="font-size:13px;color:#a1a1aa;font-weight:600;padding:2px 0;">$${a.price}</td>
                      </tr>`).join("")}
                    </table>
                  </td>
                </tr>` : ""}
                ${data.notes ? detailRow("Your Notes", esc(data.notes)) : ""}
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0;
                                    letter-spacing:0.12em;text-transform:uppercase;">
                            ${data.paymentMethod === "pay_now" ? "Total Paid Online" : "Total Due at Arrival"}
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
      ? ([["Address", `&#128205;&nbsp;${esc(data.serviceAddress)}`]] as [string, string][])
      : []),
    ...(data.distanceMiles != null
      ? ([["Distance", `${data.distanceMiles.toFixed(1)} miles from base`]] as [string, string][])
      : []),
    ["Payment Type", data.paymentMethod === "pay_now" ? "Paid (Online)" : "Pay at Arrival"],
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

  const calendarUrl = getGoogleCalendarUrl(data);

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
              <p style="color:#999999;font-size:13px;margin:0 0 16px;">
                ${esc(data.serviceName)} &mdash; ${esc(formattedDate)} at ${esc(data.bookingTime)}
              </p>
              <a href="${calendarUrl}" style="display:inline-block;background-color:#ffffff;color:#111111;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;text-decoration:none;letter-spacing:0.2px;">
                📅 Add to Google Calendar
              </a>
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
                      &#9888;&#65039; Status Alert
                    </p>
                    <p style="font-size:13px;color:#b45309;margin:0;line-height:1.5;">
                      Payment status: <strong>${data.paymentMethod === "pay_now" ? "PAID" : "DUE AT ARRIVAL"}</strong>.<br/>
                      Confirm this booking in your admin dashboard.
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

// ─── On My Way Email ──────────────────────────────────────────────────────────

function onMyWayHtml(data: {
  customerName: string;
  serviceName?: string;
  bookingTime?: string;
  serviceAddress?: string;
}): string {
  const firstName = esc(data.customerName.trim().split(/\s+/)[0] ?? "there");
  const detailLines = [
    data.serviceName ? `<tr><td style="padding:10px 20px;border-bottom:1px solid #27272a;"><span style="font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.12em;">Service</span><br/><span style="font-size:14px;font-weight:600;color:#fafafa;">${esc(data.serviceName)}</span></td></tr>` : "",
    data.bookingTime ? `<tr><td style="padding:10px 20px;border-bottom:1px solid #27272a;"><span style="font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.12em;">Time</span><br/><span style="font-size:14px;font-weight:600;color:#fafafa;">${esc(data.bookingTime)}</span></td></tr>` : "",
    data.serviceAddress ? `<tr><td style="padding:10px 20px;"><span style="font-size:10px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.12em;">Location</span><br/><span style="font-size:14px;font-weight:600;color:#fafafa;">&#128205; ${esc(data.serviceAddress)}</span></td></tr>` : "",
  ].filter(Boolean).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>On My Way — Arise And Shine VT</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid #d4af37;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 16px;text-align:center;">
              <img src="${LOGO_URL}" alt="Arise And Shine VT" width="80" height="80" style="display:block;margin:0 auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">🚗</div>
              <h1 style="margin:0;font-size:26px;font-weight:900;color:#d4af37;letter-spacing:-0.3px;">On My Way!</h1>
              <p style="margin:12px 0 0;font-size:15px;color:#a1a1aa;line-height:1.6;">Hi ${firstName} — I'm headed your way. Make sure your vehicle is accessible and I'll see you shortly!</p>
            </td>
          </tr>
          ${detailLines ? `
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;border-radius:10px;overflow:hidden;border:1px solid #27272a;">
                ${detailLines}
              </table>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:0 24px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#52525b;">Questions? Reply to this email or call/text us.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOnMyWayEmailNotification(data: {
  customerName: string;
  customerEmail: string;
  serviceName?: string;
  bookingTime?: string;
  serviceAddress?: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.customerEmail,
    replyTo: REPLY_TO,
    subject: `On My Way! 🚗 — Arise And Shine VT`,
    html: onMyWayHtml(data),
  });
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
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">${logo}</td>
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
          replyTo: REPLY_TO,
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

function getRescheduleCalendarUrl(data: UpdatedBookingEmailData): string {
  const [year, month, day] = data.newDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const match = data.newTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
    date.setHours(h, m);
  }
  const start = date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const end = new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
  const title = `Detailing: ${data.serviceName} (Rescheduled)`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`;
}

function updatedBookingHtml(data: UpdatedBookingEmailData, formattedDate: string): string {
  const firstName = (data.customerName.trim().split(/\s+/)[0] ?? "there").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const calUrl = getRescheduleCalendarUrl(data);
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
              <p style="color:#999999;font-size:14px;margin:0 0 20px;">Your appointment is now scheduled for <strong style="color:#ffffff;">${esc(formattedDate)}</strong> at <strong style="color:#ffffff;">${esc(data.newTime)}</strong>.</p>
              <a href="${calUrl}" style="display:inline-block;background-color:#ffffff;color:#111111;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;text-decoration:none;letter-spacing:0.2px;">
                📅 Update Google Calendar
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;">
                Your <strong>${esc(data.serviceName)}</strong> appointment has been rescheduled to
                <strong>${esc(formattedDate)}</strong> at <strong>${esc(data.newTime)}</strong>.
              </p>

              <!-- New date/time summary card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                ${detailRow("Service", esc(data.serviceName))}
                ${detailRow("New Date", esc(formattedDate))}
                ${detailRow("New Time", esc(data.newTime), true)}
              </table>

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
    replyTo: REPLY_TO,
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

// ─── Job Completed / Receipt Email ───────────────────────────────────────────

function jobCompletedHtml(
  data: {
    customerName: string;
    serviceName: string;
    amountPaid: number;
    completedDetailCount?: number;
    loyaltyDiscountPct?: number;
  }
): string {
  const firstName = esc(data.customerName.trim().split(/\s+/)[0] ?? "there");

  let loyaltySection = "";
  if (data.completedDetailCount != null && data.completedDetailCount > 0 && data.loyaltyDiscountPct != null) {
    const tier = getTier(data.completedDetailCount);
    const nextNeeded = detailsToNextTier(data.completedDetailCount);
    const isVip = data.loyaltyDiscountPct >= 20;
    const tierLabel = tier?.label ?? "Member";

    loyaltySection = `
              <!-- Loyalty tier update -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:linear-gradient(135deg,#1a1a0e 0%,#1e1e12 100%);
                            border:1px solid #d4af3740;border-radius:14px;
                            overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px 16px;">
                    <p style="font-size:10px;font-weight:900;color:#d4af37;
                               letter-spacing:0.22em;text-transform:uppercase;margin:0 0 12px;">
                      &#9733; Loyalty Tier Update
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:16px;font-weight:900;color:#fafafa;margin:0 0 2px;">
                            ${esc(tierLabel)} — ${data.loyaltyDiscountPct}% off every detail
                          </p>
                          <p style="font-size:12px;color:#a1a1aa;margin:0;">
                            ${data.completedDetailCount} vehicle detail${data.completedDetailCount === 1 ? "" : "s"} completed
                          </p>
                        </td>
                        <td align="right" style="vertical-align:top;">
                          <p style="font-size:22px;font-weight:900;color:#d4af37;margin:0;">
                            ${data.loyaltyDiscountPct}%
                          </p>
                        </td>
                      </tr>
                    </table>
                    ${isVip
                      ? `<p style="font-size:13px;color:#d4af37;font-weight:700;margin:12px 0 0;">
                           &#127942; You've reached VIP status — 20% off every detail, forever.
                         </p>`
                      : nextNeeded != null
                      ? `<p style="font-size:12px;color:#71717a;margin:12px 0 0;">
                           ${nextNeeded} more detail${nextNeeded === 1 ? "" : "s"} to unlock the next tier.
                         </p>`
                      : ""
                    }
                  </td>
                </tr>
              </table>`;
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Service Completed — Arise And Shine VT</title>
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

          <!--  ── HERO ── -->
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
                Service Completed!
              </h1>
              <p style="color:#999999;font-size:16px;margin:0;line-height:1.5;">
                Your vehicle is ready. Enjoy that showroom shine! ✨
              </p>
            </td>
          </tr>

          <!--  ── BODY ── -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">

              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">
                Hi ${firstName},
              </p>
              <p style="font-size:14px;color:#666666;margin:0 0 32px;line-height:1.7;">
                Your <strong>${esc(data.serviceName)}</strong> is complete! We hope you love the results. 
                Thank you for choosing Arise And Shine VT for your detailing needs. 
                Below is your receipt for the service.
              </p>

              <!-- Receipt card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:14px;
                            overflow:hidden;margin-bottom:24px;">
                ${detailRow("Service Performed", esc(data.serviceName))}
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:10px;font-weight:700;color:#aaaaaa;margin:0;
                                    letter-spacing:0.12em;text-transform:uppercase;">
                            Total Paid
                          </p>
                        </td>
                        <td align="right">
                          <p style="font-size:24px;font-weight:900;color:#111111;margin:0;">
                            $${esc(data.amountPaid.toFixed(2))}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>


              ${loyaltySection}

              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;text-align:center;">
                Love your detail? We'd appreciate a quick review! It helps us more than you know.
              </p>

              <!-- Help CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="font-size:14px;color:#555555;margin:0 0 14px;line-height:1.5;">
                      Questions about your service or account?
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

/**
 * Sends a completion receipt to the customer.
 */
export async function sendJobCompletedEmail(data: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  amountPaid: number;
  completedDetailCount?: number;
  loyaltyDiscountPct?: number;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping completion email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.customerEmail,
    replyTo: REPLY_TO,
    subject: `Service Completed — Your Arise And Shine VT Receipt`,
    html: jobCompletedHtml(data),
  });
  if (result.error) {
    console.error("[email] job completed email send failed:", result.error);
  }
}

/**
 * Sends a 24-hour review follow-up email.
 */
export async function sendReviewFollowupEmail(data: {
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.customerEmail,
    replyTo: REPLY_TO,
    subject: `How's the shine holding up? ✨ — Arise And Shine VT`,
    html: getReviewRequestHtml(data.customerName),
  });
}

// ─── Appointment reminder emails (1-day, 3-day, 7-day) ──────────────────────

function reminderEmailHtml(data: {
  customerName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  serviceAddress?: string;
}, formattedDate: string, daysOut: 1 | 3 | 7): string {
  const firstName = esc(data.customerName.trim().split(/\s+/)[0] ?? "there");

  const headline =
    daysOut === 1 ? "Your Detail is Tomorrow!" :
    daysOut === 3 ? "Your Detail is in 3 Days!" :
                    "Your Detail is Coming Up!";

  const bodyLine =
    daysOut === 1
      ? `Just a friendly reminder that your <strong>${esc(data.serviceName)}</strong> appointment is scheduled for <strong>tomorrow</strong>. We're looking forward to making your vehicle shine!`
      : daysOut === 3
      ? `Your <strong>${esc(data.serviceName)}</strong> appointment is coming up in <strong>3 days</strong>. A great time to make sure you're all set!`
      : `Your <strong>${esc(data.serviceName)}</strong> appointment is <strong>one week away</strong>. We wanted to give you a heads-up so you can plan accordingly.`;

  const accessibilityNote =
    daysOut === 1
      ? "Please make sure your vehicle is accessible at the scheduled time.<br/>If you need to reschedule, contact us as soon as possible."
      : "If you need to make any changes, now's a great time to reach out.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${headline} — Arise And Shine VT</title>
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
              <div style="font-size:48px;margin-bottom:16px;">📅</div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
                ${headline}
              </h1>
              <p style="color:#999999;font-size:14px;margin:0;">
                <strong style="color:#ffffff;">${esc(formattedDate)}</strong> at
                <strong style="color:#ffffff;">${esc(data.bookingTime)}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px;line-height:1.7;">
                ${bodyLine}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:14px;overflow:hidden;margin-bottom:24px;">
                ${detailRow("Service", esc(data.serviceName))}
                ${detailRow("Date", esc(formattedDate))}
                ${detailRow("Time", esc(data.bookingTime))}
                ${data.serviceAddress ? detailRow("Location", `&#128205;&nbsp;${esc(data.serviceAddress)}`, true) : ""}
              </table>
              <p style="font-size:13px;color:#888888;margin:0 0 24px;line-height:1.6;text-align:center;">
                ${accessibilityNote}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:12px;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <a href="mailto:${BUSINESS_EMAIL}"
                       style="display:inline-block;background-color:#111111;color:#ffffff;
                              font-size:13px;font-weight:700;padding:11px 28px;
                              border-radius:8px;text-decoration:none;">
                      Contact Us
                    </a>
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

export type ReminderEmailData = {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // e.g. "10:00 AM"
  serviceAddress?: string;
};

/**
 * Sends an appointment reminder email. daysOut controls the copy and subject line.
 */
export async function sendReminderEmail(data: ReminderEmailData, daysOut: 1 | 3 | 7 = 1): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping reminder email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const formattedDate = formatDate(data.bookingDate);

  const subject =
    daysOut === 1 ? `Reminder: Your detail is tomorrow — ${formattedDate}` :
    daysOut === 3 ? `Your detail is in 3 days — ${formattedDate}` :
                    `Your detail is one week away — ${formattedDate}`;

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.customerEmail,
    replyTo: REPLY_TO,
    subject,
    html: reminderEmailHtml(data, formattedDate, daysOut),
  });
  if (result.error) {
    console.error(`[email] reminder (${daysOut}d) send failed:`, result.error);
  }
}

// ─── Gift card delivery email ─────────────────────────────────────────────────

function giftCardEmailHtml(data: {
  recipientName: string;
  purchaserEmail: string;
  code: string;
  amount: number;
  recipientEmail?: string;
}): string {
  const name = esc(data.recipientName || "there");
  const formattedCode = esc(data.code);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Arise And Shine VT Gift Card</title>
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
              <div style="font-size:52px;margin-bottom:16px;">🎁</div>
              <h1 style="color:#d4af37;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
                You've Got a Gift Card!
              </h1>
              <p style="color:#999999;font-size:14px;margin:0;line-height:1.5;">
                <strong style="color:#ffffff;">$${esc(data.amount)}</strong> toward any Arise &amp; Shine VT detailing service
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              <p style="font-size:16px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${name},</p>
              <p style="font-size:14px;color:#666666;margin:0 0 28px;line-height:1.7;">
                You've received a gift card from <strong>${esc(data.purchaserEmail)}</strong>
                — good for <strong>$${esc(data.amount)}</strong> toward any mobile auto detailing
                service with Arise &amp; Shine VT. Use it at checkout!
              </p>

              <!-- Gift card code display -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:linear-gradient(135deg,#1a1a1a 0%,#2a2520 100%);
                            border-radius:16px;margin-bottom:28px;overflow:hidden;">
                <tr>
                  <td style="padding:32px;text-align:center;">
                    <p style="font-size:11px;font-weight:900;color:#d4af37;
                               letter-spacing:0.25em;text-transform:uppercase;margin:0 0 16px;">
                      Your Gift Card Code
                    </p>
                    <p style="font-size:28px;font-weight:900;color:#ffffff;
                               letter-spacing:0.12em;margin:0 0 12px;
                               font-family:monospace,monospace;">
                      ${formattedCode}
                    </p>
                    <p style="font-size:22px;font-weight:900;color:#d4af37;margin:0;">
                      $${esc(data.amount)} Value
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#888888;margin:0 0 28px;line-height:1.6;text-align:center;">
                Enter this code at checkout when booking on ariseandshinevt.com.<br/>
                Gift cards never expire and can be partially redeemed.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f7f7f7;border-radius:12px;margin-bottom:0;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <a href="https://ariseandshinevt.com/#services"
                       style="display:inline-block;background-color:#d4af37;color:#111111;
                              font-size:14px;font-weight:900;padding:13px 32px;
                              border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                      Book Your Detail Now
                    </a>
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

export type GiftCardEmailData = {
  /** The person receiving the gift card (purchaser if no recipient set) */
  recipientName: string;
  /** Email to deliver the gift card to */
  toEmail: string;
  /** The purchaser's email (shown in the email body) */
  purchaserEmail: string;
  code: string;
  amount: number;
};

/**
 * Sends the gift card code to the recipient (or purchaser if no recipient).
 */
export async function sendGiftCardEmail(data: GiftCardEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping gift card email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.toEmail,
    replyTo: REPLY_TO,
    subject: `Your $${data.amount} Arise & Shine VT Gift Card — Code Inside`,
    html: giftCardEmailHtml({
      recipientName: data.recipientName,
      purchaserEmail: data.purchaserEmail,
      code: data.code,
      amount: data.amount,
    }),
  });
  if (result.error) {
    console.error("[email] gift card email send failed:", result.error);
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
          replyTo: REPLY_TO,
          subject: `Your Arise And Shine VT Booking is Confirmed — ${formattedDate}`,
          html: customerEmailHtml(data, formattedDate, shortRef),
        })
      : Promise.resolve(null),

    // Owner notification: full booking details
    resend.emails.send({
      from: FROM_ADDRESS,
      to: OWNER_EMAIL,
      subject: `New Booking: ${data.customerName} — ${data.serviceName} on ${formattedDate}`,
      html: getAdminBookingAlertHtml({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAddress: data.serviceAddress,
        vehicleYear: data.vehicleYear,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        vehicleSize: data.vehicleSize,
        serviceName: data.serviceName,
        bookingDate: formattedDate,
        bookingTime: data.bookingTime,
        totalPrice: data.servicePrice,
        cardPrice: data.cardPrice,
        paymentMethod: data.paymentMethod,
        distanceMiles: data.distanceMiles,
        notes: data.notes,
        addonsJson: data.addonsJson,
        additionalVehicles: data.additionalVehicles,
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

// ─── Payment Received (Customer thank-you + Owner notification) ─────────────
export type PaymentReceivedData = {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  baseAmount: number;
  tipAmount: number;
  totalPaid: number;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleSize?: string;
  bookingDate: string;
  bookingTime: string;
  serviceAddress?: string;
};

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paymentThankYouHtml(data: PaymentReceivedData, formattedDate: string, shortRef: string): string {
  const firstName = esc(data.customerName.trim().split(/\s+/)[0] ?? "there");
  const vehicleStr = [data.vehicleYear, data.vehicleMake, data.vehicleModel].filter(Boolean).join(" ");
  const tipRow = data.tipAmount > 0 ? `
    <tr>
      <td style="padding:14px 24px;border-bottom:1px solid #f0f0f0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:13px;color:#888888;">
              <span style="font-size:14px;">💛</span>&nbsp; Tip
            </td>
            <td align="right" style="font-size:14px;color:#111111;font-weight:700;">
              $${fmtMoney(data.tipAmount)}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Thank You — Payment Received</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              ${logo}
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background-color:#111111;padding:40px 40px 36px;text-align:center;border-bottom:1px solid #1e1e1e;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 18px;">
                <tr>
                  <td width="68" height="68" style="background-color:#16a34a;border-radius:50%;text-align:center;vertical-align:middle;font-size:34px;color:#ffffff;font-weight:900;line-height:68px;">
                    &#10003;
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:30px;font-weight:900;margin:0 0 10px;letter-spacing:-0.5px;line-height:1.1;">
                Thank You, ${firstName}!
              </h1>
              <p style="color:#a1a1aa;font-size:14px;margin:0;line-height:1.6;max-width:420px;">
                Your payment of <strong style="color:#d4af37;">$${fmtMoney(data.totalPaid)}</strong> has been received.
                ${data.tipAmount > 0 ? "Your tip means the world to us. 💛" : "We loved working on your vehicle."}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;">

              <p style="font-size:14px;color:#666666;margin:0 0 28px;line-height:1.7;">
                It was a pleasure taking care of your${vehicleStr ? ` <strong style="color:#111;">${esc(vehicleStr)}</strong>` : " vehicle"}.
                Your payment is confirmed below — keep this email as your receipt.
              </p>

              <!-- Receipt -->
              <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 10px;letter-spacing:0.18em;text-transform:uppercase;">
                Receipt
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #f0f0f0;border-radius:14px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:13px;color:#888888;">${esc(data.serviceName)}</td>
                        <td align="right" style="font-size:14px;color:#111111;font-weight:700;">$${fmtMoney(data.baseAmount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${tipRow}
                <tr>
                  <td style="padding:18px 24px;background-color:#fffbe6;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#a16207;letter-spacing:0.15em;text-transform:uppercase;">Total Paid</td>
                        <td align="right" style="font-size:22px;color:#111111;font-weight:900;">$${fmtMoney(data.totalPaid)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Service summary -->
              <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 10px;letter-spacing:0.18em;text-transform:uppercase;">
                Service Summary
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #f0f0f0;border-radius:14px;overflow:hidden;margin-bottom:32px;">
                ${vehicleStr ? `
                <tr>
                  <td style="padding:13px 24px;border-bottom:1px solid #f0f0f0;">
                    <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 4px;letter-spacing:0.12em;text-transform:uppercase;">Vehicle</p>
                    <p style="font-size:14px;color:#111111;margin:0;font-weight:600;">${esc(vehicleStr)}</p>
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding:13px 24px;${data.serviceAddress ? "border-bottom:1px solid #f0f0f0;" : ""}">
                    <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 4px;letter-spacing:0.12em;text-transform:uppercase;">Service Date</p>
                    <p style="font-size:14px;color:#111111;margin:0;font-weight:600;">${esc(formattedDate)}</p>
                  </td>
                </tr>
                ${data.serviceAddress ? `
                <tr>
                  <td style="padding:13px 24px;">
                    <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 4px;letter-spacing:0.12em;text-transform:uppercase;">Location</p>
                    <p style="font-size:14px;color:#111111;margin:0;font-weight:600;">📍 ${esc(data.serviceAddress)}</p>
                  </td>
                </tr>` : ""}
              </table>

              <!-- Review CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#fffbe6 0%,#fff7d4 100%);border:1px solid #fde68a;border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="font-size:18px;color:#111111;margin:0 0 6px;font-weight:900;letter-spacing:-0.3px;">Loved the detail?</p>
                    <p style="font-size:13px;color:#666666;margin:0 0 16px;line-height:1.6;">
                      A quick Google review means everything to a small business like ours.
                    </p>
                    <a href="https://g.page/r/CarmTLBaSwkmEAE/review" style="display:inline-block;background-color:#111111;color:#ffffff;font-size:13px;font-weight:900;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">
                      ★ Leave a Review
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#666666;margin:0 0 8px;line-height:1.7;text-align:center;">
                Questions about this charge? Reply to this email or call
                <a href="tel:8025855563" style="color:#111111;font-weight:700;text-decoration:none;">802-585-5563</a>.
              </p>
              <p style="text-align:center;font-size:11px;color:#cccccc;margin:18px 0 0;font-family:monospace;">
                Receipt #${shortRef}
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

function paymentOwnerHtml(data: PaymentReceivedData, formattedDate: string, shortRef: string): string {
  const vehicleStr = [data.vehicleYear, data.vehicleMake, data.vehicleModel].filter(Boolean).join(" ");
  const tipDisplay = data.tipAmount > 0
    ? `<span style="color:#16a34a;font-weight:900;">+$${fmtMoney(data.tipAmount)}</span>`
    : `<span style="color:#a1a1aa;">No tip</span>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Received — ${esc(data.customerName)}</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <tr>
            <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:24px 40px;text-align:center;">
              <p style="color:#d4af37;font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;margin:0;">Arise &amp; Shine VT</p>
            </td>
          </tr>

          <tr>
            <td style="background:linear-gradient(135deg,#064e3b 0%,#022c22 100%);padding:32px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
              <p style="font-size:46px;margin:0 0 6px;line-height:1;">💰</p>
              <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 6px;letter-spacing:-0.3px;">
                Payment Received — $${fmtMoney(data.totalPaid)}
              </h1>
              <p style="color:#86efac;font-size:13px;margin:0;font-weight:600;">
                ${esc(data.customerName)} just paid for ${esc(data.serviceName)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;padding:32px 40px;border-radius:0 0 16px 16px;">

              <!-- Money breakdown -->
              <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 10px;letter-spacing:0.18em;text-transform:uppercase;">Breakdown</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:13px;color:#666666;">Service (${esc(data.serviceName)})</td>
                        <td align="right" style="font-size:14px;color:#111111;font-weight:700;">$${fmtMoney(data.baseAmount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:13px;color:#666666;">Tip</td>
                        <td align="right" style="font-size:14px;font-weight:700;">${tipDisplay}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;background-color:#ecfdf5;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#065f46;letter-spacing:0.15em;text-transform:uppercase;">Total Paid</td>
                        <td align="right" style="font-size:20px;color:#065f46;font-weight:900;">$${fmtMoney(data.totalPaid)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Customer + booking summary -->
              <p style="font-size:10px;font-weight:900;color:#aaaaaa;margin:0 0 10px;letter-spacing:0.18em;text-transform:uppercase;">Booking</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#aaaaaa;letter-spacing:0.1em;text-transform:uppercase;width:90px;vertical-align:top;padding-top:1px;">Customer</td>
                        <td style="font-size:14px;color:#111111;font-weight:600;">${esc(data.customerName)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${data.customerPhone ? `
                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#aaaaaa;letter-spacing:0.1em;text-transform:uppercase;width:90px;vertical-align:top;padding-top:1px;">Phone</td>
                        <td style="font-size:14px;color:#111111;font-weight:600;"><a href="tel:${esc(data.customerPhone)}" style="color:#111;text-decoration:none;">${esc(data.customerPhone)}</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ""}
                ${data.customerEmail ? `
                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#aaaaaa;letter-spacing:0.1em;text-transform:uppercase;width:90px;vertical-align:top;padding-top:1px;">Email</td>
                        <td style="font-size:14px;color:#111111;font-weight:600;">${esc(data.customerEmail)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ""}
                ${vehicleStr ? `
                <tr>
                  <td style="padding:13px 20px;border-bottom:1px solid #f0f0f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#aaaaaa;letter-spacing:0.1em;text-transform:uppercase;width:90px;vertical-align:top;padding-top:1px;">Vehicle</td>
                        <td style="font-size:14px;color:#111111;font-weight:600;">${esc(vehicleStr)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding:13px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:11px;font-weight:900;color:#aaaaaa;letter-spacing:0.1em;text-transform:uppercase;width:90px;vertical-align:top;padding-top:1px;">Date</td>
                        <td style="font-size:14px;color:#111111;font-weight:600;">${esc(formattedDate)} · ${esc(data.bookingTime)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="text-align:center;font-size:11px;color:#cccccc;margin:0;font-family:monospace;">
                Booking Ref #${shortRef}
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

export async function sendPaymentReceivedEmails(data: PaymentReceivedData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping payment emails.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const formattedDate = formatDate(data.bookingDate);
  const shortRef = data.bookingId.slice(0, 8).toUpperCase();

  const sends = await Promise.allSettled([
    data.customerEmail
      ? resend.emails.send({
          from: FROM_ADDRESS,
          to: data.customerEmail,
          replyTo: REPLY_TO,
          subject: `Thank You! Payment Received — $${fmtMoney(data.totalPaid)}`,
          html: paymentThankYouHtml(data, formattedDate, shortRef),
        })
      : Promise.resolve(null),

    resend.emails.send({
      from: FROM_ADDRESS,
      to: OWNER_EMAIL,
      subject: `💰 Payment Received: ${data.customerName} — $${fmtMoney(data.totalPaid)}${data.tipAmount > 0 ? ` (+$${fmtMoney(data.tipAmount)} tip)` : ""}`,
      html: paymentOwnerHtml(data, formattedDate, shortRef),
    }),
  ]);

  for (const [label, result] of [["customer-thankyou", sends[0]], ["owner-payment", sends[1]]] as const) {
    if (result.status === "rejected") {
      console.error(`[email] ${label} send failed:`, result.reason);
    } else if (result.value && "error" in result.value && result.value.error) {
      console.error(`[email] ${label} resend error:`, result.value.error);
    }
  }
}

// ─── Price Updated Notification ───────────────────────────────────────────────
export async function sendPriceUpdatedEmail(data: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  oldPrice: number;
  newPrice: number;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const firstName = (data.customerName.trim().split(/\s+/)[0] ?? "there");
  let formattedDate = data.bookingDate;
  try {
    const d = new Date(data.bookingDate + "T12:00:00");
    formattedDate = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {}

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Price Update — Arise & Shine VT</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <span style="color:#f59e0b;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Arise &amp; Shine VT</span>
        </td></tr>
        <tr><td style="background:#111;padding:32px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 6px;">Price Updated</h1>
          <p style="color:#999;font-size:14px;margin:0;">Your booking price has been adjusted</p>
        </td></tr>
        <tr><td style="background:#fff;padding:36px 40px;border-radius:0 0 16px 16px;">
          <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 6px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.7;">
            We wanted to let you know that the price for your <strong>${data.serviceName}</strong> appointment on
            <strong>${formattedDate}</strong> has been updated.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9f9;border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="font-size:13px;color:#888;padding:6px 0;">Previous price</td>
              <td align="right" style="font-size:13px;color:#888;padding:6px 0;text-decoration:line-through;">$${data.oldPrice.toFixed(0)}</td>
            </tr>
            <tr>
              <td style="font-size:15px;font-weight:900;color:#111;padding:6px 0;">New price</td>
              <td align="right" style="font-size:18px;font-weight:900;color:#f59e0b;padding:6px 0;">$${data.newPrice.toFixed(0)}</td>
            </tr>
          </table>
          <p style="font-size:13px;color:#888;margin:0;line-height:1.6;">
            Questions? Reply to this email or call/text us anytime. We appreciate your business!
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: data.customerEmail,
    replyTo: REPLY_TO,
    subject: `Price Update — ${data.serviceName} on ${formattedDate}`,
    html,
  }).catch(e => console.error("[email] sendPriceUpdatedEmail error:", e));
}

// ─── Win-back email (30 / 60 / 90 day lapsed customers) ─────────────────────

const WINBACK_COPY: Record<30 | 60 | 90, { subject: string; headline: string; sub: string; cta: string; offer: string; planNote: string }> = {
  30: {
    subject:  "Still thinking about that next detail?",
    headline: "Your car could use some love ✨",
    sub:      "It's been about a month since your last detail with us. Ready to book again?",
    cta:      "Book Now",
    offer:    "Use code <strong>RETURN10</strong> for $10 off your next service.",
    planNote: "Want to keep your car looking great all year? Check out our <strong>Monthly Plans</strong> — interior, exterior, or full detail on a recurring schedule.",
  },
  60: {
    subject:  "Two months already? Let's get you back on the schedule",
    headline: "It's been a while — we miss you!",
    sub:      "Your car deserves to look its best. Book a detail this week and we'll make it worth your while.",
    cta:      "Schedule My Detail",
    offer:    "Use code <strong>RETURN15</strong> for $15 off any detail service.",
    planNote: "Tired of remembering to book? Our <strong>Monthly Plans</strong> keep your car on a regular detailing schedule — starting at $65/month.",
  },
  90: {
    subject:  "3 months since your last detail — come back for $20 off",
    headline: "Your car hasn't been this dirty in a while 😄",
    sub:      "We'd love to earn your business back. Book any detail service and save $20 — just our way of saying we appreciate you.",
    cta:      "Claim My $20 Off",
    offer:    "Use code <strong>RETURN20</strong> for $20 off — expires in 7 days.",
    planNote: "Never let 3 months slip by again — our <strong>Monthly Plans</strong> keep you on an automatic schedule. Request one from your dashboard.",
  },
};

function winbackEmailHtml(name: string, days: 30 | 60 | 90): string {
  const copy = WINBACK_COPY[days];
  const n = esc(name);
  const bookingUrl = "https://ariseandshinevt.com";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${copy.subject}</title>
</head>
<body style="${base}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            ${logo}
          </td>
        </tr>
        <tr>
          <td style="background-color:#111111;padding:36px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
            <h1 style="color:#f59e0b;font-size:26px;font-weight:900;margin:0 0 10px;letter-spacing:-0.5px;">
              ${esc(copy.headline)}
            </h1>
            <p style="color:#a1a1aa;font-size:15px;margin:0;line-height:1.6;">
              Hi ${n} — ${esc(copy.sub)}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#18181b;padding:32px 40px;text-align:center;">
            <div style="background:#1e1e1e;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:left;">
              <p style="color:#f59e0b;font-size:13px;font-weight:700;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Special Offer</p>
              <p style="color:#e4e4e7;font-size:14px;margin:0;line-height:1.6;">${copy.offer}</p>
            </div>
            <div style="background:#111827;border:1px solid #1d2a3a;border-radius:12px;padding:16px 20px;margin-bottom:28px;text-align:left;">
              <p style="color:#60a5fa;font-size:11px;font-weight:700;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Monthly Plans</p>
              <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">${copy.planNote}</p>
            </div>
            <a href="${bookingUrl}" style="display:inline-block;background:#f59e0b;color:#000000;text-decoration:none;font-size:15px;font-weight:900;padding:14px 36px;border-radius:10px;letter-spacing:0.02em;">
              ${esc(copy.cta)}
            </a>
            <p style="color:#52525b;font-size:12px;margin:20px 0 0;">
              Questions? Reply to this email or text us anytime.
            </p>
          </td>
        </tr>
        ${footer}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendWinbackEmail(data: {
  customerName: string;
  customerEmail: string;
  daysSince: 30 | 60 | 90;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping win-back email.");
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const copy = WINBACK_COPY[data.daysSince];
  const result = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      data.customerEmail,
    replyTo: REPLY_TO,
    subject: copy.subject,
    html:    winbackEmailHtml(data.customerName, data.daysSince),
  });
  if (result.error) {
    console.error("[email] winback send failed:", result.error);
  }
}
