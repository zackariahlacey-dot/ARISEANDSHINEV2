/**
 * Simple admin notification email when a new booking is made.
 * Uses the shared Layout; shows customer phone and total price.
 */

import { getEmailLayoutHtml } from "./Layout";

export type AdminBookingAlertOptions = {
  customerPhone: string;
  totalPrice: number;
  /** Optional: service name, date, time for context */
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
};

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getAdminBookingAlertHtml(options: AdminBookingAlertOptions): string {
  const { customerPhone, totalPrice, serviceName, bookingDate, bookingTime } = options;

  const rows: string[] = [
    `<p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Phone</strong><br/><span style="color:#fafafa;">${esc(customerPhone)}</span></p>`,
    `<p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Total</strong><br/><span style="color:#d4af37;font-size:18px;font-weight:700;">$${esc(totalPrice.toFixed(2))}</span></p>`,
  ];
  if (serviceName) {
    rows.unshift(`<p style="margin:0 0 8px;"><strong style="color:#a1a1aa;">Service</strong><br/><span style="color:#fafafa;">${esc(serviceName)}</span></p>`);
  }
  if (bookingDate || bookingTime) {
    rows.push(
      `<p style="margin:0;"><strong style="color:#a1a1aa;">When</strong><br/><span style="color:#fafafa;">${esc(bookingDate ?? "—")} ${esc(bookingTime ?? "")}</span></p>`
    );
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;">New booking received.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#27272a;border-radius:10px;padding:20px;">
      <tr>
        <td style="color:#e4e4e7;font-size:14px;">
          ${rows.join("")}
        </td>
      </tr>
    </table>
  `;

  return getEmailLayoutHtml({
    title: "New Booking — Arise And Shine VT",
    headline: "New Booking",
    bodyHtml,
  });
}
