"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type SubNavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  count?: number;     // optional pill badge (e.g. pending plan requests)
};

/**
 * Sub-tab row that sits under the page title inside a consolidated parent
 * (People, Business). Lets the visitor hop between related routes without
 * needing the parent tab nav to grow.
 *
 * Active match: exact equality OR href is a prefix of the current path.
 */
export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      <div className="flex items-center gap-1.5 min-w-max">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                active
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.18)]"
                  : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.12]"
              )}
            >
              {Icon && <Icon size={12} strokeWidth={2.5} />}
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span className={cn(
                  "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black tabular-nums",
                  active ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-300"
                )}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Standardized config arrays so every page in a group renders the same nav.
 * Update here, every page reflects it.
 */
import { Users, Crown, DollarSign, Mail, Settings as SettingsIcon, Calendar, Zap } from "lucide-react";

/** People cluster: clients + monthly subscribers (the monthly page has its
 *  own Requests/Subscribers inner toggle, so we don't double it here). */
export const PEOPLE_SUBNAV: SubNavItem[] = [
  { label: "Clients",     href: "/admin/clients", icon: Users },
  { label: "Subscribers", href: "/admin/monthly", icon: Crown },
];

/** Business cluster: revenue/coupons + email composer + setup (hours,
 *  blocked dates, diagnostics, monthly goal). */
export const BUSINESS_SUBNAV: SubNavItem[] = [
  { label: "Revenue", href: "/admin/money",    icon: DollarSign },
  { label: "Email",   href: "/admin/email",    icon: Mail },
  { label: "Setup",   href: "/admin/settings", icon: SettingsIcon },
];

/** Schedule cluster: calendar + the urgent Squeeze request queue. */
export const SCHEDULE_SUBNAV: SubNavItem[] = [
  { label: "Calendar", href: "/admin/schedule", icon: Calendar },
  { label: "Squeeze",  href: "/admin/squeeze",  icon: Zap },
];
