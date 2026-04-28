import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Car, Anchor, Truck, Phone, ArrowLeft, DollarSign } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Service Area | Arise & Shine VT",
  description: "Arise & Shine VT is a fully mobile detailing service based in Williston, VT — we come to you anywhere in Vermont within about 1.5 hours of Williston.",
};

const SERVICE_TYPES = [
  { icon: Car,    label: "Auto Detailing",  note: "At your home, office, or wherever your car lives.",             href: "/detailing" },
  { icon: Anchor, label: "Boat & Marine",   note: "We come to your marina, launch site, or storage yard.",         href: "/boat-detailing" },
  { icon: Truck,  label: "RV & Motorhome",  note: "We come to your campground, storage lot, or driveway.",         href: "/rv-detailing" },
];

export default function ServiceAreaPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.03, mixBlendMode: "overlay" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col items-center gap-10">

          {/* Back link */}
          <div className="w-full">
            <Link href="/" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              <ArrowLeft size={14} />
              Back to Home
            </Link>
          </div>

          {/* Hero — centered */}
          <div className="text-center w-full">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Coverage</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">Vermont Service Area</h1>
            <p className="text-zinc-400 text-base leading-relaxed mb-4">
              We&apos;re fully mobile and come to you. We serve all of Vermont within about{" "}
              <span className="text-white font-semibold">1.5 hours of Williston</span>{" "}
              — if you&apos;re in Vermont, chances are we can get there.
            </p>
            <div className="flex items-center justify-center gap-2">
              <MapPin size={14} className="text-[#D4AF37]" />
              <span className="text-zinc-300 text-sm font-semibold">Based in Williston, VT · Fully Mobile</span>
            </div>
          </div>

          {/* Service type cards — icons + text centered */}
          <div className="w-full grid sm:grid-cols-3 gap-4">
            {SERVICE_TYPES.map(({ icon: Icon, label, note, href }) => (
              <Link key={label} href={href}
                className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-5 hover:border-[#D4AF37]/30 transition-all flex flex-col items-center text-center"
              >
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-[#D4AF37]" />
                </div>
                <p className="text-sm font-bold text-white mb-1.5 group-hover:text-[#D4AF37] transition-colors">{label}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{note}</p>
              </Link>
            ))}
          </div>

          {/* Travel fee card — centered header, body text readable */}
          <div className="w-full rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-7 flex flex-col items-center text-center gap-5">
            <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <DollarSign size={15} className="text-[#D4AF37]" />
            </div>
            <p className="text-sm font-bold text-white -mt-2">How Travel Fees Work</p>
            <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
              <p>
                The first <span className="text-white font-semibold">10 miles</span> from our base in Williston are always free.
                Beyond that, we charge <span className="text-white font-semibold">$0.50 per mile</span>, rounded up to the nearest dollar.
              </p>
              <p>
                For example, a location 30 miles away would have a travel fee of{" "}
                <span className="text-white font-semibold">$10</span>{" "}
                (20 billable miles × $0.50).
              </p>
              <p className="text-zinc-500">
                The exact fee — if any — is calculated automatically and shown at checkout before you confirm. No surprises.
              </p>
            </div>
          </div>

          {/* CTA — centered */}
          <div className="w-full rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-7 flex flex-col items-center text-center gap-5">
            <div>
              <p className="text-white font-bold text-lg mb-2">Not sure if we cover your area?</p>
              <p className="text-zinc-400 text-sm">Just give us a call — we&apos;re happy to let you know if we can get to you.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Phone size={14} className="text-[#D4AF37]" />
                802-585-5563
              </a>
              <Link href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors"
              >
                Book Online Now
              </Link>
            </div>
          </div>

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2025 Arise And Shine VT · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link>
              <Link href="/about" className="hover:text-[#D4AF37] transition-colors">About</Link>
              <Link href="/contact" className="hover:text-[#D4AF37] transition-colors">Contact</Link>
              <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
