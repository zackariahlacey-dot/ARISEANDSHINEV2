export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { CustomersTable, type CustomerRow } from "./CustomersTable";

export default async function CustomersPage() {
  // Service-role client bypasses RLS so admin can read all profiles.
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, email, reward_points, lifetime_points, referral_code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/customers]", error);
  }

  // Fetch booking totals per profile (for lifetime value + booking count)
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("user_id, total_price, status");

  // Aggregate per profile
  const statsMap: Record<string, { count: number; spent: number }> = {};
  for (const row of bookingRows ?? []) {
    if (!row.user_id) continue;
    if (!statsMap[row.user_id]) statsMap[row.user_id] = { count: 0, spent: 0 };
    statsMap[row.user_id].count++;
    if (row.status === "confirmed" || row.status === "completed") {
      statsMap[row.user_id].spent += row.total_price ?? 0;
    }
  }

  const customers: CustomerRow[] = (profiles ?? []).map((p) => ({
    ...p,
    customer_name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null,
    lifetimeValue: statsMap[p.id]?.spent ?? 0,
    bookingCount: statsMap[p.id]?.count ?? 0,
  }));

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
