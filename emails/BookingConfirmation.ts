/**
 * Service-aware booking confirmation email.
 * Produces distinct customer emails for Vehicle, Boat, and RV detailing.
 */

export const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

export type BookingConfirmationDetails = {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceAddress?: string;
  serviceName: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  bookingDate: string;
  bookingTime: string;
  travelFee: number;
  totalPrice: number;
  /** Extra vehicles on the same booking (multi-vehicle discount) */
  additionalVehicles?: Array<{
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    serviceName: string;
    servicePrice: number;
    selectedAddons?: { id: string; label: string; price: number }[];
  }>;
  addonsJson?: Array<{ id: string; label: string; price: number }>;
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

type ServiceType = "vehicle" | "boat" | "rv";

function getServiceType(serviceName: string): ServiceType {
  const n = serviceName.toLowerCase();
  if (n.includes("boat")) return "boat";
  if (n.includes("rv") || n.includes("motorhome")) return "rv";
  return "vehicle";
}

/** Maps DB service names to display names for boats */
const BOAT_DISPLAY: Record<string, string> = {
  "Boat Interior":         "Boat Interior",
  "Boat Exterior":         "Boat Exterior",
  "Boat Full Detail":      "Boat Full Detail",
  "Boat Showroom Package": "Marine Showroom Polish",
};

/** Maps DB service names to display names for RVs */
const RV_DISPLAY: Record<string, string> = {
  "RV Interior":        "RV Interior",
  "RV Exterior":        "RV Exterior",
  "RV Full Detail":     "RV Full Detail",
  "RV Showroom 1-Step": "RV Showroom — 1-Step Polish",
  "RV Showroom 2-Step": "RV Showroom — 2-Step Polish",
};

function getDisplayServiceName(serviceName: string, type: ServiceType): string {
  if (type === "boat") return BOAT_DISPLAY[serviceName] ?? serviceName;
  if (type === "rv") return RV_DISPLAY[serviceName] ?? serviceName;
  return serviceName;
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

const BUSINESS_EMAIL = "contact@ariseandshinevt.com";
const PHONE = "802-585-5563";

function detailRow(label: string, value: string, isLast = false): string {
  return `
  <tr>
    <td style="padding:14px 22px;${isLast ? "" : "border-bottom:1px solid #e8e8e8;"}">
      <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 4px;
                letter-spacing:0.15em;text-transform:uppercase;">${label}</p>
      <p style="font-size:15px;font-weight:600;color:#111111;margin:0;line-height:1.45;">${value}</p>
    </td>
  </tr>`;
}

function prepItem(emoji: string, text: string): string {
  return `
  <tr>
    <td style="padding:6px 0;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:26px;vertical-align:top;font-size:15px;padding-top:1px;">${emoji}</td>
          <td style="font-size:13px;color:#444444;line-height:1.55;padding-left:4px;">${text}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function stepRow(n: number, text: string): string {
  return `
  <tr>
    <td style="padding-bottom:12px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="26" height="26"
              style="background-color:#111111;border-radius:50%;text-align:center;
                     vertical-align:middle;font-size:11px;font-weight:700;
                     color:#ffffff;line-height:26px;min-width:26px;">
            ${n}
          </td>
          <td style="padding-left:12px;font-size:13px;color:#555555;
                     vertical-align:middle;line-height:1.55;">${text}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

const logoBlock = `
  <img src="${LOGO_URL}" alt="Arise And Shine VT" width="110"
       style="display:block;margin:0 auto 10px auto;width:110px;height:auto;" />
  <p style="color:#d4af37;font-size:15px;font-weight:900;margin:0;
             letter-spacing:0.08em;text-transform:uppercase;">Arise And Shine VT</p>`;

const emailFooter = `
  <tr>
    <td style="padding:28px 16px;text-align:center;
               background-color:#f9f9f9;border-top:1px solid #eeeeee;
               border-radius:0 0 16px 16px;">
      <p style="font-size:12px;font-weight:700;color:#333333;margin:0 0 4px;
                text-transform:uppercase;letter-spacing:0.08em;">Arise And Shine VT</p>
      <p style="font-size:11px;color:#999999;margin:0 0 12px;">
        Mobile Detailing &middot; Serving all of Vermont
      </p>
      <p style="font-size:12px;color:#666666;margin:0;">
        Questions? <a href="tel:${PHONE}" style="color:#d4af37;text-decoration:none;font-weight:700;">${PHONE}</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:${BUSINESS_EMAIL}" style="color:#d4af37;text-decoration:none;font-weight:700;">${BUSINESS_EMAIL}</a>
      </p>
      <p style="font-size:10px;color:#bbbbbb;margin:10px 0 0;">
        &copy; 2026 Arise And Shine VT. All rights reserved.
      </p>
    </td>
  </tr>`;

// ── Vehicle customer email ─────────────────────────────────────────────────────

function additionalVehicleRows(vehicles: BookingConfirmationDetails["additionalVehicles"]): string {
  if (!vehicles?.length) return "";
  return vehicles.map((v, i) => {
    const addonsHtml = v.selectedAddons?.length
      ? `<ul style="margin:4px 0 0;padding-left:14px;">${v.selectedAddons.map(a =>
          `<li style="font-size:11px;color:#888888;">+ ${esc(a.label)} ($${a.price})</li>`
        ).join("")}</ul>`
      : "";
    return `
  <tr>
    <td style="padding:10px 22px;border-top:1px solid #e8e8e8;">
      <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 2px;
                letter-spacing:0.15em;text-transform:uppercase;">Vehicle ${i + 2}</p>
      <p style="font-size:14px;font-weight:600;color:#111111;margin:0;">${esc(v.vehicleYear)} ${esc(v.vehicleMake)} ${esc(v.vehicleModel)}</p>
      <p style="font-size:12px;color:#888888;margin:2px 0 0;">${esc(v.serviceName)} — $${esc(v.servicePrice)}</p>
      ${addonsHtml}
    </td>
  </tr>`;
  }).join("");
}

function vehicleCustomerHtml(d: BookingConfirmationDetails, date: string): string {
  const firstName = esc(d.customerName.trim().split(/\s+/)[0] ?? "there");
  const vehicleLabel = `${esc(d.vehicleYear)} ${esc(d.vehicleMake)} ${esc(d.vehicleModel)}`;
  const travelStr = d.travelFee > 0 ? `$${d.travelFee}` : "Included";

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Detail is Confirmed — Arise And Shine VT</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:36px 16px;">
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#0a0a0a;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
        ${logoBlock}
      </td></tr>

      <!-- HERO -->
      <tr><td style="background-color:#111111;padding:32px;text-align:center;border-bottom:2px solid #d4af37;">
        <div style="width:60px;height:60px;background-color:#16a34a;border-radius:50%;
                    line-height:60px;font-size:28px;color:#fff;margin:0 auto 16px auto;text-align:center;">&#10003;</div>
        <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 8px;letter-spacing:-0.4px;">
          Your Detail is Confirmed!
        </h1>
        <p style="color:#aaaaaa;font-size:14px;margin:0;">
          See you on <strong style="color:#ffffff;">${esc(date)}</strong>
          at <strong style="color:#ffffff;">${esc(d.bookingTime)}</strong>
        </p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:32px;border-radius:0 0 16px 16px;">

        <p style="font-size:17px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#666666;margin:0 0 28px;line-height:1.7;">
          Thanks for booking with Arise And Shine VT! We're looking forward to bringing your
          <strong>${vehicleLabel}</strong> back to showroom condition.
          Here's everything you need for your upcoming appointment.
        </p>

        <!-- Booking card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:14px;overflow:hidden;margin-bottom:28px;
                      border:1px solid #eeeeee;">
          ${detailRow("Service", esc(d.serviceName))}
          ${detailRow("Vehicle 1", vehicleLabel)}
          ${additionalVehicleRows(d.additionalVehicles)}
          ${detailRow("Date", esc(date))}
          ${detailRow("Time", esc(d.bookingTime))}
          ${d.serviceAddress ? detailRow("Location", "&#128205;&nbsp;" + esc(d.serviceAddress)) : ""}
          ${d.travelFee > 0 ? detailRow("Travel Fee", travelStr) : ""}
          ${d.addonsJson?.length ? `
          <tr>
            <td style="padding:12px 22px;border-top:1px solid #e8e8e8;">
              <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 8px;
                        letter-spacing:0.15em;text-transform:uppercase;">Add-Ons</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${d.addonsJson.map((a: { label: string; price: number }) => `<tr>
                  <td style="font-size:13px;color:#333333;padding:2px 0;">+ ${esc(a.label)}</td>
                  <td align="right" style="font-size:13px;color:#555555;font-weight:600;padding:2px 0;">$${a.price}</td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:16px 22px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td><p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0;
                                letter-spacing:0.15em;text-transform:uppercase;">Total Due at Arrival</p></td>
                  <td align="right"><p style="font-size:24px;font-weight:900;color:#111111;margin:0;">
                    $${esc(d.totalPrice.toFixed(2))}</p></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Payment note -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:28px;">
          <tr><td style="padding:14px 18px;">
            <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 3px;">
              &#128179; Payment at Arrival
            </p>
            <p style="font-size:12px;color:#b45309;margin:0;line-height:1.55;">
              We accept cash or card on-site. No payment is taken until the job is complete and you're happy.
            </p>
          </td></tr>
        </table>

        <!-- What to prepare -->
        <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 12px;
                   letter-spacing:0.15em;text-transform:uppercase;">How to Prepare Your Vehicle</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${prepItem("&#128663;", "<strong>Park your vehicle in an accessible spot</strong> — ideally in your driveway or a shaded area where we can work comfortably.")}
          ${prepItem("&#128197;", "<strong>Remove personal items from the interior</strong> — seats, floor, cup holders, and console. We clean around items but work best on a clear interior.")}
          ${prepItem("&#128054;", "<strong>Make note of any pet hair</strong> — let us know at arrival if you have heavy pet hair so we can plan accordingly.")}
          ${prepItem("&#128274;", "<strong>Unlock/leave keys accessible</strong> — we'll need to access the interior and run the car briefly for interior work.")}
          ${prepItem("&#128241;", "<strong>You don't need to be present</strong> — just make sure we can access the vehicle and reach you by phone if we have questions.")}
        </table>

        <!-- What happens next -->
        <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 12px;
                   letter-spacing:0.15em;text-transform:uppercase;">What Happens Next</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${stepRow(1, "You'll get a reminder the day before your appointment.")}
          ${stepRow(2, "We'll send an <strong>\"On My Way\"</strong> text/email when we're headed to you.")}
          ${stepRow(3, "We arrive, complete your detail, and walk you through the finished result.")}
          ${stepRow(4, "Pay at arrival — cash or card — and enjoy your freshly detailed vehicle!")}
        </table>

        <!-- Contact -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;text-align:center;">
            <p style="font-size:14px;color:#555555;margin:0 0 14px;line-height:1.5;">
              Need to reschedule or have a question?
            </p>
            <a href="tel:${PHONE}"
               style="display:inline-block;background-color:#111111;color:#ffffff;
                      font-size:13px;font-weight:700;padding:11px 28px;
                      border-radius:8px;text-decoration:none;margin-right:8px;">
              &#128222; Call Us
            </a>
            <a href="mailto:${BUSINESS_EMAIL}"
               style="display:inline-block;background-color:#f0f0f0;color:#333333;
                      font-size:13px;font-weight:700;padding:11px 28px;
                      border-radius:8px;text-decoration:none;">
              Email Us
            </a>
          </td></tr>
        </table>

      </td></tr>
      ${emailFooter}
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ── Boat customer email ────────────────────────────────────────────────────────

function boatCustomerHtml(d: BookingConfirmationDetails, date: string): string {
  const firstName = esc(d.customerName.trim().split(/\s+/)[0] ?? "there");
  const displayService = getDisplayServiceName(d.serviceName, "boat");
  const boatLabel = `${esc(d.vehicleYear)} ${esc(d.vehicleMake)} ${esc(d.vehicleModel)}`;
  const travelStr = d.travelFee > 0 ? `$${d.travelFee}` : "Included";

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Boat Detail is Confirmed — Arise And Shine VT</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:36px 16px;">
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#09090b;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
        ${logoBlock}
        <p style="color:#a1a1aa;font-size:10px;margin:6px 0 0;letter-spacing:0.25em;text-transform:uppercase;">
          Waterline Up &middot; Dockside Marine Detailing
        </p>
      </td></tr>

      <!-- HERO -->
      <tr><td style="background-color:#0f0f11;padding:32px;text-align:center;border-bottom:2px solid #d4af37;">
        <p style="font-size:28px;margin:0 0 12px;">&#9875;</p>
        <h1 style="color:#d4af37;font-size:26px;font-weight:900;margin:0 0 8px;letter-spacing:-0.4px;">
          Waterline Up — Confirmed!
        </h1>
        <p style="color:#888888;font-size:13px;margin:0 0 6px;">
          Package: <strong style="color:#d4af37;">${esc(displayService)}</strong>
        </p>
        <p style="color:#888888;font-size:13px;margin:0;">
          <strong style="color:#cccccc;">${esc(date)}</strong>
          at <strong style="color:#cccccc;">${esc(d.bookingTime)}</strong>
        </p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:32px;border-radius:0 0 16px 16px;">

        <p style="font-size:17px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#666666;margin:0 0 28px;line-height:1.7;">
          Your <strong>${esc(displayService)}</strong> boat detail is booked and confirmed.
          We'll come directly to your dock, marina, or driveway — no haul-out or trailering required.
          Here's everything you need to know before we arrive.
        </p>

        <!-- Booking card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:14px;overflow:hidden;margin-bottom:28px;
                      border:1px solid #eeeeee;">
          ${detailRow("Package", esc(displayService) + `<span style="font-size:11px;color:#999999;font-weight:400;"> (${esc(d.serviceName)})</span>`)}
          ${detailRow("Boat", boatLabel)}
          ${detailRow("Date", esc(date))}
          ${detailRow("Time", esc(d.bookingTime))}
          ${d.serviceAddress ? detailRow("Service Location", "&#128205;&nbsp;" + esc(d.serviceAddress)) : ""}
          ${d.travelFee > 0 ? detailRow("Travel Fee", travelStr) : ""}
          ${d.addonsJson?.length ? `
          <tr>
            <td style="padding:12px 22px;border-top:1px solid #e8e8e8;">
              <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 8px;
                        letter-spacing:0.15em;text-transform:uppercase;">Add-Ons</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${d.addonsJson.map((a: { label: string; price: number }) => `<tr>
                  <td style="font-size:13px;color:#333333;padding:2px 0;">+ ${esc(a.label)}</td>
                  <td align="right" style="font-size:13px;color:#555555;font-weight:600;padding:2px 0;">$${a.price}</td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:16px 22px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td><p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0;
                                letter-spacing:0.15em;text-transform:uppercase;">Total Due at Arrival</p></td>
                  <td align="right"><p style="font-size:24px;font-weight:900;color:#111111;margin:0;">
                    $${esc(d.totalPrice.toFixed(2))}</p></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Waterline Up badge -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#0f0f11;border:1px solid #d4af3733;border-radius:12px;margin-bottom:28px;">
          <tr><td style="padding:16px 18px;">
            <p style="font-size:13px;font-weight:700;color:#d4af37;margin:0 0 4px;">
              &#9875; Mobile Dockside Service
            </p>
            <p style="font-size:12px;color:#888888;margin:0;line-height:1.6;">
              We specialize in detailing from the <strong style="color:#aaaaaa;">waterline up</strong>.
              No lift, no haul-out, no trailering required. We bring everything to you.
              All products are <strong style="color:#aaaaaa;">100% lake-safe &amp; VT biodegradable</strong>.
            </p>
          </td></tr>
        </table>

        <!-- How to prepare -->
        <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 12px;
                   letter-spacing:0.15em;text-transform:uppercase;">How to Prepare Your Boat</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${prepItem("&#128692;", "<strong>Make sure your boat is accessible</strong> — at your dock, in your driveway, or at your storage facility. We need enough clearance to walk around the full perimeter.")}
          ${prepItem("&#127749;", "<strong>Remove the canvas, bimini, or cover if possible</strong> — this lets us access the full cockpit and speeds up the detail significantly.")}
          ${prepItem("&#128196;", "<strong>Clear loose items from the deck and cockpit</strong> — life jackets, ropes, gear bags, and personal items.")}
          ${prepItem("&#128295;", "<strong>Note any specific problem areas</strong> — heavy staining, mold spots, or areas you want extra attention on. Let us know when we arrive.")}
          ${prepItem("&#128241;", "<strong>You don't need to be present</strong> — just ensure access and be reachable by phone if we have questions during the detail.")}
        </table>

        <!-- What happens next -->
        <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 12px;
                   letter-spacing:0.15em;text-transform:uppercase;">What Happens Next</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${stepRow(1, "You'll get a reminder the day before your appointment.")}
          ${stepRow(2, "We'll send an <strong>\"On My Way\"</strong> message when we're headed to your location.")}
          ${stepRow(3, "We arrive fully equipped and complete the full Waterline Up detail.")}
          ${stepRow(4, "We walk you through the finished results before taking payment — cash or card on-site.")}
        </table>

        <!-- Contact -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;text-align:center;">
            <p style="font-size:14px;color:#555555;margin:0 0 14px;line-height:1.5;">
              Need to reschedule, have a question, or want to add a specialist add-on?
            </p>
            <a href="tel:${PHONE}"
               style="display:inline-block;background-color:#0f0f11;color:#d4af37;
                      font-size:13px;font-weight:700;padding:11px 28px;
                      border-radius:8px;text-decoration:none;border:1px solid #d4af3755;margin-right:8px;">
              &#128222; Call / Text
            </a>
            <a href="mailto:${BUSINESS_EMAIL}"
               style="display:inline-block;background-color:#f0f0f0;color:#333333;
                      font-size:13px;font-weight:700;padding:11px 28px;
                      border-radius:8px;text-decoration:none;">
              Email Us
            </a>
          </td></tr>
        </table>

      </td></tr>
      ${emailFooter}
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ── RV customer email ──────────────────────────────────────────────────────────

function rvCustomerHtml(d: BookingConfirmationDetails, date: string): string {
  const firstName = esc(d.customerName.trim().split(/\s+/)[0] ?? "there");
  const displayService = getDisplayServiceName(d.serviceName, "rv");
  const rigLabel = `${esc(d.vehicleYear)} ${esc(d.vehicleMake)} ${esc(d.vehicleModel)}`;
  const travelStr = d.travelFee > 0 ? `$${d.travelFee}` : "Included";

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your RV Detail is Confirmed — Arise And Shine VT</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:36px 16px;">
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#09090b;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
        ${logoBlock}
        <p style="color:#a1a1aa;font-size:10px;margin:6px 0 0;letter-spacing:0.25em;text-transform:uppercase;">
          All-Terrain &middot; Mobile RV Detailing Vermont
        </p>
      </td></tr>

      <!-- HERO -->
      <tr><td style="background-color:#0f0f11;padding:32px;text-align:center;border-bottom:2px solid #d4af37;">
        <p style="font-size:28px;margin:0 0 12px;">&#128663;</p>
        <h1 style="color:#d4af37;font-size:26px;font-weight:900;margin:0 0 8px;letter-spacing:-0.4px;">
          Your RV Detail is Confirmed!
        </h1>
        <p style="color:#888888;font-size:13px;margin:0 0 6px;">
          Package: <strong style="color:#d4af37;">${esc(displayService)}</strong>
        </p>
        <p style="color:#888888;font-size:13px;margin:0;">
          <strong style="color:#cccccc;">${esc(date)}</strong>
          at <strong style="color:#cccccc;">${esc(d.bookingTime)}</strong>
        </p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:32px;border-radius:0 0 16px 16px;">

        <p style="font-size:17px;font-weight:700;color:#111111;margin:0 0 6px;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#666666;margin:0 0 28px;line-height:1.7;">
          Your <strong>${esc(displayService)}</strong> RV detail is booked and confirmed.
          We'll come directly to your driveway, campsite, or storage facility — no tow-in needed.
          Here's everything you need to know before we arrive.
        </p>

        <!-- Booking card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:14px;overflow:hidden;margin-bottom:28px;
                      border:1px solid #eeeeee;">
          ${detailRow("Package", esc(displayService) + `<span style="font-size:11px;color:#999999;font-weight:400;"> (${esc(d.serviceName)})</span>`)}
          ${detailRow("Rig", rigLabel)}
          ${detailRow("Date", esc(date))}
          ${detailRow("Time", esc(d.bookingTime))}
          ${d.serviceAddress ? detailRow("Service Location", "&#128205;&nbsp;" + esc(d.serviceAddress)) : ""}
          ${d.travelFee > 0 ? detailRow("Travel Fee", travelStr) : ""}
          ${d.addonsJson?.length ? `
          <tr>
            <td style="padding:12px 22px;border-top:1px solid #e8e8e8;">
              <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 8px;
                        letter-spacing:0.15em;text-transform:uppercase;">Add-Ons</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${d.addonsJson.map((a: { label: string; price: number }) => `<tr>
                  <td style="font-size:13px;color:#333333;padding:2px 0;">+ ${esc(a.label)}</td>
                  <td align="right" style="font-size:13px;color:#555555;font-weight:600;padding:2px 0;">$${a.price}</td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:16px 22px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td><p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0;
                                letter-spacing:0.15em;text-transform:uppercase;">Total Due at Arrival</p></td>
                  <td align="right"><p style="font-size:24px;font-weight:900;color:#111111;margin:0;">
                    $${esc(d.totalPrice.toFixed(2))}</p></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Mobile service badge -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#0f0f11;border:1px solid #d4af3733;border-radius:12px;margin-bottom:28px;">
          <tr><td style="padding:16px 18px;">
            <p style="font-size:13px;font-weight:700;color:#d4af37;margin:0 0 4px;">
              &#128663; We Come to You
            </p>
            <p style="font-size:12px;color:#888888;margin:0;line-height:1.6;">
              Driveway, campground, or storage yard — we're fully self-contained.
              No tow-in required. We use only <strong style="color:#aaaaaa;">RV-safe products</strong>
              that won't harm rubber seals, EPDM roofs, or fiberglass.
            </p>
          </td></tr>
        </table>

        <!-- How to prepare -->
        <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 12px;
                   letter-spacing:0.15em;text-transform:uppercase;">How to Prepare Your RV</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${prepItem("&#128663;", "<strong>Park the rig in an accessible, flat location</strong> — we need clearance to walk around the full perimeter and access the roof area.")}
          ${prepItem("&#9889;", "<strong>If getting an awning clean</strong> — extend the awning before we arrive so it's ready to work on immediately.")}
          ${prepItem("&#128196;", "<strong>Remove personal items from the interior</strong> — counters, tables, beds, and storage areas. A cleared interior means a faster, more thorough clean.")}
          ${prepItem("&#128295;", "<strong>Note any specific concerns</strong> — mold spots, slide-out issues, or areas needing extra attention. Let us know when we arrive.")}
          ${prepItem("&#128241;", "<strong>You don't need to be present the entire time</strong> — just make sure we have access and you're reachable by phone.")}
        </table>

        <!-- What happens next -->
        <p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 12px;
                   letter-spacing:0.15em;text-transform:uppercase;">What Happens Next</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          ${stepRow(1, "You'll receive a reminder the day before your appointment.")}
          ${stepRow(2, "We'll send an <strong>\"On My Way\"</strong> message when we're headed to your location.")}
          ${stepRow(3, "We arrive fully equipped and complete the full RV detail at your location.")}
          ${stepRow(4, "We do a walkthrough of the finished rig with you before taking payment — cash or card.")}
        </table>

        <!-- Contact -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;text-align:center;">
            <p style="font-size:14px;color:#555555;margin:0 0 14px;line-height:1.5;">
              Need to reschedule, add a specialist add-on, or have a question about your service?
            </p>
            <a href="tel:${PHONE}"
               style="display:inline-block;background-color:#0f0f11;color:#d4af37;
                      font-size:13px;font-weight:700;padding:11px 28px;
                      border-radius:8px;text-decoration:none;border:1px solid #d4af3755;margin-right:8px;">
              &#128222; Call / Text
            </a>
            <a href="mailto:${BUSINESS_EMAIL}"
               style="display:inline-block;background-color:#f0f0f0;color:#333333;
                      font-size:13px;font-weight:700;padding:11px 28px;
                      border-radius:8px;text-decoration:none;">
              Email Us
            </a>
          </td></tr>
        </table>

      </td></tr>
      ${emailFooter}
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getBookingConfirmationHtml(details: BookingConfirmationDetails): string {
  const date = formatDate(details.bookingDate);
  const type = getServiceType(details.serviceName);
  if (type === "boat") return boatCustomerHtml(details, date);
  if (type === "rv") return rvCustomerHtml(details, date);
  return vehicleCustomerHtml(details, date);
}
