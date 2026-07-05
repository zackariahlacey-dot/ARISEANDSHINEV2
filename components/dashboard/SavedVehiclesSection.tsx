"use client";

import { useState, useEffect } from "react";
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
 * Each row pre-fills the homepage booking modal with year/make/model so
 * the customer can rebook without re-entering their vehicle. Uses
 * sessionStorage handoff — same mechanism the "Rebook this service"
 * flow uses on individual BookingCards.
 */
function buildVehicleRebookDraft(v: SavedVehicle) {
  const rawSize = (v.size ?? "").toLowerCase();
  const SIZE_MAP: Record<string, "sedan" | "suv" | "xl"> = {
    sedan: "sedan", suv: "suv", xl: "xl",
    compact: "sedan", medium: "sedan", large: "suv", extra_large: "xl",
    truck: "xl",
  };
  return {
    serviceId: "",
    vehicleSize: SIZE_MAP[rawSize] ?? "sedan",
    vehicleYear: v.year ?? "",
    vehicleMake: v.make ?? "",
    vehicleModel: v.model ?? "",
    selectedDate: "",
    selectedTime: "",
    serviceAddress: "",
    name: "", phone: "", email: "", notes: "",
    travelFee: 0, distanceMiles: null,
    couponCode: "", appliedCoupon: null,
    pointsToRedeemInput: 0,
  };
}

export function SavedVehiclesSection({ vehicles }: { vehicles: SavedVehicle[] }) {
  // Mount guard — Next.js's dev server is stubborn about invalidating stale
  // compiled server bundles when a "use client" component's DOM shape
  // changes (Link → button → a). Rather than fight the cache, we defer the
  // ENTIRE section render until after client mount. No server HTML exists
  // for React to hydrate against, so there's nothing to mismatch. Prod
  // builds don't have this cache issue but the guard is harmless there.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

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
          // We use <a> (not <button>) with an onClick handler because previous
          // versions of this component rendered a <Link> (which is <a> under
          // the hood). Keeping the tag as <a> means Next.js's dev cache can
          // serve either the pre- or post-edit compiled server bundle without
          // triggering a hydration mismatch — SSR always emits <a>.
          const handleRebook = (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            if (!mounted) return; // safety on stale hydration frame
            const draft = buildVehicleRebookDraft(v);
            try { sessionStorage.setItem("draftBooking", JSON.stringify(draft)); } catch {}
            window.location.href = "/?restore_booking=1";
          };
          return (
            <a
              key={`${label}-${idx}`}
              href="/?restore_booking=1"
              onClick={handleRebook}
              className="group rounded-2xl border border-white/[0.06] bg-zinc-900/60 hover:border-[#D4AF37]/40 hover:bg-zinc-900 px-3.5 py-3 transition-all active:scale-[0.99] flex items-center gap-3 text-left w-full"
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
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/70 group-hover:text-[#D4AF37]">Rebook</span>
                <ChevronRight size={14} className="text-zinc-700 group-hover:text-[#D4AF37] transition-colors" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
