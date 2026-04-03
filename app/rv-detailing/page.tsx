import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RVDetailingPage } from "@/components/landing/RVDetailingPage";
import type { Service } from "@/app/page";

export const metadata: Metadata = {
  title: "Mobile RV Detailing Vermont | Per-Foot Pricing | Arise & Shine VT",
  description:
    "Professional mobile RV detailing in Vermont. Interior from $20/ft, Exterior from $22/ft, Full Detail from $38/ft. We come to your campsite, driveway, or storage facility. Serving Lake Champlain area.",
  keywords: [
    "RV detailing Vermont",
    "motorhome detailing Vermont",
    "mobile RV detailing VT",
    "RV cleaning Vermont",
    "RV exterior detail Burlington VT",
    "motorhome interior detail Vermont",
    "RV wax Vermont",
    "travel trailer detailing Vermont",
    "RV detailing price per foot Vermont",
    "camper detail Vermont",
    "fifth wheel detailing Vermont",
  ],
  openGraph: {
    title: "Mobile RV Detailing Vermont | Arise & Shine VT",
    description: "Per-foot RV detailing — interior from $20/ft, exterior from $22/ft, full detail from $38/ft. We come to you.",
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

  const RV_NAMES = ["RV Interior Detail", "RV Exterior Detail", "RV Full Detail"];
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
