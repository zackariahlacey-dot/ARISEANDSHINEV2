"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertOctagon, Camera, Star, MailX, UserMinus, HardHat, TrendingUp,
  ChevronRight, Loader2, Check,
} from "lucide-react";
import { getAdminNeedsAttention, type AttentionItem } from "@/app/actions/adminNeedsAttention";
import { cn } from "@/lib/utils";

const ICONS: Record<AttentionItem["kind"], typeof Camera> = {
  photo_review:                 Camera,
  low_rating:                   Star,
  payment_email_failed:         MailX,
  unassigned_booking:           UserMinus,
  contractor_issue:             AlertOctagon,
  contractor_activation:        HardHat,
  contractor_eligible_promotion: TrendingUp,
};

const SEVERITY_CLASS = {
  urgent: "border-rose-500/30 bg-rose-500/[0.05] hover:bg-rose-500/[0.08]",
  warn:   "border-amber-500/30 bg-amber-500/[0.05] hover:bg-amber-500/[0.08]",
  info:   "border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-900/60",
};
const ICON_CLASS = {
  urgent: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  warn:   "text-amber-400 bg-amber-500/15 border-amber-500/30",
  info:   "text-zinc-400 bg-zinc-800 border-white/[0.06]",
};

/**
 * Dashboard widget that surfaces every actionable signal across the admin
 * surface in one place — so the owner doesn't have to remember which tab
 * to check. Auto-refreshes every 60s.
 */
export function NeedsAttentionWidget() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-needs-attention"],
    queryFn:  getAdminNeedsAttention,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 flex items-center gap-2 text-[11px] text-zinc-500">
        <Loader2 size={13} className="animate-spin" /> Checking for issues…
      </div>
    );
  }

  const list = (items ?? []) as AttentionItem[];
  const urgentCount = list.filter(i => i.severity === "urgent").length;
  const warnCount   = list.filter(i => i.severity === "warn").length;

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Check size={16} className="text-emerald-400" strokeWidth={3} />
        </div>
        <div>
          <p className="text-sm font-black text-emerald-300">All clear</p>
          <p className="text-[11px] text-emerald-200/70">No items need your attention right now.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Needs attention · {list.length}
        </p>
        <div className="flex items-center gap-1.5">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {urgentCount} urgent
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {warnCount} warn
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {list.slice(0, 10).map(item => {
          const Icon = ICONS[item.kind];
          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              className={cn(
                "block rounded-xl border px-3 py-2.5 transition-colors active:scale-[0.99]",
                SEVERITY_CLASS[item.severity],
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center",
                  ICON_CLASS[item.severity],
                )}>
                  <Icon size={14} strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-zinc-100 truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{item.subtitle}</p>
                </div>
                <ChevronRight size={13} className="shrink-0 text-zinc-600" />
              </div>
            </Link>
          );
        })}
        {list.length > 10 && (
          <p className="text-[10px] text-zinc-600 text-center pt-1">
            +{list.length - 10} more · tap items above to resolve them
          </p>
        )}
      </div>
    </section>
  );
}
