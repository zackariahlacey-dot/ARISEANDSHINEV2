"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Crown, ChevronDown, Sparkles } from "lucide-react";

type ColId = "interior" | "full" | "ultInt" | "ultFull";

const COLUMNS: { id: ColId; name: string; subtitle: string; priceFrom: number; priceTo: number; premium?: boolean; flagship?: boolean; bookHref: string }[] = [
  { id: "interior", name: "Interior Detail",                     subtitle: "Just the inside",      priceFrom: 150, priceTo: 185, bookHref: "/detailing" },
  { id: "full",     name: "Basic Interior + Exterior",           subtitle: "Inside + outside",     priceFrom: 240, priceTo: 280, bookHref: "/detailing" },
  { id: "ultInt",   name: "Ultimate Interior",                   subtitle: "Deep premium interior",priceFrom: 240, priceTo: 270, premium: true, bookHref: "/?book=ultimate" },
  { id: "ultFull",  name: "Ultimate Full Reset",                 subtitle: "The whole package",    priceFrom: 350, priceTo: 400, premium: true, flagship: true, bookHref: "/?book=ultimate" },
];

type Cell = boolean | "partial" | "premium";

type Row = {
  category: string;
  feature: string;
  desc?: string;
  cells: Record<ColId, Cell>;
};

const ROWS: Row[] = [
  // Exterior
  { category: "Exterior", feature: "Hand wash & dry",            cells: { interior: false, full: true,    ultInt: false, ultFull: true } },
  { category: "Exterior", feature: "Wheels, tires & jambs",      cells: { interior: false, full: true,    ultInt: false, ultFull: true } },
  { category: "Exterior", feature: "3-month ceramic spray",      cells: { interior: false, full: true,    ultInt: false, ultFull: false } },
  { category: "Exterior", feature: "6-month ceramic spray",      cells: { interior: false, full: false,   ultInt: false, ultFull: "premium" } },
  { category: "Exterior", feature: "Clay bar decontamination",   cells: { interior: false, full: false,   ultInt: false, ultFull: "premium" } },
  { category: "Exterior", feature: "Plastic trim restoration",   cells: { interior: false, full: false,   ultInt: false, ultFull: "premium" } },

  // Interior
  { category: "Interior", feature: "Full vacuum (carpets, mats, seats)", cells: { interior: true, full: true, ultInt: true, ultFull: true } },
  { category: "Interior", feature: "Wipe all surfaces & glass",  cells: { interior: true, full: true, ultInt: true, ultFull: true } },
  { category: "Interior", feature: "Hot water carpet & seat extraction", cells: { interior: false, full: false, ultInt: "premium", ultFull: "premium" } },
  { category: "Interior", feature: "UV protection on plastics",  cells: { interior: false, full: false, ultInt: "premium", ultFull: "premium" } },
  { category: "Interior", feature: "Leather conditioning",       cells: { interior: false, full: false, ultInt: "premium", ultFull: "premium" } },
  { category: "Interior", feature: "Dog hair & heavy dirt",      cells: { interior: false, full: false, ultInt: "premium", ultFull: "premium" } },
  { category: "Interior", feature: "Strong odor neutralization", cells: { interior: false, full: false, ultInt: "premium", ultFull: "premium" } },
  { category: "Interior", feature: "Standard salt stain removal",cells: { interior: false, full: false, ultInt: "premium", ultFull: "premium" } },

  // Time / Booking
  { category: "Booking",  feature: "On-site duration",           desc: "How long we're at your location", cells: { interior: "partial", full: "partial", ultInt: "partial", ultFull: "partial" } },
];

const DURATION_LABEL: Record<ColId, string> = {
  interior: "1.5–2 hrs",
  full:     "2–2.5 hrs",
  ultInt:   "2.5–3.5 hrs",
  ultFull:  "3.5–4.5 hrs",
};

