/**
 * Customer-facing display label for a service.
 *
 * Internally we still key services by their canonical DB names ("Full Detail",
 * etc.) so booking history, slot reservation, and the constants in
 * SERVICE_DURATIONS / FOOTAGE_RATE keep working. The display layer below
 * remaps these to friendlier customer-facing labels.
 *
 * NOTE: If you're adding a new mapping here, double-check that the marketing
 * copy elsewhere (homepage cards, FAQ, comparison table) uses the friendly
 * name directly so it stays consistent. This helper is the safety net for
 * code paths that pass the raw DB name through.
 */

// July 2026 · 3-tier lineup. DB keeps the historical names (Interior Detail,
// Exterior Detail, Full Detail) so booking history, loyalty tables, and
// gift-card / coupon logic keep working. Customer-facing labels get the
// "Basic" prefix here so the tier ladder (Basic → Refresh → Reset) is
// obvious wherever a service name is rendered.
//
// "Full Detail" used to display as "Interior + Exterior" for marketing
// clarity. That's been rolled into "Basic Full Detail" — same idea, but
// now it sits alongside "The Refresh — Full" and "The Reset — Full" so
// the ladder is coherent.
const FRIENDLY_LABELS: Record<string, string> = {
  "Interior Detail":         "Basic Interior Detail",
  "Exterior Detail":         "Basic Exterior Detail",
  "Full Detail":             "Basic Full Detail",
  // Flagship interior tier — DB name stays "Ultimate Interior Reset" to
  // preserve booking history, loyalty, gift-card, and coupon references.
  "Ultimate Interior Reset": "The Reset — Interior",
};

export function getServiceDisplayName(serviceName: string | null | undefined, _opts: { includeFoundation?: boolean } = {}): string {
  if (!serviceName) return "Detailing Service";
  void _opts;
  return FRIENDLY_LABELS[serviceName] ?? serviceName;
}

/** Kept for back-compat with admin views — always false now that the
 *  Build Your Package builder is no longer the booking entry point. */
export function isCustomPackageService(_serviceName: string | null | undefined): boolean {
  void _serviceName;
  return false;
}
