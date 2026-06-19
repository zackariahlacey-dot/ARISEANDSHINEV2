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

const FRIENDLY_LABELS: Record<string, string> = {
  "Full Detail": "Basic Interior + Exterior",
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
