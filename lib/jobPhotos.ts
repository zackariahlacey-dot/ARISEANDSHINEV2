/**
 * Photo requirements per service type.
 *
 * Each entry maps a service-name match to the list of photo "areas" the
 * contractor must capture both before AND after the work. The "Complete"
 * button is gated until every required (before_<area>, after_<area>) pair
 * has been uploaded.
 *
 * The pre_existing_damage walk-around photo is required for every service
 * (single photo set, captured at the start of the job before work begins).
 */

export type PhotoArea =
  | "driver_seat"
  | "passenger_seat"
  | "rear_seats"
  | "trunk"
  | "front"
  | "rear"
  | "driver_side"
  | "passenger_side";

export type PhotoSlot =
  | "pre_existing_damage"
  | `before_${PhotoArea}`
  | `after_${PhotoArea}`;

export type PhotoRequirement = {
  area: PhotoArea;
  label: string;        // for the UI tile
  hint: string;         // short instructional copy
};

const INTERIOR_AREAS: PhotoRequirement[] = [
  { area: "driver_seat",    label: "Driver seat",    hint: "Whole seat + footwell" },
  { area: "passenger_seat", label: "Passenger seat", hint: "Whole seat + footwell" },
  { area: "rear_seats",     label: "Rear seats",     hint: "Full bench / 2nd row" },
  { area: "trunk",          label: "Trunk",          hint: "Cargo area + sides" },
];

const EXTERIOR_AREAS: PhotoRequirement[] = [
  { area: "front",          label: "Front",          hint: "Bumper + grille + hood" },
  { area: "rear",           label: "Rear",           hint: "Bumper + trunk + lights" },
  { area: "driver_side",    label: "Driver side",    hint: "Full length, side view" },
  { area: "passenger_side", label: "Passenger side", hint: "Full length, side view" },
];

/** Required areas (before + after each) for a given service. */
export function requiredAreasFor(serviceName: string | null | undefined): PhotoRequirement[] {
  const n = (serviceName ?? "").toLowerCase();
  if (n.includes("full"))     return [...INTERIOR_AREAS, ...EXTERIOR_AREAS];
  if (n.includes("exterior")) return EXTERIOR_AREAS;
  if (n.includes("interior")) return INTERIOR_AREAS;
  // Ultimate / paint correction / boat / RV → treat as Full coverage
  if (n.includes("ultimate") || n.includes("paint")) return [...INTERIOR_AREAS, ...EXTERIOR_AREAS];
  return [];
}

export function expectedSlotsFor(serviceName: string | null | undefined): PhotoSlot[] {
  const areas = requiredAreasFor(serviceName);
  const slots: PhotoSlot[] = ["pre_existing_damage"];
  for (const a of areas) {
    slots.push(`before_${a.area}` as PhotoSlot);
    slots.push(`after_${a.area}` as PhotoSlot);
  }
  return slots;
}

export type PhotoChecklist = {
  serviceName: string;
  preExistingDamageRequired: boolean;
  areas: PhotoRequirement[];
  totalRequired: number;       // pre + (before + after) × areas
};

export function buildPhotoChecklist(serviceName: string | null | undefined): PhotoChecklist {
  const areas = requiredAreasFor(serviceName);
  return {
    serviceName: serviceName ?? "",
    preExistingDamageRequired: true,
    areas,
    totalRequired: 1 + areas.length * 2,
  };
}

/** Friendly label for a slot (used in admin photo review). */
export function slotLabel(slot: string): string {
  if (slot === "pre_existing_damage") return "Pre-existing damage";
  const m = /^(before|after)_(.+)$/.exec(slot);
  if (!m) return slot;
  const stage = m[1] === "before" ? "Before" : "After";
  const areaKey = m[2] as PhotoArea;
  const area = [...INTERIOR_AREAS, ...EXTERIOR_AREAS].find(a => a.area === areaKey);
  return `${stage} · ${area?.label ?? areaKey}`;
}
