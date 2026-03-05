import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";

/**
 * Strips spaces, hyphens, underscores, dots — makes matching fuzzy:
 *   "F-150 XLT" → "f150xlt",  "RAV 4" → "rav4",  "Grand Cherokee" → "grandcherokee"
 */
const norm = (s: string): string =>
  s.toLowerCase().replace(/[-_\s.]/g, "");

// ─── Make aliases ─────────────────────────────────────────────────────────────
// Normalised → canonical normalised form

const MAKE_ALIASES: Record<string, string> = {
  chevy: "chevrolet",
  vw: "volkswagen",
  vwagon: "volkswagen",
  volks: "volkswagen",
  benz: "mercedes",
  mercedesbenz: "mercedes",
  mercedez: "mercedes",
  mb: "mercedes",
  landrover: "landrover",
  rangeover: "landrover", // common typo
  rangerover: "landrover",
  rolls: "rollsroyce",
  rollsroyce: "rollsroyce",
  rr: "rollsroyce",
  alfa: "alfaromeo",
  alfaromeo: "alfaromeo",
};

// ─── Vehicle database ─────────────────────────────────────────────────────────
// Format: { normalisedMake: [ [normalisedModel, sizeSlug], ... ] }
// Entries are checked in order — more specific first (multi-word before single-word).

