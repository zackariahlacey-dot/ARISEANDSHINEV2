export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomerDetailClient, type CustomerDetailData } from "./CustomerDetailClient";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const customerId = params.id;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", customerId)
    .single();

  if (!profile) {
    notFound();
  }

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", customerId);

  // Fetch bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, status, total_price, notes, services(name)")
    .eq("user_id", customerId)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false });

  // Calculate lifetime value
  const lifetimeValue = (bookings ?? [])
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  const customerData: CustomerDetailData = {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    phone: profile.phone,
    reward_points: profile.reward_points,
    lifetimeValue,
    bookingCount: (bookings ?? []).length,
    vehicles: vehicles ?? [],
    bookings: (bookings ?? []).map(b => ({
      ...b,
      service_name: Array.isArray(b.services) ? b.services[0]?.name : b.services?.name ?? "Unknown Service"
    })),
  };

  return <CustomerDetailClient customer={customerData} />;
}
