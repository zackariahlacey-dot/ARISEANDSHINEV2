export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { PlannerClient, type PlannerBooking } from "./PlannerClient";
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns";

export default async function PlannerPage() {
  const supabase = createAdminClient();

  // Fetch a 3-month window to allow for smooth month-to-month transitions
  const now = new Date();
  const start = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const end = format(endOfMonth(addMonths(now, 1)), "yyyy-MM-dd");

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select(
      "id, user_id, booking_date, booking_time, status, total_price, notes, profiles(first_name, last_name, phone), services(name), vehicles(make, model, year, size)"
    )
    .gte("booking_date", start)
    .lte("booking_date", end)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  const bookings: PlannerBooking[] = (bookingsData ?? []).map((b) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const service = Array.isArray(b.services) ? b.services[0] : b.services;
    const vehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
    
    // Extract address from notes (format: "📍 Service Location: [Address]")
    const notesStr = b.notes ?? "";
    const addressLine = notesStr.split("\n\n").find((l: string) => l.startsWith("📍"));
    const address = addressLine ? addressLine.replace("📍 Service Location: ", "") : null;

    return {
      id: b.id,
      userId: b.user_id,
      date: b.booking_date,
      time: b.booking_time,
      status: b.status,
      price: b.total_price,
      customerName: `${profile?.first_name ?? "Unknown"} ${profile?.last_name ?? ""}`.trim(),
      customerPhone: profile?.phone ?? null,
      serviceName: service?.name ?? "Unknown Service",
      vehicleDesc: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown Vehicle",
      notes: notesStr,
      address,
    };
  });

  return <PlannerClient initialBookings={bookings} />;
}
