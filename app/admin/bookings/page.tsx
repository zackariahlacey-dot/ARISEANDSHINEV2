export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { BookingsTable, type BookingRow } from "./BookingsTable";

export default async function BookingsPage() {
  let bookings: BookingRow[] = [];

  try {
    // Service-role client bypasses RLS so admin can read all bookings.
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_date, booking_time, status, total_price, notes, user_id, profiles(first_name, last_name, phone, email), services(name), vehicles(make, model, year, size)"
      )
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[admin/bookings] query error:", error.message);
      // Ensure we still pass an array; table will show "No bookings yet" or empty state
    } else if (data && Array.isArray(data)) {
      bookings = data as BookingRow[];
    }
  } catch (err) {
    console.error("[admin/bookings] fetch failed:", err);
    // Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL will throw here
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-2xl font-black text-white">Bookings</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          All appointments — search, sort, and update status in real time
        </p>
      </div>

      <BookingsTable initialBookings={bookings} />
    </div>
  );
}