type Entry = [string, VehicleSizeSlug];
const DB: Record<string, Entry[]> = {
  toyota: [
    // compact
    ["yaris", "compact"],
    ["echo", "compact"],
    ["priusc", "compact"],
    ["chr", "compact"],
    ["chrcrossover", "compact"],
    ["matrix", "compact"],
    ["bz3", "compact"],
    // sedan
    ["prius", "sedan"],
    ["priusprime", "sedan"],
    ["priusv", "sedan"],
    ["mirai", "sedan"],
    ["corolla", "sedan"],
    ["camry", "sedan"],
    ["avalon", "sedan"],
    ["supra", "sedan"],
    ["86", "sedan"],
    ["gr86", "sedan"],
    ["celica", "sedan"],
    ["solara", "sedan"],
    // suv
    ["bz4x", "suv"],
    ["venza", "suv"],
    ["rav4", "suv"],
    ["4runner", "suv"],
    ["fjcruiser", "suv"],
    ["highlander", "suv"],
    ["sequoia", "suv"],
    ["landcruiser", "suv"],
    ["sienna", "xl"],
    ["grandhighlander", "suv"],
    // truck
    ["tacoma", "suv"],
    ["tundra", "suv"],
  ],

  honda: [
    ["fit", "compact"],
    ["hrv", "compact"],
    ["honda", "compact"],
    ["insight", "sedan"],
    ["civic", "sedan"],
    ["accord", "sedan"],
    ["clarity", "sedan"],
    ["crz", "compact"],
    ["envy", "compact"],
    ["crv", "suv"],
    ["brvplus", "suv"],
    ["passport", "suv"],
    ["pilot", "suv"],
    ["odyssey", "xl"],
    ["element", "suv"],
    ["ridgeline", "suv"],
  ],

  ford: [
    // compact
    ["fiesta", "compact"],
    ["focus", "compact"],
    ["ecosport", "compact"],
    ["transitconnect", "compact"],
    // sedan
    ["fusion", "sedan"],
    ["mustang", "sedan"],
    ["taurus", "sedan"],
    ["thunderbird", "sedan"],
    ["galaxie", "sedan"],
    ["gt", "sedan"],
    ["gtplus", "sedan"],
    // suv
    ["ecosport", "compact"],
    ["escape", "suv"],
    ["broncosport", "suv"],
    ["bronco", "suv"],
    ["edge", "suv"],
    ["explorer", "suv"],
    ["expedition", "suv"],
    // truck
    ["maverick", "suv"],
    ["ranger", "suv"],
    ["f150", "suv"],
    ["f250", "suv"],
    ["f350", "suv"],
    ["f450", "suv"],
    ["fseries", "suv"],
    ["transit", "xl"],
    ["eseries", "xl"],
  ],

  chevrolet: [
    // compact
    ["spark", "compact"],
    ["sonic", "compact"],
    ["cruze", "compact"],
    ["cobalt", "compact"],
    ["aveo", "compact"],
    ["trax", "compact"],
    // sedan
    ["malibu", "sedan"],
    ["impala", "sedan"],
    ["camaro", "sedan"],
    ["corvette", "sedan"],
    ["cavalier", "sedan"],
    // suv
    ["trailblazer", "suv"],
    ["blazer", "suv"],
    ["equinox", "suv"],
    ["traverse", "suv"],
    ["tahoe", "suv"],
    ["suburban", "suv"],
    ["captiva", "suv"],
    // truck
    ["colorado", "suv"],
    ["silverado", "suv"],
    ["avalanche", "suv"],
    ["express", "xl"],
    ["s10", "suv"],
  ],

  gmc: [
    ["terrain", "suv"],
    ["acadia", "suv"],
    ["yukon", "suv"],
    ["yukonxl", "suv"],
    ["envoy", "suv"],
    ["jimmy", "suv"],
    ["canyon", "suv"],
    ["sierra", "suv"],
    ["savana", "xl"],
    ["topkick", "suv"],
  ],

  dodge: [
    ["neon", "compact"],
    ["caliber", "compact"],
    ["dart", "sedan"],
    ["charger", "sedan"],
    ["challenger", "sedan"],
    ["viper", "sedan"],
    ["stratus", "sedan"],
    ["journey", "suv"],
    ["durango", "suv"],
    ["caravan", "xl"],
  ],

  ram: [
    ["promaster city", "compact"],
    ["promastercity", "compact"],
    ["1500", "suv"],
    ["2500", "suv"],
    ["3500", "suv"],
    ["4500", "suv"],
    ["promaster", "xl"],
  ],

  jeep: [
    ["renegade", "compact"],
    ["compass", "compact"],
    ["patriot", "compact"],
    ["cherokee", "suv"],
    ["grandcherokee", "suv"],
    ["grandwaganeer", "suv"],
    ["wrangler", "suv"],
    ["liberty", "suv"],
    ["commander", "suv"],
    ["gladiator", "suv"],
  ],

  chrysler: [
    ["200", "sedan"],
    ["300", "sedan"],
    ["pacifica", "xl"],
    ["voyager", "xl"],
    ["ptcruiser", "compact"],
    ["sebring", "sedan"],
  ],

  nissan: [
    // compact
    ["micra", "compact"],
    ["versa", "compact"],
    ["juke", "compact"],
    ["kicks", "compact"],
    ["roguesport", "compact"],
    ["cube", "compact"],
    // sedan
    ["sentra", "sedan"],
    ["altima", "sedan"],
    ["maxima", "sedan"],
    ["370z", "sedan"],
    ["350z", "sedan"],
    ["gt-r", "sedan"],
    ["gtr", "sedan"],
    ["leaf", "sedan"],
    // suv
    ["rogue", "suv"],
    ["murano", "suv"],
    ["pathfinder", "suv"],
    ["armada", "suv"],
    ["xterra", "suv"],
    ["quest", "suv"],
    // truck
    ["frontier", "suv"],
    ["titan", "suv"],
    ["navara", "suv"],
    ["nv", "xl"],
  ],

  hyundai: [
    ["accent", "compact"],
    ["venue", "compact"],
    ["kona", "compact"],
    ["ioniq6", "sedan"],
    ["ioniq5", "suv"],
    ["elantra", "sedan"],
    ["sonata", "sedan"],
    ["ioniq", "sedan"],
    ["tucson", "suv"],
    ["santafe", "suv"],
    ["palisade", "suv"],
    ["nexo", "sedan"],
    ["santacruz", "suv"],
  ],

  kia: [
    ["rio", "compact"],
    ["stonic", "compact"],
    ["soul", "compact"],
    ["niro", "compact"],
    ["seltos", "compact"],
    ["forte", "sedan"],
    ["k5", "sedan"],
    ["stinger", "sedan"],
    ["sportage", "suv"],
    ["sorento", "suv"],
    ["telluride", "suv"],
    ["carnival", "xl"],
    ["mohave", "suv"],
  ],

  subaru: [
    ["brz", "compact"],
    ["impreza", "sedan"],
    ["legacy", "sedan"],
    ["wrx", "sedan"],
    ["crosstrek", "compact"],
    ["forester", "suv"],
    ["outback", "suv"],
    ["ascent", "suv"],
    ["baja", "suv"],
  ],

  mazda: [
    ["mazda2", "compact"],
    ["mazda3", "sedan"],
    ["mazda6", "sedan"],
    ["miata", "compact"],
    ["mx5", "compact"],
    ["mx30", "compact"],
    ["cx3", "compact"],
    ["cx30", "compact"],
    ["cx50", "suv"],
    ["cx5", "suv"],
    ["cx9", "suv"],
    ["cx90", "suv"],
    ["cx60", "suv"],
    ["cx80", "suv"],
  ],

  volkswagen: [
    ["polo", "compact"],
    ["up", "compact"],
    ["golf", "compact"],
    ["gti", "compact"],
    ["golfr", "compact"],
    ["id3", "compact"],
    ["idbuzz", "xl"],
    ["jetta", "sedan"],
    ["passat", "sedan"],
    ["arteon", "sedan"],
    ["phaeton", "sedan"],
    ["cc", "sedan"],
    ["taos", "compact"],
    ["tiguan", "suv"],
    ["atlas", "suv"],
    ["atlascross", "suv"],
    ["id4", "suv"],
    ["touareg", "suv"],
    ["routan", "xl"],
  ],

  bmw: [
    ["i3", "compact"],
    ["1series", "compact"],
    ["2series", "compact"],
    ["x1", "compact"],
    ["x2", "compact"],
    ["3series", "sedan"],
    ["4series", "sedan"],
    ["5series", "sedan"],
    ["6series", "sedan"],
    ["7series", "sedan"],
    ["8series", "sedan"],
    ["i4", "sedan"],
    ["i5", "sedan"],
    ["i7", "sedan"],
    ["m3", "sedan"],
    ["m4", "sedan"],
    ["m5", "sedan"],
    ["m8", "sedan"],
    ["z4", "sedan"],
    ["x3", "suv"],
    ["x4", "suv"],
    ["x5", "suv"],
    ["x6", "suv"],
    ["x7", "suv"],
    ["xm", "suv"],
    ["ix", "suv"],
    ["ix3", "suv"],
  ],

  mercedes: [
    // compact
    ["aclass", "compact"],
    ["cla", "compact"],
    ["gla", "compact"],
    ["glb", "compact"],
    // sedan
    ["cclass", "sedan"],
    ["eclass", "sedan"],
    ["sclass", "sedan"],
    ["cls", "sedan"],
    ["eqs", "sedan"],
    ["eqe", "sedan"],
    ["amggt", "sedan"],
    // suv
    ["glc", "suv"],
    ["gle", "suv"],
    ["gls", "suv"],
    ["gclass", "suv"],
    ["gwagon", "suv"],
    ["glccoupe", "suv"],
    ["glecoupe", "suv"],
    ["eqb", "suv"],
    ["eqc", "suv"],
    ["eqs suv", "suv"],
    ["eqssuv", "suv"],
    // van
    ["sprinter", "xl"],
    ["metris", "xl"],
  ],

  audi: [
    // compact
    ["a1", "compact"],
    ["a3", "compact"],
    ["tt", "compact"],
    ["q2", "compact"],
    ["q3", "compact"],
    ["etron gt", "sedan"],
    // sedan
    ["a4", "sedan"],
    ["a5", "sedan"],
    ["a6", "sedan"],
    ["a7", "sedan"],
    ["a8", "sedan"],
    ["e-tron gt", "sedan"],
    ["etrongt", "sedan"],
    ["r8", "sedan"],
    ["s3", "compact"],
    ["s4", "sedan"],
    ["s5", "sedan"],
    ["s6", "sedan"],
    ["s7", "sedan"],
    ["s8", "sedan"],
    ["rs3", "compact"],
    ["rs5", "sedan"],
    ["rs6", "sedan"],
    // suv
    ["q4etron", "suv"],
    ["q4", "suv"],
    ["q5", "suv"],
    ["q7", "suv"],
    ["q8", "suv"],
    ["etron", "suv"],
    ["sq5", "suv"],
    ["sq7", "suv"],
    ["sq8", "suv"],
    ["rsq8", "suv"],
  ],

  lexus: [
    ["ct", "compact"],
    ["ux", "compact"],
    ["is", "sedan"],
    ["es", "sedan"],
    ["gs", "sedan"],
    ["ls", "sedan"],
    ["lc", "sedan"],
    ["rc", "sedan"],
    ["nx", "compact"],
    ["rx", "suv"],
    ["gx", "suv"],
    ["lx", "suv"],
    ["tx", "suv"],
    ["rz", "suv"],
  ],

  acura: [
    ["ilx", "compact"],
    ["tlx", "sedan"],
    ["rlx", "sedan"],
    ["nsx", "sedan"],
    ["integra", "compact"],
    ["rdx", "suv"],
    ["mdx", "suv"],
    ["zdx", "suv"],
  ],

  infiniti: [
    ["q30", "compact"],
    ["q50", "sedan"],
    ["q60", "sedan"],
    ["q70", "sedan"],
    ["qx30", "compact"],
    ["qx50", "suv"],
    ["qx55", "suv"],
    ["qx60", "suv"],
    ["qx80", "suv"],
    ["ex", "compact"],
    ["fx", "suv"],
    ["jx", "suv"],
    ["qx4", "suv"],
    ["qx56", "suv"],
  ],

  cadillac: [
    ["ct4", "compact"],
    ["ct5", "sedan"],
    ["ct6", "sedan"],
    ["xts", "sedan"],
    ["ats", "compact"],
    ["cts", "sedan"],
    ["dts", "sedan"],
    ["xt4", "compact"],
    ["xt5", "suv"],
    ["xt6", "suv"],
    ["escalade", "suv"],
    ["srx", "suv"],
    ["lyriq", "suv"],
    ["optiq", "compact"],
  ],

  lincoln: [
    ["corsair", "compact"],
    ["nautilus", "suv"],
    ["aviator", "suv"],
    ["navigator", "suv"],
    ["mkz", "sedan"],
    ["mkc", "compact"],
    ["mkx", "suv"],
    ["mks", "sedan"],
    ["mkt", "suv"],
    ["towncar", "sedan"],
    ["continental", "sedan"],
  ],

  buick: [
    ["encore", "compact"],
    ["encoreGX", "compact"],
    ["encoregx", "compact"],
    ["envision", "suv"],
    ["enclave", "suv"],
    ["lacrosse", "sedan"],
    ["regal", "sedan"],
    ["verano", "sedan"],
    ["envista", "compact"],
  ],

  tesla: [
    ["model3", "sedan"],
    ["models", "sedan"],
    ["modelx", "suv"],
    ["modely", "suv"],
    ["cybertruck", "suv"],
    ["roadster", "sedan"],
    ["semi", "xl"],
  ],

  rivian: [
    ["r1t", "suv"],
    ["r1s", "suv"],
    ["r2", "suv"],
    ["r3", "compact"],
  ],

  lucid: [
    ["air", "sedan"],
    ["gravity", "suv"],
  ],

  polestar: [
    ["1", "sedan"],
    ["2", "sedan"],
    ["3", "suv"],
    ["4", "suv"],
  ],

  volvo: [
    ["v40", "compact"],
    ["v60", "sedan"],
    ["v90", "sedan"],
    ["s60", "sedan"],
    ["s90", "sedan"],
    ["c30", "compact"],
    ["c40", "compact"],
    ["ex30", "compact"],
    ["xc40", "compact"],
    ["xc60", "suv"],
    ["xc90", "suv"],
    ["ex90", "suv"],
    ["ex40", "compact"],
  ],

  genesis: [
    ["g70", "sedan"],
    ["g80", "sedan"],
    ["g90", "sedan"],
    ["gv60", "suv"],
    ["gv70", "suv"],
    ["gv80", "suv"],
    ["electrifiedg80", "sedan"],
    ["electrifiedgv70", "suv"],
  ],

  landrover: [
    ["defender", "suv"],
    ["discovery", "suv"],
    ["discoverysport", "suv"],
    ["rangeroverevoque", "compact"],
    ["rangerovervelar", "suv"],
    ["rangerover", "suv"],
    ["freelander", "suv"],
    ["lr2", "suv"],
    ["lr4", "suv"],
  ],

  jaguar: [
    ["xf", "sedan"],
    ["xe", "sedan"],
    ["xj", "sedan"],
    ["xk", "sedan"],
    ["ftype", "sedan"],
    ["fpace", "suv"],
    ["epace", "compact"],
    ["ipace", "suv"],
  ],

  porsche: [
    ["911", "sedan"],
    ["718", "sedan"],
    ["boxster", "sedan"],
    ["cayman", "sedan"],
    ["panamera", "sedan"],
    ["taycan", "sedan"],
    ["taycansporturismo", "sedan"],
    ["macan", "compact"],
    ["cayenne", "suv"],
  ],

  mini: [
    ["cooper", "compact"],
    ["clubman", "compact"],
    ["convertible", "compact"],
    ["paceman", "compact"],
    ["coupe", "compact"],
    ["roadster", "compact"],
    ["countryman", "suv"],
    ["aceman", "compact"],
  ],

  maserati: [
    ["ghibli", "sedan"],
    ["quattroporte", "sedan"],
    ["mc20", "sedan"],
    ["alfieri", "sedan"],
    ["levante", "suv"],
    ["grecale", "suv"],
  ],

  alfaromeo: [
    ["giulia", "sedan"],
    ["4c", "compact"],
    ["33stradale", "sedan"],
    ["stelvio", "suv"],
    ["tonale", "compact"],
  ],

  fiat: [
    ["500", "compact"],
    ["500x", "compact"],
    ["500l", "compact"],
    ["124", "compact"],
    ["500abarth", "compact"],
  ],

  smart: [
    ["fortwo", "compact"],
    ["forfour", "compact"],
    ["1", "compact"],
    ["3", "compact"],
  ],

  mitsubishi: [
    ["mirage", "compact"],
    ["outlander sport", "compact"],
    ["outlandersport", "compact"],
    ["eclipse cross", "suv"],
    ["eclipsecross", "suv"],
    ["outlander", "suv"],
    ["endeavor", "suv"],
    ["galant", "sedan"],
    ["lancer", "sedan"],
    ["eclipse", "sedan"],
    ["diamante", "sedan"],
  ],

  rollsroyce: [
    ["ghost", "sedan"],
    ["phantom", "sedan"],
    ["wraith", "sedan"],
    ["dawn", "sedan"],
    ["spectre", "sedan"],
    ["cullinan", "suv"],
  ],

  bentley: [
    ["continental", "sedan"],
    ["flyingspur", "sedan"],
    ["mulsanne", "sedan"],
    ["bentayga", "suv"],
  ],

  lamborghini: [
    ["huracan", "sedan"],
    ["aventador", "sedan"],
    ["revuelto", "sedan"],
    ["urus", "suv"],
  ],

  ferrari: [
    ["roma", "sedan"],
    ["portofino", "sedan"],
    ["sf90", "sedan"],
    ["812", "sedan"],
    ["f8", "sedan"],
    ["296", "sedan"],
    ["purosangue", "suv"],
  ],

  mclaren: [
    ["720s", "sedan"],
    ["artura", "sedan"],
    ["765lt", "sedan"],
    ["gt", "sedan"],
  ],

  aston: [
    ["vantage", "sedan"],
    ["db11", "sedan"],
    ["db12", "sedan"],
    ["dbs", "sedan"],
    ["dbx", "suv"],
  ],

  astonmartin: [
    ["vantage", "sedan"],
    ["db11", "sedan"],
    ["db12", "sedan"],
    ["dbs", "sedan"],
    ["dbx", "suv"],
  ],

  hummer: [
    ["h1", "suv"],
    ["h2", "suv"],
    ["h3", "suv"],
    ["ev", "suv"],
    ["evsuv", "suv"],
  ],

  scout: [
    ["terra", "suv"],
    ["traveler", "suv"],
  ],

  vinfast: [
    ["vf8", "suv"],
    ["vf9", "suv"],
    ["vf6", "compact"],
    ["vf7", "suv"],
  ],
};

