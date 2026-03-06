/**
 * Owner notification email when a new booking is made.
 * Uses the shared Layout; shows customer name, phone, car details, and scheduled date.
 * Branding: Arise And Shine VT throughout.
 */

import { getEmailLayoutHtml } from "./Layout";

export type AdminBookingAlertOptions = {
  customerName: string;
  customerPhone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  totalPrice: number;
};

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getAdminBookingAlertHtml(options: AdminBookingAlertOptions): string {
  const {
    customerName,
    customerPhone,
    vehicleYear,
    vehicleMake,
    vehicleModel,
    serviceName,
    bookingDate,
    bookingTime,
    totalPrice,
  } = options;

  const vehicleLabel = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ") || "—";

  const bodyHtml = `
    <p style="margin:0 0 16px;">A new booking was received for <strong style="color:#fafafa;">Arise And Shine VT</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#27272a;border-radius:10px;padding:20px;">
      <tr>
        <td style="color:#e4e4e7;font-size:14px;">
          <p style="margin:0 0 12px;"><strong style="color:#a1a1aa;">Customer</strong><br/><span style="color:#fafafa;">${esc(customerName)}</span></p>
          <p style="margin:0 0 12px;"><strong style="color:#a1a1aa;">Phone</strong><br/><span style="color:#fafafa;">${esc(customerPhone)}</span></p>
          <p style="margin:0 0 12px;"><strong style="color:#a1a1aa;">Vehicle</strong><br/><span style="color:#fafafa;">${esc(vehicleLabel)}</span></p>
          <p style="margin:0 0 12px;"><strong style="color:#a1a1aa;">Service</strong><br/><span style="color:#fafafa;">${esc(serviceName)}</span></p>
          <p style="margin:0 0 12px;"><strong style="color:#a1a1aa;">Scheduled</strong><br/><span style="color:#fafafa;">${esc(bookingDate)} at ${esc(bookingTime)}</span></p>
          <p style="margin:0;"><strong style="color:#a1a1aa;">Total</strong><br/><span style="color:#d4af37;font-size:18px;font-weight:700;">$${esc(totalPrice.toFixed(2))}</span></p>
        </td>
      </tr>
    </table>
  `;

  return getEmailLayoutHtml({
    title: "New Booking Received — Arise And Shine VT",
    headline: "New Booking Received — Arise And Shine VT",
    bodyHtml,
  });
}
