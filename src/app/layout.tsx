import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arise And Shine VT | Premium Mobile Detailing Vermont",
  description: "Elite mobile detailing in Vermont. Interior deep cleans, exterior shine, and ceramic protection. We come to you. Book your Elite shine today.",
  keywords: ["mobile detailing VT", "car detailing Vermont", "interior car cleaning", "ceramic coating VT", "Arise And Shine VT"],
  metadataBase: new URL('https://ariseandshinevt.com'),
  icons: {
    icon: "/e.png",
    apple: "/e.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Arise And Shine VT | Elite Mobile Detailing",
    description: "Premium mobile detailing service in Vermont. Elevate your drive with our professional interior and exterior care.",
    url: 'https://ariseandshinevt.com',
    siteName: 'Arise And Shine VT',
    images: [
      {
        url: '/aasbanner.png',
        width: 1200,
        height: 630,
        alt: 'Arise And Shine VT Premium Detailing',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arise And Shine VT | Elite Mobile Detailing',
    description: 'Premium mobile detailing service in Vermont.',
    images: ['/aasbanner.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-white selection:bg-violet-500/30`}
      >
        <div className="fixed inset-0 gradient-mesh opacity-20 pointer-events-none -z-10 will-change-opacity" />
        <div className="fixed inset-0 hud-grid pointer-events-none -z-10 opacity-30" />
        {children}
      </body>
    </html>
  );
}
