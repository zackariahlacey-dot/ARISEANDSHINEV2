import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RVDetailingPage } from "@/components/landing/RVDetailingPage";
import type { Service } from "@/app/page";
import { RV_DETAILING_SCHEMA } from "@/lib/serviceSchemas";

export const metadata: Metadata = {
  title: "Mobile RV Detailing Vermont | Per-Foot Pricing | Arise & Shine VT",
  description:
    "Mobile RV, motorhome, and travel trailer detailing in Vermont. RV Exterior $15/ft · RV Interior $25/ft · RV Full Detail $38/ft. We come to your campsite, storage facility, or driveway statewide.",
  keywords: [
    "RV detailing Vermont",
    "motorhome detailing Vermont",
    "mobile RV detailing VT",
    "RV cleaning Vermont",
    "RV exterior detail Burlington VT",
    "motorhome interior detail Vermont",
    "travel trailer detailing Vermont",
    "fifth wheel detailing Vermont",
    "RV detailing price per foot Vermont",
    "camper detail Vermont",
    "RV wash Vermont",
    "RV detailing Stowe",
    "RV detailing Burlington",
    "RV detailing Killington",
    "Class A motorhome detailing Vermont",
  ],
  openGraph: {
    title: "Mobile RV Detailing Vermont | Arise & Shine VT",
    description: "Per-foot RV detailing — Exterior $15/ft · Interior $25/ft · Full Detail $38/ft. We come to your campsite, dealer lot, or driveway statewide.",
    url: "https://ariseandshinevt.com/rv-detailing",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinevt.com/rv-detailing" },
};

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription")
    .eq("is_active", true)
    .order("price_small", { ascending: true });

  const RV_NAMES = ["RV Exterior", "RV Interior", "RV Full Detail"];
  return (
    <RVDetailingPage
      services={(services ?? []).filter((s: Service) =>
        !s.is_subscription && RV_NAMES.includes(s.name)
      )}
    />
  );
}

export default function RVDetailingRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(RV_DETAILING_SCHEMA) }}
      />
      <Suspense fallback={<RVDetailingPage services={[]} />}>
        <DataProvider />
      </Suspense>
    </>
  );
}
