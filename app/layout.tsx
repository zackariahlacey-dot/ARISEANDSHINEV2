import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Arise And Shine VT | Premium Mobile Detailing",
  description:
    "Vermont's premier mobile auto detailing service. We come to you.",
  keywords:
    "mobile detailing, Vermont, Williston, Burlington, auto detailing, car wash, ceramic coating, paint correction",
  openGraph: {
    title: "Arise And Shine VT | Premium Mobile Detailing",
    description:
      "Vermont's premier mobile auto detailing service. We come to you.",
    type: "website",
    url: "/",
    siteName: "Arise And Shine VT",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Arise And Shine VT — Premium mobile auto detailing in Vermont",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arise And Shine VT | Premium Mobile Detailing",
    description:
      "Vermont's premier mobile auto detailing service. We come to you.",
    images: ["/opengraph-image"],
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
