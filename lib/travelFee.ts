/**
 * Travel fee from actual driving distance (Google Distance Matrix API).
 *
 * Rules (June 2026):
 *   - Burlington, Williston, South Burlington → FREE regardless of distance
 *     (we're here anyway, no reason to ding hometown / next-door customers).
 *   - Everywhere else: $1/mile past 7.5 miles of driving distance from the
 *     209 Porterwood Dr (Williston) home base. Rounded up to nearest $1.
 *
 * On Distance Matrix API failure or unroutable address, returns a flat
 * fallback fee so booking can continue rather than blow up the flow.
 */

const ORIGIN = "209 Porterwood Dr, Williston, VT";
const DEFAULT_ORIGIN = ORIGIN;

const FREE_RADIUS = 7.5;
const RATE_PER_MILE = 1;
/** Flat fee (whole dollars) when Distance Matrix fails or address is unroutable */
const FALLBACK_TRAVEL_FEE = 25;

/** Towns where every customer gets a free travel fee. Match is loose — a
 *  destination string anywhere containing the city + VT counts. Designed to
 *  catch "123 Pine St, Burlington, VT 05401" and "123 Pine, Burlington" and
 *  "Burlington VT 05401" all in one. */
const FREE_TRAVEL_CITIES = ["burlington", "williston", "south burlington"];

/** Returns true when the destination address resolves to a no-travel-fee
 *  hometown match. Checks city + VT loosely, allowing flexible formatting. */
function isFreeCity(dest: string): boolean {
  const lower = dest.toLowerCase();
  // VT or Vermont must appear — guards against random "Burlington, NC" hits
  if (!lower.includes("vt") && !lower.includes("vermont")) return false;
  for (const city of FREE_TRAVEL_CITIES) {
    // Word-boundary-ish: require either start-of-string or comma/whitespace
    // before the city name so "south burlington" matches both itself AND
    // a "Burlington" check correctly (we test full FREE_TRAVEL_CITIES list).
    const re = new RegExp(`(^|[\\s,])${city}(\\b|[,\\s])`, "i");
    if (re.test(lower)) return true;
  }
  return false;
}

/** Exported helper for admin + tests so we can show "FREE — hometown" hints
 *  in UIs without re-implementing the match logic. */
export function isHometownAddress(address: string): boolean {
  return isFreeCity(address.trim());
}

export type TravelFeeResult = {
  distanceMiles: number;
  travelFee: number;
  ok: true;
} | {
  ok: false;
  error?: string;
};

function getOrigin(): string {
  const env = process.env.BUSINESS_ADDRESS ?? process.env.NEXT_PUBLIC_BUSINESS_ADDRESS;
  return (env && env.trim()) ? env.trim() : DEFAULT_ORIGIN;
}

/**
 * Get driving distance from home base to destination and compute travel fee.
 * First 10 miles free; only miles beyond 10 are charged at $0.50/mi, rounded up to nearest $1.
 * On API failure or unroutable address, returns a flat fallback fee so booking can continue.
 */
export async function getTravelFee(
  destinationAddress: string
): Promise<TravelFeeResult> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!key?.trim()) {
    return { ok: false, error: "Maps API not configured" };
  }

  const dest = destinationAddress.trim();
  if (!dest) {
    return { ok: false, error: "Address required" };
  }

  // Hometown override — Burlington / Williston / South Burlington always
  // get a $0 travel fee regardless of actual distance.
  if (isFreeCity(dest)) {
    return { ok: true, distanceMiles: 0, travelFee: 0 };
  }

  const origin = getOrigin();
  const params = new URLSearchParams({
    origins: origin,
    destinations: dest,
    key: key.trim(),
    units: "imperial",
  });

  const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinedetailing.com").replace(/\/$/, "");

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    // Include Referer so API keys with HTTP referrer restrictions work when called server-side
    const res = await fetch(url, { headers: { Referer: SITE } });
    const data = await res.json();

    if (data.status !== "OK") {
      console.warn("[getTravelFee] API status:", data.status, data.error_message);
      return {
        ok: true,
        distanceMiles: 0,
        travelFee: FALLBACK_TRAVEL_FEE,
      };
    }

    const row = data.rows?.[0];
    const element = row?.elements?.[0];
    if (!element || element.status !== "OK") {
      console.warn("[getTravelFee] No route:", element?.status);
      return {
        ok: true,
        distanceMiles: 0,
        travelFee: FALLBACK_TRAVEL_FEE,
      };
    }

    const distanceMeters = element.distance?.value ?? 0;
    const distanceInMiles = distanceMeters / 1609.34;

    let travelFee = 0;
    if (distanceInMiles > FREE_RADIUS) {
      const billableMiles = distanceInMiles - FREE_RADIUS;
      const exactFee = billableMiles * RATE_PER_MILE;
      travelFee = Math.ceil(exactFee);
    }

    return {
      ok: true,
      distanceMiles: Math.round(distanceInMiles * 100) / 100,
      travelFee,
    };
  } catch (err) {
    console.error("[getTravelFee]", err);
    return {
      ok: true,
      distanceMiles: 0,
      travelFee: FALLBACK_TRAVEL_FEE,
    };
  }
}
