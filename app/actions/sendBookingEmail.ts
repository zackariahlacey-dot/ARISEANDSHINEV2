"use server";

import { Resend } from "resend";
import { getBookingConfirmationHtml, type BookingConfirmationDetails } from "@/emails/BookingConfirmation";

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise And Shine VT <notify@ariseandshinevt.com>";

export type SendBookingEmailParams = {
  customerEmail: string;
  bookingDetails: BookingConfirmationDetails;
  totalPrice: number;
};

/**
 * Sends the premium Midnight & Champagne booking confirmation email via Resend.
 * Call this only after the booking has been successfully created in the database.
 */
export async function sendBookingEmail(params: SendBookingEmailParams): Promise<{ ok: boolean; error?: string }> {
  const { customerEmail, bookingDetails, totalPrice } = params;

  if (!customerEmail?.trim()) {
    return { ok: false, error: "Customer email is required" };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    console.warn("[sendBookingEmail] RESEND_API_KEY is not set — skipping.");
    return { ok: false, error: "Email is not configured" };
  }

  try {
    const resend = new Resend(key);
    const html = getBookingConfirmationHtml({
      ...bookingDetails,
      totalPrice,
    });

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: customerEmail.trim(),
      subject: `Your Detail is Confirmed — Arise And Shine VT`,
      html,
    });

    if (error) {
      console.error("[sendBookingEmail]", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[sendBookingEmail]", err);
    return { ok: false, error: message };
  }
}
