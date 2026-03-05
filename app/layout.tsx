import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ariseandshinevt.com"),
  title: "Arise And Shine VT | Premium Mobile Detailing",
  description:
    "Vermont's premier mobile auto detailing service. We come to you.",
  keywords:
    "mobile detailing, Vermont, Williston, Burlington, auto detailing, car wash, ceramic coating, paint correction",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Arise And Shine VT | Premium Mobile Detailing",
    description:
      "Vermont's premier mobile auto detailing service. We come to you.",
    type: "website",
    url: "/",
    siteName: "Arise And Shine VT",
    images: [{ url: "/aasbanner.png" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arise And Shine VT | Premium Mobile Detailing",
    description:
      "Vermont's premier mobile auto detailing service. We come to you.",
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
