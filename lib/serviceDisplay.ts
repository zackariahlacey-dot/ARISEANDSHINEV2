/**
 * Customer-facing display label for a service.
 *
 * Interior Detail, Exterior Detail, and Full Detail are all booked through
 * the Build Your Package flow now — they should display as "Custom Package"
 * everywhere a customer or admin sees the booking. The DB stays as the
 * underlying service name (for loyalty + reporting), only the label flips.
 *
 * Pass `includeFoundation: false` for short labels (e.g. emails subjects);
 * default includes the foundation in parens for clarity.
 */
export function getServiceDisplayName(serviceName: string | null | undefined, opts: { includeFoundation?: boolean } = {}): string {
  if (!serviceName) return "Detailing Service";
  const { includeFoundation = true } = opts;
  const map: Record<string, string> = {
    "Interior Detail": "Custom Package (Interior)",
    "Exterior Detail": "Custom Package (Exterior)",
    "Full Detail": "Custom Package (Full)",
  };
  const display = map[serviceName];
  if (!display) return serviceName;
  return includeFoundation ? display : "Custom Package";
}

/** True when the booking originated from the Build Your Package builder. */
export function isCustomPackageService(serviceName: string | null | undefined): boolean {
  if (!serviceName) return false;
  return serviceName === "Interior Detail" || serviceName === "Exterior Detail" || serviceName === "Full Detail";
}
