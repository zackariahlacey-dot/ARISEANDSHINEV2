import { Cloud, Droplets, Wind, Sunrise, Sunset } from "lucide-react";
import { mapWeatherCode, type ForecastDay } from "@/lib/weatherCodes";

/**
 * 7-day Burlington VT weather forecast. Renders as a horizontally scrollable
 * card row on mobile / grid on desktop. Each day includes a "detail day"
 * score badge — the sunnier and drier, the better for exterior work.
 */
export function WeatherForecast({ days }: { days: ForecastDay[] }) {
  // Filter out weekends — only Mon–Fri, and cap at 5 workdays.
  // dayFromDate() derives the weekday from the YYYY-MM-DD string in the
  // America/New_York tz the API returned, so we're not off-by-one against
  // the server's TZ.
  const workDays = days.filter(d => {
    const wd = weekdayFromDate(d.date);
    return wd !== 0 && wd !== 6; // 0 = Sunday, 6 = Saturday
  }).slice(0, 5);

  if (workDays.length === 0) return null;

  // Best workday for exterior detailing
  const bestDay = workDays.reduce((best, d) => {
    const bestScore = mapWeatherCode(best.weatherCode).detailScore - (best.precipChance / 10);
    const dScore = mapWeatherCode(d.weatherCode).detailScore - (d.precipChance / 10);
    return dScore > bestScore ? d : best;
  }, workDays[0]);
  const bestDayLabel = formatDayLabel(bestDay.date, true);
  const bestWeather = mapWeatherCode(bestDay.weatherCode);
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  return (
    <section className="mb-6">
      <div className="relative rounded-3xl border border-sky-400/25 overflow-hidden shadow-[0_0_40px_rgba(56,189,248,0.10)]"
        style={{ background: "linear-gradient(170deg, #0f1a24 0%, #0a0f16 100%)" }}
      >
        {/* Ambient sky gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: "radial-gradient(ellipse 100% 45% at 50% 0%, rgba(56,189,248,0.14) 0%, transparent 65%)" }}
        />
        {/* Top accent stripe */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />

        {/* Header */}
        <div className="relative px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/[0.10] border border-sky-500/25 mb-2">
              <Cloud size={9} className="text-sky-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Burlington VT · 7-Day</span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight leading-tight">Detail-Day Forecast</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">Mon–Fri only · Pick the day with the ☀️.</p>
          </div>

          {/* Best day highlight */}
          <div className="shrink-0 text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-sky-400/70">Best day</div>
            <div className="text-sm font-black text-white leading-tight mt-0.5">{bestDayLabel}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{bestWeather.emoji} {bestWeather.label}</div>
          </div>
        </div>

        {/* Day cards — 5-col grid Mon-Fri */}
        <div className="relative px-3 pb-4">
          <div className="flex overflow-x-auto gap-2 snap-x snap-mandatory pb-1 -mx-0 scrollbar-thin sm:grid sm:grid-cols-5 sm:overflow-visible sm:gap-1.5">
            {workDays.map((d) => {
              const isBest = d.date === bestDay.date;
              const isToday = d.date === todayStr;
              const w = mapWeatherCode(d.weatherCode);
              return (
                <div
                  key={d.date}
                  className={`shrink-0 snap-center w-[68px] sm:w-auto rounded-2xl border overflow-hidden transition-all ${
                    isBest
                      ? "border-emerald-400/60 bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.03] shadow-[0_0_16px_rgba(52,211,153,0.20)]"
                      : "border-white/[0.06] bg-zinc-950/40 hover:border-white/[0.14]"
                  }`}
                >
                  {isBest && (
                    <div className="text-[7px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/15 text-center py-0.5 border-b border-emerald-500/30">
                      Best
                    </div>
                  )}
                  <div className="px-2 py-2 text-center">
                    <div className={`text-[9px] font-black uppercase tracking-widest leading-tight ${
                      isToday ? "text-sky-300" : "text-zinc-500"
                    }`}>
                      {isToday ? "Today" : formatDayLabel(d.date, false)}
                    </div>
                    <div className="text-[9px] text-zinc-600 leading-tight">
                      {formatShortDate(d.date)}
                    </div>
                    <div className="text-2xl leading-none mt-1.5 mb-1">{w.emoji}</div>
                    <div className="text-[13px] font-black text-white tabular-nums leading-none">
                      {d.tempHighF}°
                    </div>
                    <div className="text-[9px] text-zinc-500 tabular-nums leading-none mt-0.5">
                      lo {d.tempLowF}°
                    </div>
                    {d.precipChance > 20 && (
                      <div className="inline-flex items-center gap-0.5 mt-1.5 px-1 py-0.5 rounded bg-blue-500/[0.10] border border-blue-500/25">
                        <Droplets size={7} className="text-blue-400" />
                        <span className="text-[8px] font-black text-blue-300 tabular-nums">{d.precipChance}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best-day stat strip */}
        <div className="relative border-t border-white/[0.05] px-4 py-2.5 flex items-center justify-between gap-3 text-[10px]">
          <div className="flex items-center gap-1 text-zinc-500">
            <Sunrise size={10} className="text-amber-400/80" />
            <span className="font-bold">Rise {bestDay.sunrise}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-500">
            <Sunset size={10} className="text-orange-400/80" />
            <span className="font-bold">Set {bestDay.sunset}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-500">
            <Wind size={10} className="text-zinc-400" />
            <span className="font-bold tabular-nums">{bestDay.windMph} mph</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDayLabel(dateStr: string, longForm: boolean): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: longForm ? "long" : "short" });
  } catch { return dateStr; }
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  } catch { return ""; }
}

/** 0 = Sunday ... 6 = Saturday. Uses noon UTC to sidestep DST edge-cases. */
function weekdayFromDate(dateStr: string): number {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.getDay();
  } catch { return -1; }
}
