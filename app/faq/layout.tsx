import type { Metadata } from "next";
import { FAQ_SECTIONS, buildFaqPageSchema } from "@/lib/faqContent";

export const metadata: Metadata = {
  title: "FAQ | Mobile Detailing Questions Answered | Arise And Shine Detailing",
  description: "Common questions about Arise And Shine Detailing's mobile detailing service in Vermont — booking, pricing, what to expect, boat and RV detailing, loyalty rewards, and more.",
  openGraph: {
    title: "FAQ | Mobile Detailing Questions Answered | Arise And Shine Detailing",
    description: "Everything you need to know about booking mobile auto, boat, and RV detailing in Vermont.",
    url: "https://www.ariseandshinedetailing.com/faq",
  },
  alternates: { canonical: "https://www.ariseandshinedetailing.com/faq" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFaqPageSchema(FAQ_SECTIONS)),
        }}
      />
      {children}
    </>
  );
}
