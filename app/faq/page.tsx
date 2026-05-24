"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Phone, Mail, Sparkles, Anchor, Truck, Gift, Star } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { FAQ_SECTIONS } from "@/lib/faqContent";

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.05] last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left group"
      >
        <span className={`text-sm font-semibold leading-snug transition-colors ${open ? "text-[#D4AF37]" : "text-zinc-200 group-hover:text-white"}`}>
          {q}
        </span>
        <ChevronDown size={16} className={`shrink-0 mt-0.5 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180 text-[#D4AF37]" : ""}`} />
      </button>
      {open && <p className="text-sm text-zinc-400 leading-relaxed pb-4 pr-6">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px 256px", opacity: 0.03, mixBlendMode: "overlay" }} />

      <div className="relative z-10">
        <SiteHeader />

        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-40 pb-20 flex flex-col gap-10">

          {/* Hero */}
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Help Center</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              Everything you need to know about mobile auto, boat, and RV detailing in Vermont.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {[
                { href: "/detailing",      label: "Auto Detailing",  icon: Sparkles },
                { href: "/boat-detailing", label: "Boat Detailing",  icon: Anchor },
                { href: "/rv-detailing",   label: "RV Detailing",    icon: Truck },
                { href: "/gift-cards",     label: "Gift Cards",      icon: Gift },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-zinc-900/60 text-zinc-400 text-xs font-medium hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
                >
                  <Icon size={11} /> {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Accordion — category headers centered, answers left for readability */}
          <div className="flex flex-col gap-4">
            {FAQ_SECTIONS.map((section) => (
              <div key={section.category} className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04] text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">{section.category}</p>
                </div>
                <div className="px-5">
                  {section.items.map((item) => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Still have questions — centered */}
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.04] p-8 flex flex-col items-center text-center gap-6">
            <Star className="w-7 h-7 text-[#D4AF37]" />
            <div>
              <p className="text-white font-bold text-lg mb-1.5">Still have a question?</p>
              <p className="text-zinc-400 text-sm">We&apos;re always happy to help — call or email anytime.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:8025855563"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-200 font-semibold text-sm hover:border-[#D4AF37]/40 hover:text-white transition-all"
              >
                <Phone size={14} className="text-[#D4AF37]" />
                802-585-5563
              </a>
              <a href="mailto:contact@ariseandshinevt.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-zinc-950 font-bold text-sm hover:bg-[#F3E5AB] transition-colors"
              >
                <Mail size={14} />
                Email Us
              </a>
            </div>
          </div>

        </main>

        <footer className="border-t border-white/[0.04] py-8 px-4 sm:px-6 pb-16">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
            <span>© 2025 Arise And Shine VT · Vermont</span>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-[#D4AF37] transition-colors">About</Link>
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
