import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { GUIDES } from "@/lib/guideContent";

export const metadata: Metadata = {
  title: "Detailing Guides | Tips, Cost & Care for Vermont Drivers | Arise & Shine VT",
  description:
    "Real, useful guides about auto, boat, and RV detailing in Vermont — what it costs, when to do it, how to prep your vehicle for the seasons, and how to maximize resale value.",
  openGraph: {
    title: "Detailing Guides | Arise & Shine VT",
    description:
      "Evergreen guides about detailing your car, boat, or RV in Vermont — from a Vermont detailer.",
    url: "https://www.ariseandshinevt.com/guides",
  },
  alternates: { canonical: "https://www.ariseandshinevt.com/guides" },
};

export default function GuidesHubPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col gap-10">

          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              <ArrowLeft size={14} />
              Back to home
            </Link>
          </div>

          <header className="text-center flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04]">
              <BookOpen size={12} className="text-[#D4AF37]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Detailing guides</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Real answers from a Vermont detailer.
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed max-w-xl">
              No fluff. No filler. Just clear guides about what detailing costs, when to do it, how to protect your vehicle through Vermont seasons, and what's worth your money.
            </p>
          </header>

          <section className="flex flex-col gap-3">
            {GUIDES.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`}
                className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-5 sm:p-6 hover:border-[#D4AF37]/30 transition-all flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]">
                    {g.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                    <Clock size={10} />
                    {g.readTimeMin} min read
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                  {g.title}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">{g.description}</p>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4AF37] mt-1">
                  Read guide
                  <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </section>

          <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-7 flex flex-col items-center text-center gap-4">
            <p className="text-white font-bold text-lg">Ready to skip the reading and book?</p>
            <p className="text-zinc-400 text-sm max-w-md">Pick your service, choose a date — we'll handle the rest.</p>
            <Link href="/?book=1"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors active:scale-[0.98]"
            >
              Book Your Detail
            </Link>
          </section>

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2026 Arise And Shine VT · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link>
              <Link href="/service-area" className="hover:text-[#D4AF37] transition-colors">Service Area</Link>
              <Link href="/contact" className="hover:text-[#D4AF37] transition-colors">Contact</Link>
              <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
