import { NextResponse } from "next/server";
import { getNextAvailableSlot } from "@/lib/nextAvailable";

export const dynamic = "force-dynamic";

const WMO: Record<number, { emoji: string; label: string }> = {
  0:  { emoji: "☀️",  label: "Clear"           },
  1:  { emoji: "🌤️", label: "Mostly Clear"     },
  2:  { emoji: "⛅",  label: "Partly Cloudy"   },
  3:  { emoji: "☁️",  label: "Overcast"        },
  45: { emoji: "🌫️", label: "Foggy"           },
  48: { emoji: "🌫️", label: "Icy Fog"         },
  51: { emoji: "🌦️", label: "Light Drizzle"   },
  53: { emoji: "🌦️", label: "Drizzle"         },
  55: { emoji: "🌧️", label: "Heavy Drizzle"   },
  61: { emoji: "🌧️", label: "Light Rain"      },
  63: { emoji: "🌧️", label: "Rain"            },
  65: { emoji: "🌧️", label: "Heavy Rain"      },
  71: { emoji: "🌨️", label: "Light Snow"      },
  73: { emoji: "🌨️", label: "Snow"            },
  75: { emoji: "❄️",  label: "Heavy Snow"      },
  77: { emoji: "🌨️", label: "Snow Grains"     },
  80: { emoji: "🌦️", label: "Showers"         },
  81: { emoji: "🌧️", label: "Heavy Showers"   },
  82: { emoji: "⛈️",  label: "Violent Showers" },
  85: { emoji: "🌨️", label: "Snow Showers"    },
  86: { emoji: "🌨️", label: "Heavy Snow Showers" },
  95: { emoji: "⛈️",  label: "Thunderstorm"   },
  96: { emoji: "⛈️",  label: "Thunderstorm + Hail" },
  99: { emoji: "⛈️",  label: "Severe Thunderstorm" },
};

async function getWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=44.4759&longitude=-73.2121" +
    "&current=temperature_2m,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min" +
    "&temperature_unit=fahrenheit&forecast_days=1&timezone=America/New_York";
  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;
  const d = await res.json();
  const cond = WMO[d.current.weather_code as number] ?? { emoji: "🌡️", label: "Mixed" };
  return {
    current: Math.round(d.current.temperature_2m as number),
    high:    Math.round((d.daily.temperature_2m_max as number[])[0]),
    low:     Math.round((d.daily.temperature_2m_min as number[])[0]),
    emoji:   cond.emoji,
    label:   cond.label,
  };
}

export async function GET() {
  const [weatherResult, slotResult] = await Promise.allSettled([
    getWeather(),
    getNextAvailableSlot(),
  ]);

  return NextResponse.json({
    weather:     weatherResult.status === "fulfilled" ? weatherResult.value : null,
    nextBooking: slotResult.status    === "fulfilled" ? slotResult.value    : null,
  });
}
