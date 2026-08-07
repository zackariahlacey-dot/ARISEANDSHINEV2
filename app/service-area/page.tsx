import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Car, Anchor, Truck, Phone, ArrowLeft, DollarSign, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TOWNS } from "@/lib/townContent";

/** Region grouping for town pages. Better than a flat alphabetical list —
 *  matches how Vermonters actually think about the state, and lets us put
 *  high-ticket markets (Stowe, Charlotte, Stratton) in their own visually-
 *  distinct sections. Slug order within each region is curated by
 *  drive-time/relevance. */
const REGIONS: { id: string; label: string; subtitle: string; slugs: string[] }[] = [
  {
    id: "champlain",
    label: "Chittenden County & Champlain Valley",
    subtitle: "Our home turf — Williston, Burlington, and the surrounding lakeshore",
    slugs: ["williston", "burlington", "south-burlington", "essex", "essex-junction", "winooski", "colchester", "shelburne", "charlotte", "hinesburg", "milton"],
  },
  {
    id: "stowe",
    label: "Stowe & Mountain Country",
    subtitle: "Ski-season specialists for second homes and resort fleets",
    slugs: ["stowe"],
  },
  {
    id: "upper-valley",
    label: "Upper Valley & Woodstock",
    subtitle: "Hanover-adjacent luxury and weekend-home markets",
    slugs: ["norwich", "woodstock", "quechee"],
  },
  {
    id: "southern",
    label: "Southern Vermont",
    subtitle: "Manchester, Stratton, and Killington — by coordinated visit",
    slugs: ["killington", "manchester", "stratton"],
  },
];

export const metadata: Metadata = {
  title: "Mobile Detailing Service Area | Burlington, Williston & Chittenden County, VT",
  description: "Arise And Shine Detailing serves Burlington, Williston, South Burlington, Shelburne, Essex, Colchester, Winooski, Milton, Hinesburg, and all of Vermont within 1.5 hours of Williston. We come to you.",
  openGraph: {
    title: "Mobile Detailing Service Area | Burlington, Williston & Chittenden County, VT",
    description: "We serve all of Chittenden County and beyond — Burlington, Williston, South Burlington, Shelburne, Essex, Colchester, and more.",
    url: "https://www.ariseandshinedetailing.com/service-area",
  },
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

          {/* Individual town landing pages — grouped by region */}
          <section className="w-full flex flex-col gap-6">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37] mb-2">Detailed coverage by city</p>
              <h2 className="text-xl sm:text-2xl font-black text-white">Pick your town</h2>
              <p className="text-xs text-zinc-500 mt-1">{TOWNS.length} town pages and growing — most popular regions first.</p>
            </div>
            {REGIONS.map((region) => {
              const regionTowns = region.slugs
                .map(slug => TOWNS.find(t => t.slug === slug))
                .filter((t): t is NonNullable<typeof t> => !!t);
              if (regionTowns.length === 0) return null;
              return (
                <div key={region.id} className="w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D4AF37] shrink-0">
                      {region.label}
                    </p>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">{region.subtitle}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {regionTowns.map((t) => (
                      <Link key={t.slug} href={`/service-area/${t.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm px-4 py-3 hover:border-[#D4AF37]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin size={14} className="text-[#D4AF37] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">{t.shortName}, VT</p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {t.driveTimeMin === 0 ? "Home base" : `~${t.driveTimeMin} min from base`}
                              {t.waterfront && " · waterfront"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Travel fee card — centered header, body text readable */}
          <div className="w-full rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-7 flex flex-col items-center text-center gap-5">
            <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <DollarSign size={15} className="text-[#D4AF37]" />
            </div>
            <p className="text-sm font-bold text-white -mt-2">How Travel Fees Work</p>
            <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
              <p>
                <span className="text-[#D4AF37] font-bold">Burlington, Williston, and South Burlington are always free</span> — no
                travel fee regardless of address.
              </p>
              <p>
                Everywhere else: the first <span className="text-white font-semibold">7.5 miles</span> from our 209 Porterwood Dr base in Williston are free.
                Beyond that, we charge <span className="text-white font-semibold">$1 per mile</span> of driving distance, rounded up to the nearest dollar.
              </p>
              <p>
                For example, a location 20 miles away would have a travel fee of{" "}
                <span className="text-white font-semibold">$13</span>{" "}
                (12.5 billable miles × $1).
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
              <a href="#"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Phone size={14} className="text-[#D4AF37]" />
                
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
            <span>© 2025 Arise And Shine Detailing · Vermont</span>
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
