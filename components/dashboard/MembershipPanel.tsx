import Link from "next/link";
import { Crown, Wallet, CalendarDays, ChevronRight } from "lucide-react";
import { getMyActiveMembership } from "@/app/actions/membership";
import { MEMBERSHIP_PRICE_USD, MEMBERSHIP_CREDIT_USD, formatCentsCompact } from "@/lib/membership";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export async function MembershipPanel() {
  const membership = await getMyActiveMembership();

  // ── No active membership: show pitch card ─────────────────────────────────
  if (!membership) {
    return (
      <Link
        href="/membership"
        className="group block rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#D4AF37]/[0.05] to-zinc-900/40 px-5 py-4 mb-4 hover:border-[#D4AF37]/45 hover:from-[#D4AF37]/[0.08] transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Crown size={16} className="text-[#D4AF37]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-100">Premium Annual Membership</p>
              <p className="text-[11px] text-zinc-500 leading-snug">Pay ${MEMBERSHIP_PRICE_USD} · Get ${MEMBERSHIP_CREDIT_USD} in credit to use on anything</p>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-[#D4AF37]/60 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    );
  }

  // ── Active membership: credit balance card ────────────────────────────────
  const balancePct = membership.credit_total_cents > 0
    ? Math.max(0, Math.min(100, Math.round((membership.credit_balance_cents / membership.credit_total_cents) * 100)))
    : 0;
  const expiresSoon = (new Date(membership.expires_at).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40 mb-4"
      style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(24,24,27,0.95) 60%)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)" }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-[#D4AF37]" fill="currentColor" />
            <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#D4AF37]">Premium Member</p>
          </div>
          {expiresSoon && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/[0.08] text-amber-300">
              Expires soon
            </span>
          )}
        </div>

        {/* Big credit display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <Wallet size={14} className="text-[#D4AF37]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Credit Available</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-[#D4AF37] tabular-nums">
              {formatCentsCompact(membership.credit_balance_cents)}
            </span>
            <span className="text-sm font-semibold text-zinc-500">
              of {formatCentsCompact(membership.credit_total_cents)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${balancePct}%`,
                background: "linear-gradient(90deg, #92700a, #D4AF37, #F3E5AB)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-zinc-950/40 px-3 py-2.5">
          <CalendarDays size={11} className="text-[#D4AF37] shrink-0" />
          <p className="text-[11px] text-zinc-400 leading-snug">
            Credit valid through <span className="text-[#D4AF37] font-bold">{fmtDate(membership.expires_at)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
