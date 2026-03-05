/**
 * Vehicle make/model database for autocomplete and size auto-detect.
 * Sizes: small (compact), medium (sedan), large (SUV/truck), extra_large (van/minivan).
 */

export type SizeTier = "small" | "medium" | "large" | "extra_large";

export type ModelEntry = { model: string; size: SizeTier };

export type VehicleDatabase = Record<string, ModelEntry[]>;

export const VEHICLE_DATABASE: VehicleDatabase = {
  Toyota: [
    { model: "Yaris", size: "small" },
    { model: "Corolla", size: "small" },
    { model: "Prius", size: "small" },
    { model: "Camry", size: "medium" },
    { model: "Avalon", size: "medium" },
    { model: "Supra", size: "medium" },
    { model: "C-HR", size: "small" },
    { model: "RAV4", size: "large" },
    { model: "Venza", size: "large" },
    { model: "Highlander", size: "large" },
    { model: "4Runner", size: "large" },
    { model: "Sequoia", size: "large" },
    { model: "Land Cruiser", size: "large" },
    { model: "Sienna", size: "extra_large" },
    { model: "Tacoma", size: "large" },
    { model: "Tundra", size: "large" },
  ],
  Honda: [
    { model: "Fit", size: "small" },
    { model: "HR-V", size: "small" },
    { model: "Civic", size: "small" },
    { model: "Insight", size: "medium" },
    { model: "Accord", size: "medium" },
    { model: "CR-V", size: "large" },
    { model: "Passport", size: "large" },
    { model: "Pilot", size: "large" },
    { model: "Odyssey", size: "extra_large" },
    { model: "Ridgeline", size: "large" },
  ],
  Ford: [
    { model: "Fiesta", size: "small" },
    { model: "Focus", size: "small" },
    { model: "EcoSport", size: "small" },
    { model: "Mustang", size: "medium" },
    { model: "Fusion", size: "medium" },
    { model: "Taurus", size: "medium" },
    { model: "Escape", size: "large" },
    { model: "Bronco Sport", size: "large" },
    { model: "Edge", size: "large" },
    { model: "Bronco", size: "large" },
    { model: "Explorer", size: "large" },
    { model: "Expedition", size: "large" },
    { model: "Maverick", size: "large" },
    { model: "Ranger", size: "large" },
    { model: "F-150", size: "large" },
    { model: "Transit", size: "extra_large" },
  ],
  Chevrolet: [
    { model: "Spark", size: "small" },
    { model: "Sonic", size: "small" },
    { model: "Trax", size: "small" },
    { model: "Malibu", size: "medium" },
    { model: "Camaro", size: "medium" },
    { model: "Corvette", size: "medium" },
    { model: "Impala", size: "medium" },
    { model: "Trailblazer", size: "large" },
    { model: "Equinox", size: "large" },
    { model: "Blazer", size: "large" },
    { model: "Traverse", size: "large" },
    { model: "Tahoe", size: "large" },
    { model: "Suburban", size: "extra_large" },
    { model: "Colorado", size: "large" },
    { model: "Silverado", size: "large" },
    { model: "Express", size: "extra_large" },
  ],
  Nissan: [
    { model: "Versa", size: "small" },
    { model: "Sentra", size: "small" },
    { model: "Kicks", size: "small" },
    { model: "Altima", size: "medium" },
    { model: "Maxima", size: "medium" },
    { model: "Leaf", size: "medium" },
    { model: "Rogue", size: "large" },
    { model: "Murano", size: "large" },
    { model: "Pathfinder", size: "large" },
    { model: "Armada", size: "large" },
    { model: "Quest", size: "extra_large" },
    { model: "Frontier", size: "large" },
    { model: "Titan", size: "large" },
  ],
  Hyundai: [
    { model: "Accent", size: "small" },
    { model: "Venue", size: "small" },
    { model: "Kona", size: "small" },
    { model: "Elantra", size: "small" },
    { model: "Sonata", size: "medium" },
    { model: "Tucson", size: "large" },
    { model: "Santa Fe", size: "large" },
    { model: "Palisade", size: "large" },
  ],
  Kia: [
    { model: "Rio", size: "small" },
    { model: "Soul", size: "small" },
    { model: "Seltos", size: "small" },
    { model: "Forte", size: "small" },
    { model: "K5", size: "medium" },
    { model: "Stinger", size: "medium" },
    { model: "Sportage", size: "large" },
    { model: "Sorento", size: "large" },
    { model: "Telluride", size: "large" },
    { model: "Carnival", size: "extra_large" },
  ],
  Tesla: [
    { model: "Model 3", size: "medium" },
    { model: "Model S", size: "medium" },
    { model: "Model Y", size: "large" },
    { model: "Model X", size: "large" },
    { model: "Cybertruck", size: "large" },
  ],
  BMW: [
    { model: "2 Series", size: "small" },
    { model: "3 Series", size: "medium" },
    { model: "4 Series", size: "medium" },
    { model: "5 Series", size: "medium" },
    { model: "7 Series", size: "medium" },
    { model: "X1", size: "small" },
    { model: "X3", size: "large" },
    { model: "X5", size: "large" },
    { model: "X7", size: "large" },
  ],
  "Mercedes-Benz": [
    { model: "A-Class", size: "small" },
    { model: "CLA", size: "small" },
    { model: "C-Class", size: "medium" },
    { model: "E-Class", size: "medium" },
    { model: "S-Class", size: "medium" },
    { model: "GLA", size: "small" },
    { model: "GLB", size: "large" },
    { model: "GLC", size: "large" },
    { model: "GLE", size: "large" },
    { model: "GLS", size: "large" },
    { model: "Sprinter", size: "extra_large" },
  ],
  Audi: [
    { model: "A3", size: "small" },
    { model: "A4", size: "medium" },
    { model: "A5", size: "medium" },
    { model: "A6", size: "medium" },
    { model: "A7", size: "medium" },
    { model: "A8", size: "medium" },
    { model: "Q3", size: "small" },
    { model: "Q5", size: "large" },
    { model: "Q7", size: "large" },
    { model: "Q8", size: "large" },
  ],
  Volkswagen: [
    { model: "Golf", size: "small" },
    { model: "Jetta", size: "small" },
    { model: "Passat", size: "medium" },
    { model: "Arteon", size: "medium" },
    { model: "Taos", size: "small" },
    { model: "Tiguan", size: "large" },
    { model: "Atlas", size: "large" },
    { model: "ID.4", size: "large" },
  ],
  Mazda: [
    { model: "Mazda3", size: "small" },
    { model: "Mazda6", size: "medium" },
    { model: "CX-30", size: "small" },
    { model: "CX-5", size: "large" },
    { model: "CX-50", size: "large" },
    { model: "CX-90", size: "large" },
  ],
  Subaru: [
    { model: "Impreza", size: "small" },
    { model: "Crosstrek", size: "small" },
    { model: "WRX", size: "medium" },
    { model: "Legacy", size: "medium" },
    { model: "Outback", size: "large" },
    { model: "Forester", size: "large" },
    { model: "Ascent", size: "large" },
  ],
  Jeep: [
    { model: "Renegade", size: "small" },
    { model: "Compass", size: "small" },
    { model: "Cherokee", size: "large" },
    { model: "Grand Cherokee", size: "large" },
    { model: "Wrangler", size: "large" },
    { model: "Gladiator", size: "large" },
  ],
  Ram: [
    { model: "1500", size: "large" },
    { model: "2500", size: "large" },
    { model: "3500", size: "large" },
    { model: "ProMaster", size: "extra_large" },
  ],
  GMC: [
    { model: "Terrain", size: "large" },
    { model: "Acadia", size: "large" },
    { model: "Yukon", size: "large" },
    { model: "Canyon", size: "large" },
    { model: "Sierra", size: "large" },
    { model: "Savana", size: "extra_large" },
  ],
  Dodge: [
    { model: "Charger", size: "medium" },
    { model: "Challenger", size: "medium" },
    { model: "Durango", size: "large" },
    { model: "Caravan", size: "extra_large" },
  ],
  Chrysler: [
    { model: "300", size: "medium" },
    { model: "Pacifica", size: "extra_large" },
    { model: "Voyager", size: "extra_large" },
  ],
  Lexus: [
    { model: "IS", size: "medium" },
    { model: "ES", size: "medium" },
    { model: "GS", size: "medium" },
    { model: "LS", size: "medium" },
    { model: "RC", size: "medium" },
    { model: "LC", size: "medium" },
    { model: "UX", size: "small" },
    { model: "NX", size: "small" },
    { model: "RX", size: "large" },
    { model: "GX", size: "large" },
    { model: "LX", size: "large" },
    { model: "TX", size: "large" },
  ],
  Cadillac: [
    { model: "CT4", size: "small" },
    { model: "CT5", size: "medium" },
    { model: "XT4", size: "small" },
    { model: "XT5", size: "large" },
    { model: "XT6", size: "large" },
    { model: "Escalade", size: "large" },
  ],
  Buick: [
    { model: "Encore", size: "small" },
    { model: "Encore GX", size: "small" },
    { model: "Envision", size: "large" },
    { model: "Enclave", size: "large" },
  ],
  Lincoln: [
    { model: "Corsair", size: "small" },
    { model: "Nautilus", size: "large" },
    { model: "Aviator", size: "large" },
    { model: "Navigator", size: "large" },
  ],
  Volvo: [
    { model: "S60", size: "medium" },
    { model: "S90", size: "medium" },
    { model: "V60", size: "medium" },
    { model: "XC40", size: "small" },
    { model: "XC60", size: "large" },
    { model: "XC90", size: "large" },
  ],
  Acura: [
    { model: "Integra", size: "small" },
    { model: "TLX", size: "medium" },
    { model: "RDX", size: "large" },
    { model: "MDX", size: "large" },
  ],
  Infiniti: [
    { model: "Q50", size: "medium" },
    { model: "Q60", size: "medium" },
    { model: "QX50", size: "large" },
    { model: "QX55", size: "large" },
    { model: "QX60", size: "large" },
    { model: "QX80", size: "large" },
  ],
  Genesis: [
    { model: "G70", size: "medium" },
    { model: "G80", size: "medium" },
    { model: "G90", size: "medium" },
    { model: "GV60", size: "small" },
    { model: "GV70", size: "large" },
    { model: "GV80", size: "large" },
  ],
  Rivian: [
    { model: "R1T", size: "large" },
    { model: "R1S", size: "large" },
    { model: "R2", size: "large" },
    { model: "R3", size: "small" },
  ],
  Lucid: [
    { model: "Air", size: "medium" },
    { model: "Gravity", size: "large" },
  ],
  Porsche: [
    { model: "718", size: "medium" },
    { model: "911", size: "medium" },
    { model: "Panamera", size: "medium" },
    { model: "Taycan", size: "medium" },
    { model: "Macan", size: "small" },
    { model: "Cayenne", size: "large" },
  ],
  Mitsubishi: [
    { model: "Mirage", size: "small" },
    { model: "Eclipse Cross", size: "large" },
    { model: "Outlander", size: "large" },
    { model: "Outlander Sport", size: "small" },
  ],
};

const MAKES_ORDERED = Object.keys(VEHICLE_DATABASE).sort();

export function getMakes(): string[] {
  return MAKES_ORDERED;
}

export function getModelsForMake(make: string): ModelEntry[] {
  if (!make.trim()) return [];
  const key = MAKES_ORDERED.find(
    (m) => m.toLowerCase() === make.trim().toLowerCase()
  );
  if (!key) return [];
  return VEHICLE_DATABASE[key] ?? [];
}

export function filterMakesByQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return MAKES_ORDERED;
  return MAKES_ORDERED.filter((m) => m.toLowerCase().includes(q));
}

export function filterModelsByQuery(
  make: string,
  query: string
): ModelEntry[] {
  const models = getModelsForMake(make);
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter((e) => e.model.toLowerCase().includes(q));
}

/** Map database size tier to booking modal VehicleSizeSlug (compact | sedan | suv | xl) */
export function sizeTierToSlug(tier: SizeTier): "compact" | "sedan" | "suv" | "xl" {
  const map: Record<SizeTier, "compact" | "sedan" | "suv" | "xl"> = {
    small: "compact",
    medium: "sedan",
    large: "suv",
    extra_large: "xl",
  };
  return map[tier] ?? "sedan";
}
