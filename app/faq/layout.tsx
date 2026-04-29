import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Mobile Detailing Questions Answered | Arise & Shine VT",
  description: "Common questions about Arise & Shine VT's mobile detailing service in Vermont — booking, pricing, what to expect, boat and RV detailing, loyalty rewards, and more.",
  openGraph: {
    title: "FAQ | Mobile Detailing Questions Answered | Arise & Shine VT",
    description: "Everything you need to know about booking mobile auto, boat, and RV detailing in Vermont.",
    url: "https://www.ariseandshinevt.com/faq",
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
