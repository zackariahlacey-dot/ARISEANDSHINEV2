"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendUpdatedBookingEmail } from "@/lib/email";

/** Converts "9:00 AM" → "09:00:00" for PostgreSQL time */
function to24h(time12: string): string {
  const trimmed = time12.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return trimmed;
  let h = parseInt(match[1], 10);
  const m = match[2];
  if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
  if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${m}:00`;
}

export async function updateBookingSchedule(
  bookingId: string,
  newDate: string,
  newTime: string
): Promise<{ success: boolean; error?: string }> {
  if (!bookingId?.trim()) {
    return { success: false, error: "Booking ID is required." };
  }
  if (!newDate?.trim() || !newTime?.trim()) {
    return { success: false, error: "Date and time are required." };
  }

  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, profiles(first_name, last_name, email), services(name)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("[updateBookingSchedule] fetch:", fetchError);
    return { success: false, error: "Booking not found." };
  }

  const time24 = to24h(newTime);

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ booking_date: newDate, booking_time: time24 })
    .eq("id", bookingId);

  if (updateError) {
    console.error("[updateBookingSchedule] update:", updateError);
    return { success: false, error: updateError.message };
  }

  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const customerName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Customer"
    : "Customer";
  const customerEmail = profile?.email ?? "";

  if (customerEmail) {
    await sendUpdatedBookingEmail({
      customerName,
      customerEmail,
      serviceName: (service as { name?: string } | null)?.name ?? "Appointment",
      newDate,
      newTime,
    });
  }

  return { success: true };
}
