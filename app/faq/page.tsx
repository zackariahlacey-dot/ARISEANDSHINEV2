"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Phone, Mail, Sparkles, Anchor, Truck, Gift, Star } from "lucide-react";
import { SiteHeader } from "@/components/landing/SiteHeader";

const FAQ_SECTIONS = [
  {
    category: "Booking & Scheduling",
    items: [
      { q: "How do I book an appointment?", a: "Book online anytime at ariseandshinevt.com — pick your service, choose a date and time, and pay online or at arrival. You'll get a confirmation email right away with all your appointment details." },
      { q: "How much notice do I need?", a: "We typically have openings within the same week. The online calendar shows real-time availability, so you can book as soon as tonight for an upcoming slot — or plan ahead weeks in advance." },
      { q: "Can I cancel or reschedule?", a: "Yes. You can reschedule directly from your account dashboard, or reach out to us by phone or email. We just ask for as much notice as possible so we can fill the slot." },
      { q: "Do I need an account to book?", a: "Nope — you can book as a guest using just your phone number and email. Creating a free account lets you track your loyalty tier, view all your bookings, and use your referral link." },
    ],
  },
  {
    category: "The Service",
    items: [
      { q: "Do you come to me?", a: "Yes — 100% mobile. We come to your home, office, marina, campground, or storage facility anywhere in our Vermont service area. You don't have to go anywhere or drop anything off." },
      { q: "Do you need power or water at my location?", a: "No. We're fully self-contained with our own water supply, generator, and professional-grade equipment. All we need is access to your vehicle." },
      { q: "What happens if it rains?", a: "We'll reach out to reschedule at no charge. Exterior work needs dry conditions to give you the best result. Interior-only appointments can sometimes still proceed in light rain — we'll figure it out together." },
      { q: "How long does a detail take?", a: "Roughly: Interior Detail — 2 to 3 hours. Exterior Detail — 1.5 to 2 hours. Full Detail — 3 to 4 hours. Boat and RV appointments scale with footage and can range from 3 to 10+ hours. We'll give you an estimate when you book." },
      { q: "Do I need to be home during the appointment?", a: "No. As long as your vehicle is accessible at the scheduled time and location, we can work independently. We'll send you a text when we start and when we finish." },
    ],
  },
  {
    category: "Pricing & Payment",
    items: [
      { q: "How is pricing determined?", a: "Standard vehicle pricing is based on vehicle size — compact/sedan, mid-size SUV, full-size SUV/truck, or oversized. Boat and RV pricing is per linear foot with a minimum. All pricing is shown upfront before you book — no surprises." },
      { q: "What forms of payment do you accept?", a: "All major credit and debit cards online via Stripe. If you prefer, you can also pay cash or card in person at arrival — just select 'Pay at Arrival' when booking." },
      { q: "Do you offer gift cards?", a: "Yes! Gift cards are available in any amount at ariseandshinevt.com/gift-cards. Perfect for birthdays, Father's Day, or anyone who deserves a clean vehicle." },
      { q: "Are there any travel fees?", a: "For locations within our primary service area, there's no travel fee. Longer-distance appointments may include a small travel charge — this is calculated and shown at checkout before you confirm." },
    ],
  },
  {
    category: "Loyalty, Referrals & Membership",
    items: [
      { q: "How do loyalty discounts work?", a: "Every car detail you complete counts toward your tier — no points to track. Member (1 detail): 5% off. Silver (3): 10% off. Gold (5): 15% off. VIP (10): 20% off every detail, forever. Discounts apply automatically at checkout." },
      { q: "How does the referral program work?", a: "Every account gets a unique referral link. When a friend books using your link, they get 10% off their first detail. There's no limit to how many friends you can refer." },
      { q: "What is the Maintenance Club?", a: "The Maintenance Club is a monthly detail subscription — pick interior or full detail maintenance, and each month you'll get an email to choose your preferred date. Members enjoy priority scheduling and consistent pricing." },
    ],
  },
  {
    category: "Boats, RVs & Specialty Services",
    items: [
      { q: "Do you detail boats?", a: "Yes — we detail powerboats, pontoons, sailboats, and center consoles at your marina, launch, or storage. Minimum 15 ft, priced per linear foot. We use 100% lake-safe products." },
      { q: "Do you detail RVs and motorhomes?", a: "Yes — Class A, B, and C motorhomes, travel trailers, and fifth wheels. Minimum 20 ft, priced per linear foot. We come to your campground, storage lot, or driveway." },
      { q: "What is paint correction?", a: "Paint correction is a multi-stage machine polishing process that removes swirl marks, light scratches, oxidation, and water spots from your vehicle's clear coat — restoring deep gloss and clarity." },
    ],
  },
  {
    category: "Preparation & Expectations",
    items: [
      { q: "How should I prep my vehicle?", a: "Just remove personal items, loose change, trash, and anything you'd rather keep private. Pets and car seats should be removed if you want those areas detailed. That's it — we handle everything else." },
      { q: "What products do you use?", a: "We use professional-grade detailing products including Meguiar's, Chemical Guys, and 303 Aerospace protectants. For boat work, all products are EPA-approved and lake-safe." },
      { q: "Do you offer any guarantee?", a: "Yes — if you're not satisfied with the result, let us know within 24 hours and we'll make it right. Your vehicle's finish is our reputation." },
    ],
  },
];

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
