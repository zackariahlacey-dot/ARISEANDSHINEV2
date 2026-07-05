import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PaintCorrectionPage } from "@/components/landing/PaintCorrectionPage";
import type { Service } from "@/app/page";
import { getAddonOverridesMap } from "@/app/actions/addonPricing";

export const metadata: Metadata = {
  title: "Paint Correction Vermont | 1-Step & 2-Step + Premium Ceramic | Arise & Shine VT",
  description:
    "Professional paint correction in Vermont — 1-Step and 2-Step machine polish with optional Premium Ceramic coating. Set pricing by vehicle size, no hidden quotes.",
  keywords: [
    "paint correction Vermont",
    "ceramic coating Vermont",
    "1-step paint correction",
    "2-step paint correction",
    "swirl removal Vermont",
    "premium ceramic coating Burlington VT",
  ],
  openGraph: {
    title: "Paint Correction Vermont | Arise & Shine VT",
    description: "1-Step and 2-Step paint correction with Premium Ceramic add-ons. Set pricing, no quotes.",
    url: "https://ariseandshinedetailing.com/paint-correction",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinedetailing.com/paint-correction" },
};

async function DataProvider() {
  const supabase = await createClient();
  const [{ data: services }, addonOverrides] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription, category, is_active")
      .eq("is_active", true)
      .order("price_small", { ascending: true }),
    getAddonOverridesMap(),
  ]);
  const PC_NAMES = ["Paint Correction — 1 Step", "Paint Correction — 2 Step"];
  const pcServices = (services ?? []).filter((s: Service) => PC_NAMES.includes(s.name));
  const allServices = (services ?? []) as Service[];
  return <PaintCorrectionPage services={pcServices} allServices={allServices} addonOverrides={addonOverrides} />;
}

export default function PaintCorrectionRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <DataProvider />
    </Suspense>
  );
}
