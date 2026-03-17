export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { TodayClient, type TodayJobRow } from "./TodayClient";

export default async function TodayPage() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select(
      "id, user_id, booking_time, status, total_price, notes, profiles(first_name, last_name, phone), services(name), vehicles(make, model, year, size)"
    )
    .eq("booking_date", today)
    .neq("status", "cancelled")
    .order("booking_time", { ascending: true });

  const jobs: TodayJobRow[] = (bookingsData ?? []).map((b) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const service = Array.isArray(b.services) ? b.services[0] : b.services;
    const vehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
    
    // Extract address from notes (format: "📍 Service Location: [Address]")
    const notesStr = b.notes ?? "";
    const addressLine = notesStr.split("\n\n").find((l: string) => l.startsWith("📍"));
    const address = addressLine ? addressLine.replace("📍 Service Location: ", "") : null;

    return {
      id: b.id,
      booking_time: b.booking_time,
      status: b.status,
      total_price: b.total_price,
      customer_name: `${profile?.first_name ?? "Unknown"} ${profile?.last_name ?? ""}`.trim(),
      customer_phone: profile?.phone ?? null,
      customer_id: b.user_id, // Added
      service_name: service?.name ?? "Unknown Service",
      vehicle_desc: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.size})` : "Unknown Vehicle",
      address: address,
      notes: notesStr,
    };
  });

  return <TodayClient jobs={jobs} date={today} />;
}
