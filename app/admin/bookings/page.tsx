export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { BookingsTable, type BookingRow } from "./BookingsTable";
import { BookingsPageClient } from "./BookingsPageClient";
import type { ServiceOption } from "./NewBookingSheet";

export default async function BookingsPage() {
  const supabase = createAdminClient();
  let bookings: BookingRow[] = [];
  let services: ServiceOption[] = [];

  try {
    const [{ data: bookingsData, error: bookingsError }, { data: servicesData }] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "*, profiles:user_id(first_name, last_name, phone), vehicles:vehicle_id(year, make, model), services:service_id(name), coupons:coupon_id(code)"
        )
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: false })
        .limit(500),
      supabase
        .from("services")
        .select("id, name, price_small, price_medium, price_large, price_extra_large")
        .order("price_small", { ascending: true }),
    ]);

    if (bookingsError) {
      console.error("[admin/bookings] query error:", bookingsError.message);
    } else if (bookingsData && Array.isArray(bookingsData)) {
      bookings = bookingsData as BookingRow[];
    }
    if (servicesData && Array.isArray(servicesData)) {
      services = servicesData as ServiceOption[];
    }
  } catch (err) {
    console.error("[admin/bookings] fetch failed:", err);
  }

  return (
    <BookingsPageClient
      initialBookings={bookings}
      services={services}
    />
  );
}
