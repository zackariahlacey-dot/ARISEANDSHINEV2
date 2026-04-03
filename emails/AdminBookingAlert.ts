/**
 * Owner notification email when a new booking is made.
 * Service-aware: distinct layout and context for Vehicle, Boat, and RV.
 * Sent to zackariahlacey@gmail.com on every new booking.
 */

const LOGO_URL =
  "https://esgdlmvvjrduazdraewq.supabase.co/storage/v1/object/public/public-assets/e.png";

export type AdminBookingAlertOptions = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress?: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleSize?: string;
  serviceName: string;
  bookingDate: string;   // formatted, e.g. "Monday, June 2, 2026"
  bookingTime: string;   // e.g. "9:00 AM"
  totalPrice: number;
  paymentMethod?: "pay_at_arrival" | "pay_now";
  distanceMiles?: number;
  notes?: string;
  addonsJson?: { id: string; label: string; price: number }[];
};

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type ServiceType = "vehicle" | "boat" | "rv";

function getServiceType(n: string): ServiceType {
  const l = n.toLowerCase();
  if (l.includes("boat")) return "boat";
  if (l.includes("rv") || l.includes("motorhome")) return "rv";
  return "vehicle";
}

const BOAT_DISPLAY: Record<string, string> = {
  "Boat Interior Detail": "Marine Express",
  "Boat Exterior Detail": "The Deep Reset",
  "Full Boat Detail": "Showroom Restoration",
};

const RV_DISPLAY: Record<string, string> = {
  "RV Interior Detail": "Interior Refresh",
  "RV Exterior Detail": "Road Revival",
  "RV Full Detail": "Full Rig Overhaul",
};

function displayService(name: string, type: ServiceType): string {
  if (type === "boat") return BOAT_DISPLAY[name] ? `${BOAT_DISPLAY[name]} (${name})` : name;
  if (type === "rv") return RV_DISPLAY[name] ? `${RV_DISPLAY[name]} (${name})` : name;
  return name;
}

// ── Shared building blocks ────────────────────────────────────────────────────

const base = `margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;`;

function row(label: string, value: string, isLast = false): string {
  return `
  <tr>
    <td style="padding:11px 18px;${isLast ? "" : "border-bottom:1px solid #eeeeee;"}">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:10px;font-weight:800;color:#aaaaaa;text-transform:uppercase;
                     letter-spacing:0.12em;width:100px;vertical-align:top;padding-top:2px;">
            ${label}
          </td>
          <td style="font-size:14px;font-weight:600;color:#111111;line-height:1.45;">
            ${value}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function sectionHeader(text: string): string {
  return `<p style="font-size:10px;font-weight:800;color:#aaaaaa;margin:0 0 8px;
                    letter-spacing:0.14em;text-transform:uppercase;">${text}</p>`;
}

const logoBlock = `
  <img src="${LOGO_URL}" alt="Arise And Shine VT" width="90"
       style="display:block;margin:0 auto 8px auto;width:90px;height:auto;" />
  <p style="color:#d4af37;font-size:14px;font-weight:900;margin:0;
             letter-spacing:0.08em;text-transform:uppercase;">Arise And Shine VT</p>`;

// ── Vehicle admin email ────────────────────────────────────────────────────────

