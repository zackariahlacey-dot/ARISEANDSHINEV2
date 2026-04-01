import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PaintCorrectionPage } from "@/components/landing/PaintCorrectionPage";

export const metadata: Metadata = {
  title: "Paint Correction Vermont | Swirl Removal & Restoration | Arise & Shine VT",
  description:
    "Professional paint correction and restoration in Vermont. Level 1 single-stage polish and Level 2 two-stage compound correction — removing swirl marks, scratches, and oxidation. Mobile service statewide.",
  keywords: [
    "paint correction Vermont",
    "swirl mark removal Vermont",
    "car scratch removal Vermont",
    "paint restoration Vermont",
    "machine polish Vermont",
    "ceramic coating Vermont",
    "paint correction Burlington VT",
    "auto paint restoration Vermont",
    "oxidation removal Vermont",
  ],
  openGraph: {
    title: "Paint Correction & Restoration Vermont | Arise & Shine VT",
    description: "Level 1 & Level 2 machine paint correction — swirl removal, oxidation, and scratch reduction. Mobile statewide.",
    url: "https://ariseandshinevt.com/paint-correction",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinevt.com/paint-correction" },
};

async function DataProvider() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price_small, price_medium, price_large, price_extra_large, is_subscription")
    .order("price_small", { ascending: true });
  return <PaintCorrectionPage services={services ?? []} />;
}

export default function PaintCorrectionRoute() {
  return (
    <Suspense fallback={<PaintCorrectionPage services={[]} />}>
      <DataProvider />
    </Suspense>
  );
}
