import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BoatDetailingPage } from "@/components/landing/BoatDetailingPage";
import type { Service } from "@/app/page";
import { BOAT_DETAILING_SCHEMA } from "@/lib/serviceSchemas";

export const metadata: Metadata = {
  title: "Mobile Boat Detailing Vermont | Per-Foot Pricing | Arise & Shine VT",
  description:
    "Professional mobile boat detailing in Vermont. Interior Detail from $18/ft, Exterior from $20/ft, Full Detail from $32/ft. We come to your marina, dock, or driveway. Lake Champlain area specialists.",
  keywords: [
    "boat detailing Vermont",
    "marine detailing Vermont",
    "mobile boat detailing VT",
    "boat cleaning Vermont",
    "boat detailing Lake Champlain",
    "hull cleaning Vermont",
    "boat interior detailing Vermont",
    "boat wax Vermont",
    "marine detailing Burlington VT",
    "pontoon cleaning Vermont",
    "boat detail price per foot Vermont",
    "gelcoat restoration Vermont",
  ],
  openGraph: {
    title: "Mobile Boat Detailing Vermont | Arise & Shine VT",
    description: "Per-foot marine detailing — interior from $18/ft, exterior from $20/ft, full detail from $32/ft. We come to you.",
    url: "https://ariseandshinevt.com/boat-detailing",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinevt.com/boat-detailing" },
};

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription")
    .order("price_small", { ascending: true });

  const BOAT_NAMES = ["Boat Interior", "Boat Exterior", "Boat Full Detail", "Boat Showroom Package"];
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
