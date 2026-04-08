"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingDeletionAuditEmail } from "@/lib/email";

export async function deleteBooking(bookingId: string): Promise<{
  success: boolean;
  error?: string;
  customerName?: string;
}> {
  if (!bookingId?.trim()) {
    return { success: false, error: "Arise And Shine VT: Booking ID is required." };
  }

  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, total_price, user_id, service_name, profiles(first_name, last_name)"
    )
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("[deleteBooking] fetch:", fetchError);
    return { success: false, error: "Arise And Shine VT: Booking not found." };
  }

  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const customerName =
    profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Customer"
      : "Customer";

  // Remove any linked block-outs or temporary hold records (if tables exist)
  await supabase.from("blocked_dates").delete().eq("booking_id", bookingId);
  await supabase.from("booking_holds").delete().eq("booking_id", bookingId);

  const { error: deleteError } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (deleteError) {
    console.error("[deleteBooking] delete:", deleteError);
    return { success: false, error: "Arise And Shine VT: Failed to delete booking." };
  }

  await sendBookingDeletionAuditEmail({
    customerName,
    bookingId,
    bookingDate: booking.booking_date,
  });

  // ── Reverse earned points ──────────────────────────────────────────────────
  const profileId = (booking.user_id as string | null);
  if (profileId) {
    const totalPrice = Number((booking as any).total_price) || 0;
    const pointsToReverse = Math.floor(Math.max(0, totalPrice));
    if (pointsToReverse > 0) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("reward_points, lifetime_points")
        .eq("id", profileId)
        .maybeSingle();
      if (prof) {
        const newReward = Math.max(0, (prof.reward_points ?? 0) - pointsToReverse);
        const newLifetime = Math.max(0, (prof.lifetime_points ?? 0) - pointsToReverse);
        await supabase
          .from("profiles")
          .update({ reward_points: newReward, lifetime_points: newLifetime })
          .eq("id", profileId);
        await supabase.from("point_transactions").insert({
          user_id: profileId,
          amount: -pointsToReverse,
          description: `Deleted booking — ${(booking as any).service_name ?? "Detailing Service"}`,
        });
      }
    }
  }

  return { success: true, customerName };
}
