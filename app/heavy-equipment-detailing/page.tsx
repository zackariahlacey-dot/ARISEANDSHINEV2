import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HeavyEquipmentDetailingPage } from "@/components/landing/HeavyEquipmentDetailingPage";
import type { Service } from "@/app/page";
import { HEAVY_EQUIPMENT_DETAILING_SCHEMA } from "@/lib/serviceSchemas";

export const metadata: Metadata = {
  title: "Heavy Equipment Cab Detailing Vermont | Excavator, Dozer, Loader | Arise And Shine Detailing",
  description:
    "Mobile heavy equipment cab interior detailing in Vermont — excavators, dozers, loaders, skid steers, tractors, log trucks, dump trucks. We come to your job site or yard. Hourly available for tough jobs.",
  keywords: [
    "heavy equipment detailing Vermont",
    "excavator cab cleaning Vermont",
    "dozer cleaning Vermont",
    "skid steer interior detail",
    "tractor cab cleaning Vermont",
    "log truck interior Vermont",
    "dump truck cab detailing",
    "mobile equipment detailing Burlington VT",
    "construction equipment detailing Vermont",
    "municipal fleet detailing Vermont",
  ],
  openGraph: {
    title: "Heavy Equipment Cab Detailing Vermont | Arise And Shine Detailing",
    description:
      "Mobile cab interior detailing for excavators, dozers, loaders, and tractors. We come to your yard or job site. Hourly + flat-rate pricing available.",
    url: "https://ariseandshinedetailing.com/heavy-equipment-detailing",
    siteName: "Arise And Shine Detailing",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinedetailing.com/heavy-equipment-detailing" },
};

const HE_SERVICE_NAMES = ["Equipment Cab Reset", "Equipment Hourly Service"];

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription, category")
    .eq("is_active", true)
    .order("price_small", { ascending: true });

  return (
    <HeavyEquipmentDetailingPage
      services={(services ?? []).filter((s: Service) =>
        !s.is_subscription && (s.category === "Heavy Equipment" || HE_SERVICE_NAMES.includes(s.name))
      )}
    />
  );
}

export default function HeavyEquipmentRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HEAVY_EQUIPMENT_DETAILING_SCHEMA) }}
      />
      <Suspense fallback={<HeavyEquipmentDetailingPage services={[]} />}>
        <DataProvider />
      </Suspense>
    </>
  );
}
