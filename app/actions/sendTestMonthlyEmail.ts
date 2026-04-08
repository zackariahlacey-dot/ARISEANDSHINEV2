"use server";

import { Resend } from "resend";
import { signInviteToken, signScheduleToken } from "@/lib/monthlyToken";
import { getMonthlyPlanInviteHtml } from "@/emails/MonthlyPlanInvite";
import { getMonthlyPlanConfirmationHtml } from "@/emails/MonthlyPlanConfirmation";
import { getMonthlyScheduleReminderHtml } from "@/emails/MonthlyScheduleReminder";

const FROM  = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";
const SITE  = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com").replace(/\/$/, "");

export type TestEmailType = "invite" | "confirmation" | "reminder";

export async function sendTestMonthlyEmail(
  toEmail: string,
  emailType: TestEmailType
): Promise<{ ok: boolean; error?: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const DEMO_FIRST   = "Sarah";
  const DEMO_PLAN    = "Full Maintenance";
  const DEMO_PRICE   = 120;
  const DEMO_MAKE    = "Toyota";
  const DEMO_MODEL   = "RAV4";
  const DEMO_MONTH   = "2026-05"; // a future month for demo purposes

  try {
    if (emailType === "invite") {
      // Create a real signed invite token pointing to the onboard page
      const token = await signInviteToken(toEmail);
      const link  = `${SITE}/onboard/monthly?token=${token}`;
      const { error } = await resend.emails.send({
        from:    FROM,
        to:      toEmail,
        subject: "[TEST] You're invited to join the Monthly Detail Club — Arise & Shine VT",
        html:    getMonthlyPlanInviteHtml(DEMO_FIRST, link),
        replyTo: "contact@ariseandshinevt.com",
      });
      if (error) return { ok: false, error: error.message };
    }

    if (emailType === "confirmation") {
      const { error } = await resend.emails.send({
        from:    FROM,
        to:      toEmail,
        subject: `[TEST] You're in — ${DEMO_PLAN} monthly plan confirmed!`,
        html:    getMonthlyPlanConfirmationHtml(DEMO_FIRST, DEMO_PLAN, DEMO_PRICE, "stripe", DEMO_MAKE, DEMO_MODEL),
        replyTo: "contact@ariseandshinevt.com",
      });
      if (error) return { ok: false, error: error.message };
    }

    if (emailType === "reminder") {
      // Use a fake subscription ID for the demo token (token still verifiable, just won't find a real sub)
      const fakeSubId = "00000000-0000-0000-0000-000000000000";
      const token     = await signScheduleToken(fakeSubId, DEMO_MONTH);
      const link      = `${SITE}/schedule/monthly?token=${token}`;
      const { error } = await resend.emails.send({
        from:    FROM,
        to:      toEmail,
        subject: "[TEST] Pick your May detail date — Arise & Shine VT",
        html:    getMonthlyScheduleReminderHtml(DEMO_FIRST, DEMO_PLAN, DEMO_MONTH, link),
        replyTo: "contact@ariseandshinevt.com",
      });
      if (error) return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("[sendTestMonthlyEmail] error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
