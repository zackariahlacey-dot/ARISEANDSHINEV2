import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailableSlots, timeToMins } from "@/lib/availability";
import { ymdInBusinessTz, todayInBusinessTz } from "@/lib/dates";

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

async function getNextAvailableSlot() {
  const supabase = createAdminClient();
  const today    = new Date();
  // Business-local date string — UTC would shift to tomorrow after ~7 PM ET
  // and silently skip today's blocked-date entry.
  const todayStr = todayInBusinessTz();
  const endDate  = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  const endDateStr = ymdInBusinessTz(endDate);

  // Fetch all needed data in parallel — one round-trip
  const [opRes, blockedRes, bookingsRes] = await Promise.all([
    supabase.from("operating_hours").select("day_of_week, start_time, end_time, is_open, month"),
    supabase.from("blocked_dates").select("blocked_date").gte("blocked_date", todayStr).lte("blocked_date", endDateStr),
    supabase.from("bookings")
      .select("booking_date, booking_time, service_name, vehicle_size, status, duration_override")
      .gte("booking_date", todayStr)
      .lte("booking_date", endDateStr)
      .neq("status", "cancelled"),
  ]);

  const allOpHours  = opRes.data ?? [];
  const blockedSet  = new Set((blockedRes.data ?? []).map((b: any) => b.blocked_date as string));

  // Group bookings by date
  const byDate = new Map<string, any[]>();
  for (const b of (bookingsRes.data ?? [])) {
    const arr = byDate.get(b.booking_date) ?? [];
    arr.push(b);
    byDate.set(b.booking_date, arr);
  }

  // 1-hour buffer from now so we don't show a slot that's already started
  const nowMins = today.getHours() * 60 + today.getMinutes() + 60;

  for (let offset = 0; offset < 30; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    // Day-of-week + month also need to be in business time (the Date getters
    // return server-local values — on Vercel that's UTC).
    const dateStr = ymdInBusinessTz(d);
    const [yyyy, mm, dd] = dateStr.split("-").map(n => parseInt(n, 10));
    // Build a noon-local Date so getDay/getMonth match the business calendar.
    const localNoon = new Date(`${dateStr}T12:00:00`);
    const dow       = localNoon.getDay();
    const month     = mm;

    if (blockedSet.has(dateStr)) continue;
    void yyyy; void dd;

    const opHours =
      allOpHours.find((h: any) => h.day_of_week === dow && h.month === month) ??
      allOpHours.find((h: any) => h.day_of_week === dow && h.month == null) ??
      null;

    if (!opHours || !opHours.is_open) continue;

    const dayStart      = opHours.start_time ? timeToMins(opHours.start_time) : 7 * 60;
    const dayEnd        = opHours.end_time   ? timeToMins(opHours.end_time)   : 19 * 60;
    const effectiveStart = offset === 0 ? Math.max(dayStart, nowMins) : dayStart;

    const existing = (byDate.get(dateStr) ?? []).map((b: any) => ({
      ...b,
      total_duration_mins: b.duration_override ?? undefined,
    }));

    // Use a 2-hour exterior detail as the standard check — short enough to find real gaps
    const slots = getAvailableSlots(existing, "Exterior Detail", "sedan", effectiveStart, dayEnd);
    if (slots.length === 0) continue;

    const dateLabel =
      offset === 0 ? "Today" :
      offset === 1 ? "Tomorrow" :
      d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const [h, m] = slots[0].split(":");
    const hour   = parseInt(h, 10);
    const timeLabel = `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;

    return { dateStr: dateLabel, timeStr: timeLabel };
  }

  return null;
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
