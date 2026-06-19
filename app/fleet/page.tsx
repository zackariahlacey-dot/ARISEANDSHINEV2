import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Users, Truck, ShieldCheck, Sparkles, Phone, ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { FleetQuoteCalculator } from "@/components/fleet/FleetQuoteCalculator";

export const metadata: Metadata = {
  title: "Fleet & Corporate Detailing Quotes Vermont | Arise & Shine VT",
  description:
    "Get an instant fleet detailing quote for 4+ vehicles in Vermont. Mobile detailing for dealerships, rental companies, corporate fleets, and group bookings. Fleet discounts up to 20%. We come to you statewide.",
  keywords: [
    "fleet detailing Vermont",
    "corporate detailing Burlington VT",
    "company car detailing Vermont",
    "dealership detailing Vermont",
    "rental car detailing Vermont",
    "fleet quote Vermont",
    "multi-vehicle detailing Vermont",
    "bulk car detailing Vermont",
    "group car detailing Burlington",
  ],
  openGraph: {
    title: "Fleet Detailing Quotes Vermont | Arise & Shine VT",
    description: "Instant fleet quotes for 4+ vehicles. Up to 20% off · we come to your location · serving all of Vermont.",
    url: "https://ariseandshinevt.com/fleet",
    siteName: "Arise & Shine VT",
    locale: "en_US",
    type: "website",
  },
  alternates: { canonical: "https://ariseandshinevt.com/fleet" },
};

export default function FleetPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-12 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12) 0%, transparent 65%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-5">
            <Building2 size={10} className="shrink-0" />Fleet & Corporate Quotes
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent mb-5"
            style={{ filter: "drop-shadow(0 2px 24px rgba(212,175,55,0.25))" }}>
            Have 4 or More Vehicles<br />That Need Cleaning?
          </h1>

          <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-6 max-w-2xl mx-auto">
            Whether it&apos;s your dealership lot, the rental fleet, your company cars, or a Saturday-morning detailing day for your coworkers — we&apos;ll come to you and get them all done. Build a quote below, no commitment to inquire.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-2">
            {[
              { icon: Truck,       label: "We Come to You" },
              { icon: ShieldCheck, label: "Fully Insured" },
              { icon: Sparkles,    label: "Up to 20% Off" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                <Icon size={16} className="text-[#D4AF37]" />
                <p className="text-[10px] font-bold text-zinc-300 text-center leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calculator ────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-5 sm:p-7">
            <FleetQuoteCalculator />
          </div>
        </div>
      </section>

      {/* ── How Fleet Works ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">How Fleet Bookings Work</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">From Quote to Done</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "01", icon: "📋", title: "Build Your Quote",   desc: "Use the calculator above. Adjust vehicle count, mix, and service tier — we'll show your live total with the fleet discount automatically applied." },
              { step: "02", icon: "✉️", title: "Send the Inquiry",   desc: "Fill in a few quick contact details. We review every fleet request personally and respond within 24 hours to confirm details and schedule." },
              { step: "03", icon: "🚗", title: "We Handle the Rest", desc: "Once accepted, we coordinate the schedule — single day for small fleets, multi-day for larger ones — and bring everything we need to your location." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/60 mb-1">Step {step}</p>
                <p className="text-sm font-bold text-white mb-1.5">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Books Fleets ──────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20 border-t border-white/[0.05] pt-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">
            <Users size={11} /> Common Fleet Customers
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-6">Built for Vermont Businesses</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              { name: "Dealerships",          desc: "Pre-sale prep, trade-in turnaround, demo cars" },
              { name: "Rental Companies",     desc: "Between-rental resets, end-of-season deep cleans" },
              { name: "Corporate Fleets",     desc: "Sales reps, delivery vans, company cars" },
              { name: "Property Managers",    desc: "Tenant move-in/out, on-site detailing days" },
              { name: "Employee Perk Days",   desc: "Saturday morning all-team detailing events" },
              { name: "Group Bookings",       desc: "Neighborhoods, condo associations, families" },
            ].map((s) => (
              <div key={s.name} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 hover:border-[#D4AF37]/30 transition-colors text-left">
                <p className="text-sm font-bold text-white leading-tight">{s.name}</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.05] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-3">Need a Quote Today?</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            For urgent fleets or custom scheduling, call us directly. We&apos;ll work with you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="tel:8025855563"
              className="btn-primary-gold-shimmer h-14 px-8 rounded-xl font-bold tracking-wide bg-zinc-900/80 backdrop-blur-sm border border-[#D4AF37]/50 text-[#D4AF37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-500 ease-in-out overflow-hidden inline-flex items-center gap-2 text-base">
              <Phone size={15} /><span className="relative z-[1]">802-585-5563</span>
            </a>
            <a href="mailto:contact@ariseandshinevt.com" className="text-zinc-400 hover:text-[#D4AF37] font-medium transition-colors text-sm">
              contact@ariseandshinevt.com
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 text-xs text-zinc-600 text-center sm:text-left">
          <span>© 2025 Arise And Shine VT · Vermont Mobile Detailing</span>
          <Link href="/" className="hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1">
            <ChevronLeft size={12} /> Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
