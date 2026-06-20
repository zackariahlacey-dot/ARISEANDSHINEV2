"use server";

import { Resend } from "resend";
import { getBookingConfirmationHtml, type BookingConfirmationDetails } from "@/emails/BookingConfirmation";
import { getBookerAccountInviteHtml } from "@/emails/BookerAccountInvite";

/** Must match verified sender domain (ariseandshinedetailing.com) in Resend dashboard */
const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
const REPLY_TO = "contact@ariseandshinedetailing.com";

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

    const sn = bookingDetails.serviceName.toLowerCase();
    // Interior/Exterior/Full Detail bookings now flow through the Build Your
    // Package builder — surface that in the subject so customers recognize
    // their custom-built order.
    const isBuilderPackage = sn === "interior detail" || sn === "exterior detail" || sn === "full detail";
    const subjectPrefix = bookingDetails.isMaintenance
      ? "Your Maintenance Detail is Booked"
      : sn.includes("boat")
      ? "Your Boat Detail is Confirmed — Waterline Up"
      : sn.includes("rv") || sn.includes("motorhome")
      ? "Your RV Detail is Confirmed"
      : isBuilderPackage
      ? "Your Custom Detail Package is Scheduled"
      : "Your Detail is Confirmed";

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: customerEmail.trim(),
      replyTo: REPLY_TO,
      subject: `${subjectPrefix} — Arise And Shine Detailing`,
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

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ariseandshinedetailing.com").replace(/\/$/, "");
}

/**
 * Second email after booking: prompts guest bookers (no Auth user yet) to sign up.
 * Bookings/vehicles/points merge by email when they complete signup.
 */
export async function sendBookerAccountInviteEmail(params: {
  customerEmail: string;
  customerName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const customerEmail = params.customerEmail?.trim();
  if (!customerEmail) {
    return { ok: false, error: "Customer email is required" };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    console.warn("[sendBookerAccountInviteEmail] RESEND_API_KEY is not set — skipping.");
    return { ok: false, error: "Email is not configured" };
  }

  const signUpUrl = `${siteOrigin()}/auth/sign-up?email=${encodeURIComponent(customerEmail.toLowerCase())}&redirect=${encodeURIComponent("/#services")}`;

  try {
    const resend = new Resend(key);
    const html = getBookerAccountInviteHtml({
      customerName: params.customerName || "there",
      signUpUrl,
    });

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: customerEmail,
      replyTo: REPLY_TO,
      subject: "Create your account — see your booking & rewards — Arise And Shine Detailing",
      html,
    });

    if (error) {
      console.error("[sendBookerAccountInviteEmail]", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[sendBookerAccountInviteEmail]", err);
    return { ok: false, error: message };
  }
}
