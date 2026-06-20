"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getEmailLayoutHtml } from "@/emails/Layout";

export async function sendReengagementEmails({ testOnly }: { testOnly: boolean }) {
  const supabase = createAdminClient();

  // Find customers whose last booking was > 90 days ago
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoffDateStr = ninetyDaysAgo.toISOString().split("T")[0];

  // We need to find profiles where their max booking_date is <= cutoffDateStr
  // Supabase doesn't have an easy "having max()" in simple postgrest, so we will fetch all profiles with bookings and filter.
  // Actually, we can fetch all bookings, group by user_id in JS, and find the latest.

  const { data: bookings, error: bookingsErr } = await supabase
    .from("bookings")
    .select("user_id, booking_date, status")
    .in("status", ["completed", "confirmed"]);

  if (bookingsErr) {
    return { success: false, error: bookingsErr.message };
  }

  // Find latest booking date per user
  const latestBookingMap: Record<string, string> = {};
  for (const b of (bookings || [])) {
    if (!b.user_id) continue;
    if (!latestBookingMap[b.user_id] || b.booking_date > latestBookingMap[b.user_id]) {
      latestBookingMap[b.user_id] = b.booking_date;
    }
  }

  // Filter users > 90 days
  const eligibleUserIds = Object.keys(latestBookingMap).filter(uid => latestBookingMap[uid] <= cutoffDateStr);

  if (eligibleUserIds.length === 0 && !testOnly) {
    return { success: true, sent: 0, msg: "No eligible customers found." };
  }

  // Get eligible profiles
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, first_name, email")
    .in("id", testOnly ? [] : eligibleUserIds) // if testOnly, we won't email real users
    .not("email", "is", null);

  if (profErr) {
    return { success: false, error: profErr.message };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>";
  let sent = 0;
  let skipped = 0;

  if (testOnly) {
    // Send to admin
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "contact@ariseandshinedetailing.com";
    await sendSingleReengagement(resend, from, adminEmail, "Admin (Test)");
    return { success: true, sent: 1, msg: `Test sent to admin.` };
  }

  for (const profile of (profiles || [])) {
    if (!profile.email) {
      skipped++;
      continue;
    }
    const res = await sendSingleReengagement(resend, from, profile.email, profile.first_name || "there");
    if (res) sent++;
    else skipped++;
  }

  return { success: true, sent, skipped, msg: `Sent to ${sent} customers.` };
}

async function sendSingleReengagement(resend: Resend, from: string, to: string, firstName: string) {
  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:40px;text-align:center;">
            <h1 style="color:#111111;font-size:24px;font-weight:900;margin:0 0 16px;">Time for a refresh? ✨</h1>
            <p style="color:#555555;font-size:16px;line-height:1.6;margin:0 0 24px;">
              Hi ${firstName}, it's been a little while since your last detail with Arise And Shine Detailing. 
              Keep your vehicle protected and looking its best!
            </p>
            <p style="color:#555555;font-size:16px;line-height:1.6;margin:0 0 32px;">
              Use code <strong style="color:#D4AF37;">REFRESH10</strong> for 10% off your next booking.
            </p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ariseandshinedetailing.com'}" style="display:inline-block;background-color:#D4AF37;color:#111111;font-size:16px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">
              Book Your Detail
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;

  const finalHtml = getEmailLayoutHtml({
    title: "Time for a refresh? - Arise And Shine Detailing",
    headline: "We've missed you!",
    bodyHtml
  });

  try {
    await resend.emails.send({
      from,
      to,
      subject: "Time for a refresh? 10% off inside ✨",
      html: finalHtml,
    });
    return true;
  } catch (err) {
    console.error("[sendSingleReengagement] error:", err);
    return false;
  }
}
