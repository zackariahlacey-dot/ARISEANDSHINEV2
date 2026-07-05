import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";
import { getAddonOverridesMap } from "@/app/actions/addonPricing";
import { getNextAvailableSlot } from "@/lib/nextAvailable";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price_small: number;
  price_medium: number;
  price_large: number;
  price_extra_large: number;
  is_subscription: boolean;
  /** Optional Supabase service category — used by the booking modal to route
   *  semi truck and heavy equipment services into the right pathway. */
  category?: string | null;
  /** Optional is_active — customer-facing queries filter by this so
   *  retired SKUs never surface even if the migration hasn't run yet. */
  is_active?: boolean;
};

async function ServicesProvider() {
  const supabase = await createClient();

  const [{ data: services }, addonOverrides, nextSlot] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription, category, is_active")
      .eq("is_active", true)
      .order("price_small", { ascending: true }),
    getAddonOverridesMap(),
    getNextAvailableSlot().catch(() => null),
  ]);

  return <LandingPage services={services ?? []} addonOverrides={addonOverrides} nextSlot={nextSlot} />;
}

export default function Home() {
  return (
    <Suspense fallback={<LandingPage services={[]} addonOverrides={{}} nextSlot={null} />}>
      <ServicesProvider />
    </Suspense>
  );
}
