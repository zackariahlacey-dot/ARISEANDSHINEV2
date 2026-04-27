import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RVDetailingPage } from "@/components/landing/RVDetailingPage";
import type { Service } from "@/app/page";

export const metadata: Metadata = {
  title: "Mobile RV Detailing Vermont | Per-Foot Pricing | Arise & Shine VT",
  description:
    "Professional mobile RV detailing in Vermont. Exterior Refresh from $18/ft, Living Space Reset from $28/ft, Ultimate Transformation from $50/ft. We come to your campsite, driveway, or storage facility.",
  keywords: [
    "RV detailing Vermont",
    "motorhome detailing Vermont",
    "mobile RV detailing VT",
    "RV cleaning Vermont",
    "RV exterior detail Burlington VT",
    "motorhome interior detail Vermont",
    "RV oxidation restoration Vermont",
    "travel trailer detailing Vermont",
    "RV detailing price per foot Vermont",
    "camper detail Vermont",
    "fifth wheel detailing Vermont",
  ],
  openGraph: {
    title: "Mobile RV Detailing Vermont | Arise & Shine VT",
    description: "Per-foot RV detailing — exterior refresh $18/ft, living space reset $28/ft, full transformation $50/ft. We come to you.",
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
    .order("price_small", { ascending: true });

  const RV_NAMES = ["RV Exterior Refresh", "RV Living Space Reset", "RV Ultimate Transformation", "RV Oxidation Restoration"];
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
    <Suspense fallback={<RVDetailingPage services={[]} />}>
      <DataProvider />
    </Suspense>
  );
}
