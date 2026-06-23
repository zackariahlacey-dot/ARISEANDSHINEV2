import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BoatDetailingPage } from "@/components/landing/BoatDetailingPage";
import type { Service } from "@/app/page";
import { BOAT_DETAILING_SCHEMA } from "@/lib/serviceSchemas";

export const metadata: Metadata = {
  title: "Mobile Boat Detailing Vermont | Lake Champlain Specialists | Arise And Shine Detailing",
  description:
    "Mobile boat detailing in Vermont — dockside on Lake Champlain, Mallets Bay, Shelburne Bay & statewide. Boat Interior $15/ft · Boat Exterior $16/ft · Boat Full Detail $28/ft. Lake-safe products, no trailering required.",
  keywords: [
    "boat detailing Vermont",
    "marine detailing Vermont",
    "mobile boat detailing VT",
    "boat cleaning Vermont",
    "boat detailing Lake Champlain",
    "boat detailing Mallets Bay",
    "boat detailing Burlington VT",
    "boat detailing Colchester VT",
    "boat detailing Shelburne VT",
    "hull cleaning Vermont",
    "boat interior detailing Vermont",
    "boat wax Vermont",
    "pontoon cleaning Vermont",
    "boat detail price per foot Vermont",
    "dockside boat detailing Vermont",
  ],
  openGraph: {
    title: "Mobile Boat Detailing Vermont | Lake Champlain Specialists",
    description: "Dockside boat detailing — Interior $15/ft · Exterior $16/ft · Full Detail $28/ft. We come to your slip or driveway. Lake-safe products, statewide service.",
    url: "https://ariseandshinedetailing.com/boat-detailing",
    siteName: "Arise And Shine Detailing",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinedetailing.com/boat-detailing" },
};

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription, category")
    .eq("is_active", true)
    .order("price_small", { ascending: true });

  const BOAT_NAMES = ["Boat Interior", "Boat Exterior", "Boat Full Detail"];
  return (
    <BoatDetailingPage
      services={(services ?? []).filter((s: Service) =>
        !s.is_subscription && BOAT_NAMES.includes(s.name)
      )}
    />
  );
}

export default function BoatDetailingRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BOAT_DETAILING_SCHEMA) }}
      />
      <Suspense fallback={<BoatDetailingPage services={[]} />}>
        <DataProvider />
      </Suspense>
    </>
  );
}
