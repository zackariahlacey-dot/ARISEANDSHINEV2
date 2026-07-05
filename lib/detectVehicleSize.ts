import type { VehicleSizeSlug } from "@/app/actions/bookDetailing";

/**
 * Strips spaces, hyphens, underscores, dots — makes matching fuzzy:
 *   "F-150 XLT" → "f150xlt",  "RAV 4" → "rav4",  "Grand Cherokee" → "grandcherokee"
 */
const norm = (s: string): string =>
  s.toLowerCase().replace(/[-_\s.]/g, "");

// ─── Make aliases ─────────────────────────────────────────────────────────────
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
  rangeover: "landrover",
  rangerover: "landrover",
  rolls: "rollsroyce",
  rollsroyce: "rollsroyce",
  rr: "rollsroyce",
  alfa: "alfaromeo",
  alfaromeo: "alfaromeo",
};

// ─── Vehicle database ─────────────────────────────────────────────────────────
// mappings (3 sizes):
// sedan = Car / coupe / compact sedan / 2-row crossover
// suv = 2-row SUV / pickup / midsize truck
// xl = 3-row SUV / Yukon / Suburban / Sprinter / work van

type Entry = [string, VehicleSizeSlug];
const DB: Record<string, Entry[]> = {
  // Size tiers (July 2026):
  //   sedan = cars, coupes, compacts, 2-row crossovers
  //   suv   = 2-row SUVs, mid-size trucks (Tacoma, Colorado, Frontier, Ranger, Ridgeline, Maverick, Gladiator)
  //   xl    = 3-row SUVs + full-size pickups + minivans + work vans + Sprinter/Transit
  toyota: [
    ["yaris", "sedan"], ["echo", "sedan"], ["priusc", "sedan"], ["chr", "sedan"],
    ["chrcrossover", "sedan"], ["matrix", "sedan"], ["bz3", "sedan"], ["prius", "sedan"],
    ["priusprime", "sedan"], ["priusv", "sedan"], ["mirai", "sedan"], ["corolla", "sedan"],
    ["camry", "sedan"], ["avalon", "sedan"], ["supra", "sedan"], ["86", "sedan"],
    ["gr86", "sedan"], ["celica", "sedan"], ["solara", "sedan"],
    ["bz4x", "sedan"], ["venza", "sedan"], ["rav4", "sedan"], // 2-Row SUVs
    ["4runner", "suv"], ["fjcruiser", "suv"], ["tacoma", "suv"],
    // 3-row SUVs + full-size trucks + minivan → xl
    ["highlander", "xl"], ["sequoia", "xl"], ["landcruiser", "xl"],
    ["grandhighlander", "xl"], ["sienna", "xl"], ["tundra", "xl"],
  ],

  honda: [
    ["fit", "sedan"], ["hrv", "sedan"], ["honda", "sedan"], ["insight", "sedan"],
    ["civic", "sedan"], ["accord", "sedan"], ["clarity", "sedan"], ["crz", "sedan"],
    ["crv", "sedan"], ["element", "sedan"], // 2-Row
    ["passport", "suv"], ["ridgeline", "suv"], // 2-row full SUV / mid-size truck
    ["pilot", "xl"], ["odyssey", "xl"], // 3-row SUV + minivan
  ],

  ford: [
    ["fiesta", "sedan"], ["focus", "sedan"], ["ecosport", "sedan"], ["transitconnect", "sedan"],
    ["fusion", "sedan"], ["mustang", "sedan"], ["taurus", "sedan"],
    ["escape", "sedan"], ["broncosport", "sedan"], ["edge", "sedan"], // 2-Row
    ["bronco", "suv"], ["explorer", "suv"], // 2-row full SUV
    ["maverick", "suv"], ["ranger", "suv"], // mid-size trucks
    // 3-row SUV + full-size trucks + work vans → xl
    ["expedition", "xl"], ["f150", "xl"], ["f250", "xl"], ["f350", "xl"],
    ["f450", "xl"], ["f550", "xl"],
    ["transit", "xl"], ["eseries", "xl"], ["econoline", "xl"],
  ],

  chevrolet: [
    ["spark", "sedan"], ["sonic", "sedan"], ["cruze", "sedan"], ["cobalt", "sedan"],
    ["trax", "sedan"], ["malibu", "sedan"], ["impala", "sedan"], ["camaro", "sedan"],
    ["corvette", "sedan"],
    ["trailblazer", "sedan"], ["blazer", "sedan"], ["equinox", "sedan"], // 2-Row
    ["colorado", "suv"], // mid-size truck
    // 3-row SUVs + full-size trucks + work van → xl
    ["traverse", "xl"], ["tahoe", "xl"], ["suburban", "xl"],
    ["silverado", "xl"], ["avalanche", "xl"], ["express", "xl"],
  ],

  gmc: [
    ["terrain", "sedan"],
    ["canyon", "suv"], // mid-size truck
    // 3-row + full-size + work van
    ["acadia", "xl"], ["yukon", "xl"], ["yukonxl", "xl"],
    ["sierra", "xl"], ["savana", "xl"],
  ],

  dodge: [
    ["neon", "sedan"], ["dart", "sedan"], ["charger", "sedan"], ["challenger", "sedan"],
    ["journey", "suv"], // mid-size 2-row
    // 3-row SUVs + minivans + work van
    ["durango", "xl"], ["caravan", "xl"], ["grandcaravan", "xl"], ["promaster", "xl"],
    ["promastercitycargo", "sedan"], ["promastercity", "sedan"],
  ],

  ram: [
    ["1500", "xl"], ["ram1500", "xl"],
    ["2500", "xl"], ["ram2500", "xl"],
    ["3500", "xl"], ["ram3500", "xl"],
    ["4500", "xl"], ["5500", "xl"],
    ["promaster", "xl"], ["promastercity", "sedan"],
  ],

  jeep: [
    ["renegade", "sedan"], ["compass", "sedan"], ["patriot", "sedan"], ["cherokee", "sedan"],
    ["liberty", "sedan"], // 2-Row
    ["wrangler", "suv"], // full-size 2-row SUV
    ["gladiator", "suv"], // mid-size truck
    ["grandcherokee", "suv"], // 2-row full SUV
    // 3-row + Grand Wagoneer full-size
    ["grandcherokeel", "xl"], ["commander", "xl"],
    ["wagoneer", "xl"], ["grandwaganeer", "xl"], ["grandwagoneer", "xl"],
  ],

  nissan: [
    ["micra", "sedan"], ["versa", "sedan"], ["sentra", "sedan"], ["altima", "sedan"],
    ["maxima", "sedan"], ["leaf", "sedan"],
    ["juke", "sedan"], ["kicks", "sedan"], ["rogue", "sedan"], ["murano", "sedan"],
    ["xterra", "suv"], ["frontier", "suv"], // 2-row full SUV / mid-size truck
    // 3-row SUVs + full-size truck + minivan + work vans
    ["pathfinder", "xl"], ["armada", "xl"], ["quest", "xl"], ["titan", "xl"],
    ["nv", "xl"], ["nv200", "sedan"],
    ["nv1500", "xl"], ["nv2500", "xl"], ["nv3500", "xl"],
  ],

  hyundai: [
    ["accent", "sedan"], ["elantra", "sedan"], ["sonata", "sedan"], ["ioniq", "sedan"],
    ["venue", "sedan"], ["kona", "sedan"], ["tucson", "sedan"], ["santafe", "sedan"], // 2-Row
    ["santacruz", "suv"], // compact/mid-size truck
    ["ioniq5", "sedan"], ["ioniq6", "sedan"],
    ["palisade", "xl"], // 3-row
  ],

  kia: [
    ["rio", "sedan"], ["forte", "sedan"], ["k5", "sedan"], ["stinger", "sedan"],
    ["soul", "sedan"], ["niro", "sedan"], ["seltos", "sedan"], ["sportage", "sedan"], // 2-Row
    ["sorento", "suv"], // 2-3 row varies; keep in middle tier
    ["telluride", "xl"], ["carnival", "xl"], // 3-row + minivan
  ],

  subaru: [
    ["impreza", "sedan"], ["legacy", "sedan"], ["wrx", "sedan"], ["brz", "sedan"],
    ["crosstrek", "sedan"], ["forester", "sedan"], ["outback", "sedan"], // 2-Row
    ["ascent", "xl"], // 3-row
  ],

  mazda: [
    ["mazda3", "sedan"], ["mazda6", "sedan"], ["miata", "sedan"],
    ["cx3", "sedan"], ["cx30", "sedan"], ["cx5", "sedan"], ["cx50", "sedan"], // 2-Row
    ["cx9", "xl"], ["cx90", "xl"], // 3-row
  ],

  volkswagen: [
    ["golf", "sedan"], ["jetta", "sedan"], ["passat", "sedan"], ["arteon", "sedan"],
    ["taos", "sedan"], ["tiguan", "sedan"], ["id4", "sedan"], // 2-Row
    ["atlas", "xl"], ["touareg", "xl"], ["idbuzz", "xl"], ["routan", "xl"], // 3-row + van
  ],

  bmw: [
    ["1series", "sedan"], ["2series", "sedan"], ["3series", "sedan"], ["4series", "sedan"],
    ["5series", "sedan"], ["7series", "sedan"],
    ["x1", "sedan"], ["x2", "sedan"], ["x3", "sedan"], // 2-Row
    ["x4", "suv"], ["x5", "suv"], ["x6", "suv"], // 2-row full SUV
    ["x7", "xl"], // 3-row
  ],

  mercedes: [
    ["aclass", "sedan"], ["cclass", "sedan"], ["eclass", "sedan"], ["sclass", "sedan"],
    ["cla", "sedan"], ["cls", "sedan"],
    ["gla", "sedan"], ["glb", "sedan"], ["glc", "sedan"], // 2-Row
    ["gle", "suv"], ["gclass", "suv"], // 2-row full SUV
    ["gls", "xl"], ["sprinter", "xl"], // 3-row + van
  ],

  audi: [
    ["a1", "sedan"], ["a3", "sedan"], ["a4", "sedan"], ["a5", "sedan"],
    ["a6", "sedan"], ["a7", "sedan"], ["a8", "sedan"],
    ["q2", "sedan"], ["q3", "sedan"], ["q5", "sedan"], // 2-Row
    ["etron", "suv"],
    ["q7", "xl"], ["q8", "xl"], // 3-row
  ],

  lexus: [
    ["is", "sedan"], ["es", "sedan"], ["ls", "sedan"], ["rc", "sedan"], ["lc", "sedan"],
    ["ux", "sedan"], ["nx", "sedan"], ["rx", "sedan"], // 2-Row
    ["gx", "xl"], ["lx", "xl"], ["tx", "xl"], // 3-row
  ],

  infiniti: [
    ["q50", "sedan"], ["q60", "sedan"], ["q70", "sedan"],
    ["qx30", "sedan"], ["qx50", "sedan"], ["qx55", "sedan"],
    ["qx60", "xl"], ["qx70", "suv"], ["qx80", "xl"],
  ],

  cadillac: [
    ["cts", "sedan"], ["ats", "sedan"], ["ct4", "sedan"], ["ct5", "sedan"], ["ct6", "sedan"],
    ["xt4", "sedan"], ["xt5", "sedan"], ["xt6", "xl"],
    ["escalade", "xl"], ["escaladeesv", "xl"],
  ],

  lincoln: [
    ["continental", "sedan"], ["mkz", "sedan"], ["corsair", "sedan"], ["nautilus", "sedan"],
    ["aviator", "xl"], ["navigator", "xl"],
  ],

  buick: [
    ["encore", "sedan"], ["envision", "sedan"], ["regal", "sedan"], ["verano", "sedan"],
    ["enclave", "xl"],
  ],

  tesla: [
    ["model3", "sedan"], ["models", "sedan"], ["modely", "sedan"],
    ["modelx", "xl"], // 3-row
    ["cybertruck", "xl"], // full-size truck
    ["semi", "xl"],
  ],
};

