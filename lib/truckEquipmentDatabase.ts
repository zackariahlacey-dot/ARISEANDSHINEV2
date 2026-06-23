/**
 * Semi-truck and heavy-equipment make + model catalog for booking-flow
 * autocomplete. Separate from lib/vehicleDatabase.ts because trucks and
 * equipment are flat-priced (no size auto-detect) and the consumer
 * vehicle DB doesn't carry Class 8 / construction inventory.
 *
 * Models per make are non-exhaustive but cover the rigs we actually
 * detail week-over-week in Vermont — owner-operator classics plus
 * common fleet day-cabs. Edits are safe: anything not listed is
 * typeable freely via the input.
 */

// ── Semi Truck Makes ─────────────────────────────────────────────────────────
export const TRUCK_MAKES: readonly string[] = [
  "Peterbilt",
  "Kenworth",
  "Freightliner",
  "Volvo",
  "Mack",
  "Western Star",
  "International",
  "Hino",
  "Isuzu",
] as const;

export const TRUCK_MODELS: Record<string, readonly string[]> = {
  Peterbilt:    ["389", "579", "567", "520", "337", "348", "365", "367", "220", "330"],
  Kenworth:     ["W900", "W990", "T680", "T880", "T800", "T370", "T270", "T280", "T180"],
  Freightliner: ["Cascadia", "Coronado", "M2 106", "M2 112", "122SD", "108SD", "114SD", "Argosy"],
  Volvo:        ["VNL 860", "VNL 760", "VNL 400", "VNL 300", "VNR", "VHD", "VAH"],
  Mack:         ["Anthem", "Granite", "Pinnacle", "TerraPro", "LR", "MD"],
  "Western Star": ["49X", "47X", "57X", "4900", "4700", "5700"],
  International: ["LT", "RH", "LoneStar", "HV", "MV", "HX", "ProStar", "9900i", "9400i"],
  Hino:         ["L7", "L6", "XL7", "XL8", "268", "338"],
  Isuzu:        ["FTR", "FVR", "NPR", "NQR", "NRR"],
};

// ── Heavy Equipment Brands ───────────────────────────────────────────────────
export const HE_MAKES: readonly string[] = [
  "Caterpillar",
  "John Deere",
  "Komatsu",
  "Bobcat",
  "Kubota",
  "Case",
  "Volvo",
  "Hitachi",
  "Liebherr",
  "JCB",
  "New Holland",
  "Hyundai",
  "Doosan",
  "Massey Ferguson",
  "Kenworth",
  "Mack",
  "Peterbilt",
  "Western Star",
] as const;

