export const FAQ_SECTIONS = [
  {
    category: "Booking & Scheduling",
    items: [
      { q: "How do I book an appointment?", a: "Book online anytime at ariseandshinevt.com — pick your service, choose a date and time, and pay online or at arrival. You'll get a confirmation email right away with all your appointment details." },
      { q: "How much notice do I need?", a: "We typically have openings within the same week. The online calendar shows real-time availability, so you can book as soon as tonight for an upcoming slot — or plan ahead weeks in advance." },
      { q: "Can I cancel or reschedule?", a: "Yes. You can reschedule directly from your account dashboard, or reach out to us by phone or email. We just ask for as much notice as possible so we can fill the slot." },
      { q: "Do I need an account to book?", a: "Nope — you can book as a guest using just your phone number and email. Creating a free account lets you track your loyalty tier, view all your bookings, and request a monthly plan." },
    ],
  },
  {
    category: "The Service",
    items: [
      { q: "Do you come to me?", a: "Yes — 100% mobile. We come to your home, office, marina, campground, or storage facility anywhere in our Vermont service area. You don't have to go anywhere or drop anything off." },
      { q: "Do you need power or water at my location?", a: "No. We're fully self-contained with our own water supply, generator, and professional-grade equipment. All we need is access to your vehicle." },
      { q: "What happens if it rains?", a: "We'll reach out to reschedule at no charge. Exterior work needs dry conditions to give you the best result. Interior-only appointments can sometimes still proceed in light rain — we'll figure it out together." },
      { q: "How long does a detail take?", a: "Standard auto details: Interior — about 2.5 hours. Exterior — about 2 hours. Full Detail — about 3 hours. Paint Correction: 1-Step runs roughly 5.5 to 8 hours depending on vehicle size. 2-Step runs 9 to 10+ hours and typically reserves the whole day. Boats and RVs scale by length — interior or exterior alone runs 3 to 6 hours, a full boat or RV detail runs 5 to 10 hours, and oxidation restoration or ultimate transformation packages can take the entire day. We'll give you a specific estimate when you book." },
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
    category: "Loyalty & Monthly Plans",
    items: [
      { q: "How do loyalty discounts work?", a: "Every car detail you complete counts toward your tier — no points to track. Member (1 detail): 5% off. Silver (3): 10% off. Gold (5): 15% off. VIP (10): 20% off every detail, forever. Discounts apply automatically at checkout." },
      { q: "What are Monthly Plans?", a: "Monthly Plans let you lock in recurring detailing on a set schedule — interior, exterior, or full detail. Choose a fixed day each month (like the 2nd Tuesday) or opt to receive a monthly email to pick your day. Request a plan from your account dashboard." },
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
] as const;

export function buildFaqPageSchema(faqSections: typeof FAQ_SECTIONS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqSections.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      }))
    ),
  };
}