const MAKE_INDEX = new Map<string, Entry[]>();
for (const [rawMake, entries] of Object.entries(DB)) {
  const n = norm(rawMake);
  const existing = MAKE_INDEX.get(n) ?? [];
  MAKE_INDEX.set(n, [...existing, ...entries]);
}

// Display-friendly capitalization for autocomplete suggestions.
// Most model keys are normalized (lowercase, no spaces/hyphens); we capitalize
// the first letter for display. Special cases like "RAV4", "F-150", "CR-V"
// get cleaned up here.
const MODEL_DISPLAY_OVERRIDES: Record<string, string> = {
  rav4: "RAV4", chr: "C-HR", bz3: "bZ3", bz4x: "bZ4X", gr86: "GR86", "86": "86",
  crv: "CR-V", crz: "CR-Z", hrv: "HR-V",
  f150: "F-150", f250: "F-250", f350: "F-350",
  cx3: "CX-3", cx30: "CX-30", cx5: "CX-5", cx50: "CX-50", cx9: "CX-9", cx90: "CX-90",
  mazda3: "Mazda3", mazda6: "Mazda6",
  id4: "ID.4", idbuzz: "ID. Buzz",
  "1series": "1 Series", "2series": "2 Series", "3series": "3 Series", "4series": "4 Series", "5series": "5 Series", "7series": "7 Series",
  x1: "X1", x2: "X2", x3: "X3", x4: "X4", x5: "X5", x6: "X6", x7: "X7",
  aclass: "A-Class", cclass: "C-Class", eclass: "E-Class", sclass: "S-Class", gclass: "G-Class",
  cla: "CLA", cls: "CLS", gla: "GLA", glb: "GLB", glc: "GLC", gle: "GLE", gls: "GLS",
  a1: "A1", a3: "A3", a4: "A4", a5: "A5", a6: "A6", a7: "A7", a8: "A8",
  q2: "Q2", q3: "Q3", q5: "Q5", q7: "Q7", q8: "Q8",
  etron: "e-tron",
  is: "IS", es: "ES", ls: "LS", rc: "RC", lc: "LC", ux: "UX", nx: "NX", rx: "RX", gx: "GX", lx: "LX", tx: "TX",
  model3: "Model 3", models: "Model S", modely: "Model Y", modelx: "Model X",
  cybertruck: "Cybertruck",
  k5: "K5", grandcherokee: "Grand Cherokee", grandwaganeer: "Grand Wagoneer",
  grandcaravan: "Grand Caravan", grandhighlander: "Grand Highlander",
  landcruiser: "Land Cruiser", fjcruiser: "FJ Cruiser",
  priusc: "Prius C", priusprime: "Prius Prime", priusv: "Prius V",
  yukonxl: "Yukon XL",
  promaster: "ProMaster", promastercity: "ProMaster City", promastercitycargo: "ProMaster City Cargo",
  transitconnect: "Transit Connect", broncosport: "Bronco Sport", santafe: "Santa Fe", santacruz: "Santa Cruz",
  eseries: "E-Series", econoline: "Econoline",
  nv: "NV", nv200: "NV200", nv1500: "NV1500", nv2500: "NV2500", nv3500: "NV3500",
  ioniq5: "Ioniq 5", ioniq6: "Ioniq 6",
  // Ram + heavy-duty
  ram1500: "1500", ram2500: "2500", ram3500: "3500",
  "1500": "1500", "2500": "2500", "3500": "3500", "4500": "4500", "5500": "5500",
  f450: "F-450", f550: "F-550",
  // Jeep — 3-row Grand Cherokee L / Wagoneer family
  grandcherokeel: "Grand Cherokee L",
  wagoneer: "Wagoneer", grandwagoneer: "Grand Wagoneer",
  // Infiniti
  q50: "Q50", q60: "Q60", q70: "Q70",
  qx30: "QX30", qx50: "QX50", qx55: "QX55", qx60: "QX60", qx70: "QX70", qx80: "QX80",
  // Cadillac
  cts: "CTS", ats: "ATS", ct4: "CT4", ct5: "CT5", ct6: "CT6",
  xt4: "XT4", xt5: "XT5", xt6: "XT6",
  escalade: "Escalade", escaladeesv: "Escalade ESV",
  // Lincoln
  mkz: "MKZ",
  // Buick
  // (no overrides needed — capitalization defaults are fine)
  // Tesla
  semi: "Semi",
};
const MAKE_DISPLAY_OVERRIDES: Record<string, string> = {
  bmw: "BMW", gmc: "GMC", vw: "VW", volkswagen: "Volkswagen", mercedes: "Mercedes",
  ram: "Ram", infiniti: "Infiniti", cadillac: "Cadillac", lincoln: "Lincoln", buick: "Buick",
};

