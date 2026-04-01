"use server";

import { Resend } from "resend";
import { getReviewRequestHtml } from "@/emails/ReviewRequest";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTestReviewEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const html = getReviewRequestHtml("Zack", "Full Interior & Exterior Detail");

    const { error } = await resend.emails.send({
      from: "Arise & Shine VT <bookings@ariseandshinevt.com>",
      to: "zackariahlacey@gmail.com",
      subject: "[TEST] How's the shine holding up? ✨ — Arise & Shine VT",
      html,
      replyTo: "contact@ariseandshinevt.com",
    });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
