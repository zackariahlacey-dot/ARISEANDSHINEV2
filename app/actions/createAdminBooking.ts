"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingEmail } from "@/app/actions/sendBookingEmail";
import { sendBookingEmails } from "@/lib/email";
import { Resend } from "resend";
import Stripe from "stripe";
import { getTravelFee } from "@/lib/travelFee";

const VEHICLE_SIZE_MAP = {
  compact: "small",
  sedan: "medium",
  suv: "large",
  xl: "extra_large",
} as const;

function to24h(time12: string): string {
  const [timePart, period] = time12.split(" ");
  const [rawH, rawM = "00"] = timePart.split(":");
  let h = parseInt(rawH, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${rawM}:00`;
}

function toPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 10);
}

export type CreateAdminBookingPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleSize: keyof typeof VEHICLE_SIZE_MAP;
  serviceId: string;
  serviceName: string;
  totalPrice: number;
  bookingDate: string;
  bookingTime: string;
  paymentOption: "pay_at_arrival" | "send_invoice";
  serviceAddress?: string;
  travelFee?: number;
  setupFee?: number;
  notes?: string;
};

export type CreateAdminBookingResult =
  | { success: true; bookingId: string; invoiceUrl?: string }
  | { success: false; error: string };

export async function createAdminBooking(
  payload: CreateAdminBookingPayload
): Promise<CreateAdminBookingResult> {
  const supabase = createAdminClient();
  const phoneDigits = toPhoneDigits(payload.phone);
  if (phoneDigits.length < 10) {
    return { success: false, error: "A valid phone number is required." };
  }
  if (!payload.bookingDate || !payload.bookingTime) {
    return { success: false, error: "Date and time are required." };
  }
  if (!payload.serviceId || !payload.serviceName || payload.totalPrice <= 0) {
    return { success: false, error: "Valid service and price are required." };
  }

  // Calculate distance for admin alerts
  let distanceMiles = 0;
  if (payload.serviceAddress) {
    const feeRes = await getTravelFee(payload.serviceAddress);
    if (feeRes.ok) distanceMiles = feeRes.distanceMiles;
  }

  // 1. Find or create profile
  let profileId: string;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phoneDigits)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    profileId = existing.id;
    await supabase
      .from("profiles")
      .update({
        first_name: payload.firstName.trim() || null,
        last_name: payload.lastName.trim() || null,
        email: payload.email.trim() || null,
      })
      .eq("id", profileId);
  } else {
    profileId = crypto.randomUUID();
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: profileId,
      first_name: payload.firstName.trim() || null,
      last_name: payload.lastName.trim() || null,
      email: payload.email.trim() || null,
      phone: phoneDigits,
      reward_points: 0,
      lifetime_points: 0,
    });
    if (profileErr) {
      console.error("[createAdminBooking] profile insert:", profileErr);
      return { success: false, error: "Could not create customer profile." };
    }
  }

  // 2. Insert vehicle
  const { data: vehicle, error: vehicleErr } = await supabase
    .from("vehicles")
    .insert({
      user_id: profileId,
      make: payload.vehicleMake.trim(),
      model: payload.vehicleModel.trim(),
      year: parseInt(payload.vehicleYear, 10) || new Date().getFullYear(),
      size: VEHICLE_SIZE_MAP[payload.vehicleSize],
    })
    .select("id")
    .single();

  if (vehicleErr || !vehicle) {
    console.error("[createAdminBooking] vehicle insert:", vehicleErr);
    return { success: false, error: "Could not save vehicle." };
  }

  const status =
    payload.paymentOption === "pay_at_arrival" ? "confirmed" : "pending_payment";
  
  const paymentMethodText = payload.paymentOption === "pay_at_arrival" 
    ? "💳 Payment: Pay at Arrival (admin-created)" 
    : "💳 Payment: Stripe Invoice (admin-created)";

  const notesBody = [
    paymentMethodText,
    payload.serviceAddress ? `📍 Service Location: ${payload.serviceAddress}` : null,
    payload.travelFee != null && payload.travelFee > 0 ? `🚗 Travel Fee: $${payload.travelFee.toFixed(2)}` : null,
    payload.setupFee != null && payload.setupFee > 0 ? `🧹 One-time Setup & Reset: $${payload.setupFee.toFixed(2)}` : null,
    payload.notes || null,
  ].filter(Boolean).join("\n\n");

  // 3. Insert booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      user_id: profileId,
      vehicle_id: vehicle.id,
      service_id: payload.serviceId,
      booking_date: payload.bookingDate,
      booking_time: to24h(payload.bookingTime),
      status,
      total_price: payload.totalPrice,
      notes: notesBody,
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    console.error("[createAdminBooking] booking insert:", bookingErr);
    return { success: false, error: "Could not create booking." };
  }

  const customerName = [payload.firstName, payload.lastName].filter(Boolean).join(" ") || "Customer";
  const bookingTime12 = payload.bookingTime;

  // 4a. Stripe Invoice
  if (payload.paymentOption === "send_invoice") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { success: false, error: "Stripe is not configured. Use Pay at Arrival." };
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com";
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    let invoiceUrl: string | undefined;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(payload.totalPrice * 100),
              product_data: {
                name: payload.serviceName,
                description: `${payload.vehicleYear} ${payload.vehicleMake} ${payload.vehicleModel} · ${payload.bookingDate} at ${payload.bookingTime}`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: payload.email?.trim() || undefined,
        metadata: { booking_id: booking.id },
        success_url: `${origin}/admin/bookings?paid=1`,
        cancel_url: `${origin}/admin/bookings`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      });
      invoiceUrl = session.url ?? undefined;
    } catch (stripeErr) {
      console.error("[createAdminBooking] Stripe session:", stripeErr);
      return { success: false, error: "Could not create invoice link." };
    }

    if (payload.email?.trim() && invoiceUrl) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
      const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #d4af37;">
        <tr><td style="padding:32px 24px;">
          <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 8px;">Arise And Shine VT</p>
          <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Your detailing appointment has been scheduled!</p>
          <p style="color:#e4e4e7;font-size:15px;line-height:1.6;margin:0 0 24px;">Please pay your invoice to secure your spot.</p>
          <p style="text-align:center;margin:24px 0 0;">
            <a href="${invoiceUrl}" style="display:inline-block;background:#D4AF37;color:#0a0a0a;font-size:16px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Pay Invoice</a>
          </p>
          <p style="color:#71717a;font-size:12px;margin:24px 0 0;">${payload.serviceName} · ${payload.bookingDate} at ${payload.bookingTime}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
      await resend.emails.send({
        from,
        to: payload.email.trim(),
        subject: `Your Arise And Shine VT Appointment — Please Pay Your Invoice`,
        html,
      }).catch((err) => console.error("[createAdminBooking] invoice email:", err));
    }
  }

  // 4b. Send comprehensive emails (Admin & Customer)
  const emailData = {
    bookingId: booking.id,
    customerName,
    customerEmail: payload.email,
    customerPhone: phoneDigits,
    serviceName: payload.serviceName,
    servicePrice: payload.totalPrice,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    vehicleYear: payload.vehicleYear,
    vehicleMake: payload.vehicleMake,
    vehicleModel: payload.vehicleModel,
    vehicleSize: payload.vehicleSize,
    rewardPointsEarned: 0, // Points awarded on completion
    serviceAddress: payload.serviceAddress,
    distanceMiles,
    paymentMethod: (payload.paymentOption === "send_invoice" ? "pay_now" : "pay_at_arrival") as "pay_now" | "pay_at_arrival",
    notes: payload.notes,
  };

  if (payload.paymentOption === "pay_at_arrival" && payload.email?.trim()) {
    // Standard confirmation for Pay at Arrival
    await sendBookingEmail({
      customerEmail: payload.email.trim(),
      bookingDetails: {
        customerName,
        serviceName: payload.serviceName,
        vehicleYear: payload.vehicleYear,
        vehicleMake: payload.vehicleMake,
        vehicleModel: payload.vehicleModel,
        bookingDate: payload.bookingDate,
        bookingTime: bookingTime12,
        travelFee: payload.travelFee ?? 0,
        totalPrice: payload.totalPrice,
      },
      totalPrice: payload.totalPrice,
    }).catch((err) => console.error("[createAdminBooking] confirmation email:", err));
  }

  // Comprehensive Admin Alert
  await sendBookingEmails(emailData, { skipCustomerEmail: true }).catch((err) => 
    console.error("[createAdminBooking] admin email alert failed:", err)
  );

  return { success: true, bookingId: booking.id, invoiceUrl: payload.paymentOption === "send_invoice" ? "sent" : undefined };
}
