import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceClubPage } from "@/components/landing/MaintenanceClubPage";
import type { Service } from "@/app/page";

export const metadata: Metadata = {
  title: "Monthly Car Detailing Vermont | Maintenance Club | Arise & Shine VT",
  description:
    "Vermont's premier monthly auto detailing subscription. Keep your vehicle in showroom condition year-round with our Maintenance Club — fixed monthly dates, premium products, priority scheduling.",
  keywords: [
    "monthly car detailing Vermont",
    "auto detailing subscription Vermont",
    "recurring car detail Vermont",
    "detailing membership Vermont",
    "monthly auto care Vermont",
    "car maintenance club Vermont",
    "auto detailing plan Burlington VT",
    "regular car cleaning Vermont",
  ],
  openGraph: {
    title: "Monthly Car Detailing Subscription Vermont | Arise & Shine VT",
    description: "Vermont's best recurring auto detailing plan. Priority scheduling, fixed monthly dates, premium products.",
    url: "https://ariseandshinevt.com/maintenance-club",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinevt.com/maintenance-club" },
};

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription")
    .order("price_small", { ascending: true });
  return <MaintenanceClubPage services={(services ?? []).filter((s: Service) => s.is_subscription)} />;
}

export default function MaintenanceClubRoute() {
  return (
    <Suspense fallback={<MaintenanceClubPage services={[]} />}>
      <DataProvider />
    </Suspense>
  );
}
