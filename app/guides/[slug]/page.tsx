import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ChevronRight, Phone, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getGuideBySlug, getGuideSlugs, buildArticleSchema, GUIDES } from "@/lib/guideContent";

export function generateStaticParams() {
  return getGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guide | Arise & Shine VT" };
  return {
    title: `${guide.title} | Arise & Shine VT`,
    description: guide.description,
    keywords: guide.keywords,
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://www.ariseandshinevt.com/guides/${guide.slug}`,
      type: "article",
      publishedTime: guide.publishedDate,
    },
    alternates: { canonical: `https://www.ariseandshinevt.com/guides/${guide.slug}` },
  };
}

/** Render a markdown-ish line with **bold** segments preserved. */
function renderInline(line: string) {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-bold text-white">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const related = guide.relatedSlugs
    .map((s) => GUIDES.find((g) => g.slug === s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleSchema(guide)) }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.05) 0%, transparent 65%)" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col gap-10">

          <div>
            <Link href="/guides" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              <ArrowLeft size={14} />
              All guides
            </Link>
          </div>

          {/* Article header */}
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]">
                {guide.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                <Clock size={10} />
                {guide.readTimeMin} min read
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">{guide.title}</h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">{guide.intro}</p>
          </header>

          {/* Article body */}
          <article className="flex flex-col gap-10">
            {guide.sections.map((section, i) => (
              <section key={i} className="flex flex-col gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{section.heading}</h2>
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="text-sm sm:text-base text-zinc-400 leading-relaxed">{renderInline(p)}</p>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="flex flex-col gap-3 mt-1">
                    {section.bullets.map((b, k) => (
                      <li key={k} className="flex gap-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
                        <span className="text-[#D4AF37] shrink-0 mt-1">•</span>
                        <span>{renderInline(b)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>

          {/* Primary CTA */}
          <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-7 flex flex-col items-center text-center gap-4">
            <p className="text-white font-bold text-lg">{guide.primaryCta.label === "Book your seasonal detail" ? "Ready for a detail?" : "Ready to book?"}</p>
            <p className="text-zinc-400 text-sm max-w-md">We come to you anywhere in Vermont — fully self-contained, transparent pricing, easy online booking.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
              <Link href={guide.primaryCta.href}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors active:scale-[0.98]"
              >
                {guide.primaryCta.label}
                <ChevronRight size={14} />
              </Link>
              <a href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Phone size={14} className="text-[#D4AF37]" />
                802-585-5563
              </a>
            </div>
          </section>

          {/* Related guides */}
          {related.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <BookOpen size={12} className="text-[#D4AF37]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Keep reading</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.map((g) => (
                  <Link key={g.slug} href={`/guides/${g.slug}`}
                    className="group rounded-xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm p-4 hover:border-[#D4AF37]/30 transition-all flex flex-col gap-2"
                  >
                    <p className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors">{g.shortTitle}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{g.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2026 Arise And Shine VT · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/guides" className="hover:text-[#D4AF37] transition-colors">All Guides</Link>
              <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">FAQ</Link>
              <Link href="/" className="hover:text-[#D4AF37] transition-colors">← Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
