"use client";

import { useQuery } from "@tanstack/react-query";

// Burlington VT — close enough for a temp badge across the service area.
// If you ever want per-address temps, we can geocode service_address and
// thread lat/lng into this hook.
const LAT = 44.4759;
const LON = -73.2121;

type WeatherResp = {
  current: {
    temperature_2m: number;
    weather_code: number;
    apparent_temperature: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max?: number[];
  };
};

export type DayForecast = {
  date: string;
  high: number;
  low: number;
  emoji: string;
  code: number;
  precipProb: number;
};

const WEATHER_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌦",
  61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "❄️",
  77: "🌨",
  80: "🌦", 81: "🌧", 82: "🌧",
  85: "🌨", 86: "🌨",
  95: "⛈", 96: "⛈", 99: "⛈",
};

export function useWeather() {
  return useQuery({
    queryKey: ["weather", LAT, LON],
    queryFn: async () => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&current=temperature_2m,weather_code,apparent_temperature,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/New_York&forecast_days=7`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("weather failed");
      const data: WeatherResp = await r.json();
      const code = data.current.weather_code;
      const daily: DayForecast[] = (data.daily?.time ?? []).map((date, i) => ({
        date,
        high:       Math.round(data.daily!.temperature_2m_max[i]),
        low:        Math.round(data.daily!.temperature_2m_min[i]),
        emoji:      WEATHER_EMOJI[data.daily!.weather_code[i]] ?? "🌡",
        code:       data.daily!.weather_code[i],
        precipProb: Math.round(data.daily!.precipitation_probability_max?.[i] ?? 0),
      }));
      return {
        temp:    Math.round(data.current.temperature_2m),
        feels:   Math.round(data.current.apparent_temperature),
        wind:    Math.round(data.current.wind_speed_10m),
        emoji:   WEATHER_EMOJI[code] ?? "🌡",
        code,
        daily,
      };
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}

/** Look up the daily forecast row for a specific YYYY-MM-DD date. */
export function forecastForDate(daily: DayForecast[] | undefined, dateStr: string): DayForecast | null {
  if (!daily?.length) return null;
  return daily.find(d => d.date === dateStr) ?? null;
}
