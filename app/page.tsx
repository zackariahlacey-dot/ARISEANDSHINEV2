import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price_small: number;
  price_medium: number;
  price_large: number;
  price_extra_large: number;
  is_subscription: boolean;
};

async function ServicesProvider() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription")
    .order("price_small", { ascending: true });

  return <LandingPage services={services ?? []} />;
}

export default function Home() {
  return (
    <Suspense fallback={<LandingPage services={[]} />}>
      <ServicesProvider />
    </Suspense>
  );
}