export function ServiceComparisonTable() {
  const [showAll, setShowAll] = useState(false);
  // Collapse to a "key differences" view by default so the section doesn't
  // dominate the homepage. Show all 15 rows on "See full comparison".
  const keyRows = ROWS.filter(r => r.category === "Booking" || ["6-month ceramic spray", "Clay bar decontamination", "Hot water carpet & seat extraction", "UV protection on plastics", "Leather conditioning", "Strong odor neutralization", "Standard salt stain removal", "Hand wash & dry"].includes(r.feature));
  const displayRows = showAll ? ROWS : keyRows;
  const categories = Array.from(new Set(displayRows.map(r => r.category)));

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55 }}
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Which One Do I Need?</p>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">Compare Service Tiers</h2>
          <p className="text-zinc-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
            See exactly what&apos;s included at each tier. Upgrade anytime — and the Ultimate Series automatically bundles features that would cost more à la carte.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block rounded-2xl border border-white/[0.07] bg-zinc-900/30 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: "minmax(220px,1.4fr) repeat(4, 1fr)" }}>
            {/* Column headers */}
            <div className="px-4 py-4 border-b border-white/[0.06] bg-zinc-950/40" />
            {COLUMNS.map(col => (
              <ColumnHeader key={col.id} col={col} />
            ))}

            {/* Rows */}
            {categories.map(cat => (
              <CategoryGroup key={cat} cat={cat} rows={displayRows.filter(r => r.category === cat)} />
            ))}

            {/* Price row */}
            <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-t border-white/[0.06] bg-zinc-950/40">
              Starting Price
            </div>
            {COLUMNS.map(col => (
              <div key={col.id} className={`px-3 py-3 text-center border-t border-white/[0.06] ${col.flagship ? "bg-[#D4AF37]/[0.05]" : col.premium ? "bg-[#D4AF37]/[0.025]" : "bg-zinc-950/40"}`}>
                <div className="text-lg font-black text-[#D4AF37] tabular-nums">
                  ${col.priceFrom}{col.priceTo !== col.priceFrom && `–$${col.priceTo}`}
                </div>
              </div>
            ))}

            {/* CTA row */}
            <div className="px-4 py-3 border-t border-white/[0.06] bg-zinc-950/40" />
            {COLUMNS.map(col => (
              <div key={col.id} className={`px-3 py-3 border-t border-white/[0.06] text-center ${col.flagship ? "bg-[#D4AF37]/[0.05]" : col.premium ? "bg-[#D4AF37]/[0.025]" : "bg-zinc-950/40"}`}>
                <a href={col.bookHref}
                  className={`inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-black transition-all ${
                    col.flagship
                      ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black hover:opacity-90"
                      : col.premium
                        ? "bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/[0.08]"
                        : "bg-zinc-950 border border-white/[0.1] text-white hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
                  }`}>
                  Book
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: stacked accordions per tier */}
        <div className="lg:hidden space-y-3">
          {COLUMNS.map(col => (
            <MobileTierCard
              key={col.id}
              col={col}
              rows={displayRows.filter(r => r.cells[col.id] === true || r.cells[col.id] === "premium")}
            />
          ))}
        </div>

        {/* Show all toggle */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setShowAll(s => !s)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.07] bg-zinc-900/40 text-zinc-300 text-xs font-bold hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
          >
            {showAll ? "Show less" : "See full comparison"}
            <ChevronDown size={12} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}

// ── Desktop bits ──────────────────────────────────────────────────────────────
function ColumnHeader({ col }: { col: (typeof COLUMNS)[number] }) {
  return (
    <div className={`px-3 py-4 border-b border-white/[0.06] text-center ${col.flagship ? "bg-gradient-to-b from-[#D4AF37]/[0.12] to-[#D4AF37]/[0.04]" : col.premium ? "bg-[#D4AF37]/[0.04]" : "bg-zinc-950/40"}`}>
      {col.flagship && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black mb-1.5">
          <Crown size={8} fill="currentColor" />Flagship
        </span>
      )}
      {col.premium && !col.flagship && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 mb-1.5">
          Premium
        </span>
      )}
      <p className={`text-sm font-black leading-tight ${col.premium ? "text-[#D4AF37]" : "text-white"}`}>{col.name}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5">{col.subtitle}</p>
    </div>
  );
}

function CategoryGroup({ cat, rows }: { cat: string; rows: Row[] }) {
  return (
    <>
      <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/70 bg-zinc-950/60 border-t border-white/[0.06] col-span-5"
        style={{ gridColumn: "span 5 / span 5" }}>
        {cat}
      </div>
      {rows.map((row, idx) => (
        <RowDisplay key={`${cat}-${idx}`} row={row} />
      ))}
    </>
  );
}

