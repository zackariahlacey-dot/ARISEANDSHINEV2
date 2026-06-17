/**
 * Per-city content for /service-area/[city] landing pages.
 * Each page targets local search ("[city] mobile auto detailing").
 * Content is unique per town — drive time, neighborhood callouts,
 * typical vehicle mix, and a localized FAQ.
 */

export type TownContent = {
  slug: string;
  /** "Burlington, VT" — used in headings, schema, metadata */
  name: string;
  /** "Burlington" — used in subheads */
  shortName: string;
  /** Drive time from Williston home base in minutes (used in copy + filtering). */
  driveTimeMin: number;
  /** Short positioning sentence used as the eyebrow tagline. */
  oneLineHook: string;
  /** Specific neighborhoods, landmarks, or districts we mention by name. */
  neighborhoodCallouts: string[];
  /** 3-4 sentence intro paragraph — must be unique per city. */
  intro: string;
  /** Mix of vehicles typical in this area. One sentence. */
  commonVehicles: string;
  /** Where we typically detail in this town (driveways, marinas, lots). */
  serviceNotes: string;
  /** Whether this town has notable waterfront access (Burlington, Shelburne, Colchester, Milton). */
  waterfront: boolean;
  /** Nearby towns to cross-link, listed in walk-of-relevance order. */
  nearbyTowns: { slug: string; shortName: string }[];
  /** City-specific FAQ. 2-3 items, real questions for that town. */
  localFaq: { q: string; a: string }[];
};

