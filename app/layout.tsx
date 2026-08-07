import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { PWARegistration } from "@/components/PWARegistration";
import { PWALaunchRedirect } from "@/components/PWALaunchRedirect";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { CrossSellCouponCapture } from "@/components/landing/CrossSellCouponCapture";
import "./globals.css";

const META_PIXEL_ID = "1007604245608620";
// Google Ads (gtag.js) — AW-prefixed conversion ID from Google Ads dashboard.
// Fire conversion events with:
//   window.gtag('event', 'conversion', { send_to: 'AW-18281977763/LABEL' });
const GOOGLE_ADS_ID = "AW-18281977763";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  // viewport-fit=cover lets the page draw under iOS notches + home indicator
  // so we can use env(safe-area-inset-*) padding where it matters.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#D4AF37" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ariseandshinedetailing.com"),
  title: {
    default: "Arise And Shine Detailing",
    template: "%s | Arise And Shine Detailing",
  },
  description: "Arise And Shine Detailing is no longer offering services.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Arise And Shine Detailing",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
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
        <PWARegistration />
        <PWALaunchRedirect />
        {/* Meta Pixel — ad tracking + conversions. Loaded afterInteractive so
            it never blocks first paint. PageView fires automatically on load;
            fire custom events (e.g. fbq('track','Lead')) from booking success. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {/* Google Ads (gtag.js) — loads the conversion library + initializes
            the AW-… config. Fire conversions from booking success with:
              window.gtag('event','conversion',{send_to:'AW-18281977763/LABEL'}); */}
        <Script
          id="google-ads-src"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        />
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
        {/* Capture inbound ?coupon=… cross-sell codes from the exterior site
            into localStorage; the booking modal auto-applies on open. */}
        <Suspense fallback={null}>
          <CrossSellCouponCapture />
        </Suspense>
        {/* InstallPrompt disabled per owner request — too pushy on landing visits. */}
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
