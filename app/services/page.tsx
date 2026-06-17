import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ServicesPage } from "@/components/landing/ServicesPage";
import type { Service } from "@/app/page";

export const metadata: Metadata = {
  title: "Detailing Services & Pricing | Arise & Shine VT",
  description:
    "Browse all mobile auto detailing services in Vermont — Interior, Exterior, Full Detail, Ultimate Series, and Monthly Maintenance Club. Transparent pricing, easy online booking.",
  keywords: [
    "Vermont auto detailing",
    "mobile car detailing Vermont",
    "Burlington VT car detail",
    "interior detailing Vermont",
    "ceramic coating Vermont",
    "car detailing prices Vermont",
    "auto detail near me Vermont",
  ],
  openGraph: {
    title: "Detailing Services & Pricing | Arise & Shine VT",
    description:
      "Vermont's premier mobile auto detailing service. Browse all services with transparent pricing and book online.",
    url: "https://ariseandshinevt.com/services",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://ariseandshinevt.com/services",
  },
};

async function ServicesDataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription"
    )
    .order("price_small", { ascending: true });

  return <ServicesPage services={services ?? []} />;
}

export default function ServicesRoute() {
  return (
    <Suspense fallback={<ServicesPage services={[]} />}>
      <ServicesDataProvider />
    </Suspense>
  );
}
