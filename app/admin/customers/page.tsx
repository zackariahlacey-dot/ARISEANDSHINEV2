export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { CustomersTable, type CustomerRow } from "./CustomersTable";

type ProfileWithBookings = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  reward_points: number | null;
  lifetime_points: number | null;
  referral_code: string | null;
  created_at: string | null;
  bookings?: { id: string; total_price: number | null }[] | null;
};

export default async function CustomersPage() {
  const supabase = createAdminClient();

  const { data: profilesData, error } = await supabase
    .from("profiles")
    .select("*, bookings(id, total_price)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/customers]", error);
  }

  const customers: CustomerRow[] = (profilesData ?? []).map((p: ProfileWithBookings) => {
    const bookings = p.bookings ?? [];
    const lifetimeValue = bookings.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
    const bookingCount = bookings.length;
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      customer_name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null,
      phone: p.phone,
      reward_points: p.reward_points,
      referral_code: p.referral_code,
      created_at: p.created_at,
      lifetime_points: p.lifetime_points,
      lifetimeValue,
      bookingCount,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-2xl font-black text-white">Customers</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Arise And Shine VT — Full CRM: search, sort by value, and edit reward points or contact info
        </p>
      </div>

      <CustomersTable initialCustomers={customers} />
    </div>
  );
}
