import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { PWARegistration } from "@/components/PWARegistration";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  themeColor: "#D4AF37",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ariseandshinevt.com"),
  title: {
    default: "Mobile Auto Detailing in Burlington & Williston, VT | Arise & Shine VT",
    template: "%s | Arise & Shine VT",
  },
  description:
    "Vermont's #1 mobile detailing service — we come to you in Burlington, Williston, South Burlington, Shelburne, Essex, and all of Chittenden County. Auto, boat, and RV detailing.",
  keywords: [
    "mobile detailing Vermont",
    "mobile auto detailing Burlington VT",
    "car detailing Williston VT",
    "mobile car detailing South Burlington",
    "boat detailing Vermont",
    "RV detailing Vermont",
    "auto detailing Chittenden County",
    "mobile detailing Essex VT",
    "paint correction Vermont",
    "interior detailing Vermont",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Arise & Shine VT",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/aasbanner.png",
  },
  openGraph: {
    title: "Mobile Auto Detailing in Burlington & Williston, VT | Arise & Shine VT",
    description:
      "Vermont's #1 mobile detailing service — we come to you in Burlington, Williston, South Burlington, Shelburne, Essex, and all of Chittenden County.",
    type: "website",
    url: "https://www.ariseandshinevt.com",
    siteName: "Arise & Shine VT",
    images: [{ url: "/aasbanner.png", width: 1200, height: 630, alt: "Arise & Shine VT Mobile Detailing" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobile Auto Detailing in Burlington & Williston, VT | Arise & Shine VT",
    description:
      "Vermont's #1 mobile detailing service — we come to you anywhere in Chittenden County.",
    images: ["/aasbanner.png"],
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://www.ariseandshinevt.com",
              name: "Arise & Shine VT",
              description: "Vermont's premier mobile auto, boat, and RV detailing service. Fully self-contained — we come to you anywhere in Vermont.",
              url: "https://www.ariseandshinevt.com",
              telephone: "+18025855563",
              email: "contact@ariseandshinevt.com",
              image: "https://www.ariseandshinevt.com/aasbanner.png",
              logo: "https://www.ariseandshinevt.com/aasbanner.png",
              priceRange: "$$",
              currenciesAccepted: "USD",
              paymentAccepted: "Cash, Credit Card",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Williston",
                addressRegion: "VT",
                postalCode: "05495",
                addressCountry: "US",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 44.4273,
                longitude: -73.0601,
              },
              areaServed: [
                { "@type": "City", name: "Burlington, VT" },
                { "@type": "City", name: "Williston, VT" },
                { "@type": "City", name: "South Burlington, VT" },
                { "@type": "City", name: "Shelburne, VT" },
                { "@type": "City", name: "Essex, VT" },
                { "@type": "City", name: "Essex Junction, VT" },
                { "@type": "City", name: "Colchester, VT" },
                { "@type": "City", name: "Winooski, VT" },
                { "@type": "City", name: "Milton, VT" },
                { "@type": "City", name: "Hinesburg, VT" },
                { "@type": "State", name: "Vermont" },
              ],
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Detailing Services",
                itemListElement: [
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Interior Detailing" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Exterior Detailing" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Full Detail" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Boat Detailing" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "RV Detailing" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Paint Correction" } },
                ],
              },
              sameAs: [
                "https://g.page/r/Cd76zEF6l465EAI/review",
              ],
            }),
          }}
        />
        <PWARegistration />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
          </QueryProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
