"use server";

import { createResend } from "@/lib/mailer";
import { getReviewRequestHtml } from "@/emails/ReviewRequest";

const resend = createResend();

export async function sendTestReviewEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const html = getReviewRequestHtml("Zack", "Full Interior & Exterior Detail");

    const { error } = await resend.emails.send({
      from: "Arise And Shine Detailing <bookings@ariseandshinedetailing.com>",
      to: "zackariahlacey@gmail.com",
      subject: "[TEST] How's the shine holding up? ✨ — Arise And Shine Detailing",
      html,
      replyTo: "contact@ariseandshinedetailing.com",
    });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
