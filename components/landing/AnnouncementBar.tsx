"use client";

import { useEffect, useState } from "react";

type AnnouncementData = {
  weather: {
    current: number;
    high: number;
    low: number;
    emoji: string;
    label: string;
  } | null;
  nextBooking: {
    dateStr: string;
    timeStr: string;
  } | null;
};

type Segment = { id: string; node: React.ReactNode };

function Divider() {
  return (
    <span className="shrink-0 mx-5 w-px h-3 rounded-full bg-[#D4AF37]/20 inline-block" />
  );
}

function buildSegments(data: AnnouncementData | null): Segment[] {
  const segs: Segment[] = [];

  if (data?.weather) {
    const w = data.weather;
    segs.push({
      id: "weather",
      node: (
        <span className="inline-flex items-center gap-2">
          <span className="text-base leading-none">{w.emoji}</span>
          <span className="text-zinc-500 font-medium tracking-wide">Burlington</span>
          <span className="font-bold text-white">{w.current}°F</span>
          <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">
            H:{w.high}° L:{w.low}°
          </span>
          <span className="text-zinc-600">{w.label}</span>
        </span>
      ),
    });
  }

  if (data?.nextBooking) {
    const b = data.nextBooking;
    segs.push({
      id: "booking",
      node: (
        <span className="inline-flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#D4AF37]/70 bg-[#D4AF37]/10 px-1.5 py-0.5 rounded-md border border-[#D4AF37]/15">
            Next Opening
          </span>
          <span className="font-bold text-white">{b.dateStr}</span>
          {b.timeStr && (
            <span className="text-zinc-400">@ {b.timeStr}</span>
          )}
        </span>
      ),
    });
  }

  segs.push({
    id: "brand",
    node: (
      <span className="inline-flex items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Arise &amp; Shine VT
        </span>
        <span className="w-px h-2.5 bg-zinc-700 rounded-full" />
        <span className="text-zinc-500 font-medium">Vermont&apos;s Premier Mobile Detailing</span>
      </span>
    ),
  });

  return segs;
}

// Interleave segments with dividers, then repeat 3× for seamless loop
function buildTicker(segs: Segment[]): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  segs.forEach(({ id, node }, i) => {
    items.push(
      <span key={`${id}-node`} className="inline-flex items-center shrink-0 whitespace-nowrap">
        {node}
      </span>
    );
    items.push(<Divider key={`${id}-div-${i}`} />);
  });
  return items;
}

export function AnnouncementBar() {
  const [data, setData] = useState<AnnouncementData | null>(null);

  useEffect(() => {
    fetch("/api/announcement")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const segments = buildSegments(data);
  const tickerItems = buildTicker(segments);
  // Repeat 3× for seamless -33.33% loop
  const repeated = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div
      className="fixed top-0 inset-x-0 z-[51] h-8 overflow-hidden flex items-center"
      style={{
        background: "linear-gradient(90deg, #09090b 0%, #0c0c0a 50%, #09090b 100%)",
        borderBottom: "1px solid rgba(212,175,55,0.12)",
        boxShadow: "0 1px 0 rgba(212,175,55,0.04)",
      }}
    >
      {/* Left edge fade */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #09090b, transparent)" }}
      />
      {/* Right edge fade */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #09090b, transparent)" }}
      />

      <div
        className="announcement-ticker inline-flex items-center text-[11px]"
        style={{ paddingLeft: "4rem" }}
      >
        {repeated.map((node, i) => (
          <span key={i} className="inline-flex items-center shrink-0">
            {node}
          </span>
        ))}
      </div>
    </div>
  );
}