function displayModel(key: string): string {
  if (MODEL_DISPLAY_OVERRIDES[key]) return MODEL_DISPLAY_OVERRIDES[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}
function displayMake(key: string): string {
  if (MAKE_DISPLAY_OVERRIDES[key]) return MAKE_DISPLAY_OVERRIDES[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** All known make names (display-friendly), sorted alphabetically. */
export function getAllMakeSuggestions(): string[] {
  const makes = Object.keys(DB).map(displayMake);
  return [...new Set(makes)].sort();
}

/** Model suggestions for a typed make, fuzzy-matched. */
export function getModelSuggestionsForMake(makeInput: string): string[] {
  if (!makeInput.trim()) return [];
  const nm = norm(makeInput);
  const resolved = MAKE_ALIASES[nm] ? norm(MAKE_ALIASES[nm]) : nm;
  const entries = MAKE_INDEX.get(resolved);
  if (!entries) return [];
  return entries.map(([key]) => displayModel(key));
}

export function detectVehicleSize(make: string, model: string): VehicleSizeSlug | null {
  if (!make.trim() || model.trim().length < 1) return null;
  const normMake = norm(make);
  const normModel = norm(model);
  if (!normMake || normModel.length < 1) return null;
  const resolvedMake = MAKE_ALIASES[normMake] ? norm(MAKE_ALIASES[normMake]) : normMake;
  const entries = MAKE_INDEX.get(resolvedMake);
  if (!entries) return null;
  for (const [key, size] of entries) {
    if (key === normModel) return size;
  }
  for (const [key, size] of entries) {
    if (normModel.startsWith(key) || key.startsWith(normModel)) return size;
  }
  return null;
}
