export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { ServicesManager, type ServiceRow } from "./ServicesManager";

export default async function AdminServicesPage() {
  const supabase = createAdminClient();
  const { data: servicesData } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription")
    .order("price_small", { ascending: true });

  const services: ServiceRow[] = (servicesData ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? null,
    price_small: Number(row.price_small) ?? 0,
    price_medium: Number(row.price_medium) ?? 0,
    price_large: Number(row.price_large) ?? 0,
    price_extra_large: Number(row.price_extra_large) ?? 0,
    is_subscription: Boolean(row.is_subscription),
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-white">Service Pricing</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Edit service names and prices by vehicle size. Click Save Changes to update.
        </p>
      </div>
      <ServicesManager initialServices={services} />
    </div>
  );
}