// ─── Build make index ─────────────────────────────────────────────────────────
// We build this once at module load so repeated calls are fast.

const MAKE_INDEX = new Map<string, Entry[]>();
for (const [rawMake, entries] of Object.entries(DB)) {
  const n = norm(rawMake);
  // Merge if make appears twice (e.g. honda, hyundai appear twice due to copy-paste above)
  const existing = MAKE_INDEX.get(n) ?? [];
  MAKE_INDEX.set(n, [...existing, ...entries]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Given a vehicle make and model string (as typed by the user), return the
 * best-guess VehicleSizeSlug or `null` if no match is found.
 *
 * Uses a two-pass strategy:
 *   1. Exact match after normalisation
 *   2. Partial match (input starts with a DB key, or vice-versa)
 */
export function detectVehicleSize(
  make: string,
  model: string
): VehicleSizeSlug | null {
  if (!make.trim() || model.trim().length < 1) return null;

  const normMake = norm(make);
  const normModel = norm(model);

  if (!normMake || normModel.length < 1) return null;

  // Resolve alias (e.g. "chevy" → "chevrolet")
  const resolvedMake = MAKE_ALIASES[normMake] ? norm(MAKE_ALIASES[normMake]) : normMake;

  const entries = MAKE_INDEX.get(resolvedMake);
  if (!entries) return null;

  // Pass 1 — exact match
  for (const [key, size] of entries) {
    if (key === normModel) return size;
  }

  // Pass 2 — substring match (handles trim variants & suffixes like " XLT", " Sport")
  for (const [key, size] of entries) {
    if (normModel.startsWith(key) || key.startsWith(normModel)) return size;
  }

  return null;
}
