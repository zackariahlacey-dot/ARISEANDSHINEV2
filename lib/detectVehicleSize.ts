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
// mappings:
// compact = Small (Compacts + 2-Row SUVs)
// sedan = Medium
// suv = Large (3-Row SUVs + Trucks + Passenger Minivans)
// xl = Work Van (Sprinter, Transit, Promaster, Express, Savana, NV cargo, E-Series)

type Entry = [string, VehicleSizeSlug];
const DB: Record<string, Entry[]> = {
  toyota: [
    ["yaris", "compact"], ["echo", "compact"], ["priusc", "compact"], ["chr", "compact"],
    ["chrcrossover", "compact"], ["matrix", "compact"], ["bz3", "compact"], ["prius", "compact"],
    ["priusprime", "compact"], ["priusv", "compact"], ["mirai", "compact"], ["corolla", "compact"],
    ["camry", "sedan"], ["avalon", "sedan"], ["supra", "compact"], ["86", "compact"],
    ["gr86", "compact"], ["celica", "compact"], ["solara", "compact"],
    ["bz4x", "compact"], ["venza", "compact"], ["rav4", "compact"], // 2-Row SUVs -> Small
    ["4runner", "suv"], ["fjcruiser", "compact"], ["highlander", "suv"],
    ["sequoia", "suv"], ["landcruiser", "suv"], ["sienna", "suv"], ["grandhighlander", "suv"],
    ["tacoma", "suv"], ["tundra", "suv"],
  ],

  honda: [
    ["fit", "compact"], ["hrv", "compact"], ["honda", "compact"], ["insight", "compact"],
    ["civic", "compact"], ["accord", "sedan"], ["clarity", "sedan"], ["crz", "compact"],
    ["crv", "compact"], // 2-Row SUV -> Small
    ["passport", "suv"], ["pilot", "suv"], ["odyssey", "suv"], ["element", "compact"],
    ["ridgeline", "suv"],
  ],

  ford: [
    ["fiesta", "compact"], ["focus", "compact"], ["ecosport", "compact"], ["transitconnect", "compact"],
    ["fusion", "sedan"], ["mustang", "compact"], ["taurus", "sedan"],
    ["escape", "compact"], ["broncosport", "compact"], ["edge", "compact"], // 2-Row SUVs -> Small
    ["bronco", "suv"], ["explorer", "suv"], ["expedition", "suv"],
    ["maverick", "suv"], ["ranger", "suv"], ["f150", "suv"], ["f250", "suv"], ["f350", "suv"],
    ["transit", "xl"], ["eseries", "xl"], ["econoline", "xl"],
  ],

  chevrolet: [
    ["spark", "compact"], ["sonic", "compact"], ["cruze", "compact"], ["cobalt", "compact"],
    ["trax", "compact"], ["malibu", "sedan"], ["impala", "sedan"], ["camaro", "compact"],
    ["corvette", "compact"],
    ["trailblazer", "compact"], ["blazer", "compact"], ["equinox", "compact"], // 2-Row SUVs -> Small
    ["traverse", "suv"], ["tahoe", "suv"], ["suburban", "suv"],
    ["colorado", "suv"], ["silverado", "suv"], ["avalanche", "suv"], ["express", "xl"],
  ],

  gmc: [
    ["terrain", "compact"], ["acadia", "suv"], ["yukon", "suv"], ["yukonxl", "suv"],
    ["canyon", "suv"], ["sierra", "suv"], ["savana", "xl"],
  ],

  dodge: [
    ["neon", "compact"], ["dart", "compact"], ["charger", "sedan"], ["challenger", "sedan"],
    ["journey", "suv"], ["durango", "suv"], ["caravan", "suv"], ["grandcaravan", "suv"], ["promaster", "xl"], ["promastercitycargo", "compact"], ["promastercity", "compact"],
  ],

  jeep: [
    ["renegade", "compact"], ["compass", "compact"], ["patriot", "compact"], ["cherokee", "compact"],
    ["wrangler", "compact"], ["liberty", "compact"], // 2-Row SUVs -> Small
    ["grandcherokee", "suv"], ["grandwaganeer", "suv"], ["commander", "suv"], ["gladiator", "suv"],
  ],

  nissan: [
    ["micra", "compact"], ["versa", "compact"], ["sentra", "compact"], ["altima", "sedan"],
    ["maxima", "sedan"], ["leaf", "compact"],
    ["juke", "compact"], ["kicks", "compact"], ["rogue", "compact"], ["murano", "compact"], // 2-Row SUVs -> Small
    ["pathfinder", "suv"], ["armada", "suv"], ["xterra", "compact"], ["quest", "suv"],
    ["frontier", "suv"], ["titan", "suv"], ["nv", "xl"], ["nv200", "compact"],
    ["nv1500", "xl"], ["nv2500", "xl"], ["nv3500", "xl"],
  ],

  hyundai: [
    ["accent", "compact"], ["elantra", "compact"], ["sonata", "sedan"], ["ioniq", "compact"],
    ["venue", "compact"], ["kona", "compact"], ["tucson", "compact"], ["santafe", "compact"], // 2-Row SUVs -> Small
    ["palisade", "suv"], ["santacruz", "suv"], ["ioniq5", "compact"], ["ioniq6", "sedan"],
  ],

  kia: [
    ["rio", "compact"], ["forte", "compact"], ["k5", "sedan"], ["stinger", "sedan"],
    ["soul", "compact"], ["niro", "compact"], ["seltos", "compact"], ["sportage", "compact"], // 2-Row SUVs -> Small
    ["sorento", "suv"], ["telluride", "suv"], ["carnival", "suv"],
  ],

  subaru: [
    ["impreza", "compact"], ["legacy", "sedan"], ["wrx", "compact"], ["brz", "compact"],
    ["crosstrek", "compact"], ["forester", "compact"], ["outback", "compact"], // 2-Row SUVs -> Small
    ["ascent", "suv"],
  ],

  mazda: [
    ["mazda3", "compact"], ["mazda6", "sedan"], ["miata", "compact"],
    ["cx3", "compact"], ["cx30", "compact"], ["cx5", "compact"], ["cx50", "compact"], // 2-Row SUVs -> Small
    ["cx9", "suv"], ["cx90", "suv"],
  ],

  volkswagen: [
    ["golf", "compact"], ["jetta", "compact"], ["passat", "sedan"], ["arteon", "sedan"],
    ["taos", "compact"], ["tiguan", "compact"], ["id4", "compact"], // 2-Row SUVs -> Small
    ["atlas", "suv"], ["touareg", "suv"], ["idbuzz", "suv"], ["routan", "suv"],
  ],

  bmw: [
    ["1series", "compact"], ["2series", "compact"], ["3series", "compact"], ["4series", "compact"],
    ["5series", "sedan"], ["7series", "sedan"],
    ["x1", "compact"], ["x2", "compact"], ["x3", "compact"], // 2-Row SUVs -> Small
    ["x4", "suv"], ["x5", "suv"], ["x6", "suv"], ["x7", "suv"],
  ],

  mercedes: [
    ["aclass", "compact"], ["cclass", "compact"], ["eclass", "sedan"], ["sclass", "sedan"],
    ["cla", "compact"], ["cls", "sedan"],
    ["gla", "compact"], ["glb", "compact"], ["glc", "compact"], // 2-Row SUVs -> Small
    ["gle", "suv"], ["gls", "suv"], ["gclass", "suv"], ["sprinter", "xl"],
  ],

  audi: [
    ["a1", "compact"], ["a3", "compact"], ["a4", "compact"], ["a5", "compact"],
    ["a6", "sedan"], ["a7", "sedan"], ["a8", "sedan"],
    ["q2", "compact"], ["q3", "compact"], ["q5", "compact"], // 2-Row SUVs -> Small
    ["q7", "suv"], ["q8", "suv"], ["etron", "suv"],
  ],

  lexus: [
    ["is", "compact"], ["es", "sedan"], ["ls", "sedan"], ["rc", "compact"], ["lc", "compact"],
    ["ux", "compact"], ["nx", "compact"], ["rx", "compact"], // 2-Row SUVs -> Small
    ["gx", "suv"], ["lx", "suv"], ["tx", "suv"],
  ],

  tesla: [
    ["model3", "compact"], ["models", "sedan"], ["modely", "compact"], ["modelx", "suv"], ["cybertruck", "suv"],
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
};
const MAKE_DISPLAY_OVERRIDES: Record<string, string> = {
  bmw: "BMW", gmc: "GMC", vw: "VW", volkswagen: "Volkswagen", mercedes: "Mercedes",
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
