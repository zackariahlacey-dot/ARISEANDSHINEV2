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
