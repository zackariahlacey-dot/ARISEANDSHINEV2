import { createClient } from "@/lib/supabase/server";
import { MarketingPage } from "./MarketingPage";
import type { CouponRow } from "@/app/actions/createCoupon";

export default async function MarketingServerPage() {
  const supabase = await createClient();

  const [{ data: coupons }, { count: recipientCount }] = await Promise.all([
    supabase
      .from("coupons")
      .select("id, code, discount_amount, discount_percentage, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", ""),
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
