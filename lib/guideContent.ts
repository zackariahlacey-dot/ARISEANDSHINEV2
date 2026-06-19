/**
 * Long-form guide content for /guides/[slug] pages.
 * These are evergreen, search-targeted articles — each one focused on a
 * single high-intent query for a Vermont mobile detailing customer.
 *
 * Quality > quantity: 6 substantive guides beat 60 thin posts for a
 * local service business.
 */

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  keywords: string[];
  category: "Pricing" | "Seasonal" | "Educational" | "Selling" | "Marine";
  readTimeMin: number;
  publishedDate: string;
  /** Hero one-liner pulled below the H1. */
  intro: string;
  sections: GuideSection[];
  primaryCta: { label: string; href: string };
  relatedSlugs: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-much-does-mobile-detailing-cost-vermont",
    title: "How Much Does Mobile Auto Detailing Cost in Vermont?",
    shortTitle: "What does mobile detailing cost in Vermont?",
    description:
      "A clear breakdown of mobile auto detailing prices in Vermont — interior vs. exterior, vehicle size impact, and what's included vs. what's an upcharge.",
    keywords: [
      "mobile detailing cost Vermont",
      "auto detailing price Vermont",
      "how much does car detailing cost",
      "car detailing price Burlington VT",
      "mobile detail price Vermont",
    ],
    category: "Pricing",
    readTimeMin: 4,
    publishedDate: "2026-01-15",
    intro:
      "Short answer: a mobile auto detail in Vermont typically runs from $130 for a basic exterior wash on a sedan up to $400 or more for a full ultimate-tier reset on a three-row SUV. The variation comes down to four things — service type, vehicle size, condition, and add-ons. Here's how the math actually shakes out.",
    sections: [
      {
        heading: "The four variables that move price",
        paragraphs: [
          "Every reputable detailer in Vermont prices roughly the same way, even if the package names differ. Once you understand the four levers, comparing quotes gets easy.",
        ],
        bullets: [
          "**Service type** — Interior, exterior, or full detail. Interior is more labor-intensive than exterior (think stain removal vs. wash), so it often costs slightly more for the same vehicle.",
          "**Vehicle size** — A sedan has roughly half the interior surface area of a three-row SUV. Detailers price by size tier (sedan / SUV / three-row or oversized) to keep this fair.",
          "**Vehicle condition** — A well-maintained car needs a wash and refresh. A car that hasn't been detailed in two years and lives outside year-round needs deep extraction, leather restoration, and salt-stain neutralization. Some detailers absorb this into the base price; others add a \"condition fee.\"",
          "**Add-ons** — Engine bay detail, ceramic spray sealant, headliner shampoo, ozone treatment, pet hair removal beyond standard.",
        ],
      },
      {
        heading: "Typical Vermont pricing ranges",
        paragraphs: [
          "These are the going rates for mobile detailing in Chittenden County and the broader Champlain Valley as of 2026:",
        ],
        bullets: [
          "**Exterior Detail** — $130 to $200 depending on size. Includes wash, wheels, tires, exterior windows, and surface sealant.",
          "**Interior Detail** — $150 to $220. Includes vacuum, deep wipe-down, glass, leather/vinyl conditioning, and basic stain treatment.",
          "**Basic Interior + Exterior** — $240 to $320. Combined interior + exterior, typically discounted versus booking them separately.",
          "**Ultimate / Premium Tier** — $350 to $450+. Includes everything above plus deep extraction, headliner work, leather restoration, and a longer-lasting protectant.",
        ],
      },
      {
        heading: "Why mobile detailing isn't usually more expensive than a shop",
        paragraphs: [
          "A common assumption is that mobile detailing carries a premium because the detailer is driving to you. In reality, mobile operators don't pay rent on a wash bay, don't pay utilities on a shop, and don't have a receptionist taking phone calls — those savings cancel out the travel cost. Most mobile pricing lands within ~10% of comparable shop pricing.",
          "What you do save is your time. A full detail at a shop typically requires you to drop off, find a ride, come back, and reorganize your day. Mobile means your car is detailed in your driveway while you work, sleep, or run errands.",
        ],
      },
      {
        heading: "Watch for these pricing red flags",
        paragraphs: [
          "Detailing pricing is mostly transparent in Vermont, but a few patterns are worth flagging:",
        ],
        bullets: [
          "**\"Starting at\" pricing with no upper bound** — Reputable detailers publish a price range or a clear size tier. If you only see \"starting at $99,\" expect a surprise.",
          "**No condition disclosure** — Ask whether your stated condition (heavy pet hair, kid mess, smoke, water damage) is included or extra. Get the answer in writing before booking.",
          "**Travel fees calculated on arrival** — Travel should be quoted at booking, not invoiced after the fact. If a detailer can't give you a travel number when you book, that's a bad sign.",
        ],
      },
    ],
    primaryCta: { label: "See our full pricing", href: "/detailing" },
    relatedSlugs: ["detailing-vs-car-wash", "best-time-to-detail-car-vermont"],
  },
  {
    slug: "best-time-to-detail-car-vermont",
    title: "Best Time of Year to Detail Your Car in Vermont",
    shortTitle: "When to detail your car in Vermont",
    description:
      "Vermont's four-season climate makes detail timing matter. Here's a month-by-month guide to when each kind of detail pays off most.",
    keywords: [
      "when to detail car Vermont",
      "best time car detailing Vermont",
      "spring detailing Vermont",
      "winter detailing Vermont",
      "fall detailing Vermont",
    ],
    category: "Seasonal",
    readTimeMin: 5,
    publishedDate: "2026-02-01",
    intro:
      "Vermont gives your car four very different kinds of abuse across the year — salt and brine in winter, mud and pollen in spring, sun and tar in summer, and tree sap and falling debris in fall. Timing your detail to the season makes the work more effective and the result last longer. Here's the playbook.",
    sections: [
      {
        heading: "March–April: Salt Recovery (the highest-leverage time of year)",
        paragraphs: [
          "If you only do one detail per year in Vermont, do it now. Five months of road salt has been quietly etching your paint, accelerating rust in your wheel wells, and rotting your interior carpets where you tracked it in on boots. The longer you wait, the more permanent the damage becomes.",
          "A spring detail should specifically include: salt-neutralizing exterior wash, deep wheel and wheel-well cleaning, undercarriage rinse, and interior carpet extraction (not just vacuuming). A standard wash won't touch most of this.",
        ],
      },
      {
        heading: "May–June: Pollen reset + paint protection",
        paragraphs: [
          "Vermont's spring pollen blooms (especially birch and maple) coat cars in a yellow film that's bonded to your clear coat by mid-June if left alone. This is also when most Vermonters start using their cars more — road trips, lake runs, longer commutes. It's the right window for a deep wash and a fresh ceramic spray sealant that'll carry through summer.",
        ],
      },
      {
        heading: "July–August: Maintenance + boat/RV peak",
        paragraphs: [
          "Mid-summer is mostly about maintenance — a quick interior reset before family trips, an exterior refresh after a beach weekend. Skip the deep work this time of year. Save the budget for spring or fall.",
          "For boat and RV owners, July and August are peak detailing season. UV exposure on gelcoat and RV exteriors is brutal in summer sun — a mid-season exterior detail with a UV-protective sealant pays off in resale value down the road.",
        ],
      },
      {
        heading: "September–October: Pre-winter armor",
        paragraphs: [
          "Detailing your car in early fall — before the first snow — is the single best move for preventing winter damage. A fresh sealant or wax layer applied to clean paint resists salt bonding much more effectively than bare paint does. Interior conditioning before winter helps leather and vinyl tolerate the dry indoor air without cracking.",
          "If you can swing two details per year, make them spring (salt recovery) and fall (pre-winter armor). Skip the rest.",
        ],
      },
      {
        heading: "November–February: Winter is for maintenance, not full details",
        paragraphs: [
          "Mobile detailing slows down in deep winter for good reason — exterior work requires above-freezing temperatures and dry conditions. We can usually do interior-only details through winter (heated garage, your driveway on a sunny day), but reserve big exterior work for the shoulder seasons. If your car is genuinely embarrassing in February, an interior reset will buy you peace until spring.",
        ],
      },
    ],
    primaryCta: { label: "Book your seasonal detail", href: "/detailing" },
    relatedSlugs: ["salt-damage-winter-car-protection", "how-much-does-mobile-detailing-cost-vermont"],
  },
  {
    slug: "salt-damage-winter-car-protection",
    title: "Salt Damage: Protecting Your Car Through a Vermont Winter",
    shortTitle: "Salt damage & winter protection",
    description:
      "Road salt is the single biggest threat to your car in Vermont. Here's how it damages your vehicle and what actually prevents it.",
    keywords: [
      "salt damage car Vermont",
      "winter car protection Vermont",
      "road salt damage car",
      "prevent rust Vermont winter",
      "winter car care Vermont",
    ],
    category: "Seasonal",
    readTimeMin: 5,
    publishedDate: "2026-02-10",
    intro:
      "Vermont uses both sodium chloride (rock salt) and magnesium chloride brine on its roads from late November through early April. Both are corrosive to steel, aluminum, and chrome — and they're sneakier than they look. Here's what's actually happening to your car, and the small set of habits that prevent 90% of the damage.",
    sections: [
      {
        heading: "What salt does to your car (it's not just rust)",
        paragraphs: [
          "Salt damages your vehicle through three separate mechanisms — only one of which is the rust you're picturing.",
        ],
        bullets: [
          "**Direct corrosion** — Salt-water solution attacks bare metal anywhere it can reach. The worst spots are the underbody, fender liners, wheel wells, and the lower edges of doors. Even small paint chips become rust sites because salt brine seeps under the surrounding clear coat.",
          "**Etching** — The brine evaporates on your paint and leaves microscopic salt crystals that dig into the clear coat with every temperature change. Over a winter, this dulls finish and creates haze that's tough to polish out.",
          "**Interior damage** — Salt tracked in on shoes works into carpet fibers and binds to the moisture from melting snow. Left alone, it forms white salt rings that bleach the carpet and damage the underlying jute padding.",
        ],
      },
      {
        heading: "The four habits that prevent 90% of salt damage",
        paragraphs: [
          "You don't need a heated garage to keep your car healthy through Vermont winter. You need a small set of routines:",
        ],
        bullets: [
          "**Wash within 48 hours of a salt event.** Salt does its damage when wet, then dries to crystals that survive until the next moisture cycle. A quick rinse — even at a self-serve bay — flushes the worst before it bonds.",
          "**Don't skip the undercarriage.** Drive-through washes that include an underbody spray are worth the upcharge in winter. The underside catches more salt than the body and you can't see what's happening down there.",
          "**Knock snow off your floor mats every morning.** That clump of slush isn't melting evenly — it's slowly delivering salt water into your carpet for the next 8 hours.",
          "**Get one fall detail with a fresh sealant or wax.** This is the single highest-leverage move. Clean paint with fresh protection sheds salt far better than bare paint, and the protection lasts roughly 4–6 months — exactly the length of a Vermont salt season.",
        ],
      },
      {
        heading: "If you've already let it go too long",
        paragraphs: [
          "If you're reading this in March or April and realizing your car has been salt-coated since December, a Basic Interior + Exterior detail will do most of the repair — a neutralizing wash, deep wheel and underbody work, salt-stain extraction from carpets, and a fresh layer of ceramic spray sealant to carry you into spring.",
          "Left alone, salt damage compounds — what's surface staining now becomes deep rust pitting next winter. The intervention is much cheaper than the repair.",
        ],
      },
    ],
    primaryCta: { label: "Book a Basic Interior + Exterior Detail", href: "/detailing" },
    relatedSlugs: ["best-time-to-detail-car-vermont", "detailing-vs-car-wash"],
  },
  {
    slug: "detailing-vs-car-wash",
    title: "Detailing vs. Car Wash: What's the Difference?",
    shortTitle: "Detailing vs. car wash",
    description:
      "Are you paying for a wash when you actually need a detail? Here's what each one actually includes and when to choose which.",
    keywords: [
      "detailing vs car wash",
      "difference between detail and car wash",
      "what is car detailing",
      "is detailing worth it",
      "car wash vs detailing Vermont",
    ],
    category: "Educational",
    readTimeMin: 4,
    publishedDate: "2026-01-25",
    intro:
      "A car wash is to a detail what a quick shower is to a deep clean of your house — both have their place, but they're not the same thing and they don't substitute for each other. Here's the actual difference in plain language, with a simple test to know which one you need today.",
    sections: [
      {
        heading: "What a car wash actually does",
        paragraphs: [
          "A standard car wash — drive-through, tunnel, or self-serve — is a soap-and-rinse operation focused entirely on your exterior. Most washes take 3 to 8 minutes and remove loose dirt, road film, and surface dust. Higher-tier washes add things like clear-coat protectant or a basic underbody spray.",
          "What a car wash does NOT do: clean the inside of your car, address bonded contaminants (tar, tree sap, bug residue, salt crystals etched into paint), restore faded trim, condition leather, or fix swirl marks. The wash brush itself, in many tunnel washes, actually adds light scratches over time.",
        ],
      },
      {
        heading: "What a real detail actually does",
        paragraphs: [
          "A detail is a multi-hour, multi-stage process that addresses everything a car wash doesn't. An interior detail typically includes vacuuming, deep cleaning of all surfaces (dashboard, vents, door panels, headliner), glass cleaning, conditioning of leather/vinyl, and treatment of any stains. An exterior detail goes well beyond a wash — clay-bar decontamination, removal of bonded contaminants, polish or wax application, and tire/trim restoration.",
          "A full detail combines both and typically takes 3 to 4 hours. The end result isn't \"a slightly cleaner version of the same car\" — it's closer to \"the car as it was when you bought it.\"",
        ],
      },
      {
        heading: "The simple test for which you need",
        paragraphs: [
          "Walk to your car right now and answer these questions honestly:",
        ],
        bullets: [
          "Are there crumbs, dust, or fingerprints anywhere inside? You need a detail, not a wash.",
          "Has it been more than 6 months since your last detail? You need a detail, not a wash.",
          "Are there water spots or dull spots on the paint that don't come off when you wipe? You need a detail (specifically, clay bar + polish).",
          "Is the only issue \"some road dust on the outside\"? A wash is fine.",
          "Are you about to sell or trade in the car? A detail will pay for itself many times over. (See our pre-sale detailing guide.)",
        ],
      },
      {
        heading: "How often should you actually detail?",
        paragraphs: [
          "For most Vermont drivers, two details per year is the sweet spot — one in early fall (pre-winter armor) and one in spring (salt recovery). In between, regular drive-through washes handle the maintenance. If you've got kids, pets, or a long commute, bumping to three details per year often makes sense.",
          "If you've never had your car professionally detailed, the first one will surprise you. Most people don't realize what's actually been bonding to their car for years until they see the difference.",
        ],
      },
    ],
    primaryCta: { label: "Book your first detail", href: "/detailing" },
    relatedSlugs: ["how-much-does-mobile-detailing-cost-vermont", "salt-damage-winter-car-protection"],
  },
  {
    slug: "boat-winterization-vermont",
    title: "Vermont Boat Detailing & Winterization Prep: What to Do Before Storage",
    shortTitle: "Boat winterization prep in Vermont",
    description:
      "Storing your boat for a Vermont winter? Here's what to clean, treat, and protect before the cover goes on — and what skipping this step costs you in spring.",
    keywords: [
      "boat winterization Vermont",
      "boat detailing before storage",
      "Lake Champlain boat winter",
      "boat storage prep Vermont",
      "winter boat detail Vermont",
    ],
    category: "Marine",
    readTimeMin: 5,
    publishedDate: "2026-02-15",
    intro:
      "Vermont's boating season is short — roughly Memorial Day to Columbus Day on Lake Champlain — which means your boat spends seven months sitting still. What you do before the cover goes on determines what you'll find when you pull it off in May. Here's the pre-storage detailing checklist that actually matters.",
    sections: [
      {
        heading: "Why pre-storage detailing matters more than spring detailing",
        paragraphs: [
          "Most boat owners think of detailing as a spring task — get it shiny before launch day. That's backwards. The damage that builds up over winter is mostly chemical and biological, and it happens because contaminants get sealed in by the cover. A boat stored dirty cooks for seven months.",
          "Algae and waterline scum bond permanently when left to dry. Mildew sets up shop in any interior surface with residual moisture. Tree sap from temporary outdoor storage etches into gelcoat. The cost of removing all this in spring is far higher than the cost of cleaning before storage.",
        ],
      },
      {
        heading: "The pre-storage detail checklist",
        paragraphs: [
          "A proper pre-storage detail covers both the exterior and the interior — and a few things specific to marine storage:",
        ],
        bullets: [
          "**Hull and waterline cleaning** — Algae, scum line, and any oxidation removed before they bond permanently. Trying to remove these in spring usually requires aggressive compounding, which thins your gelcoat.",
          "**Gelcoat sealant** — A wax or polymer sealant applied to clean gelcoat slows oxidation through winter and makes spring prep dramatically faster.",
          "**Interior deep clean and dry** — Carpets, upholstery, headliner, storage compartments. Any residual moisture under your cover becomes mildew by January.",
          "**Vinyl conditioning** — Cushions, dash, and trim treated with a UV protectant so they don't crack from temperature swings.",
          "**Bilge cleaning** — Cleaned and dried so nothing's brewing under the floor all winter.",
          "**Stainless polish** — Stainless rails and fittings polished to slow surface corrosion.",
        ],
      },
      {
        heading: "Marina, trailer, or driveway: where to detail matters",
        paragraphs: [
          "We work in all three — at Lake Champlain marinas (Shelburne Shipyard, Burlington Boat House, Malletts Bay, and more), on home trailers, and at private waterfront properties. Most pre-storage details happen on land — either at your slip pre-haul-out, on your trailer at home, or at your storage facility.",
          "Timing-wise, the right window is the two weeks before you cover the boat — late September through mid-October for most Vermont owners. Earlier means you'll re-dirty everything; later risks weather windows for exterior work.",
        ],
      },
      {
        heading: "What it costs vs. what it saves",
        paragraphs: [
          "A pre-storage detail on a 22-foot boat runs roughly $700–$900 depending on condition. The spring alternative — fixing seven months of locked-in damage — typically runs $1,400–$1,800 because it requires compounding, deep oxidation removal, and full mildew remediation. Pre-storage detailing isn't just protection; it's straightforwardly cheaper over a season.",
        ],
      },
    ],
    primaryCta: { label: "Book boat detailing", href: "/boat-detailing" },
    relatedSlugs: ["best-time-to-detail-car-vermont"],
  },
  {
    slug: "pre-sale-detailing-resale-value",
    title: "Pre-Sale Detailing: Get $1,500+ More for Your Car",
    shortTitle: "Pre-sale detailing & resale value",
    description:
      "A pre-sale detail is the highest-ROI move you can make before selling a used car. Here's why it works, what it should include, and what to expect for your money.",
    keywords: [
      "pre-sale car detailing",
      "detail before selling car",
      "increase car resale value Vermont",
      "detail car for trade in",
      "used car detailing Vermont",
    ],
    category: "Selling",
    readTimeMin: 4,
    publishedDate: "2026-02-20",
    intro:
      "Of all the ways to add value to a used car before selling, a professional detail has the best return on investment by a wide margin. A $300 detail typically adds $1,500 to $2,500 to the sale price — and sells the car 2x faster. Here's why this works and what your detail needs to include to actually move the needle.",
    sections: [
      {
        heading: "Why detailing works so well for resale",
        paragraphs: [
          "Buyers are not rational about used cars. They form an opinion in the first 30 seconds of seeing your listing photos or walking up to your vehicle, and that opinion drives the rest of the negotiation. A clean car signals: cared-for, well-maintained, low-risk. A dirty car signals: neglected, hiding something, lots of room to negotiate down.",
          "The actual mechanical condition often matters less than the perceived condition. Two identical cars — same mileage, same year, same trim — sell for wildly different prices depending on how clean they look. A pre-sale detail closes that gap.",
        ],
      },
      {
        heading: "What a pre-sale detail should include",
        paragraphs: [
          "A general detail will help, but a pre-sale detail should be specifically optimized for what buyers notice and what photos capture:",
        ],
        bullets: [
          "**Full interior reset** — Vacuum, deep extraction, all surfaces wiped, glass perfect, leather/vinyl conditioned. Buyers obsess over interior smell, so odor neutralization (or ozone treatment for smokers/pets) is critical.",
          "**Engine bay clean** — Most sellers skip this. A clean engine bay signals \"I maintain this car.\" The cost is small; the perceived value is significant.",
          "**Wheel and tire restoration** — Tire dressing, wheel polish, brake dust removal. Wheels show up prominently in photos.",
          "**Paint correction (if budget allows)** — Removing swirl marks and light scratches makes the paint look new under any lighting. This is what listings photos pick up.",
          "**Headlight restoration if hazy** — Yellowed headlights age a car visually by 5+ years. Restoration is cheap and dramatic.",
        ],
      },
      {
        heading: "The math: $300 in, $1,500+ out",
        paragraphs: [
          "On a $15,000 used car, the typical pre-sale detail adds about 10% to the sale price — that's $1,500 on average for a $250–$350 investment. On higher-end vehicles ($30,000+), the lift is often greater in absolute terms ($2,500–$4,000) because buyers in that price range are even more sensitive to condition.",
          "Beyond the price lift, detailed cars sell roughly twice as fast on private-party platforms (Facebook Marketplace, Craigslist) and at dealer trade-in. Faster sales mean fewer test drives, less time off work, and the ability to move on to your next vehicle quickly.",
        ],
      },
      {
        heading: "When to schedule the detail",
        paragraphs: [
          "Schedule the detail within 48 hours of taking listing photos. Cleaner photos drive more inquiries, more inquiries drive more offers, more offers drive the price up. If you're trading in to a dealer, do the detail the day before your appointment.",
          "Don't detail your car a month before listing it — you'll undo the work by driving it. Detail, photograph, list — in that order, in the same week.",
        ],
      },
    ],
    primaryCta: { label: "Book pre-sale detail", href: "/detailing" },
    relatedSlugs: ["detailing-vs-car-wash", "how-much-does-mobile-detailing-cost-vermont"],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

/** Schema.org Article JSON-LD for a single guide. */
export function buildArticleSchema(guide: Guide) {
  const url = `https://www.ariseandshinevt.com/guides/${guide.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    image: "https://www.ariseandshinevt.com/aasbanner.png",
    datePublished: guide.publishedDate,
    dateModified: guide.publishedDate,
    author: {
      "@type": "Organization",
      name: "Arise & Shine VT",
      url: "https://www.ariseandshinevt.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Arise & Shine VT",
      logo: { "@type": "ImageObject", url: "https://www.ariseandshinevt.com/aasbanner.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}
