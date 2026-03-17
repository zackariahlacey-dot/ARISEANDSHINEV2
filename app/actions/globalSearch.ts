"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type SearchResult = {
  type: "customer" | "booking";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const supabase = createAdminClient();
  const q = query.toLowerCase().trim();

  // Search Profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(5);

  const customerResults: SearchResult[] = (profiles ?? []).map((p) => ({
    type: "customer",
    id: p.id,
    title: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown",
    subtitle: `Customer • ${p.phone ?? "No phone"}`,
    href: `/admin/customers/${p.id}`,
  }));

  // Search Bookings (by Date or ID or Service)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_date, service_id, services(name)")
    .or(`booking_date.ilike.%${q}%,id.ilike.%${q}%`)
    .limit(5);

  const bookingResults: SearchResult[] = (bookings ?? []).map((b) => {
    const service = Array.isArray(b.services) ? b.services[0] : b.services;
    return {
      type: "booking",
      id: b.id,
      title: `Job on ${b.booking_date}`,
      subtitle: `${service?.name ?? "Detailing"} • #${b.id.slice(0, 8)}`,
      href: `/admin/bookings`, // We don't have a detail page for booking, but we could add highlight?
    };
  });

  return [...customerResults, ...bookingResults];
}
