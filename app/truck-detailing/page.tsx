import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TruckDetailingPage } from "@/components/landing/TruckDetailingPage";
import type { Service } from "@/app/page";
import { TRUCK_DETAILING_SCHEMA } from "@/lib/serviceSchemas";

export const metadata: Metadata = {
  title: "Mobile Semi Truck Detailing Vermont | Day Cab & Sleeper | Arise And Shine Detailing",
  description:
    "Mobile semi truck detailing in Vermont — yard washes, exterior detail, interior reset, sleeper cab service. Owner-operator and fleet pricing. We come to your yard, terminal, or truck stop. Free travel in Chittenden County.",
  keywords: [
    "semi truck detailing Vermont",
    "truck wash Vermont",
    "tractor trailer detailing Burlington VT",
    "mobile truck detailing Vermont",
    "fleet truck detailing Vermont",
    "owner operator detailing Vermont",
    "day cab interior detailing Vermont",
    "sleeper cab detailing Vermont",
    "truck aluminum polishing Vermont",
    "Williston truck wash",
    "mobile truck detailing Burlington",
    "Class 8 detailing Vermont",
  ],
  openGraph: {
    title: "Mobile Semi Truck Detailing Vermont | Arise And Shine Detailing",
    description:
      "Yard washes, exterior detail, interior reset for day cabs & sleepers. We come to your yard or terminal. Fleet pricing available.",
    url: "https://ariseandshinedetailing.com/truck-detailing",
    siteName: "Arise And Shine Detailing",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinedetailing.com/truck-detailing" },
};

const TRUCK_SERVICE_NAMES = [
  "Truck Yard Wash",
  "Truck Exterior Refresh — Day Cab",
  "Truck Exterior Refresh — Sleeper",
  "Premium Exterior Detail — Day Cab",
  "Premium Exterior Detail — Sleeper",
  "Day Cab Interior Reset",
  "Sleeper Cab Interior Reset",
  "Day Cab Complete",
  "Sleeper Cab Complete",
];

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription, category")
    .eq("is_active", true)
    .order("price_small", { ascending: true });

  return (
    <TruckDetailingPage
      services={(services ?? []).filter((s: Service) =>
        !s.is_subscription && (s.category === "Truck" || TRUCK_SERVICE_NAMES.includes(s.name))
      )}
    />
  );
}

export default function TruckDetailingRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TRUCK_DETAILING_SCHEMA) }}
      />
      <Suspense fallback={<TruckDetailingPage services={[]} />}>
        <DataProvider />
      </Suspense>
    </>
  );
}