function RowDisplay({ row }: { row: Row }) {
  return (
    <>
      <div className="px-4 py-2.5 text-sm text-zinc-300 border-t border-white/[0.04]">
        {row.feature}
        {row.desc && <p className="text-[10px] text-zinc-500 mt-0.5">{row.desc}</p>}
      </div>
      {(["interior", "full", "ultInt", "ultFull"] as const).map(c => {
        const col = COLUMNS.find(x => x.id === c)!;
        const v = row.cells[c];
        const bg = col.flagship ? "bg-[#D4AF37]/[0.05]" : col.premium ? "bg-[#D4AF37]/[0.025]" : "";
        // Special handling for the "On-site duration" row — show the actual time string
        if (row.feature === "On-site duration") {
          return (
            <div key={c} className={`px-3 py-2.5 text-center border-t border-white/[0.04] text-[11px] font-bold text-zinc-300 tabular-nums ${bg}`}>
              {DURATION_LABEL[c]}
            </div>
          );
        }
        return (
          <div key={c} className={`px-3 py-2.5 text-center border-t border-white/[0.04] ${bg}`}>
            <CellMark v={v} />
          </div>
        );
      })}
    </>
  );
}

function CellMark({ v }: { v: Cell }) {
  if (v === true) {
    return (
      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 items-center justify-center">
        <Check size={11} className="text-emerald-300" strokeWidth={3} />
      </span>
    );
  }
  if (v === "premium") {
    return (
      <span className="inline-flex w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/50 items-center justify-center" title="Included in premium tier">
        <Crown size={10} className="text-[#D4AF37]" fill="currentColor" />
      </span>
    );
  }
  if (v === "partial") {
    return <span className="text-[11px] text-zinc-500 font-bold">—</span>;
  }
  return (
    <span className="inline-flex w-5 h-5 rounded-full bg-zinc-800/50 border border-white/[0.04] items-center justify-center">
      <Minus size={10} className="text-zinc-600" />
    </span>
  );
}

// ── Mobile tier card (accordion) ──────────────────────────────────────────────
function MobileTierCard({ col, rows }: { col: (typeof COLUMNS)[number]; rows: Row[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border overflow-hidden ${col.flagship ? "border-[#D4AF37]/50 shadow-[0_0_24px_rgba(212,175,55,0.12)]" : col.premium ? "border-[#D4AF37]/25" : "border-white/[0.07]"} bg-zinc-900/40`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-4 flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {col.flagship && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black">
                <Crown size={8} fill="currentColor" />Flagship
              </span>
            )}
            {col.premium && !col.flagship && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30">Premium</span>
            )}
          </div>
          <p className={`text-base font-black ${col.premium ? "text-[#D4AF37]" : "text-white"} truncate`}>{col.name}</p>
          <p className="text-[11px] text-zinc-500">{col.subtitle} · ⏱ {DURATION_LABEL[col.id]}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black text-[#D4AF37] tabular-nums">
            ${col.priceFrom}
          </p>
          {col.priceTo !== col.priceFrom && <p className="text-[10px] text-zinc-500">–${col.priceTo}</p>}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ul className="space-y-1.5 mb-3">
            {rows.length === 0 && (
              <li className="text-xs text-zinc-500 italic">Standard cleaning only — tap a higher tier for premium features.</li>
            )}
            {rows.map((row, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300 leading-snug">
                {row.cells[col.id] === "premium"
                  ? <Crown size={11} className="text-[#D4AF37] shrink-0 mt-1" fill="currentColor" />
                  : <Check size={11} className="text-emerald-400 shrink-0 mt-1" strokeWidth={3} />
                }
                <span>{row.feature}</span>
              </li>
            ))}
          </ul>
          <a href={col.bookHref}
            className={`block text-center py-2.5 rounded-xl font-black text-xs ${
              col.flagship
                ? "bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black"
                : col.premium
                  ? "bg-zinc-950 border border-[#D4AF37]/50 text-[#D4AF37]"
                  : "bg-zinc-950 border border-white/[0.1] text-white"
            }`}>
            Book {col.name}
          </a>
        </div>
      )}
    </div>
  );
}
