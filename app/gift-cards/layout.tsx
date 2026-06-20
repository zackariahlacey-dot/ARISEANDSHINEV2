import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auto Detailing Gift Cards | Arise And Shine Detailing — Burlington, VT",
  description:
    "Give the gift of a spotless vehicle. Digital gift cards from $10 — delivered by email instantly. Redeemable on any mobile auto, boat, or RV detailing service in Vermont.",
  keywords: [
    "auto detailing gift card Vermont",
    "car detailing gift Burlington VT",
    "mobile detailing gift card",
    "Vermont auto detail gift",
    "detailing gift idea Vermont",
  ],
  openGraph: {
    title: "Auto Detailing Gift Cards | Arise And Shine Detailing",
    description:
      "Digital gift cards from $10. Delivered by email instantly. Redeemable on any detail.",
    url: "https://www.ariseandshinedetailing.com/gift-cards",
    siteName: "Arise And Shine Detailing",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://www.ariseandshinedetailing.com/gift-cards" },
};

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
