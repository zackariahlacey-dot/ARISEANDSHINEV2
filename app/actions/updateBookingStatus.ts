"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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

  // Award reward points when an admin marks a booking as completed
  let pointsAwarded = 0;
  if (newStatus === "completed" && profileId && totalPrice > 0) {
    pointsAwarded = Math.floor(Math.max(0, totalPrice));

    const { data: prof } = await supabase
      .from("profiles")
      .select("reward_points")
      .eq("id", profileId)
      .single();

    if (prof && typeof prof.reward_points === "number") {
      await supabase
        .from("profiles")
        .update({ reward_points: prof.reward_points + pointsAwarded })
        .eq("id", profileId);
    }
  }

  return { success: true, pointsAwarded };
}
