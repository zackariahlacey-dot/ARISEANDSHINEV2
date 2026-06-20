import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin, Phone, ArrowLeft, Sparkles, Anchor, Truck, Clock,
  Check, Car, ChevronRight,
} from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getTownBySlug, getTownSlugs, type TownContent } from "@/lib/townContent";
import { buildFaqPageSchema } from "@/lib/faqContent";

export function generateStaticParams() {
  return getTownSlugs().map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const town = getTownBySlug(city);
  if (!town) return { title: "Service Area | Arise And Shine Detailing" };

  const title = `Mobile Auto Detailing in ${town.shortName}, VT | Arise And Shine Detailing`;
  const description = `Mobile auto, boat, and RV detailing in ${town.shortName}, Vermont. We come to your driveway, marina, or office — fully self-contained equipment, transparent pricing, easy online booking. ${town.driveTimeMin === 0 ? "Our home base." : `About ${town.driveTimeMin} minutes from our Williston base.`}`;

  return {
    title,
    description,
    keywords: [
      `mobile auto detailing ${town.shortName} VT`,
      `car detailing ${town.shortName} Vermont`,
      `mobile car detailing ${town.shortName}`,
      `auto detail near me ${town.shortName} VT`,
      `${town.shortName} car detailing`,
      ...(town.waterfront ? [`boat detailing ${town.shortName} VT`, `marine detailing ${town.shortName}`] : []),
    ],
    openGraph: {
      title,
      description,
      url: `https://www.ariseandshinedetailing.com/service-area/${town.slug}`,
      siteName: "Arise And Shine Detailing",
      locale: "en_US",
      type: "website",
    },
    alternates: { canonical: `https://www.ariseandshinedetailing.com/service-area/${town.slug}` },
  };
}

export default async function TownPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const town = getTownBySlug(city);
  if (!town) notFound();

  // FAQPage schema for this town's local FAQ
  const faqSchema = buildFaqPageSchema([{ category: `${town.shortName} FAQ`, items: [...town.localFaq] }] as unknown as Parameters<typeof buildFaqPageSchema>[0]);

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col gap-12">

          {/* Back link */}
          <div>
            <Link href="/service-area" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              <ArrowLeft size={14} />
              All service areas
            </Link>
          </div>

          {/* Hero */}
          <header className="text-center flex flex-col items-center gap-4">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37]">{town.oneLineHook}</p>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Mobile Auto Detailing in {town.shortName}, VT
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed max-w-2xl">{town.intro}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-zinc-900/60 text-xs text-zinc-400">
                <Clock size={11} className="text-[#D4AF37]" />
                {town.driveTimeMin === 0 ? "Home base" : `~${town.driveTimeMin} min from Williston`}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-zinc-900/60 text-xs text-zinc-400">
                <MapPin size={11} className="text-[#D4AF37]" />
                {town.name}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Link href="/?book=1"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors active:scale-[0.98]"
              >
                Book Your Detail
                <ChevronRight size={14} />
              </Link>
              <a href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Phone size={14} className="text-[#D4AF37]" />
                802-585-5563
              </a>
            </div>
          </header>

          {/* Neighborhood callouts */}
          {town.neighborhoodCallouts.length > 0 && (
            <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-6 sm:p-8 flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">Areas we cover in {town.shortName}</p>
              <div className="flex flex-wrap gap-2">
                {town.neighborhoodCallouts.map((n) => (
                  <span key={n} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] text-sm text-zinc-300">
                    <Check size={11} className="text-[#D4AF37]" />
                    {n}
                  </span>
                ))}
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed mt-2">{town.serviceNotes}</p>
            </section>
          )}

          {/* Services available in this town */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ServiceCard
              href="/detailing"
              icon={Sparkles}
              label="Auto Detailing"
              priceRange="$130–$400"
              note={town.commonVehicles}
            />
            {town.waterfront && (
              <ServiceCard
                href="/boat-detailing"
                icon={Anchor}
                label="Boat Detailing"
                priceRange="$15–$55/ft"
                note={`Lake Champlain marinas and ${town.shortName} private docks — lake-safe products only.`}
              />
            )}
            <ServiceCard
              href="/rv-detailing"
              icon={Truck}
              label="RV Detailing"
              priceRange="$15–$38/ft"
              note={`We come to ${town.shortName} driveways, storage lots, or campsites.`}
            />
          </section>

          {/* Local FAQ */}
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37] text-center">{town.shortName} questions</p>
            <h2 className="text-2xl font-black text-white text-center mb-2">Frequently asked</h2>
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm divide-y divide-white/[0.05]">
              {town.localFaq.map((item) => (
                <div key={item.q} className="p-5 sm:p-6">
                  <p className="text-sm font-semibold text-zinc-100 mb-2">{item.q}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 text-center mt-2">
              More questions? <Link href="/faq" className="text-[#D4AF37] hover:underline">See the full FAQ</Link>.
            </p>
          </section>

          {/* Nearby towns cross-link */}
          {town.nearbyTowns.length > 0 && (
            <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-6 flex flex-col items-center text-center gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Also serving nearby</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {town.nearbyTowns.map((n) => (
                  <Link key={n.slug} href={`/service-area/${n.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.06] bg-zinc-900/60 text-sm text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
                  >
                    {n.shortName}, VT
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Final CTA */}
          <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-7 flex flex-col items-center text-center gap-4">
            <p className="text-white font-bold text-lg">Ready to book your {town.shortName} detail?</p>
            <p className="text-zinc-400 text-sm max-w-md">Pick a date and time online, or call us — we'll come to you.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
              <Link href="/?book=1"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors active:scale-[0.98]"
              >
                Book Online
              </Link>
              <a href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Phone size={14} className="text-[#D4AF37]" />
                Call 802-585-5563
              </a>
            </div>
          </section>

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2026 Arise And Shine Detailing · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link>
              <Link href="/about" className="hover:text-[#D4AF37] transition-colors">About</Link>
              <Link href="/service-area" className="hover:text-[#D4AF37] transition-colors">All Areas</Link>
              <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

type ServiceCardProps = {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  priceRange: string;
  note: string;
};

function ServiceCard({ href, icon: Icon, label, priceRange, note }: ServiceCardProps) {
  return (
    <Link href={href}
      className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-5 hover:border-[#D4AF37]/30 transition-all flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
          <Icon size={16} className="text-[#D4AF37]" />
        </div>
        <span className="text-sm font-black text-white">{priceRange}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors">{label}</p>
        <p className="text-xs text-zinc-500 leading-relaxed mt-1">{note}</p>
      </div>
    </Link>
  );
}
