import { createClient } from "@/lib/supabase/server";
import { BookingsTable, type BookingRow } from "./BookingsTable";

export default async function BookingsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, booking_time, status, total_price, notes, user_id, profiles(first_name, last_name, phone, email), services(name), vehicles(make, model, year, size)"
    )
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[admin/bookings]", error);
  }

  const bookings = (data ?? []) as BookingRow[];

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
