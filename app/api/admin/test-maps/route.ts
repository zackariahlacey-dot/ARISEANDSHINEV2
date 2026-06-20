import { NextResponse } from "next/server";

/**
 * Quick diagnostic: hits the Distance Matrix API server-side and returns the raw response.
 * Visit /api/admin/test-maps in browser to see if the API key works server-side.
 * DELETE this file once confirmed working.
 */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "No API key found in env" });

  const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinedetailing.com").replace(/\/$/, "");

  const params = new URLSearchParams({
    origins:      "209 Porterwood Dr, Williston, VT",
    destinations: "Burlington, VT",
    key,
    units:        "imperial",
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

  try {
    const res  = await fetch(url, { headers: { Referer: SITE } });
    const data = await res.json();
    return NextResponse.json({ keyPresent: true, keyPrefix: key.slice(0, 12) + "…", response: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
