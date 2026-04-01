"use server";

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const SIZE_LABELS: Record<string, string> = {
  compact: "Compact",
  sedan: "Sedan / Coupe",
  suv: "SUV / Crossover",
  truck: "Truck / Van",
};

export async function sendStripePaymentLink(bookingId: string, booking: {
  serviceName: string;
  totalPrice: number;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleSize?: string;
  bookingDate: string;
  bookingTime: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<{ url: string; emailSent: boolean } | { error: string }> {
  try {
    const {
      serviceName,
      totalPrice,
      vehicleYear = "",
      vehicleMake = "",
      vehicleModel = "",
      vehicleSize = "",
      bookingDate,
      bookingTime,
      customerEmail,
      customerName,
    } = booking;

    if (!totalPrice || totalPrice <= 0) {
      return { error: "Invalid price for this booking." };
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(totalPrice * 100),
            product_data: {
              name: serviceName,
              description: [
                vehicleYear && vehicleMake && vehicleModel
                  ? `${vehicleYear} ${vehicleMake} ${vehicleModel}`
                  : null,
                vehicleSize ? (SIZE_LABELS[vehicleSize] ?? vehicleSize) : null,
                `${bookingDate} at ${bookingTime}`,
              ]
                .filter(Boolean)
                .join(" · "),
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      metadata: {
        bookingId,
        source: "admin_payment_link",
      },
      success_url: `${origin}/admin/schedule?payment=success`,
      cancel_url: `${origin}/admin/schedule?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    });

    const paymentUrl = session.url!;

    // ── Send email if we have a customer email ──────────────────────────────
    let emailSent = false;
    if (customerEmail) {
      try {
        const { sendCustomEmailAction } = await import("@/app/actions/adminActions");
        const firstName = customerName?.split(" ")[0] || "there";
        const vehicleStr = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ");
        const emailBody = `Hi ${firstName},

Your Arise & Shine VT payment link is ready!

Service: ${serviceName}${vehicleStr ? `\nVehicle: ${vehicleStr}` : ""}
Date: ${bookingDate} at ${bookingTime}
Amount Due: $${totalPrice}

Click the button below to pay securely via Stripe (link expires in 24 hours):

${paymentUrl}

If you have any questions, just reply to this email or call us at 802-585-5563.

Thanks,
Zack — Arise & Shine VT`;

        // Use a version that renders the link as a proper button
        const { Resend } = await import("resend");
        const key = process.env.RESEND_API_KEY;
        if (key) {
          const resend = new Resend(key);
          const fromAddr = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
          const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#18181b;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;text-align:center;border-bottom:1px solid #27272a;">
              <p style="color:#d4af37;font-size:15px;font-weight:900;margin:0;letter-spacing:0.05em;text-transform:uppercase;">Arise And Shine VT</p>
              <p style="color:#71717a;font-size:10px;margin:4px 0 0;letter-spacing:0.15em;text-transform:uppercase;">Premium Mobile Auto Detailing</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="font-size:20px;font-weight:900;color:#ffffff;margin:0 0 8px;">Your Payment Link is Ready</p>
              <p style="font-size:14px;color:#a1a1aa;margin:0 0 20px;line-height:1.6;">Hi ${firstName}, your Arise &amp; Shine VT invoice is ready to pay securely online.</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #27272a;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Service</span><br>
                    <span style="font-size:14px;color:#e4e4e7;font-weight:600;">${serviceName}</span>
                  </td>
                </tr>
                ${vehicleStr ? `<tr><td style="padding:12px 0;border-bottom:1px solid #27272a;"><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Vehicle</span><br><span style="font-size:14px;color:#e4e4e7;font-weight:600;">${vehicleStr}</span></td></tr>` : ""}
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #27272a;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Date &amp; Time</span><br>
                    <span style="font-size:14px;color:#e4e4e7;font-weight:600;">${bookingDate} at ${bookingTime}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Amount Due</span><br>
                    <span style="font-size:22px;color:#d4af37;font-weight:900;">$${totalPrice}</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;text-align:center;">
                <a href="${paymentUrl}" style="display:inline-block;padding:14px 32px;background-color:#d4af37;color:#000000;font-size:13px;font-weight:900;text-decoration:none;border-radius:8px;letter-spacing:0.08em;text-transform:uppercase;">Pay Now — $${totalPrice}</a>
              </div>
              <p style="font-size:11px;color:#52525b;margin:16px 0 0;text-align:center;">Link expires in 24 hours · Powered by Stripe</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;text-align:center;border-top:1px solid #27272a;">
              <p style="font-size:11px;color:#52525b;margin:0;">Questions? Call <a href="tel:8025855563" style="color:#d4af37;text-decoration:none;">802-585-5563</a> or reply to this email.</p>
              <p style="font-size:11px;color:#52525b;margin:4px 0 0;">&copy; 2026 Arise And Shine VT. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          await resend.emails.send({
            from: fromAddr,
            to: customerEmail,
            replyTo: "contact@ariseandshinevt.com",
            subject: `Your Payment Link — ${serviceName} · $${totalPrice}`,
            html,
          });
          emailSent = true;
        }
      } catch (emailErr) {
        console.error("[sendStripePaymentLink] Email failed:", emailErr);
        // Don't fail the whole call — URL is still valid
      }
    }

    return { url: paymentUrl, emailSent };
  } catch (err) {
    console.error("[sendStripePaymentLink]", err);
    return { error: err instanceof Error ? err.message : "Failed to create payment link." };
  }
}

