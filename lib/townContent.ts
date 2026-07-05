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
      "Williston is home base for Arise And Shine Detailing. We've detailed cars in nearly every subdivision in town — from the family neighborhoods off Mountain View Road to the larger lots along Old Stage. If you live or work in Williston, we're often able to fit you in same-week, and on quick-turn requests we can frequently get to you within 24-48 hours.",
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
        a: "Yes. Our Interior + Exterior and Exterior Detail packages target exactly the kind of buildup that boat-tow trucks accumulate from the bay's launch ramps. Wheel wells, undercarriage spray-down, and salt-neutralizing wash all included.",
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
        a: "Yes — Milton is well within our standard service area. First 7.5 miles from our Williston base are travel-fee-free; beyond that it's $1/mile rounded up. The full fee is shown at checkout before you confirm.",
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
        a: "Yes — that's exactly what our Interior + Exterior and Exterior Detail packages are built for. Wheel wells, undercarriage, fender liners, and salt-neutralizing wash all included.",
      },
      {
        q: "Can you reach properties on long dirt driveways?",
        a: "Yes. Our vehicle is a standard work van with all-season tires — we get to long dirt and gravel driveways routinely. Mention any access concerns at booking so we can plan accordingly.",
      },
    ],
  },

  // ─── HIGH-TICKET LUXURY TOWNS (June 2026 SEO expansion) ─────────────────
  // Hand-crafted for affluent markets — Charlotte estates, Stowe ski second-
  // homes, Manchester/Woodstock weekend money, Norwich/Dartmouth wealth,
  // Killington/Stratton resort fleets, Quechee Club retirees. Copy positions
  // the brand for luxury vehicles, ceramic coatings, and on-site estate
  // service rather than commuter Subarus. Each page has its own neighborhood
  // callouts, target vehicles, and 3 location-specific FAQs.
  {
    slug: "charlotte",
    name: "Charlotte, VT",
    shortName: "Charlotte",
    driveTimeMin: 25,
    oneLineHook: "Estate mobile detailing on the Lake Champlain shoreline",
    neighborhoodCallouts: ["Mt Philo Road", "Greenbush Road", "Thompsons Point", "Cedar Beach", "Lake Road", "Ferry Road"],
    intro:
      "Charlotte has the kind of waterfront estates and long shoreline driveways that mobile detailing was built for. We come right to your Mt Philo or Greenbush Road home, set up in your driveway, and detail one car or four without disrupting your day. Premium services like the 5-Year Gentech Graphene Coating and Ultimate Interior + Exterior Reset are particularly popular here — built for vehicles that earn their keep on Charlotte's mix of dirt roads, lake spray, and ski-season trips.",
    commonVehicles:
      "Charlotte skews toward Range Rovers, Audi SQ7/SQ8, Porsche Macan/Cayenne, Mercedes G-Wagon, and high-trim Tahoes and Suburbans — plus the occasional classic kept for summer driving along the lake.",
    serviceNotes:
      "Most Charlotte appointments are in private driveways with plenty of room to work — we frequently detail multiple vehicles in one visit at family compounds along Lake Road and Thompsons Point. Long gravel drives are no issue. Ferry Road clients sometimes have us meet at the dock when the boat detail and the SUV detail land on the same day.",
    waterfront: true,
    nearbyTowns: [
      { slug: "shelburne", shortName: "Shelburne" },
      { slug: "hinesburg", shortName: "Hinesburg" },
      { slug: "south-burlington", shortName: "South Burlington" },
    ],
    localFaq: [
      {
        q: "Can you detail multiple vehicles at our Charlotte estate in one visit?",
        a: "Yes — multi-vehicle visits are a huge part of what we do here. Each additional vehicle gets a discount (2% per vehicle, up to 20% off the total), and a full-day fleet visit covers 4-8 vehicles. Get an instant quote on /fleet or call 802-585-5563 to coordinate.",
      },
      {
        q: "Do you do the 5-Year Gentech Graphene Coating on-site in Charlotte?",
        a: "Yes — our Gentech Graphene application is fully mobile and we do it in your covered garage or in a shaded part of your driveway. Charlotte estates often have ideal conditions for a perfect cure. Body, wheels, and windows can each be coated for compounding value (2 picks = 15% off, 3 = 25% off).",
      },
      {
        q: "Can you handle a Range Rover, Porsche, or Mercedes G-Wagon?",
        a: "Of course. The Ultimate Interior + Exterior Reset is built around luxury SUVs — hot water extraction on leather, neutral-pH wash on the paint, plastic trim restoration on dark exterior trim. We carry coatings rated safe for matte/satin finishes when needed; mention your finish at booking.",
      },
    ],
  },
  {
    slug: "stowe",
    name: "Stowe, VT",
    shortName: "Stowe",
    driveTimeMin: 50,
    oneLineHook: "Ski-country mobile detailing — second homes, fleets, and Sprinters",
    neighborhoodCallouts: ["Mountain Road", "Trapp Hill Road", "Edson Hill", "West Hill", "Stowe Hollow", "Stowe Mountain Lodge area"],
    intro:
      "Stowe is a different planet for mobile detailing — the salt and sand from the winter season, the gravel from spring mud season, the dust from summer mountain biking, the trail mud from fall hikes. We come right to your Mountain Road condo, Trapp Hill chalet, or Edson Hill estate and reset whatever the season just put your vehicle through. Sprinter vans, ski-loader Tahoes, Range Rovers, and the occasional Defender or G-Wagon are our regulars here.",
    commonVehicles:
      "Stowe sees the heaviest concentration of Sprinter and Transit vans (rentals + private), Range Rover and G-Wagon, full-size Tahoe/Yukon family rigs, and a steady rotation of guest cars at the Lodge, Stowflake, and the Trapp Family Lodge — many of which we detail in the property lot.",
    serviceNotes:
      "Stowe second-home owners often have us cycle through their fleet 2-3 times a season — pre-Thanksgiving reset, post-presidents-week salt recovery, end-of-mud-season scrub. We can detail in heated garages, covered carports, or open driveways. Mountain Road condo owners frequently arrange detailing at the resort's day lot.",
    waterfront: false,
    nearbyTowns: [
      { slug: "williston", shortName: "Williston" },
      { slug: "essex", shortName: "Essex" },
    ],
    localFaq: [
      {
        q: "Can you detail my Sprinter or ski-loader van in Stowe?",
        a: "Yes — Sprinters and Transit vans are one of our most-detailed vehicle types in Stowe. We price as 3-row/work van. Interior service includes cargo area degrease, dog hair extraction, ski boot salt removal, and full driver's-area reset. Exterior includes the high-roof, ladders, and chrome stainless trim polishing.",
      },
      {
        q: "Do you offer seasonal packages for ski-house owners?",
        a: "Yes — most Stowe second-home clients book us for a Thanksgiving pre-season clean, a Presidents Day deep salt recovery, and an end-of-mud-season detail in May. We can pre-book all three at booking time. The 5-Year Gentech Graphene Coating dramatically reduces winter salt damage if applied in the fall.",
      },
      {
        q: "How early in the season do you start coming up to Stowe?",
        a: "We're up Mountain Road weekly from October through April for salt-season clients, and the rest of the year on request. Travel from our Williston base is about 50 minutes — a $42-50 travel fee at our $1/mile past 7.5mi rate. Bundled with a multi-vehicle visit, it's almost always worth it.",
      },
    ],
  },
  {
    slug: "manchester",
    name: "Manchester, VT",
    shortName: "Manchester",
    driveTimeMin: 165,
    oneLineHook: "Mobile detailing for Equinox-area second homes & resort guests",
    neighborhoodCallouts: ["Equinox Resort area", "Manchester Village", "Manchester Center", "Stratton Road", "Bromley Mountain area"],
    intro:
      "Manchester is southern Vermont's luxury hub — Equinox Resort weekenders from NYC and Boston, Stratton Mountain second-home owners, and a steady flow of high-end guest vehicles. We schedule trips down for groups of bookings rather than one-offs, so the per-vehicle travel cost stays reasonable. If you can coordinate a few neighbors or your resort group, we can make Manchester work as a regular stop.",
    commonVehicles:
      "Manchester clients almost universally drive luxury — Range Rover, Audi RS, Porsche Cayenne/Macan, Mercedes E/S-class, BMW X5/X7, plus the occasional Tesla Model X. Resort fleets sometimes include weekend rentals (G-Wagons, 911s) that need turnover detailing.",
    serviceNotes:
      "Manchester trips are typically reserved for group bookings of 3+ vehicles or a single full-day fleet appointment. Equinox Resort and several private clubs in the area have hosted us. We bring everything self-contained; no resort/club support required.",
    waterfront: false,
    nearbyTowns: [
      { slug: "stratton", shortName: "Stratton" },
    ],
    localFaq: [
      {
        q: "Do you actually travel to Manchester from Williston?",
        a: "Yes — but it works best when bookings are coordinated. We schedule Manchester runs around clusters of 3+ vehicles so the per-vehicle travel cost drops to something reasonable. Travel fee is $1/mile past 7.5 miles, capped at the actual mileage. For a 4-vehicle visit, this typically lands at $30-50 per car.",
      },
      {
        q: "Can the Equinox Resort or our club host you for the day?",
        a: "Yes — we've worked out of property lots before. Bring our 1-vehicle setup; we just need a hose-or-no-hose corner of the lot to set up. Most resorts are happy to host because the service is invisible to other guests.",
      },
      {
        q: "What services make sense for our weekend cars?",
        a: "If the car only sees Manchester weekends, an Ultimate Interior + Exterior Reset twice a year is usually the right cadence — once at end of winter, once before the holidays. Add the 5-Year Gentech Graphene Coating in year one and it dramatically cuts your in-between maintenance.",
      },
    ],
  },
  {
    slug: "woodstock",
    name: "Woodstock, VT",
    shortName: "Woodstock",
    driveTimeMin: 105,
    oneLineHook: "Mobile detailing for Woodstock village & estate clients",
    neighborhoodCallouts: ["Woodstock Village", "Suicide Six area", "Pomfret", "South Woodstock", "The Woodstock Inn area"],
    intro:
      "Woodstock is one of Vermont's most photographed villages and one of its quietest luxury markets — long-tenured families, weekenders from Boston and NYC, and the Woodstock Inn's well-heeled guest flow. We bring mobile detailing right to the village's narrow side streets, the country estates beyond the green, and the resort lot itself when guests need turn-around service before driving home.",
    commonVehicles:
      "Woodstock skews older-luxury and classic — Range Rover, Mercedes wagons, Volvo XC90, restored vintage trucks and station wagons, plus the occasional Porsche garage-queen brought out for fall foliage drives.",
    serviceNotes:
      "Most Woodstock visits are by appointment for residents within the village or in Pomfret and South Woodstock. The Inn occasionally arranges fleet days for guest cars or staff vehicles. Long dirt-road approaches are normal here and we handle them routinely.",
    waterfront: false,
    nearbyTowns: [
      { slug: "norwich", shortName: "Norwich" },
      { slug: "quechee", shortName: "Quechee" },
    ],
    localFaq: [
      {
        q: "Can you detail in Woodstock's narrow village streets?",
        a: "Yes — we're a single work-van setup, no trailer required. We tuck into a driveway or pull-off and work from there. If your village home doesn't have a driveway, your neighbor's or a nearby pull-off usually solves it; we'll figure it out.",
      },
      {
        q: "Do you handle classic / vintage vehicles?",
        a: "Yes — our products are pH-neutral and safe for older clear coats, single-stage paint, and chrome. We use hand-washing only (no automated touchpoints, ever). For a fully-original classic, the basic Exterior Detail is usually right; we can step up to a 5-Year Gentech Graphene Coating on garage-queens that see only sunny-day driving.",
      },
      {
        q: "Can the Woodstock Inn coordinate detailing for guests?",
        a: "Yes — we've done arrival/departure detailing for resort guests in the Inn's main lot. Talk to the concierge or contact us directly and we'll quote the visit.",
      },
    ],
  },
  {
    slug: "norwich",
    name: "Norwich, VT",
    shortName: "Norwich",
    driveTimeMin: 110,
    oneLineHook: "Hanover-adjacent luxury mobile detailing",
    neighborhoodCallouts: ["Main Street", "Beaver Meadow Road", "Turnpike Road", "Norwich Inn area", "Hanover line"],
    intro:
      "Norwich is Hanover-adjacent professor money — Dartmouth faculty, alumni weekend homes, and a long-tail Upper Valley luxury market. We come right to Beaver Meadow Road estates and Main Street historic homes with full mobile setup. Range Rovers, Audis, and Lexus SUVs are the usual suspects, and Gentech Graphene Coating uptake is high here because clients understand the math on long-term paint protection.",
    commonVehicles:
      "Norwich runs Range Rover Sport/Velar, Lexus RX/LX, Audi Q7/Q8, plus a healthy contingent of garage-kept BMW and Mercedes sedans driven seasonally.",
    serviceNotes:
      "Most Norwich appointments are in residential driveways. Dartmouth-related weekend-home owners often book us during their visit windows — we'll coordinate timing with your stay if you're only here certain weekends. Long-distance travel fee applies but is offset by our 2%-per-vehicle multi-vehicle discount if you can coordinate with neighbors.",
    waterfront: false,
    nearbyTowns: [
      { slug: "woodstock", shortName: "Woodstock" },
      { slug: "quechee", shortName: "Quechee" },
    ],
    localFaq: [
      {
        q: "Do you serve Dartmouth faculty / Hanover area regularly?",
        a: "Yes — Norwich is one of our recurring Upper Valley stops. We schedule routes through Norwich + Woodstock + Quechee together so the trip pays for itself. If you're a faculty client with a regular schedule, ask about quarterly recurring visits.",
      },
      {
        q: "What's the price difference for ceramic coating on a luxury SUV here?",
        a: "5-Year Gentech Graphene Coating is $250 (sedan) / $350 (SUV) / $400 (3-row/work van) on the body, $125 flat on wheels, $250 on all glass. Pick 2 and save 15%; pick all 3 and save 25%. A full Range Rover treatment (body + wheels + windows) typically lands at $543 after the 25% discount.",
      },
      {
        q: "Can you detail at our second home if we're not there?",
        a: "Yes — we work all the time with second-home clients who give us a code or arrange driveway access. We text photos when we start and finish, and we don't need anyone on-site. Property managers are welcome to coordinate too.",
      },
    ],
  },
  {
    slug: "killington",
    name: "Killington, VT",
    shortName: "Killington",
    driveTimeMin: 100,
    oneLineHook: "Ski-season mobile detailing for resort fleets & second homes",
    neighborhoodCallouts: ["Killington Road", "East Mountain Road", "Pico area", "Killington Resort base", "Mendon"],
    intro:
      "Killington is brutal on vehicles — November to April salt, mud-season slop, and dirt roads year-round. We come to your Killington Road condo, your Mendon estate, or the resort lot itself to reset whatever ski-season just put on your truck. Big rigs are the norm here — 3-row SUVs, full-size Tahoes/Yukons, work-spec Tacomas and F-150s with ski racks.",
    commonVehicles:
      "Killington runs heavy on Tahoe/Yukon/Suburban (full-size 3-row), Toyota Tacoma/Tundra, Ford F-150/F-250, Jeep Wrangler/Gladiator, Subaru Ascent/Outback, and the occasional Sprinter ski-loader van.",
    serviceNotes:
      "Most Killington trips are by appointment for second-home owners or resort/restaurant fleet bookings. We can detail in resort base lots or your condo's parking area. Heavy salt cleanup is a Killington specialty — our Salt Stain Removal add-on is included in every Ultimate package and almost always recommended after Presidents Day weekend.",
    waterfront: false,
    nearbyTowns: [
      { slug: "woodstock", shortName: "Woodstock" },
    ],
    localFaq: [
      {
        q: "Can you handle the salt damage from a full Killington season?",
        a: "Yes — that's exactly what the Ultimate Interior + Exterior Reset is built for. It includes Standard Salt Stain Removal, hot water extraction on carpets, undercarriage wheel-well degrease, and a 6-month ceramic spray seal. Most Killington clients book the Ultimate twice a year — pre-season in November and post-season in late April.",
      },
      {
        q: "Do you detail at the resort or only at private homes?",
        a: "Both. We've done condo lot details at Killington base, K-1 lot, and Snowshed area, plus private residences along Killington Road and into Mendon. Bring 1-vehicle setup; no resort hookup needed.",
      },
      {
        q: "Can you detail multiple vehicles at our Killington house?",
        a: "Yes — multi-vehicle is heavily discounted. Each additional vehicle adds 2% off the total, up to 20% off at 10+ vehicles. A 4-vehicle ski-week detail at $200 each before discount would be about $736 after discount instead of $800.",
      },
    ],
  },
  {
    slug: "stratton",
    name: "Stratton, VT",
    shortName: "Stratton",
    driveTimeMin: 160,
    oneLineHook: "Stratton Mountain second-home mobile detailing",
    neighborhoodCallouts: ["Stratton Mountain Road", "Stratton Village", "Bondville", "Winhall", "South Londonderry"],
    intro:
      "Stratton has the highest concentration of NYC/Boston weekend homes in southern Vermont and the corresponding luxury fleet — Range Rover, Porsche Cayenne, Mercedes G-Wagon, plus a healthy mix of work-spec Tahoes and Sprinters. We bring full mobile detailing to your Stratton Mountain Road home, the village, or the resort base lot. Like Manchester, Stratton works best when bookings cluster — multi-vehicle days make the trip pay off.",
    commonVehicles:
      "Stratton skews Range Rover, Audi Q8/SQ8, Porsche Cayenne/Macan, Mercedes G-Wagon, plus full-size Tahoes/Suburbans for family fleets and Sprinter vans for ski-loaders.",
    serviceNotes:
      "Stratton trips are typically reserved for fleet days (3+ vehicles) or coordinated weekends where multiple homeowners can be served on one visit. We come fully self-contained; no resort hookup needed. Travel fee applies but per-vehicle drops fast with each additional booking.",
    waterfront: false,
    nearbyTowns: [
      { slug: "manchester", shortName: "Manchester" },
    ],
    localFaq: [
      {
        q: "Will you come down to Stratton for a single car?",
        a: "Generally we wait until we have a Stratton run booked (3+ cars or a fleet day) to keep the per-car travel reasonable. If you're booking a single luxury vehicle for a 5-Year Gentech Graphene Coating ($543 after discount for body+wheels+windows on an SUV), the trip math usually works on its own. Otherwise, ask your neighbors.",
      },
      {
        q: "Can you handle ski-season salt and mud at our Stratton home?",
        a: "Yes — our Ultimate Interior + Exterior Reset is built for this exact use case. Salt-neutralizing wash, hot water carpet extraction for boot mud, underbody cleanup. Apply 5-Year Gentech Graphene Coating in the fall and follow up with Ultimate reset in March, and your truck stays in showroom shape through a full Stratton winter.",
      },
      {
        q: "Do you work directly with our property manager?",
        a: "Yes — we coordinate with property managers all the time for absentee second-home owners. They give us access, we send photos before/during/after, and we bill the homeowner directly. Email contact@ariseandshinedetailing.com to set it up.",
      },
    ],
  },
  {
    slug: "quechee",
    name: "Quechee, VT",
    shortName: "Quechee",
    driveTimeMin: 100,
    oneLineHook: "Quechee Club & Lakeland mobile detailing",
    neighborhoodCallouts: ["Quechee Club", "Quechee Lakeland", "Lake Pinneo", "Quechee Gorge area", "Hartland Road"],
    intro:
      "Quechee is a quieter luxury market built around the Quechee Club and the lakefront homes along Lake Pinneo. Retirees with detailing budgets, second-home owners from Boston, and a steady summer mix of luxury SUVs, vintage convertibles, and Club golf carts that occasionally need attention too. We come right to your driveway or, by arrangement, into the Club lot.",
    commonVehicles:
      "Quechee runs Range Rover, Lexus LX, Audi Q7, Volvo XC90, Mercedes E-class, plus a small contingent of vintage Mercedes and Porsche kept seasonally. Vintage MGs and BMW E30s show up at Club events.",
    serviceNotes:
      "Most Quechee details happen in private driveways throughout the Club area and Lakeland. We've also worked in the Club lot by arrangement during quieter weekday windows. Long-distance travel fee applies; we coordinate Quechee/Norwich/Woodstock runs together to keep per-vehicle cost reasonable.",
    waterfront: false,
    nearbyTowns: [
      { slug: "woodstock", shortName: "Woodstock" },
      { slug: "norwich", shortName: "Norwich" },
    ],
    localFaq: [
      {
        q: "Do you work with the Quechee Club for member fleet days?",
        a: "Yes — Club-coordinated fleet days are a great way to keep your travel cost spread across multiple members. Talk to the Club office or contact us directly and we'll arrange a half-day or full-day visit.",
      },
      {
        q: "Can you detail a vintage Mercedes or BMW E30 here?",
        a: "Yes — vintage and classic vehicles are our specialty. pH-neutral wash, hand-only contact, single-stage paint safe products, chrome polishing. For a fully-original car we typically recommend the basic Exterior Detail; for a restored car that's the show-car, we'd add 5-Year Gentech Graphene Coating to lock in the gloss.",
      },
      {
        q: "How does the travel fee work at this distance?",
        a: "It's $1 per mile past 7.5 miles of driving distance from our 209 Porterwood Dr (Williston) base. Quechee is about 100 miles round-trip, so the travel fee is around $185. We almost always coordinate Quechee bookings into Norwich/Woodstock visits to spread it across multiple stops — talk to us about timing.",
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
