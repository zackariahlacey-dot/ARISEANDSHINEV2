"use server";

import type { ForecastDay } from "@/lib/weatherCodes";
export type { ForecastDay } from "@/lib/weatherCodes";

/**
 * 7-day weather forecast for Burlington, VT — powered by Open-Meteo.
 * Free public API, no key required, quick response, cached for 1 hour so
 * we're not hammering it on every dashboard render.
 *
 * Used to help the customer pick a detail day. Rainy day? Consider interior.
 * Sunny? Perfect for full exterior + ceramic.
 */

// Burlington, VT (business base)
const LAT = 44.4759;
const LON = -73.2121;

// Simple mem cache (1 hour). Serverless funcs cold-start often, so this is
// a soft optimisation — the API also caches at their end.
type CacheEntry = { at: number; data: ForecastDay[] };
const cache = new Map<string, CacheEntry>();
const ONE_HOUR = 60 * 60 * 1000;

export async function getWeatherForecast(): Promise<ForecastDay[]> {
  const cacheKey = "burlington-vt";
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.at) < ONE_HOUR) return cached.data;

  try {
    // Fetch 10 days so we always have at least 5 weekdays even when today
    // is a Friday (Fri + next Mon-Fri = 6 weekdays out of 10 total days).
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=10`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const raw = await res.json();
    const daily = raw?.daily;
    if (!daily?.time?.length) return [];

    const days: ForecastDay[] = (daily.time as string[]).map((date, i) => ({
      date,
      weatherCode:   Number(daily.weather_code?.[i] ?? 0),
      tempHighF:     Math.round(Number(daily.temperature_2m_max?.[i] ?? 0)),
      tempLowF:      Math.round(Number(daily.temperature_2m_min?.[i] ?? 0)),
      precipChance:  Math.round(Number(daily.precipitation_probability_max?.[i] ?? 0)),
      precipInches:  Number(daily.precipitation_sum?.[i] ?? 0),
      windMph:       Math.round(Number(daily.wind_speed_10m_max?.[i] ?? 0)),
      sunrise:       formatTime(daily.sunrise?.[i] ?? ""),
      sunset:        formatTime(daily.sunset?.[i] ?? ""),
    }));

    cache.set(cacheKey, { at: now, data: days });
    return days;
  } catch (err) {
    console.error("[weather] fetch failed:", err);
    return [];
  }
}

function formatTime(isoLike: string): string {
  // Open-Meteo returns "2026-07-05T05:47" in the requested tz (America/New_York).
  const match = isoLike.match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
