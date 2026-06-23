import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DetailingPage } from "@/components/landing/DetailingPage";
import type { Service } from "@/app/page";
import { AUTO_DETAILING_SCHEMA } from "@/lib/serviceSchemas";

export const metadata: Metadata = {
  title: "Mobile Auto Detailing Vermont | Interior, Exterior & Basic Interior + Exterior | Arise And Shine Detailing",
  description:
    "Professional mobile car detailing services in Vermont — Interior Detail, Exterior Detail, and Basic Interior + Exterior packages. We come to your home or office. Transparent pricing, easy booking.",
  keywords: [
    "mobile car detailing Vermont",
    "auto detailing Burlington VT",
    "interior detailing Vermont",
    "exterior detailing Vermont",
    "full detail Vermont",
    "car detail near me Vermont",
    "mobile detailing Williston VT",
    "auto detailing South Burlington",
    "car wash Vermont",
    "professional detailing Vermont",
  ],
  openGraph: {
    title: "Mobile Auto Detailing Vermont | Arise And Shine Detailing",
    description: "Interior, Exterior & Basic Interior + Exterior — we come to you, anywhere in Vermont.",
    url: "https://ariseandshinedetailing.com/detailing",
    siteName: "Arise And Shine Detailing",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinedetailing.com/detailing" },
};

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription, category")
    .order("price_small", { ascending: true });
  const VEHICLE_NAMES = [
    "Interior Detail", "Exterior Detail", "Full Detail",
    "Ultimate Interior Reset", "Ultimate Interior + Exterior Reset",
  ];
  return <DetailingPage services={(services ?? []).filter((s: Service) =>
    !s.is_subscription && VEHICLE_NAMES.includes(s.name)
  )} />;
}

export default function DetailingRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(AUTO_DETAILING_SCHEMA) }}
      />
      <Suspense fallback={<DetailingPage services={[]} />}>
        <DataProvider />
      </Suspense>
    </>
  );
}
