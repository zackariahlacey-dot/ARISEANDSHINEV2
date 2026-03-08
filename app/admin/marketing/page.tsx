export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingPage } from "./MarketingPage";
import type { CouponRow } from "@/app/actions/createCoupon";

export default async function MarketingServerPage() {
  const supabase = createAdminClient();

  const [{ data: coupons }, { count: recipientCount }] = await Promise.all([
    supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-white">Marketing</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Manage promo codes and send email campaigns to your customers
        </p>
      </div>

      <MarketingPage
        initialCoupons={(coupons ?? []) as CouponRow[]}
        recipientCount={recipientCount ?? 0}
      />
    </div>
  );
}
