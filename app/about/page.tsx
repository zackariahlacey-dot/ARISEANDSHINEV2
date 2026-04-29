import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Star, Leaf, Sparkles, Phone, Mail, MapPin, Heart, Award } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "About Arise & Shine VT | Owner-Operated Mobile Detailing in Vermont",
  description: "Arise & Shine VT is Vermont's owner-operated mobile detailing service. Fully insured, eco-conscious products, 5-star rated — serving Burlington, Williston, South Burlington, Shelburne, Essex, and all of Chittenden County.",
  openGraph: {
    title: "About Arise & Shine VT | Owner-Operated Mobile Detailing in Vermont",
    description: "Vermont's owner-operated mobile detailing service. Fully insured, eco-conscious products, 5-star rated.",
    url: "https://www.ariseandshinevt.com/about",
  },
};

const VALUES = [
  { icon: Star,    title: "Quality Over Speed",     desc: "We don't cut corners. Every job gets the same attention to detail whether it's a daily driver or a show vehicle." },
  { icon: Heart,   title: "Owner-Operated",          desc: "When you book with Arise & Shine VT, you're working directly with the owner — not a franchise, not a sub-contractor." },
  { icon: Leaf,    title: "Eco-Conscious Products",  desc: "We use professional-grade, environmentally responsible products — including lake-safe formulas for all marine work in Vermont." },
  { icon: Shield,  title: "Fully Insured",           desc: "We carry full liability insurance so you can have complete peace of mind when we're working on your vehicle, boat, or RV." },
  { icon: MapPin,  title: "100% Mobile",             desc: "We bring everything to you — fully self-contained with our own water, power, and equipment. No drop-off, no waiting room." },
  { icon: Award,   title: "5-Star Rated",            desc: "Our reputation is built one vehicle at a time. We're proud of our track record and stand behind every detail we perform." },
];

const SERVICES_OFFERED = [
  { label: "Interior Detailing",        href: "/detailing" },
  { label: "Exterior Detailing",        href: "/detailing" },
  { label: "Full Detail Packages",      href: "/detailing" },
  { label: "Boat & Marine Detailing",   href: "/boat-detailing" },
  { label: "RV & Motorhome Detailing",  href: "/rv-detailing" },
  { label: "Paint Correction",          href: "/paint-correction" },
  { label: "Monthly Maintenance Club",  href: "/maintenance-club" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.03, mixBlendMode: "overlay" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col gap-14">

          {/* Hero */}
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Our Story</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-5 tracking-tight leading-tight">
              Vermont&apos;s Mobile Detailing<br className="hidden sm:block" /> Specialist
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed max-w-2xl mx-auto">
              Arise &amp; Shine VT was built on a simple belief: your vehicle deserves professional-level care
              without the hassle of dropping it off somewhere. We bring the detail shop to your driveway,
              your marina, or wherever life takes you.
            </p>
          </div>

          {/* Who we are + What we do — two centered columns */}
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Who We Are */}
              <div className="flex flex-col items-center text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37] mb-4">Who We Are</p>
                <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                  <p>
                    Arise &amp; Shine VT is an owner-operated mobile detailing business proudly serving Vermont.
                    Every appointment is handled personally — you&apos;re not getting a rotating crew or a franchise
                    technician. You&apos;re getting the owner, showing up with professional equipment and a
                    genuine commitment to the result.
                  </p>
                  <p>
                    We specialize in mobile auto, boat, and RV detailing across the Green Mountain State.
                    Whether it&apos;s your daily driver, your pontoon coming out of winter storage, or your Class A
                    RV prepping for a summer trip — we&apos;ve got you covered.
                  </p>
                  <p>
                    Fully self-contained: our own water, generator, and professional-grade tools.
                    Your driveway, marina, storage lot — we come to you.
                  </p>
                </div>
              </div>

              {/* What We Do */}
              <div className="flex flex-col items-center text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37] mb-4">What We Do</p>
                <ul className="space-y-2 w-full">
                  {SERVICES_OFFERED.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="flex items-center justify-center gap-2.5 text-sm text-zinc-300 hover:text-[#D4AF37] transition-colors group">
                        <Sparkles size={13} className="text-[#D4AF37]/50 group-hover:text-[#D4AF37] shrink-0 transition-colors" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-6 border-t border-white/[0.06] w-full flex flex-col items-center">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37] mb-4">Get In Touch</p>
                  <div className="space-y-2.5">
                    <a href="tel:8025855563" className="flex items-center justify-center gap-2.5 text-sm text-zinc-300 hover:text-white transition-colors">
                      <Phone size={13} className="text-[#D4AF37]" />
                      802-585-5563
                    </a>
                    <a href="mailto:contact@ariseandshinevt.com" className="flex items-center justify-center gap-2.5 text-sm text-zinc-300 hover:text-white transition-colors">
                      <Mail size={13} className="text-[#D4AF37]" />
                      contact@ariseandshinevt.com
                    </a>
                    <span className="flex items-center justify-center gap-2.5 text-sm text-zinc-500">
                      <MapPin size={13} className="text-[#D4AF37]" />
                      Vermont, USA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Values grid */}
          <div>
            <div className="text-center mb-8">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">What We Stand For</p>
              <h2 className="text-2xl font-black text-white tracking-tight">Our Approach</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VALUES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-3">
                    <Icon size={16} className="text-[#D4AF37]" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1.5">{title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-8 flex flex-col items-center text-center gap-6">
            <div>
              <p className="text-white font-bold text-xl mb-2">Ready to see the difference?</p>
              <p className="text-zinc-400 text-sm">Book your detail online in minutes — we&apos;ll take care of the rest.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors">
                Book a Detail
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all">
                Contact Us
              </Link>
            </div>
          </div>

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2025 Arise And Shine VT · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link>
              <Link href="/contact" className="hover:text-[#D4AF37] transition-colors">Contact</Link>
              <Link href="/service-area" className="hover:text-[#D4AF37] transition-colors">Service Area</Link>
              <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
