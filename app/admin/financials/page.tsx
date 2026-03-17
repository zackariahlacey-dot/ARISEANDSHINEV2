export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { FinancialsClient, type FinancialsData } from "./FinancialsClient";

export default async function FinancialsPage() {
  const supabase = createAdminClient();

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, booking_date, total_price, status, stripe_checkout_session_id, services(name), profiles(first_name, last_name, email, phone)")
    .in("status", ["confirmed", "completed"])
    .order("booking_date", { ascending: false });

  const bookings: FinancialsData[] = (bookingsData ?? []).map((b) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const service = Array.isArray(b.services) ? b.services[0] : b.services;
    
    return {
      id: b.id,
      date: b.booking_date,
      amount: Number(b.total_price) || 0,
      status: b.status,
      isOnline: !!b.stripe_checkout_session_id,
      serviceName: service?.name ?? "Unknown Service",
      customerName: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
      customerEmail: profile?.email ?? "",
      customerPhone: profile?.phone ?? "",
    };
  });

  return <FinancialsClient bookings={bookings} />;
}