export const HE_MODELS: Record<string, readonly string[]> = {
  Caterpillar: [
    "320 Excavator", "330 Excavator", "336 Excavator", "349 Excavator", "390 Excavator",
    "D5 Dozer", "D6 Dozer", "D8 Dozer", "D9 Dozer",
    "950 Wheel Loader", "966 Wheel Loader", "980 Wheel Loader",
    "246D3 Skid Steer", "259D3 CTL", "279D3 CTL", "299D3 CTL",
    "420 Backhoe", "430 Backhoe", "450 Backhoe",
    "745 Articulated Hauler", "725 Articulated Hauler",
    "TH408D Telehandler", "TH514D Telehandler",
    "938M Wheel Loader",
  ],
  "John Deere": [
    "210G Excavator", "245G Excavator", "350G Excavator", "470G Excavator",
    "310 Backhoe", "410 Backhoe", "710 Backhoe",
    "333G Skid Steer", "317G Skid Steer", "330G Skid Steer", "325G Skid Steer",
    "850 Dozer", "950K Dozer", "1050K Dozer",
    "644L Wheel Loader", "744L Wheel Loader", "844L Wheel Loader",
    "9R Tractor", "8R Tractor", "7R Tractor", "6M Tractor", "5M Tractor",
    "1024 Tractor", "1025R Tractor",
  ],
  Komatsu: [
    "PC210 Excavator", "PC360 Excavator", "PC490 Excavator", "PC650 Excavator",
    "D65 Dozer", "D85 Dozer", "D155 Dozer",
    "WA320 Loader", "WA380 Loader", "WA470 Loader",
    "HM300 Articulated Hauler", "HM400 Articulated Hauler",
    "WB97 Backhoe",
  ],
  Bobcat: [
    "S650 Skid Steer", "S740 Skid Steer", "S770 Skid Steer", "S850 Skid Steer",
    "T76 Track Loader", "T770 Track Loader", "T870 Track Loader",
    "E26 Mini Excavator", "E50 Mini Excavator", "E85 Excavator",
    "L23 Loader", "L28 Loader",
    "V519 Telehandler", "TL519 Telehandler",
  ],
  Kubota: [
    "M5 Tractor", "M6 Tractor", "M7 Tractor", "L Series Tractor", "BX Series Tractor",
    "SVL75 Track Loader", "SVL95 Track Loader",
    "KX040 Mini Excavator", "KX080 Mini Excavator", "U35 Mini Excavator", "U55 Mini Excavator",
    "R430 Wheel Loader", "R530 Wheel Loader",
  ],
  Case: [
    "CX210 Excavator", "CX300 Excavator", "CX490 Excavator",
    "580 Backhoe", "590 Backhoe", "695 Backhoe",
    "SR240 Skid Steer", "SR270 Skid Steer", "TR340 CTL",
    "750M Dozer", "850M Dozer", "1150M Dozer",
    "521G Wheel Loader", "621G Wheel Loader",
  ],
  Volvo: [
    "EC220 Excavator", "EC300 Excavator", "EC480 Excavator", "EC750 Excavator",
    "L60 Loader", "L90 Loader", "L120 Loader", "L150 Loader", "L180 Loader",
    "A30 Articulated Hauler", "A40 Articulated Hauler", "A45 Articulated Hauler",
  ],
  Hitachi: [
    "ZX200 Excavator", "ZX350 Excavator", "ZX490 Excavator",
    "ZW180 Loader", "ZW220 Loader", "ZW310 Loader",
  ],
  Liebherr: [
    "R 920 Excavator", "R 945 Excavator", "R 956 Excavator",
    "L 526 Loader", "L 538 Loader", "L 550 Loader",
    "PR 716 Dozer", "PR 736 Dozer",
  ],
  JCB: [
    "3CX Backhoe", "4CX Backhoe", "ICX Backhoe",
    "270 Skid Steer", "300 Skid Steer", "TLT35 Telehandler",
    "525-60 Telehandler", "535-95 Telehandler",
  ],
  "New Holland": [
    "T6 Tractor", "T7 Tractor", "T8 Tractor", "T9 Tractor",
    "Workmaster Tractor", "Boomer Tractor",
    "L228 Skid Steer", "L234 Skid Steer", "C234 CTL",
    "E37 Mini Excavator", "E55 Mini Excavator",
  ],
  Hyundai:        ["HX220 Excavator", "HX300 Excavator", "HL955 Loader", "HL970 Loader"],
  Doosan:         ["DX225 Excavator", "DX300 Excavator", "DL250 Loader", "DL420 Loader"],
  "Massey Ferguson": ["1500 Series", "5700 Series", "6700 Series", "7700 Series", "8700 Series"],
  Kenworth:       ["T800 Dump", "T880 Dump", "C500 Off-Highway", "T800 Log Truck", "W900 Log Truck"],
  Mack:           ["Granite Dump", "Granite Log Truck", "TerraPro Dump", "Pinnacle Log Truck"],
  Peterbilt:      ["367 Dump", "388 Dump", "367 Log Truck", "389 Log Truck"],
  "Western Star": ["4700 Dump", "49X Dump", "49X Log Truck", "4900 Log Truck"],
};

// ── Generic filter helpers (case-insensitive substring) ──────────────────────
export function filterTruckMakesByQuery(query: string): readonly string[] {
  const q = query.trim().toLowerCase();
  if (!q) return TRUCK_MAKES;
  return TRUCK_MAKES.filter((m) => m.toLowerCase().includes(q));
}

export function filterTruckModelsByQuery(make: string, query: string): readonly string[] {
  const m = make.trim();
  if (!m) return [];
  const key = TRUCK_MAKES.find((mk) => mk.toLowerCase() === m.toLowerCase());
  if (!key) return [];
  const models = TRUCK_MODELS[key] ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter((mod) => mod.toLowerCase().includes(q));
}

export function filterHEMakesByQuery(query: string): readonly string[] {
  const q = query.trim().toLowerCase();
  if (!q) return HE_MAKES;
  return HE_MAKES.filter((m) => m.toLowerCase().includes(q));
}

export function filterHEModelsByQuery(make: string, query: string): readonly string[] {
  const m = make.trim();
  if (!m) return [];
  const key = HE_MAKES.find((mk) => mk.toLowerCase() === m.toLowerCase());
  if (!key) return [];
  const models = HE_MODELS[key] ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter((mod) => mod.toLowerCase().includes(q));
}