export const TOWNS: TownContent[] = [
  {
    slug: "burlington",
    name: "Burlington, VT",
    shortName: "Burlington",
    driveTimeMin: 15,
    oneLineHook: "Mobile detailing for Vermont's largest city",
    neighborhoodCallouts: ["Hill Section", "Old North End", "South End", "the Waterfront", "UVM area", "Church Street"],
    intro:
      "Burlington is the heart of our service area. From the Hill Section's tree-lined driveways to the South End's row of apartment buildings near Pine Street, we're detailing cars across the city week in, week out. We pull right up to your home, your downtown parking spot, or your UVM-area apartment building — no need to drive across town, find a wash bay, or hand over your keys.",
    commonVehicles:
      "Burlington sees the full range — Subarus and Outbacks dominate, but we detail plenty of compact city cars near downtown, plus the family SUVs and minivans further up the Hill.",
    serviceNotes:
      "Most Burlington appointments happen in residential driveways or apartment lots. For downtown clients without a driveway, we can often work in a public lot or a friend's space within walking distance — just give us a heads up at booking. We're fully self-contained (water, generator, pro equipment) so power and a hose at your location aren't required.",
    waterfront: true,
    nearbyTowns: [
      { slug: "south-burlington", shortName: "South Burlington" },
      { slug: "winooski", shortName: "Winooski" },
      { slug: "colchester", shortName: "Colchester" },
    ],
    localFaq: [
      {
        q: "Can you detail my car if I live in a downtown Burlington apartment?",
        a: "Yes. We work with downtown residents all the time — we typically use a nearby public lot, your building's lot, or street parking on a quiet block. Let us know your situation at booking and we'll confirm logistics.",
      },
      {
        q: "Do you detail boats at the Burlington waterfront?",
        a: "Yes — we detail boats at Burlington Boat House, Perkins Pier, and the Community Sailing Center. We come right to your slip or trailer with 100% lake-safe products. See our boat detailing page for per-foot pricing.",
      },
      {
        q: "How long does it take to get to Burlington from Williston?",
        a: "About 15 minutes by I-89, traffic depending. We typically arrive within the booked window and text you 30 minutes out.",
      },
    ],
  },
  {
    slug: "williston",
    name: "Williston, VT",
    shortName: "Williston",
    driveTimeMin: 0,
    oneLineHook: "Mobile detailing in our home town",
    neighborhoodCallouts: ["Maple Tree Place", "Taft Corners", "U-Mall area", "Williston Village", "Old Stage Road"],
    intro:
      "Williston is home base for Arise & Shine VT. We've detailed cars in nearly every subdivision in town — from the family neighborhoods off Mountain View Road to the larger lots along Old Stage. If you live or work in Williston, we're often able to fit you in same-week, and on quick-turn requests we can frequently get to you within 24-48 hours.",
    commonVehicles:
      "Williston's mix leans toward family vehicles — full-size SUVs, three-row crossovers, and trucks — but we handle a steady rotation of work trucks and commuter cars for residents near Taft Corners and the office complexes along Industrial Avenue.",
    serviceNotes:
      "Most Williston details happen in residential driveways. We also have several recurring commercial clients who book monthly maintenance plans for company vehicles parked at Maple Tree Place and the surrounding office parks. Self-contained setup means we don't need power or water on site.",
    waterfront: false,
    nearbyTowns: [
      { slug: "south-burlington", shortName: "South Burlington" },
      { slug: "essex", shortName: "Essex" },
      { slug: "essex-junction", shortName: "Essex Junction" },
    ],
    localFaq: [
      {
        q: "Can you come to my office at Maple Tree Place during the workday?",
        a: "Yes. Workday details at offices around Maple Tree Place and Taft Corners are some of our most popular bookings — leave your car at your usual spot, we detail while you work, and you walk out to a finished car.",
      },
      {
        q: "Do you offer recurring monthly plans for Williston residents?",
        a: "Yes — Monthly Plans let you lock in a recurring detail on a fixed day each month (e.g. the 2nd Tuesday). Request a plan from your account dashboard after your first detail with us.",
      },
    ],
  },
  {
    slug: "south-burlington",
    name: "South Burlington, VT",
    shortName: "South Burlington",
    driveTimeMin: 10,
    oneLineHook: "Mobile detailing for South Burlington — at home, at the airport, or at the office",
    neighborhoodCallouts: ["Dorset Street", "Kennedy Drive", "Hinesburg Road", "City Center", "near BTV airport"],
    intro:
      "South Burlington is one of our busiest service areas — dense residential, lots of family SUVs, and a steady flow of business travelers leaving their cars at the airport long-term. We detail cars in driveways across Kennedy Drive, Dorset Street, and the residential pockets near City Center, plus airport-area appointments for clients flying out.",
    commonVehicles:
      "Family SUVs, leased crossovers, and full-size trucks dominate the South Burlington mix. We see a lot of vehicles in need of seasonal salt removal after winter and pollen reset in spring.",
    serviceNotes:
      "Most South Burlington appointments are in residential driveways. We also offer detail-while-you-fly service near BTV — leave us your keys and itinerary, we'll have your car spotless when you land. Self-contained setup, no power or water hookup needed at your location.",
    waterfront: false,
    nearbyTowns: [
      { slug: "burlington", shortName: "Burlington" },
      { slug: "williston", shortName: "Williston" },
      { slug: "shelburne", shortName: "Shelburne" },
    ],
    localFaq: [
      {
        q: "Can you detail my car at the Burlington airport long-term lot while I'm traveling?",
        a: "Yes — we offer detail-while-you-travel service for South Burlington and BTV-area clients. Book the service, leave us your keys and flight info, and we'll have your car finished by the time you land.",
      },
      {
        q: "Do you serve apartment complexes in South Burlington?",
        a: "Yes. We regularly work with residents at apartment complexes off Williston Road, Kennedy Drive, and Dorset Street — usually in the building's lot or a nearby public space.",
      },
    ],
  },
  {
    slug: "shelburne",
    name: "Shelburne, VT",
    shortName: "Shelburne",
    driveTimeMin: 15,
    oneLineHook: "Mobile detailing for Shelburne — home, lakefront, and farm",
    neighborhoodCallouts: ["Shelburne Village", "Bay Road", "Webster Road", "Shelburne Farms area", "the Shelburne Museum corridor"],
    intro:
      "Shelburne is a top destination for our boat detailing business — Lake Champlain access at Shelburne Bay and Shelburne Shipyard brings us out regularly for marine work. On the auto side, we detail family vehicles in Shelburne Village neighborhoods and the larger residential lots along Bay Road and toward Shelburne Farms.",
    commonVehicles:
      "Shelburne sees a high mix of family SUVs, premium German sedans, and a steady stream of boat-tow trucks. Marine clients lean heavily on our per-foot boat detailing services.",
    serviceNotes:
      "Auto detailing happens in residential driveways. Boat detailing is performed dockside at Shelburne Shipyard, on trailers at storage facilities, or at private waterfront properties. All boat products are EPA-approved and 100% lake-safe.",
    waterfront: true,
    nearbyTowns: [
      { slug: "south-burlington", shortName: "South Burlington" },
      { slug: "hinesburg", shortName: "Hinesburg" },
      { slug: "burlington", shortName: "Burlington" },
    ],
    localFaq: [
      {
        q: "Do you detail boats at Shelburne Shipyard?",
        a: "Yes. Boats at Shelburne Shipyard and Shelburne Bay marinas are some of our most common marine bookings. We come to your slip or trailer with everything we need — see our boat detailing page for per-foot pricing.",
      },
      {
        q: "Can you detail at a private waterfront property in Shelburne?",
        a: "Yes — we work directly at private docks and waterfront driveways. Just provide access and we'll handle the rest.",
      },
    ],
  },
  {
    slug: "essex",
    name: "Essex, VT",
    shortName: "Essex",
    driveTimeMin: 15,
    oneLineHook: "Mobile detailing for Essex — residential and corporate fleet",
    neighborhoodCallouts: ["Essex Center", "the IBM/GlobalFoundries corridor", "Essex Way", "Old Stage Road"],
    intro:
      "Essex is one of our consistent residential service areas, plus we handle vehicles for clients working in the IBM/GlobalFoundries (now GlobalFoundries) corridor. Most appointments happen in residential driveways across Essex Center and the family neighborhoods off Essex Way, with occasional workday details at office parks for clients who want their car finished by the time they clock out.",
    commonVehicles:
      "Essex sees a heavy mix of family vehicles — three-row SUVs, minivans, and crossovers — alongside long-commute sedans and a steady flow of work trucks and contractor vehicles.",
    serviceNotes:
      "Residential driveways are our primary work site in Essex. For workday details at the GlobalFoundries campus or nearby office parks, leave us your keys at a designated spot and we'll handle it during your shift. Self-contained equipment — no power or water needed.",
    waterfront: false,
    nearbyTowns: [
      { slug: "essex-junction", shortName: "Essex Junction" },
      { slug: "williston", shortName: "Williston" },
      { slug: "colchester", shortName: "Colchester" },
    ],
    localFaq: [
      {
        q: "Can you detail my car at the GlobalFoundries campus during my shift?",
        a: "Yes — workday details at the GlobalFoundries lot are a regular request. Coordinate the drop-off spot at booking and we'll have it finished by the time you wrap.",
      },
      {
        q: "Do you offer fleet pricing for Essex businesses?",
        a: "Yes. For small fleets (3+ vehicles) booking on a recurring schedule, we offer custom fleet pricing. Reach out via the contact page with your fleet size and we'll put together a quote.",
      },
    ],
  },
  {
    slug: "essex-junction",
    name: "Essex Junction, VT",
    shortName: "Essex Junction",
    driveTimeMin: 15,
    oneLineHook: "Mobile detailing for Essex Junction — \"The Junction\" residents covered",
    neighborhoodCallouts: ["downtown Essex Junction", "the Champlain Valley Fair area", "Pearl Street", "Park Street"],
    intro:
      "We detail vehicles across Essex Junction's residential neighborhoods — from the homes near downtown to the family streets off Pearl and Park. Most of our Junction clients are repeat customers on loyalty tiers, often booking interior details after long Vermont winters or full details before summer travel.",
    commonVehicles:
      "The Junction mix is family-heavy — SUVs and crossovers dominate, with a healthy share of compact commuters and a sprinkling of older Subarus and pickup trucks.",
    serviceNotes:
      "Driveway service is the norm in Essex Junction. We routinely fit detailing into the early afternoon while clients are at work or kids are at school — let us know your access situation at booking. Self-contained setup means we don't need anything from your home.",
    waterfront: false,
    nearbyTowns: [
      { slug: "essex", shortName: "Essex" },
      { slug: "williston", shortName: "Williston" },
      { slug: "colchester", shortName: "Colchester" },
    ],
    localFaq: [
      {
        q: "Do you detail during the Champlain Valley Fair week?",
        a: "Yes — we work through fair week as long as appointments are far enough from the fairgrounds traffic that we can get in and out cleanly. Book early that week — slots fill faster than usual.",
      },
      {
        q: "Can I leave my car keys with a neighbor for a Junction appointment?",
        a: "Yes — many of our Junction clients leave keys with a neighbor or in a lockbox. As long as the car is accessible, we'll text you on arrival and again at completion.",
      },
    ],
  },
  {
    slug: "colchester",
    name: "Colchester, VT",
    shortName: "Colchester",
    driveTimeMin: 20,
    oneLineHook: "Mobile detailing for Colchester — lakeside homes to lakefront boats",
    neighborhoodCallouts: ["Malletts Bay", "Bayside", "Mill Pond Road", "Colchester Point", "Severance Road"],
    intro:
      "Colchester combines a strong residential auto-detailing customer base with an active boat detailing season thanks to Malletts Bay. We work residential driveways across Mill Pond, Severance, and the Bayside area, plus boat detail appointments at Malletts Bay docks and home boat trailers throughout the summer.",
    commonVehicles:
      "Family SUVs and tow trucks dominate Colchester's auto mix — plenty of clients are pulling boats to and from the bay, so we see a lot of vehicles needing salt-and-launch-ramp grime removed.",
    serviceNotes:
      "Auto details happen in residential driveways. Boat appointments happen dockside at private and shared Malletts Bay slips, or on trailers at home. We use lake-safe products throughout — nothing we use threatens the watershed.",
    waterfront: true,
    nearbyTowns: [
      { slug: "winooski", shortName: "Winooski" },
      { slug: "milton", shortName: "Milton" },
      { slug: "burlington", shortName: "Burlington" },
    ],
    localFaq: [
      {
        q: "Do you detail boats at Malletts Bay?",
        a: "Yes — Malletts Bay is one of our most common boat detail locations. We come to your slip or trailer at private and shared marinas. See our boat detailing page for per-foot pricing.",
      },
      {
        q: "Can you handle the salt and grime my truck picks up from the launch ramps?",
        a: "Yes. Our Full Detail and Exterior Detail packages target exactly the kind of buildup that boat-tow trucks accumulate from the bay's launch ramps. Wheel wells, undercarriage spray-down, and salt-neutralizing wash all included.",
      },
    ],
  },
  {
    slug: "winooski",
    name: "Winooski, VT",
    shortName: "Winooski",
    driveTimeMin: 20,
    oneLineHook: "Mobile detailing for Winooski — the river city",
    neighborhoodCallouts: ["downtown Winooski", "the Onion City", "Mallets Bay Avenue area", "Hickok Street", "the Champlain Mill area"],
    intro:
      "Winooski's density and growing young-professional population means most of our detailing happens at apartments, condos, and small driveways near the downtown core. We coordinate parking carefully — sometimes in your building's lot, sometimes at a nearby public space — and work efficiently so neighbors aren't disrupted.",
    commonVehicles:
      "Winooski's mix skews toward compact commuters and crossovers — fewer pickups than the surrounding towns, more Subarus and Hondas. Interior details are our most-booked service here.",
    serviceNotes:
      "Apartment and condo lots are common Winooski work sites. For downtown residents without a dedicated spot, we'll coordinate a nearby public lot at booking. Equipment is fully self-contained, so neighbors won't see hoses running or hear plug-in machines.",
    waterfront: false,
    nearbyTowns: [
      { slug: "burlington", shortName: "Burlington" },
      { slug: "colchester", shortName: "Colchester" },
      { slug: "south-burlington", shortName: "South Burlington" },
    ],
    localFaq: [
      {
        q: "I live in a Winooski apartment without parking — can you still detail my car?",
        a: "Yes. We've done plenty of Winooski apartment details by coordinating a nearby public lot at booking. Let us know your situation and we'll work out logistics.",
      },
      {
        q: "Will your equipment disturb my neighbors?",
        a: "Our setup is quieter than a typical car wash — no roaring blowers, no high-pressure pumps running constantly. Most neighbors don't notice we're there.",
      },
    ],
  },
  {
    slug: "milton",
    name: "Milton, VT",
    shortName: "Milton",
    driveTimeMin: 25,
    oneLineHook: "Mobile detailing for Milton — bigger lots, bigger vehicles",
    neighborhoodCallouts: ["Milton Town Core", "Lake Road", "Bear Trap Road", "Sandbar State Park area", "Arrowhead Lake area"],
    intro:
      "Milton's larger residential lots and rural character mean we typically work in spacious driveways with plenty of room to set up. The mix here is heavier on trucks, work vehicles, and tow vehicles for boats and campers heading to Sandbar or Arrowhead. Most appointments are repeat clients on loyalty tiers.",
    commonVehicles:
      "Trucks dominate the Milton mix — full-size pickups, work trucks, and tow vehicles for boats and travel trailers. We also see plenty of family SUVs and a fair share of older Vermont-classic Subarus.",
    serviceNotes:
      "Residential driveway service is the norm. Boat and RV details are also common — we'll come to your home, your storage location, or directly to a launch site within the area. Self-contained equipment, no power or water needed at your location.",
    waterfront: true,
    nearbyTowns: [
      { slug: "colchester", shortName: "Colchester" },
      { slug: "essex", shortName: "Essex" },
      { slug: "williston", shortName: "Williston" },
    ],
    localFaq: [
      {
        q: "Do you detail RVs and travel trailers in Milton?",
        a: "Yes — Milton is one of our common RV detail areas given how many residents own and tow trailers to nearby campgrounds. We come to your driveway, storage lot, or campsite. See our RV detailing page for per-foot pricing.",
      },
      {
        q: "Can you handle the longer drive from Williston?",
        a: "Yes — Milton is well within our standard service area. First 10 miles are travel-fee-free; beyond that it's $0.50/mile rounded up. The full fee is shown at checkout before you confirm.",
      },
    ],
  },
  {
    slug: "hinesburg",
    name: "Hinesburg, VT",
    shortName: "Hinesburg",
    driveTimeMin: 25,
    oneLineHook: "Mobile detailing for Hinesburg — rural Vermont, premium results",
    neighborhoodCallouts: ["Hinesburg Village", "Mechanicsville Road", "Lewis Creek Road", "Pond Brook Road"],
    intro:
      "Hinesburg's mix of village residences and larger rural properties gives us a wide range of work — from compact-car interior resets in the village to full details on trucks and SUVs on country roads heading toward Charlotte and Monkton. Mud-season cleanup and salt-recovery work are especially popular here.",
    commonVehicles:
      "Trucks and SUVs dominate Hinesburg — lots of pickups and tow vehicles, plus a steady mix of Subaru wagons. Mud is the universal enemy here from March through May.",
    serviceNotes:
      "Driveway service for both village and rural addresses. For long dirt-road properties, just give us a heads up at booking so we know what to expect. Self-contained equipment — perfect for properties without easy hose or power access.",
    waterfront: false,
    nearbyTowns: [
      { slug: "shelburne", shortName: "Shelburne" },
      { slug: "williston", shortName: "Williston" },
      { slug: "south-burlington", shortName: "South Burlington" },
    ],
    localFaq: [
      {
        q: "Do you handle Vermont mud-season cleanup?",
        a: "Yes — that's exactly what our Full Detail and Exterior Detail packages are built for. Wheel wells, undercarriage, fender liners, and salt-neutralizing wash all included.",
      },
      {
        q: "Can you reach properties on long dirt driveways?",
        a: "Yes. Our vehicle is a standard work van with all-season tires — we get to long dirt and gravel driveways routinely. Mention any access concerns at booking so we can plan accordingly.",
      },
    ],
  },
];

export function getTownBySlug(slug: string): TownContent | undefined {
  return TOWNS.find((t) => t.slug === slug);
}

export function getTownSlugs(): string[] {
  return TOWNS.map((t) => t.slug);
}
