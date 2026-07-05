/**
 * Package matcher — detect when a customer's Build Your Package selections
 * map cleanly onto Ultimate Interior Reset. Nudges them to switch and save.
 *
 * July 2026 lineup: only one Ultimate SKU exists (Ultimate Interior Reset).
 * The old combo "Ultimate Interior + Exterior Reset" is replaced by the
 * Ultimate + Exterior toggle add-on, so the matcher no longer needs to
 * detect a "full reset" case.
 */

export type FoundationKey = "interior" | "exterior" | "full";

/** Add-ons functionally included in Ultimate Interior Reset. */
const ULT_INTERIOR_INCLUDED = new Set([
  "upholstery_shampoo",  // seat + carpet shampoo is core to Ultimate
  "leather_condition",   // included if leather present
  "pet_hair",            // heavy vacuum covers pet hair
]);

export type PackageMatch = {
  serviceName: string;
  displayName: string;
  matchKind: "exact" | "better" | "near";
  includedAddonIds: string[];
};

export function matchPackage(args: {
  foundation: FoundationKey;
  selectedAddonIds: string[];
}): PackageMatch | null {
  if (args.foundation !== "interior" && args.foundation !== "full") return null;

  const interiorOverlap = args.selectedAddonIds.filter(id => ULT_INTERIOR_INCLUDED.has(id));

  // All 3 included add-ons picked → they're paying MORE than Ultimate.
  if (interiorOverlap.length >= 3) {
    return {
      serviceName: "Ultimate Interior Reset",
      displayName: "Ultimate Interior Reset",
      matchKind: "better",
      includedAddonIds: interiorOverlap,
    };
  }

  // 2 of 3 → near match, informational nudge.
  if (interiorOverlap.length >= 2) {
    return {
      serviceName: "Ultimate Interior Reset",
      displayName: "Ultimate Interior Reset",
      matchKind: "near",
      includedAddonIds: interiorOverlap,
    };
  }

  return null;
}

export function describeIncludedAddons(includedAddonIds: string[]): string[] {
  const labels: Record<string, string> = {
    upholstery_shampoo: "Carpet & Upholstery Shampoo",
    leather_condition:  "Leather Conditioning",
    pet_hair:           "Pet Hair Removal",
  };
  return includedAddonIds.map(id => labels[id] ?? id);
}