function vehicleAdminHtml(o: AdminBookingAlertOptions): string {
  const vehicleLabel = [o.vehicleYear, o.vehicleMake, o.vehicleModel].filter(Boolean).join(" ") || "—";
  const mapsUrl = o.customerAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.customerAddress)}`
    : null;
  const addonsHtml = o.addonsJson?.length
    ? o.addonsJson.map((a) => `<li style="margin:2px 0;font-size:13px;color:#333;">+ ${esc(a.label)} ($${a.price})</li>`).join("")
    : "";

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Vehicle Booking — Arise And Shine VT</title></head>
<body style="${base}">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#0a0a0a;border-radius:14px 14px 0 0;padding:24px 28px;text-align:center;">
        ${logoBlock}
      </td></tr>

      <!-- ALERT BAR -->
      <tr><td style="background-color:#16a34a;padding:14px 24px;text-align:center;">
        <p style="color:#ffffff;font-size:16px;font-weight:900;margin:0;letter-spacing:0.02em;">
          &#128663; New Vehicle Booking
        </p>
        <p style="color:#bbf7d0;font-size:12px;margin:4px 0 0;">
          ${esc(o.bookingDate)} at ${esc(o.bookingTime)}
          ${o.paymentMethod === "pay_now" ? " &middot; <strong>PAID ONLINE</strong>" : " &middot; Pay at Arrival"}
        </p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:28px;border-radius:0 0 14px 14px;">

        ${sectionHeader("Customer")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #eeeeee;">
          ${row("Name", `<strong>${esc(o.customerName)}</strong>`)}
          ${row("Phone", `<a href="tel:${esc(o.customerPhone)}" style="color:#111;text-decoration:none;">${esc(o.customerPhone)}</a>
                          &nbsp;<a href="sms:${esc(o.customerPhone)}" style="font-size:11px;color:#d4af37;font-weight:700;">Text</a>`)}
          ${row("Email", `<a href="mailto:${esc(o.customerEmail)}" style="color:#d4af37;text-decoration:none;">${esc(o.customerEmail)}</a>`)}
          ${o.customerAddress ? row("Address", mapsUrl
            ? `<a href="${mapsUrl}" style="color:#d4af37;text-decoration:none;">&#128205; ${esc(o.customerAddress)}</a>`
            : `&#128205; ${esc(o.customerAddress)}`
          ) : ""}
          ${o.distanceMiles != null ? row("Distance", `${o.distanceMiles.toFixed(1)} miles`) : ""}
        </table>

        ${sectionHeader("Booking")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #eeeeee;">
          ${row("Service", esc(o.serviceName))}
          ${row("Vehicle", esc(vehicleLabel) + (o.vehicleSize ? `<span style="color:#999;font-size:11px;"> — ${esc(o.vehicleSize)}</span>` : ""))}
          ${row("Date", esc(o.bookingDate))}
          ${row("Time", esc(o.bookingTime))}
          ${row("Payment", o.paymentMethod === "pay_now" ? "<strong style='color:#16a34a;'>PAID ONLINE</strong>" : "Due at Arrival")}
          ${row("Total", `<strong style="font-size:18px;color:#111;">$${esc(o.totalPrice.toFixed(2))}</strong>`, !addonsHtml && !o.notes)}
          ${addonsHtml ? row("Add-ons", `<ul style="margin:4px 0;padding-left:16px;">${addonsHtml}</ul>`) : ""}
          ${o.notes ? row("Notes", `<em style="color:#555;">${esc(o.notes)}</em>`, true) : ""}
        </table>

        <!-- Quick actions -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:8px;">
          <tr><td style="padding:16px 20px;text-align:center;">
            <p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 12px;">Quick Actions</p>
            <a href="tel:${esc(o.customerPhone)}"
               style="display:inline-block;background:#111;color:#fff;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128222; Call
            </a>
            <a href="sms:${esc(o.customerPhone)}"
               style="display:inline-block;background:#d4af37;color:#111;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128172; Text
            </a>
            ${mapsUrl ? `<a href="${mapsUrl}"
               style="display:inline-block;background:#f0f0f0;color:#333;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128205; Maps
            </a>` : ""}
          </td></tr>
        </table>

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ── Boat admin email ───────────────────────────────────────────────────────────

function boatAdminHtml(o: AdminBookingAlertOptions): string {
  const boatLabel = [o.vehicleYear, o.vehicleMake, o.vehicleModel].filter(Boolean).join(" ") || "—";
  const pkgDisplay = BOAT_DISPLAY[o.serviceName] ?? o.serviceName;
  const mapsUrl = o.customerAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.customerAddress)}`
    : null;
  const addonsHtml = o.addonsJson?.length
    ? o.addonsJson.map((a) => `<li style="margin:2px 0;font-size:13px;color:#333;">+ ${esc(a.label)} ($${a.price})</li>`).join("")
    : "";

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Boat Booking — Arise And Shine VT</title></head>
<body style="${base}">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#09090b;border-radius:14px 14px 0 0;padding:24px 28px;text-align:center;">
        ${logoBlock}
        <p style="color:#a1a1aa;font-size:9px;margin:6px 0 0;letter-spacing:0.25em;text-transform:uppercase;">
          Waterline Up · Dockside Marine
        </p>
      </td></tr>

      <!-- ALERT BAR -->
      <tr><td style="background-color:#0f0f11;border-bottom:2px solid #d4af37;padding:16px 24px;text-align:center;">
        <p style="color:#d4af37;font-size:16px;font-weight:900;margin:0;">
          &#9875; New Boat Booking — ${esc(pkgDisplay)}
        </p>
        <p style="color:#888888;font-size:12px;margin:5px 0 0;">
          ${esc(o.bookingDate)} at ${esc(o.bookingTime)}
          ${o.paymentMethod === "pay_now" ? " &middot; <strong style='color:#d4af37;'>PAID ONLINE</strong>" : " &middot; Pay at Arrival"}
        </p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:28px;border-radius:0 0 14px 14px;">

        ${sectionHeader("Customer")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #eeeeee;">
          ${row("Name", `<strong>${esc(o.customerName)}</strong>`)}
          ${row("Phone", `<a href="tel:${esc(o.customerPhone)}" style="color:#111;text-decoration:none;">${esc(o.customerPhone)}</a>
                          &nbsp;<a href="sms:${esc(o.customerPhone)}" style="font-size:11px;color:#d4af37;font-weight:700;">Text</a>`)}
          ${row("Email", `<a href="mailto:${esc(o.customerEmail)}" style="color:#d4af37;text-decoration:none;">${esc(o.customerEmail)}</a>`)}
          ${o.customerAddress ? row("Dock / Location", mapsUrl
            ? `<a href="${mapsUrl}" style="color:#d4af37;text-decoration:none;">&#128205; ${esc(o.customerAddress)}</a>`
            : `&#128205; ${esc(o.customerAddress)}`
          ) : ""}
          ${o.distanceMiles != null ? row("Distance", `${o.distanceMiles.toFixed(1)} miles`) : ""}
        </table>

        ${sectionHeader("Booking")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #eeeeee;">
          ${row("Package", `<strong>${esc(pkgDisplay)}</strong> <span style="color:#999;font-size:11px;">(${esc(o.serviceName)})</span>`)}
          ${row("Boat", esc(boatLabel))}
          ${row("Date", esc(o.bookingDate))}
          ${row("Time", esc(o.bookingTime))}
          ${row("Payment", o.paymentMethod === "pay_now" ? "<strong style='color:#16a34a;'>PAID ONLINE</strong>" : "Due at Arrival")}
          ${row("Total", `<strong style="font-size:18px;color:#111;">$${esc(o.totalPrice.toFixed(2))}</strong>`, !addonsHtml && !o.notes)}
          ${addonsHtml ? row("Add-ons", `<ul style="margin:4px 0;padding-left:16px;">${addonsHtml}</ul>`) : ""}
          ${o.notes ? row("Notes", `<em style="color:#555;">${esc(o.notes)}</em>`, true) : ""}
        </table>

        <!-- Checklist reminder -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#0f0f11;border:1px solid #d4af3733;border-radius:10px;margin-bottom:20px;">
          <tr><td style="padding:14px 18px;">
            <p style="font-size:12px;font-weight:700;color:#d4af37;margin:0 0 8px;">
              &#9875; Marine Prep Checklist
            </p>
            <ul style="margin:0;padding-left:18px;color:#aaaaaa;font-size:12px;line-height:1.7;">
              <li>Confirm dock/driveway/storage yard location before arrival</li>
              <li>Bring full marine detail kit — steam, hot water extraction</li>
              <li>Check for pontoon tubes — upsell Tube Polish if applicable</li>
              <li>Check for heavy isinglass haze — upsell Window Clarity</li>
              <li>All chemicals biodegradable &amp; VT lake-safe &#10003;</li>
            </ul>
          </td></tr>
        </table>

        <!-- Quick actions -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <tr><td style="padding:16px 20px;text-align:center;">
            <p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 12px;">Quick Actions</p>
            <a href="tel:${esc(o.customerPhone)}"
               style="display:inline-block;background:#111;color:#fff;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128222; Call
            </a>
            <a href="sms:${esc(o.customerPhone)}"
               style="display:inline-block;background:#d4af37;color:#111;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128172; Text
            </a>
            ${mapsUrl ? `<a href="${mapsUrl}"
               style="display:inline-block;background:#f0f0f0;color:#333;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128205; Dock Location
            </a>` : ""}
          </td></tr>
        </table>

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ── RV admin email ─────────────────────────────────────────────────────────────

function rvAdminHtml(o: AdminBookingAlertOptions): string {
  const rigLabel = [o.vehicleYear, o.vehicleMake, o.vehicleModel].filter(Boolean).join(" ") || "—";
  const pkgDisplay = RV_DISPLAY[o.serviceName] ?? o.serviceName;
  const mapsUrl = o.customerAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.customerAddress)}`
    : null;
  const addonsHtml = o.addonsJson?.length
    ? o.addonsJson.map((a) => `<li style="margin:2px 0;font-size:13px;color:#333;">+ ${esc(a.label)} ($${a.price})</li>`).join("")
    : "";

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New RV Booking — Arise And Shine VT</title></head>
<body style="${base}">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

      <!-- HEADER -->
      <tr><td style="background-color:#09090b;border-radius:14px 14px 0 0;padding:24px 28px;text-align:center;">
        ${logoBlock}
        <p style="color:#a1a1aa;font-size:9px;margin:6px 0 0;letter-spacing:0.25em;text-transform:uppercase;">
          All-Terrain · Mobile RV Detailing
        </p>
      </td></tr>

      <!-- ALERT BAR -->
      <tr><td style="background-color:#0f0f11;border-bottom:2px solid #d4af37;padding:16px 24px;text-align:center;">
        <p style="color:#d4af37;font-size:16px;font-weight:900;margin:0;">
          &#128663; New RV Booking — ${esc(pkgDisplay)}
        </p>
        <p style="color:#888888;font-size:12px;margin:5px 0 0;">
          ${esc(o.bookingDate)} at ${esc(o.bookingTime)}
          ${o.paymentMethod === "pay_now" ? " &middot; <strong style='color:#d4af37;'>PAID ONLINE</strong>" : " &middot; Pay at Arrival"}
        </p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:28px;border-radius:0 0 14px 14px;">

        ${sectionHeader("Customer")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #eeeeee;">
          ${row("Name", `<strong>${esc(o.customerName)}</strong>`)}
          ${row("Phone", `<a href="tel:${esc(o.customerPhone)}" style="color:#111;text-decoration:none;">${esc(o.customerPhone)}</a>
                          &nbsp;<a href="sms:${esc(o.customerPhone)}" style="font-size:11px;color:#d4af37;font-weight:700;">Text</a>`)}
          ${row("Email", `<a href="mailto:${esc(o.customerEmail)}" style="color:#d4af37;text-decoration:none;">${esc(o.customerEmail)}</a>`)}
          ${o.customerAddress ? row("Site / Location", mapsUrl
            ? `<a href="${mapsUrl}" style="color:#d4af37;text-decoration:none;">&#128205; ${esc(o.customerAddress)}</a>`
            : `&#128205; ${esc(o.customerAddress)}`
          ) : ""}
          ${o.distanceMiles != null ? row("Distance", `${o.distanceMiles.toFixed(1)} miles`) : ""}
        </table>

        ${sectionHeader("Booking")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f8f8f8;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #eeeeee;">
          ${row("Package", `<strong>${esc(pkgDisplay)}</strong> <span style="color:#999;font-size:11px;">(${esc(o.serviceName)})</span>`)}
          ${row("Rig", esc(rigLabel))}
          ${row("Date", esc(o.bookingDate))}
          ${row("Time", esc(o.bookingTime))}
          ${row("Payment", o.paymentMethod === "pay_now" ? "<strong style='color:#16a34a;'>PAID ONLINE</strong>" : "Due at Arrival")}
          ${row("Total", `<strong style="font-size:18px;color:#111;">$${esc(o.totalPrice.toFixed(2))}</strong>`, !addonsHtml && !o.notes)}
          ${addonsHtml ? row("Add-ons", `<ul style="margin:4px 0;padding-left:16px;">${addonsHtml}</ul>`) : ""}
          ${o.notes ? row("Notes", `<em style="color:#555;">${esc(o.notes)}</em>`, true) : ""}
        </table>

        <!-- Checklist reminder -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#0f0f11;border:1px solid #d4af3733;border-radius:10px;margin-bottom:20px;">
          <tr><td style="padding:14px 18px;">
            <p style="font-size:12px;font-weight:700;color:#d4af37;margin:0 0 8px;">
              &#128663; RV Prep Checklist
            </p>
            <ul style="margin:0;padding-left:18px;color:#aaaaaa;font-size:12px;line-height:1.7;">
              <li>Confirm campsite/driveway/storage yard has enough clearance to work around full rig</li>
              <li>Large rigs 45ft+ — confirm no surcharge needed before arrival</li>
              <li>If awning add-on booked — confirm it can be extended on-site</li>
              <li>Bring EPDM/TPO-safe sealant if roof coat add-on booked</li>
              <li>Only RV-safe products — no harsh chemicals on seals or roof &#10003;</li>
            </ul>
          </td></tr>
        </table>

        <!-- Quick actions -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <tr><td style="padding:16px 20px;text-align:center;">
            <p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 12px;">Quick Actions</p>
            <a href="tel:${esc(o.customerPhone)}"
               style="display:inline-block;background:#111;color:#fff;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128222; Call
            </a>
            <a href="sms:${esc(o.customerPhone)}"
               style="display:inline-block;background:#d4af37;color:#111;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128172; Text
            </a>
            ${mapsUrl ? `<a href="${mapsUrl}"
               style="display:inline-block;background:#f0f0f0;color:#333;font-size:12px;font-weight:700;
                      padding:9px 20px;border-radius:7px;text-decoration:none;margin:3px;">
              &#128205; Directions
            </a>` : ""}
          </td></tr>
        </table>

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getAdminBookingAlertHtml(options: AdminBookingAlertOptions): string {
  const type = getServiceType(options.serviceName);
  if (type === "boat") return boatAdminHtml(options);
  if (type === "rv") return rvAdminHtml(options);
  return vehicleAdminHtml(options);
}
