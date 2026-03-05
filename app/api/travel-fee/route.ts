import { NextRequest, NextResponse } from "next/server";
import { getTravelFee } from "@/lib/travelFee";

/**
 * GET /api/travel-fee?address=...
 * Returns { distanceMiles, travelFee } or { error }.
 * Used by the booking modal to show travel fee when user selects a service address.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address?.trim()) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }
  const result = await getTravelFee(address.trim());
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not get distance" },
      { status: 400 }
    );
  }
  return NextResponse.json({
    distanceMiles: result.distanceMiles,
    travelFee: result.travelFee,
  });
}
