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
  toyota: [
    ["yaris", "sedan"], ["echo", "sedan"], ["priusc", "sedan"], ["chr", "sedan"],
    ["chrcrossover", "sedan"], ["matrix", "sedan"], ["bz3", "sedan"], ["prius", "sedan"],
    ["priusprime", "sedan"], ["priusv", "sedan"], ["mirai", "sedan"], ["corolla", "sedan"],
    ["camry", "sedan"], ["avalon", "sedan"], ["supra", "sedan"], ["86", "sedan"],
    ["gr86", "sedan"], ["celica", "sedan"], ["solara", "sedan"],
    ["bz4x", "sedan"], ["venza", "sedan"], ["rav4", "sedan"], // 2-Row SUVs -> Small
    ["4runner", "suv"], ["fjcruiser", "sedan"], ["highlander", "suv"],
    ["sequoia", "suv"], ["landcruiser", "suv"], ["sienna", "suv"], ["grandhighlander", "suv"],
    ["tacoma", "suv"], ["tundra", "suv"],
  ],

  honda: [
    ["fit", "sedan"], ["hrv", "sedan"], ["honda", "sedan"], ["insight", "sedan"],
    ["civic", "sedan"], ["accord", "sedan"], ["clarity", "sedan"], ["crz", "sedan"],
    ["crv", "sedan"], // 2-Row SUV -> Small
    ["passport", "suv"], ["pilot", "suv"], ["odyssey", "suv"], ["element", "sedan"],
    ["ridgeline", "suv"],
  ],

  ford: [
    ["fiesta", "sedan"], ["focus", "sedan"], ["ecosport", "sedan"], ["transitconnect", "sedan"],
    ["fusion", "sedan"], ["mustang", "sedan"], ["taurus", "sedan"],
    ["escape", "sedan"], ["broncosport", "sedan"], ["edge", "sedan"], // 2-Row SUVs -> Small
    ["bronco", "suv"], ["explorer", "suv"], ["expedition", "suv"],
    ["maverick", "suv"], ["ranger", "suv"], ["f150", "suv"], ["f250", "suv"], ["f350", "suv"],
    ["transit", "xl"], ["eseries", "xl"], ["econoline", "xl"],
  ],

  chevrolet: [
    ["spark", "sedan"], ["sonic", "sedan"], ["cruze", "sedan"], ["cobalt", "sedan"],
    ["trax", "sedan"], ["malibu", "sedan"], ["impala", "sedan"], ["camaro", "sedan"],
    ["corvette", "sedan"],
    ["trailblazer", "sedan"], ["blazer", "sedan"], ["equinox", "sedan"], // 2-Row SUVs -> Small
    ["traverse", "suv"], ["tahoe", "suv"], ["suburban", "suv"],
    ["colorado", "suv"], ["silverado", "suv"], ["avalanche", "suv"], ["express", "xl"],
  ],

  gmc: [
    ["terrain", "sedan"], ["acadia", "suv"], ["yukon", "suv"], ["yukonxl", "suv"],
    ["canyon", "suv"], ["sierra", "suv"], ["savana", "xl"],
  ],

  dodge: [
    ["neon", "sedan"], ["dart", "sedan"], ["charger", "sedan"], ["challenger", "sedan"],
    ["journey", "suv"], ["durango", "suv"], ["caravan", "suv"], ["grandcaravan", "suv"], ["promaster", "xl"], ["promastercitycargo", "sedan"], ["promastercity", "sedan"],
  ],

  jeep: [
    ["renegade", "sedan"], ["compass", "sedan"], ["patriot", "sedan"], ["cherokee", "sedan"],
    ["wrangler", "sedan"], ["liberty", "sedan"], // 2-Row SUVs -> Small
    ["grandcherokee", "suv"], ["grandwaganeer", "suv"], ["commander", "suv"], ["gladiator", "suv"],
  ],

  nissan: [
    ["micra", "sedan"], ["versa", "sedan"], ["sentra", "sedan"], ["altima", "sedan"],
    ["maxima", "sedan"], ["leaf", "sedan"],
    ["juke", "sedan"], ["kicks", "sedan"], ["rogue", "sedan"], ["murano", "sedan"], // 2-Row SUVs -> Small
    ["pathfinder", "suv"], ["armada", "suv"], ["xterra", "sedan"], ["quest", "suv"],
    ["frontier", "suv"], ["titan", "suv"], ["nv", "xl"], ["nv200", "sedan"],
    ["nv1500", "xl"], ["nv2500", "xl"], ["nv3500", "xl"],
  ],

  hyundai: [
    ["accent", "sedan"], ["elantra", "sedan"], ["sonata", "sedan"], ["ioniq", "sedan"],
    ["venue", "sedan"], ["kona", "sedan"], ["tucson", "sedan"], ["santafe", "sedan"], // 2-Row SUVs -> Small
    ["palisade", "suv"], ["santacruz", "suv"], ["ioniq5", "sedan"], ["ioniq6", "sedan"],
  ],

  kia: [
    ["rio", "sedan"], ["forte", "sedan"], ["k5", "sedan"], ["stinger", "sedan"],
    ["soul", "sedan"], ["niro", "sedan"], ["seltos", "sedan"], ["sportage", "sedan"], // 2-Row SUVs -> Small
    ["sorento", "suv"], ["telluride", "suv"], ["carnival", "suv"],
  ],

  subaru: [
    ["impreza", "sedan"], ["legacy", "sedan"], ["wrx", "sedan"], ["brz", "sedan"],
    ["crosstrek", "sedan"], ["forester", "sedan"], ["outback", "sedan"], // 2-Row SUVs -> Small
    ["ascent", "suv"],
  ],

  mazda: [
    ["mazda3", "sedan"], ["mazda6", "sedan"], ["miata", "sedan"],
    ["cx3", "sedan"], ["cx30", "sedan"], ["cx5", "sedan"], ["cx50", "sedan"], // 2-Row SUVs -> Small
    ["cx9", "suv"], ["cx90", "suv"],
  ],

  volkswagen: [
    ["golf", "sedan"], ["jetta", "sedan"], ["passat", "sedan"], ["arteon", "sedan"],
    ["taos", "sedan"], ["tiguan", "sedan"], ["id4", "sedan"], // 2-Row SUVs -> Small
    ["atlas", "suv"], ["touareg", "suv"], ["idbuzz", "suv"], ["routan", "suv"],
  ],

  bmw: [
    ["1series", "sedan"], ["2series", "sedan"], ["3series", "sedan"], ["4series", "sedan"],
    ["5series", "sedan"], ["7series", "sedan"],
    ["x1", "sedan"], ["x2", "sedan"], ["x3", "sedan"], // 2-Row SUVs -> Small
    ["x4", "suv"], ["x5", "suv"], ["x6", "suv"], ["x7", "suv"],
  ],

  mercedes: [
    ["aclass", "sedan"], ["cclass", "sedan"], ["eclass", "sedan"], ["sclass", "sedan"],
    ["cla", "sedan"], ["cls", "sedan"],
    ["gla", "sedan"], ["glb", "sedan"], ["glc", "sedan"], // 2-Row SUVs -> Small
    ["gle", "suv"], ["gls", "suv"], ["gclass", "suv"], ["sprinter", "xl"],
  ],

  audi: [
    ["a1", "sedan"], ["a3", "sedan"], ["a4", "sedan"], ["a5", "sedan"],
    ["a6", "sedan"], ["a7", "sedan"], ["a8", "sedan"],
    ["q2", "sedan"], ["q3", "sedan"], ["q5", "sedan"], // 2-Row SUVs -> Small
    ["q7", "suv"], ["q8", "suv"], ["etron", "suv"],
  ],

  lexus: [
    ["is", "sedan"], ["es", "sedan"], ["ls", "sedan"], ["rc", "sedan"], ["lc", "sedan"],
    ["ux", "sedan"], ["nx", "sedan"], ["rx", "sedan"], // 2-Row SUVs -> Small
    ["gx", "suv"], ["lx", "suv"], ["tx", "suv"],
  ],

  tesla: [
    ["model3", "sedan"], ["models", "sedan"], ["modely", "sedan"], ["modelx", "suv"], ["cybertruck", "suv"],
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
