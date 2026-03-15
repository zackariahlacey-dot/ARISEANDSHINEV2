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
// mappings:
// compact = Small / Medium
// suv = Large / 3-Row / Van

type Entry = [string, VehicleSizeSlug];
const DB: Record<string, Entry[]> = {
  toyota: [
    // compact (Small / Medium)
    ["yaris", "compact"],
    ["echo", "compact"],
    ["priusc", "compact"],
    ["chr", "compact"],
    ["chrcrossover", "compact"],
    ["matrix", "compact"],
    ["bz3", "compact"],
    // sedan (Small / Medium)
    ["prius", "compact"],
    ["priusprime", "compact"],
    ["priusv", "compact"],
    ["mirai", "compact"],
    ["corolla", "compact"],
    ["camry", "compact"],
    ["avalon", "compact"],
    ["supra", "compact"],
    ["86", "compact"],
    ["gr86", "compact"],
    ["celica", "compact"],
    ["solara", "compact"],
    // suv (Large)
    ["bz4x", "suv"],
    ["venza", "suv"],
    ["rav4", "suv"],
    ["4runner", "suv"],
    ["fjcruiser", "suv"],
    ["highlander", "suv"],
    ["sequoia", "suv"],
    ["landcruiser", "suv"],
    ["sienna", "suv"],
    ["grandhighlander", "suv"],
    // truck
    ["tacoma", "suv"],
    ["tundra", "suv"],
  ],

  honda: [
    ["fit", "compact"],
    ["hrv", "compact"],
    ["honda", "compact"],
    ["insight", "compact"],
    ["civic", "compact"],
    ["accord", "compact"],
    ["clarity", "compact"],
    ["crz", "compact"],
    ["envy", "compact"],
    ["crv", "suv"],
    ["brvplus", "suv"],
    ["passport", "suv"],
    ["pilot", "suv"],
    ["odyssey", "suv"],
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
    ["fusion", "compact"],
    ["mustang", "compact"],
    ["taurus", "compact"],
    ["thunderbird", "compact"],
    ["galaxie", "compact"],
    ["gt", "compact"],
    ["gtplus", "compact"],
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
    ["transit", "suv"],
    ["eseries", "suv"],
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
    ["malibu", "compact"],
    ["impala", "compact"],
    ["camaro", "compact"],
    ["corvette", "compact"],
    ["cavalier", "compact"],
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
    ["express", "suv"],
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
    ["savana", "suv"],
    ["topkick", "suv"],
  ],

  dodge: [
    ["neon", "compact"],
    ["caliber", "compact"],
    ["dart", "compact"],
    ["charger", "compact"],
    ["challenger", "compact"],
    ["viper", "compact"],
    ["stratus", "compact"],
    ["journey", "suv"],
    ["durango", "suv"],
    ["caravan", "suv"],
  ],

  ram: [
    ["promaster city", "compact"],
    ["promastercity", "compact"],
    ["1500", "suv"],
    ["2500", "suv"],
    ["3500", "suv"],
    ["4500", "suv"],
    ["promaster", "suv"],
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
    ["200", "compact"],
    ["300", "compact"],
    ["pacifica", "suv"],
    ["voyager", "suv"],
    ["ptcruiser", "compact"],
    ["sebring", "compact"],
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
    ["sentra", "compact"],
    ["altima", "compact"],
    ["maxima", "compact"],
    ["370z", "compact"],
    ["350z", "compact"],
    ["gt-r", "compact"],
    ["gtr", "compact"],
    ["leaf", "compact"],
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
    ["nv", "suv"],
  ],

  hyundai: [
    ["accent", "compact"],
    ["venue", "compact"],
    ["kona", "compact"],
    ["ioniq6", "compact"],
    ["ioniq5", "suv"],
    ["elantra", "compact"],
    ["sonata", "compact"],
    ["ioniq", "compact"],
    ["tucson", "suv"],
    ["santafe", "suv"],
    ["palisade", "suv"],
    ["nexo", "compact"],
    ["santacruz", "suv"],
  ],

  kia: [
    ["rio", "compact"],
    ["stonic", "compact"],
    ["soul", "compact"],
    ["niro", "compact"],
    ["seltos", "compact"],
    ["forte", "compact"],
    ["k5", "compact"],
    ["stinger", "compact"],
    ["sportage", "suv"],
    ["sorento", "suv"],
    ["telluride", "suv"],
    ["carnival", "suv"],
    ["mohave", "suv"],
  ],

  subaru: [
    ["brz", "compact"],
    ["impreza", "compact"],
    ["legacy", "compact"],
    ["wrx", "compact"],
    ["crosstrek", "compact"],
    ["forester", "suv"],
    ["outback", "suv"],
    ["ascent", "suv"],
    ["baja", "suv"],
  ],

  mazda: [
    ["mazda2", "compact"],
    ["mazda3", "compact"],
    ["mazda6", "compact"],
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
    ["idbuzz", "suv"],
    ["jetta", "compact"],
    ["passat", "compact"],
    ["arteon", "compact"],
    ["phaeton", "compact"],
    ["cc", "compact"],
    ["taos", "compact"],
    ["tiguan", "suv"],
    ["atlas", "suv"],
    ["atlascross", "suv"],
    ["id4", "suv"],
    ["touareg", "suv"],
    ["routan", "suv"],
  ],

  bmw: [
    ["i3", "compact"],
    ["1series", "compact"],
    ["2series", "compact"],
    ["x1", "compact"],
    ["x2", "compact"],
    ["3series", "compact"],
    ["4series", "compact"],
    ["5series", "compact"],
    ["6series", "compact"],
    ["7series", "compact"],
    ["8series", "compact"],
    ["i4", "compact"],
    ["i5", "compact"],
    ["i7", "compact"],
    ["m3", "compact"],
    ["m4", "compact"],
    ["m5", "compact"],
    ["m8", "compact"],
    ["z4", "compact"],
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
    ["cclass", "compact"],
    ["eclass", "compact"],
    ["sclass", "compact"],
    ["cls", "compact"],
    ["eqs", "compact"],
    ["eqe", "compact"],
    ["amggt", "compact"],
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
    ["sprinter", "suv"],
    ["metris", "suv"],
  ],

  audi: [
    // compact
    ["a1", "compact"],
    ["a3", "compact"],
    ["tt", "compact"],
    ["q2", "compact"],
    ["q3", "compact"],
    ["etron gt", "compact"],
    // sedan
    ["a4", "compact"],
    ["a5", "compact"],
    ["a6", "compact"],
    ["a7", "compact"],
    ["a8", "compact"],
    ["e-tron gt", "compact"],
    ["etrongt", "compact"],
    ["r8", "compact"],
    ["s3", "compact"],
    ["s4", "compact"],
    ["s5", "compact"],
    ["s6", "compact"],
    ["s7", "compact"],
    ["s8", "compact"],
    ["rs3", "compact"],
    ["rs5", "compact"],
    ["rs6", "compact"],
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
    ["is", "compact"],
    ["es", "compact"],
    ["gs", "compact"],
    ["ls", "compact"],
    ["lc", "compact"],
    ["rc", "compact"],
    ["nx", "compact"],
    ["rx", "suv"],
    ["gx", "suv"],
    ["lx", "suv"],
    ["tx", "suv"],
    ["rz", "suv"],
  ],

  acura: [
    ["ilx", "compact"],
    ["tlx", "compact"],
    ["rlx", "compact"],
    ["nsx", "compact"],
    ["integra", "compact"],
    ["rdx", "suv"],
    ["mdx", "suv"],
    ["zdx", "suv"],
  ],

  infiniti: [
    ["q30", "compact"],
    ["q50", "compact"],
    ["q60", "compact"],
    ["q70", "compact"],
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
    ["ct5", "compact"],
    ["ct6", "compact"],
    ["xts", "compact"],
    ["ats", "compact"],
    ["cts", "compact"],
    ["dts", "compact"],
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
    ["mkz", "compact"],
    ["mkc", "compact"],
    ["mkx", "suv"],
    ["mks", "compact"],
    ["mkt", "suv"],
    ["towncar", "compact"],
    ["continental", "compact"],
  ],

  buick: [
    ["encore", "compact"],
    ["encoreGX", "compact"],
    ["encoregx", "compact"],
    ["envision", "suv"],
    ["enclave", "suv"],
    ["lacrosse", "compact"],
    ["regal", "compact"],
    ["verano", "compact"],
    ["envista", "compact"],
  ],

  tesla: [
    ["model3", "compact"],
    ["models", "compact"],
    ["modelx", "suv"],
    ["modely", "suv"],
    ["cybertruck", "suv"],
    ["roadster", "compact"],
    ["semi", "suv"],
  ],

  rivian: [
    ["r1t", "suv"],
    ["r1s", "suv"],
    ["r2", "suv"],
    ["r3", "compact"],
  ],

  lucid: [
    ["air", "compact"],
    ["gravity", "suv"],
  ],

  polestar: [
    ["1", "compact"],
    ["2", "compact"],
    ["3", "suv"],
    ["4", "suv"],
  ],

  volvo: [
    ["v40", "compact"],
    ["v60", "compact"],
    ["v90", "compact"],
    ["s60", "compact"],
    ["s90", "compact"],
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
    ["g70", "compact"],
    ["g80", "compact"],
    ["g90", "compact"],
    ["gv60", "suv"],
    ["gv70", "suv"],
    ["gv80", "suv"],
    ["electrifiedg80", "compact"],
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
    ["xf", "compact"],
    ["xe", "compact"],
    ["xj", "compact"],
    ["xk", "compact"],
    ["ftype", "compact"],
    ["fpace", "suv"],
    ["epace", "compact"],
    ["ipace", "suv"],
  ],

  porsche: [
    ["911", "compact"],
    ["718", "compact"],
    ["boxster", "compact"],
    ["cayman", "compact"],
    ["panamera", "compact"],
    ["taycan", "compact"],
    ["taycansporturismo", "compact"],
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
    ["ghibli", "compact"],
    ["quattroporte", "compact"],
    ["mc20", "compact"],
    ["alfieri", "compact"],
    ["levante", "suv"],
    ["grecale", "suv"],
  ],

  alfaromeo: [
    ["giulia", "compact"],
    ["4c", "compact"],
    ["33stradale", "compact"],
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
    ["galant", "compact"],
    ["lancer", "compact"],
    ["eclipse", "compact"],
    ["diamante", "compact"],
  ],

  rollsroyce: [
    ["ghost", "compact"],
    ["phantom", "compact"],
    ["wraith", "compact"],
    ["dawn", "compact"],
    ["spectre", "compact"],
    ["cullinan", "suv"],
  ],

  bentley: [
    ["continental", "compact"],
    ["flyingspur", "compact"],
    ["mulsanne", "compact"],
    ["bentayga", "suv"],
  ],

  lamborghini: [
    ["huracan", "compact"],
    ["aventador", "compact"],
    ["revuelto", "compact"],
    ["urus", "suv"],
  ],

  ferrari: [
    ["roma", "compact"],
    ["portofino", "compact"],
    ["sf90", "compact"],
    ["812", "compact"],
    ["f8", "compact"],
    ["296", "compact"],
    ["purosangue", "suv"],
  ],

  mclaren: [
    ["720s", "compact"],
    ["artura", "compact"],
    ["765lt", "compact"],
    ["gt", "compact"],
  ],

  aston: [
    ["vantage", "compact"],
    ["db11", "compact"],
    ["db12", "compact"],
    ["dbs", "compact"],
    ["dbx", "suv"],
  ],

  astonmartin: [
    ["vantage", "compact"],
    ["db11", "compact"],
    ["db12", "compact"],
    ["dbs", "compact"],
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
