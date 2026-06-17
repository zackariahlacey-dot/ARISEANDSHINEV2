import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, Sparkles, Anchor, Truck, MessageCircle, Calendar, Star, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Contact Arise & Shine VT | Mobile Detailing in Burlington & Williston, VT",
  description: "Call or text Arise & Shine VT at 802-585-5563 — Vermont's mobile auto, boat, and RV detailing service. Book online or reach us by phone or email.",
  openGraph: {
    title: "Contact Arise & Shine VT | Mobile Detailing in Burlington & Williston, VT",
    description: "Call or text 802-585-5563 — we serve Burlington, Williston, South Burlington, and all of Chittenden County.",
    url: "https://www.ariseandshinevt.com/contact",
  },
};

// Phone hours — when calls/texts get a live reply. Booking slots themselves
// run 1 PM – 6:30 PM on weekdays via the booking modal's calendar.
const HOURS = [
  { day: "Monday – Friday", time: "10:00 AM – 6:00 PM" },
  { day: "Saturday",        time: "By appointment" },
  { day: "Sunday",          time: "Closed" },
];

const QUICK_LINKS = [
  { label: "Book Auto Detailing",  href: "/detailing",        icon: Sparkles      },
  { label: "Book Boat Detailing",  href: "/boat-detailing",   icon: Anchor        },
  { label: "Book RV Detailing",    href: "/rv-detailing",     icon: Truck         },
  { label: "FAQs",                 href: "/faq",              icon: MessageCircle },
];

export default function ContactPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.03, mixBlendMode: "overlay" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col gap-10">

          {/* Hero */}
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Get In Touch</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
              Contact Arise &amp; Shine VT
            </h1>
            <p className="text-zinc-400 text-base max-w-xl mx-auto leading-relaxed">
              Questions about a service, want to get a quote, or just need to talk to a real person?
              I&apos;m here to help.
            </p>
            <a
              href="https://g.page/r/Cd76zEF6l465EAI/review"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] hover:bg-[#D4AF37]/[0.12] transition-colors group"
            >
              <Star size={12} className="text-[#D4AF37] fill-[#D4AF37]" />
              <span className="text-xs font-bold text-white">5.0 on Google</span>
              <span className="text-xs text-zinc-500">·</span>
              <span className="text-xs text-zinc-400 group-hover:text-[#D4AF37] transition-colors">Read reviews</span>
              <ExternalLink size={10} className="text-zinc-500 group-hover:text-[#D4AF37] transition-colors" />
            </a>
          </div>

          {/* Contact cards — all centered */}
          <div className="grid sm:grid-cols-2 gap-4">

            {/* Call */}
            <a href="tel:8025855563"
              className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-6 flex flex-col items-center text-center hover:border-[#D4AF37]/30 hover:bg-zinc-900/80 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-4">
                <Phone size={20} className="text-[#D4AF37]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1">Call Us</p>
              <p className="text-white font-bold text-xl mb-1 group-hover:text-[#D4AF37] transition-colors">802-585-5563</p>
              <p className="text-zinc-500 text-xs">Tap to call — we pick up!</p>
            </a>

            {/* Email */}
            <a href="mailto:contact@ariseandshinevt.com"
              className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-6 flex flex-col items-center text-center hover:border-[#D4AF37]/30 hover:bg-zinc-900/80 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-4">
                <Mail size={20} className="text-[#D4AF37]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1">Email Us</p>
              <p className="text-white font-bold text-sm mb-1 group-hover:text-[#D4AF37] transition-colors break-all">
                contact@ariseandshinevt.com
              </p>
              <p className="text-zinc-500 text-xs">We typically respond within a few hours</p>
            </a>

            {/* Location */}
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-6 flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-4">
                <MapPin size={20} className="text-[#D4AF37]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1">Service Area</p>
              <p className="text-white font-bold text-base mb-1">Williston, VT 05495</p>
              <p className="text-zinc-400 text-xs leading-relaxed mb-2">
                Home base. Serving all of Chittenden County and within roughly 1.5 hours of Williston.
              </p>
              <Link href="/service-area" className="text-[#D4AF37] hover:underline text-xs font-semibold">
                See full coverage →
              </Link>
            </div>

            {/* Hours */}
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-6 flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-4">
                <Clock size={20} className="text-[#D4AF37]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3">Phone Hours</p>
              <div className="space-y-2 w-full">
                {HOURS.map(({ day, time }) => (
                  <div key={day} className="flex justify-between items-baseline gap-4">
                    <span className="text-zinc-400 text-xs">{day}</span>
                    <span className="text-zinc-200 text-xs font-semibold shrink-0">{time}</span>
                  </div>
                ))}
              </div>
              <p className="text-zinc-600 text-[11px] mt-3">Appointments run 1 PM – 6:30 PM weekdays. <Link href="/detailing?book=1" className="text-[#D4AF37] hover:underline">See available slots →</Link></p>
            </div>
          </div>

          {/* Quick book — centered */}
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-7 flex flex-col items-center text-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Calendar size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-white font-bold text-base mb-1">Ready to book?</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                The fastest way to get on our schedule is to book online — you&apos;ll see real-time
                availability and get a confirmation email instantly.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.08] bg-zinc-900/60 text-zinc-300 text-xs font-semibold hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
                >
                  <Icon size={12} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2025 Arise And Shine VT · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link>
              <Link href="/about" className="hover:text-[#D4AF37] transition-colors">About</Link>
              <Link href="/service-area" className="hover:text-[#D4AF37] transition-colors">Service Area</Link>
              <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
