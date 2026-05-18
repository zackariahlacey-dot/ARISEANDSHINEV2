"use client";

import Link from "next/link";
import { Car, ChevronRight, Clock } from "lucide-react";
import type { SavedVehicle } from "@/app/actions/getMaintenanceOffers";

function formatLastDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/**
 * Compact card list of distinct vehicles the customer has had detailed.
 * Each row links to the main booking flow with a "book another detail"
 * hand-off (uses the regular Build Your Package since there's no active
 * maintenance offer for it).
 */
export function SavedVehiclesSection({ vehicles }: { vehicles: SavedVehicle[] }) {
  if (vehicles.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
          <Car size={12} className="text-zinc-400" />
        </div>
        <p className="text-xs font-bold tracking-[0.18em] uppercase text-zinc-400">
          My Vehicles · {vehicles.length}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {vehicles.slice(0, 6).map((v, idx) => {
          const label = `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim() || "Vehicle";
          return (
            <Link
              key={`${label}-${idx}`}
              href="/#services"
              className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 hover:border-[#D4AF37]/40 hover:bg-zinc-900 px-3.5 py-3 transition-all active:scale-[0.99] flex items-center gap-3"
            >
              <div className="shrink-0 w-9 h-9 rounded-xl bg-zinc-800 border border-white/[0.04] flex items-center justify-center">
                <Car size={14} className="text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{label}</p>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Clock size={9} />
                  <span>Last detailed {formatLastDate(v.lastDetailedDate)}</span>
                  {v.bookingsCount > 1 && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span>{v.bookingsCount} services</span>
                    </>
                  )}
                </p>
              </div>
              <ChevronRight size={14} className="shrink-0 text-zinc-700 group-hover:text-[#D4AF37] transition-colors" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
