export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { MembershipsClient, type MembershipRow } from "./MembershipsClient";

export default async function MembershipsPage() {
  const supabase = createAdminClient();

  // Find all customers who have at least one "Monthly" service in their booking history
  // In a real Stripe app, we would query the `subscriptions` table.
  // Since we are tracking recurring revenue in the dashboard from a `subscriptions` table, 
  // let's try to query that table directly.

  const { data: subsData } = await supabase
    .from("subscriptions")
    .select("*, profiles(id, first_name, last_name, phone, email)")
    .eq("status", "active");

  const memberships: MembershipRow[] = (subsData ?? []).map((s: any) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      id: s.id,
      userId: profile?.id || s.user_id,
      customerName: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Unknown",
      phone: profile?.phone || "—",
      email: profile?.email || "—",
      planName: s.price >= 150 ? "Full Detail Maintenance" : "Interior Maintenance",
      price: s.price,
      nextBilling: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString().split('T')[0] : "—",
      status: s.status
    };
  });

  return <MembershipsClient initialMemberships={memberships} />;
}
