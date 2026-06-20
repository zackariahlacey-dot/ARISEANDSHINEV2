/**
 * Package matcher — detect when a customer's Build Your Package selections
 * map cleanly onto one of our pre-defined service tiers. Used by the
 * BuildYourPackage component (and the homepage builder) to surface a
 * "matches: Ultimate Interior Reset" hint so customers don't accidentally
 * build something more expensive than the named package.
 *
 * Match shape:
 *   - foundation: which DB service (Interior / Exterior / Full Detail)
 *   - addonIds: array of selected add-on ids
 *
 * Returns the canonical service name (e.g. "Ultimate Interior Reset")
 * the build is closest to, OR null if it doesn't match a predefined tier.
 */

export type FoundationKey = "interior" | "exterior" | "full";

/** Add-ons that ARE included by default in each Ultimate package — used to
 *  detect when a custom build is functionally equivalent. */
const ULT_INTERIOR_INCLUDED = new Set([
  "upholstery_shampoo",  // Carpet & Upholstery Shampoo
  "salt_stain_removal",  // Standard Salt Stain Removal
  "odor_bomb",           // Strong Odor Elimination
  "leather_condition",   // Leather Conditioning
  "uv_interior",         // UV Protection
  "steam_sanitation",    // Steam Sanitation
  "clay_bar",            // Clay Bar (Interior Glass)
  "pet_hair",            // Heavy Pet Hair Removal
]);

const ULT_FULL_EXTRA = new Set([
  "clay_bar",            // Paint Decon
  "ceramic_3yr",         // 5-Year Gentech Body
  "wheel_ceramic",       // 5-Year Gentech Wheels
]);

export type PackageMatch = {
  /** Canonical DB service name. */
  serviceName: string;
  /** Human label for the badge / button. */
  displayName: string;
  /** "Exact" = identical add-on set. "Better" = customer is paying MORE
   *  than the named package would cost (i.e. they should switch and save).
   *  "Near" = within 1-2 add-ons of a match (informational only). */
  matchKind: "exact" | "better" | "near";
  /** Add-ons that are INCLUDED in the named package (subtract from cost). */
  includedAddonIds: string[];
};

/** Detects the best matching predefined package for a build. Returns null
 *  when the build is too custom to map cleanly. */
export function matchPackage(args: {
  foundation: FoundationKey;
  selectedAddonIds: string[];
}): PackageMatch | null {
  const selected = new Set(args.selectedAddonIds);

  // ── Ultimate Interior Reset detection ─────────────────────────────────
  // Triggers when foundation = interior OR full AND the customer has
  // selected at least 2 add-ons that overlap with the Ultimate Interior
  // included list. The more they've selected from that set, the stronger
  // the match.
  if (args.foundation === "interior" || args.foundation === "full") {
    const interiorOverlap = args.selectedAddonIds.filter(id => ULT_INTERIOR_INCLUDED.has(id));
    if (interiorOverlap.length >= 4) {
      return {
        serviceName: "Ultimate Interior Reset",
        displayName: "Ultimate Interior Reset",
        matchKind: "better",
        includedAddonIds: interiorOverlap,
      };
    }
    if (interiorOverlap.length >= 2) {
      return {
        serviceName: "Ultimate Interior Reset",
        displayName: "Ultimate Interior Reset",
        matchKind: "near",
        includedAddonIds: interiorOverlap,
      };
    }
  }

  // ── Ultimate Full Reset detection ─────────────────────────────────────
  // Foundation = full AND at least 2 from the exterior premium set
  // (ceramic / clay bar / wheels) — they're already in flagship territory.
  if (args.foundation === "full") {
    const allMatches = args.selectedAddonIds.filter(id =>
      ULT_INTERIOR_INCLUDED.has(id) || ULT_FULL_EXTRA.has(id),
    );
    const fullOverlap = args.selectedAddonIds.filter(id => ULT_FULL_EXTRA.has(id));
    if (fullOverlap.length >= 2 && allMatches.length >= 4) {
      return {
        serviceName: "Ultimate Interior + Exterior Reset",
        displayName: "Ultimate Full Reset",
        matchKind: "better",
        includedAddonIds: allMatches,
      };
    }
  }

  return null;
}

/** Convenience — list the friendly display names for a match's
 *  includedAddonIds, so the UI can render "Already includes: X, Y, Z". */
export function describeIncludedAddons(includedAddonIds: string[]): string[] {
  const labels: Record<string, string> = {
    upholstery_shampoo:  "Carpet & Upholstery Shampoo",
    salt_stain_removal:  "Salt Stain Removal",
    odor_bomb:           "Odor Elimination",
    leather_condition:   "Leather Conditioning",
    uv_interior:         "UV Protection",
    steam_sanitation:    "Steam Sanitation",
    clay_bar:            "Clay Bar",
    pet_hair:            "Pet Hair Removal",
    ceramic_3yr:         "5-Year Gentech (Body)",
    wheel_ceramic:       "5-Year Gentech (Wheels)",
  };
  return includedAddonIds.map(id => labels[id] ?? id);
}
