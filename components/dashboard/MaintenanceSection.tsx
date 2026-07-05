"use client";

import { useState } from "react";
import { Car, Sparkles, Clock, ChevronRight } from "lucide-react";
import type { MaintenanceOffer } from "@/app/actions/getMaintenanceOffers";
import { MaintenanceBookingModal } from "./MaintenanceBookingModal";
import {
  maintenancePrice,
  maintenanceExpiryCopy,
  maintenanceFoundationFor,
  CONDITION_TIERS,
} from "@/lib/maintenance";

/**
 * Dashboard section that lists active maintenance offers. Each card opens
 * the MaintenanceBookingModal for one-tap rebook.
 */
export function MaintenanceSection({ offers }: { offers: MaintenanceOffer[] }) {
  const [activeOffer, setActiveOffer] = useState<MaintenanceOffer | null>(null);

  if (offers.length === 0) return null;

  return (
    <>
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
            <Sparkles size={12} className="text-[#D4AF37]" />
          </div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#D4AF37]">
            Maintenance Offers · {offers.length}
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
          Locked-in pricing on a quick maintenance detail for every vehicle you've had done — good for 3 months.
        </p>

        <div className="space-y-2.5">
          {offers.map(offer => {
            const foundation = maintenanceFoundationFor(offer.sourceServiceName);
            const cheapestPrice = maintenancePrice(offer.basePrice, "showroom");
            const expiry = maintenanceExpiryCopy(offer.eligibleUntil);
            const vehicleLabel = `${offer.vehicleYear ?? ""} ${offer.vehicleMake ?? ""} ${offer.vehicleModel ?? ""}`.trim() || "Your vehicle";

            return (
              <button
                key={offer.id}
                type="button"
                onClick={() => setActiveOffer(offer)}
                className="group w-full text-left rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/[0.06] via-zinc-900/60 to-zinc-900/60 hover:border-[#D4AF37]/55 hover:from-[#D4AF37]/[0.10] transition-all active:scale-[0.99] overflow-hidden"
              >
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                    <Car size={18} className="text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        From ${cheapestPrice}
                      </span>
                      <span className="text-[9px] text-zinc-600">·</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock size={9} /> {expiry}
                      </span>
                    </div>
                    <p className="text-sm font-black text-white truncate">{vehicleLabel}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      Maintenance · {foundation === "full" ? "Interior + Exterior" : foundation === "interior" ? "Interior" : "Exterior"}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-zinc-600 group-hover:text-[#D4AF37] transition-colors" />
                </div>
                <div className="px-4 pb-3 pt-0.5 grid grid-cols-3 gap-1">
                  {CONDITION_TIERS.map(tier => {
                    const p = maintenancePrice(offer.basePrice, tier.id);
                    return (
                      <div
                        key={tier.id}
                        className="text-center px-1 py-1.5 rounded-lg bg-zinc-950/40 border border-white/[0.04]"
                      >
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">{tier.emoji} {tier.label}</p>
                        <p className="text-[11px] font-black text-zinc-200 tabular-nums">${p}</p>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <MaintenanceBookingModal
        offer={activeOffer}
        open={!!activeOffer}
        onClose={() => setActiveOffer(null)}
        onBooked={() => setActiveOffer(null)}
      />
    </>
  );
}
