/**
 * Travel fee from actual driving distance (Google Distance Matrix API).
 * First 10 miles free from home base; then $0.50 per mile beyond that, rounded up to nearest $1.
 * Fallback: flat fee if API fails so booking does not break.
 */

const ORIGIN = "209 Porterwood Dr, Williston, VT";
const DEFAULT_ORIGIN = ORIGIN;

const FREE_RADIUS = 10;
const RATE_PER_MILE = 0.5;
/** Flat fee (whole dollars) when Distance Matrix fails or address is unroutable */
const FALLBACK_TRAVEL_FEE = 25;

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

  const origin = getOrigin();
  const params = new URLSearchParams({
    origins: origin,
    destinations: dest,
    key: key.trim(),
    units: "imperial",
  });

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const res = await fetch(url);
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
