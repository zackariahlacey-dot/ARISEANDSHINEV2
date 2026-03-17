"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendJobCompletedEmail } from "@/lib/email";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  profileId: string | null,
  totalPrice: number
): Promise<{ success: boolean; error?: string; pointsAwarded?: number }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId);

  if (error) {
    console.error("[updateBookingStatus]", error);
    return { success: false, error: error.message };
  }

  // Logic for Completed Bookings
  let pointsAwarded = 0;
  if (newStatus === "completed") {
    // 1. Fetch full details for the email
    const { data: booking } = await supabase
      .from("bookings")
      .select("*, profiles(*), services(name)")
      .eq("id", bookingId)
      .single();

    if (booking && booking.profiles) {
      const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      
      pointsAwarded = Math.floor(Math.max(0, totalPrice));

      // 2. Award Points
      if (typeof profile.reward_points === "number") {
        await supabase
          .from("profiles")
          .update({ reward_points: profile.reward_points + pointsAwarded })
          .eq("id", profile.id);
      }

      // 3. Send Completion Email / Receipt
      if (profile.email) {
        await sendJobCompletedEmail({
          customerName: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
          customerEmail: profile.email,
          serviceName: service?.name ?? "Detailing Service",
          amountPaid: totalPrice,
          pointsEarned: pointsAwarded,
        }).catch(err => console.error("[updateBookingStatus] Email error:", err));

        // 4. Schedule Review Follow-up (24 hours later)
        // Note: In a production serverless env, use a real task queue (like Upstash or Google Cloud Tasks)
        // For this environment, we will use a "fire and forget" setTimeout as a placeholder logic
        const dayInMs = 24 * 60 * 60 * 1000;
        const customerName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
        const customerEmail = profile.email;
        
        setTimeout(() => {
          import("@/lib/email").then(m => {
            m.sendReviewFollowupEmail({ customerName, customerEmail });
          });
        }, dayInMs);
      }
    }
  }

  return { success: true, pointsAwarded };
}
