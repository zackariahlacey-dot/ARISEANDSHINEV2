/**
 * Customer-facing display label for a service.
 *
 * After the rollback to the basic-services + Ultimate Series card flow,
 * customers book the service by name directly — no more "Custom Package"
 * wrapper. We still expose the helper + signature so call sites don't
 * have to change; it just returns the service name as-is.
 */
export function getServiceDisplayName(serviceName: string | null | undefined, _opts: { includeFoundation?: boolean } = {}): string {
  if (!serviceName) return "Detailing Service";
  void _opts;
  return serviceName;
}

/** Kept for back-compat with admin views — always false now that the
 *  Build Your Package builder is no longer the booking entry point. */
export function isCustomPackageService(_serviceName: string | null | undefined): boolean {
  void _serviceName;
  return false;
}
