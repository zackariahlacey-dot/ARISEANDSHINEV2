"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingCancellationEmails } from "@/lib/email";

export async function cancelBooking(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!bookingId?.trim()) {
    return { success: false, error: "Booking ID is required." };
  }

  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, booking_time, status, profiles(first_name, last_name, email), services(name)"
    )
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("[cancelBooking] fetch:", fetchError);
    return { success: false, error: "Booking not found." };
  }

  if (booking.status === "cancelled") {
    return { success: false, error: "This booking is already cancelled." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (updateError) {
    console.error("[cancelBooking] update:", updateError);
    return { success: false, error: updateError.message };
  }

  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const customerName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Customer"
    : "Customer";
  const customerEmail = profile?.email ?? "";
  const bookingTime = booking.booking_time
    ? new Date(`1970-01-01T${booking.booking_time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const serviceName = (service as { name?: string } | null)?.name ?? "Appointment";

  await sendBookingCancellationEmails({
    customerName,
    customerEmail,
    bookingDate: booking.booking_date,
    bookingTime,
    serviceName,
  });

  return { success: true };
}
