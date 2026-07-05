/**
 * Weather forecast types + WMO code helper. Lives outside the "use server"
 * file so it can be imported into client components — server-action files
 * can only export async functions.
 */

export type ForecastDay = {
  date: string;                // YYYY-MM-DD
  weatherCode: number;         // WMO code
  tempHighF: number;
  tempLowF: number;
  precipChance: number;        // 0–100
  precipInches: number;
  windMph: number;
  sunrise: string;             // e.g. "6:12 AM"
  sunset:  string;             // e.g. "8:34 PM"
};

/**
 * WMO weather code → simplified label + emoji + "detail day" score.
 * Higher score = better for exterior detailing.
 * Reference: https://open-meteo.com/en/docs
 */
export function mapWeatherCode(code: number): { label: string; emoji: string; detailScore: number } {
  if (code === 0)                              return { label: "Clear",         emoji: "☀️", detailScore: 10 };
  if (code === 1)                              return { label: "Mostly Sunny",  emoji: "🌤️", detailScore: 9 };
  if (code === 2)                              return { label: "Partly Cloudy", emoji: "⛅",  detailScore: 8 };
  if (code === 3)                              return { label: "Overcast",      emoji: "☁️", detailScore: 6 };
  if (code === 45 || code === 48)              return { label: "Foggy",         emoji: "🌫️", detailScore: 5 };
  if (code >= 51 && code <= 55)                return { label: "Drizzle",       emoji: "🌦️", detailScore: 3 };
  if (code >= 56 && code <= 57)                return { label: "Freezing Rain", emoji: "🌧️", detailScore: 1 };
  if (code >= 61 && code <= 65)                return { label: "Rainy",         emoji: "🌧️", detailScore: 2 };
  if (code >= 66 && code <= 67)                return { label: "Icy Rain",      emoji: "🌨️", detailScore: 1 };
  if (code >= 71 && code <= 75)                return { label: "Snow",          emoji: "❄️",  detailScore: 1 };
  if (code === 77)                             return { label: "Snow Grains",   emoji: "🌨️", detailScore: 2 };
  if (code >= 80 && code <= 82)                return { label: "Showers",       emoji: "🌦️", detailScore: 3 };
  if (code >= 85 && code <= 86)                return { label: "Snow Showers",  emoji: "🌨️", detailScore: 1 };
  if (code >= 95)                              return { label: "Storms",        emoji: "⛈️", detailScore: 1 };
  return { label: "Unknown", emoji: "•", detailScore: 5 };
}
