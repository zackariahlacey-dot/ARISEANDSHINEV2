"use client";

import { useState } from "react";
import {
  Search,
  X,
  Edit3,
  Gift,
  Loader2,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/updateCustomerProfile";
import { getTierBadgeDisplay } from "@/lib/calculateLifetimeTier";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  /** Combined display name from first_name + last_name */
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  reward_points: number | null;
  referral_code: string | null;
  created_at: string | null;
  lifetime_points?: number | null;
  lifetimeValue: number;
  bookingCount: number;
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: CustomerRow;
  onClose: () => void;
  onSaved: (id: string, pts: number, phone: string) => void;
}) {
  const [points, setPoints] = useState(String(customer.reward_points ?? 0));
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.email ||
    "Unknown";

  const handleSave = async () => {
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < 0) {
      setError("Points must be a non-negative number.");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await updateCustomerProfile(customer.id, {
      reward_points: pts,
      phone: phone.trim() || undefined,
    });

    setLoading(false);
    if (result.success) {
      onSaved(customer.id, pts, phone.trim());
      onClose();
    } else {
      setError(result.error ?? "Update failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900/95 border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D4AF37] mb-1">
              Edit Customer
            </p>
            <h3 className="text-base font-bold text-white leading-none">{name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Current stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-zinc-950/60 border border-white/[0.05] rounded-xl p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600 mb-1">
                Current Points
              </p>
              <p className="text-xl font-black text-[#D4AF37] tabular-nums">
                {(customer.reward_points ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex-1 bg-zinc-950/60 border border-white/[0.05] rounded-xl p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600 mb-1">
                Lifetime Spend
              </p>
              <p className="text-xl font-black text-white tabular-nums">
                ${customer.lifetimeValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Reward points field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2">
              Reward Points{" "}
              <span className="text-zinc-600 normal-case font-normal tracking-normal">
                (set new total)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="flex-1 bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all tabular-nums"
              />
              {/* Quick +/- buttons */}
              {[50, 100, 200].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setPoints((p) => String(Math.max(0, (parseInt(p, 10) || 0) + n)))
                  }
                  className="px-2.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.07] text-[10px] text-zinc-400 hover:text-white hover:bg-white/[0.09] transition-colors font-semibold"
                >
                  +{n}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              10 pts = $1 off their next booking. Use +50/100/200 to add a bonus.
            </p>
          </div>

          {/* Phone field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(802) 555-0100"
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3 text-xs text-red-300">
              <AlertCircle size={13} className="shrink-0 text-red-400" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              loading
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-white text-zinc-950 hover:bg-zinc-100"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check size={13} strokeWidth={2.5} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CustomersTable({
  initialCustomers,
}: {
  initialCustomers: CustomerRow[];
}) {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"lifetimeValue" | "reward_points" | "created_at">("lifetimeValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editing, setEditing] = useState<CustomerRow | null>(null);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const customerName = c.customer_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
    return (
      customerName.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.referral_code ?? "").toLowerCase().includes(q)
    );
  });

  // ── Sort ────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const av =
      sortKey === "lifetimeValue"
        ? a.lifetimeValue
        : sortKey === "reward_points"
        ? (a.reward_points ?? 0)
        : a.created_at ?? "";
    const bv =
      sortKey === "lifetimeValue"
        ? b.lifetimeValue
        : sortKey === "reward_points"
        ? (b.reward_points ?? 0)
        : b.created_at ?? "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleSaved = (id: string, pts: number, phone: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, reward_points: pts, phone: phone || c.phone }
          : c
      )
    );
  };

  const SortBtn = ({
    label,
    col,
  }: {
    label: string;
    col: typeof sortKey;
  }) => (
    <button
      onClick={() => handleSort(col)}
      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] hover:text-zinc-300 transition-colors ${
        sortKey === col ? "text-[#D4AF37]" : "text-zinc-600"
      }`}
    >
      {label}
      {sortKey === col &&
        (sortDir === "asc" ? (
          <ChevronUpIcon />
        ) : (
          <ChevronDownIcon />
        ))}
    </button>
  );

  return (
    <>
      {/* Edit modal */}
      {editing && (
        <EditModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or referral code…"
          className="w-full max-w-md bg-zinc-900/60 border border-white/[0.07] rounded-xl pl-9 pr-9 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-zinc-600 mb-3 tabular-nums">
        {sorted.length} customer{sorted.length !== 1 ? "s" : ""}
        {search ? " matching" : " total"}
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Customer
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Contact
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Bookings
                </th>
                <th className="px-5 py-3.5 text-left">
                  <SortBtn label="Lifetime Value" col="lifetimeValue" />
                </th>
                <th className="px-5 py-3.5 text-left">
                  <SortBtn label="Points" col="reward_points" />
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Tier
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Referral Code
                </th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-zinc-600 text-sm"
                  >
                    {search ? "No customers match your search" : "No customers yet"}
                  </td>
                </tr>
              ) : (
                sorted.map((c) => {
                  const { label, gradientClass } = getTierBadgeDisplay(c.lifetime_points ?? c.reward_points ?? 0);
                  
                  const displayName = c.customer_name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || "—");

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                    >
                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-zinc-400">
                              {(displayName || c.email || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-200">
                            {displayName}
                          </p>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <p className="text-[10px] text-zinc-400">
                          {c.phone ?? "—"}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {c.email ?? ""}
                        </p>
                      </td>

                      {/* Bookings */}
                      <td className="px-5 py-3.5 text-xs text-zinc-400 tabular-nums">
                        {c.bookingCount}
                      </td>

                      {/* Lifetime value */}
                      <td className="px-5 py-3.5 text-xs font-bold text-zinc-200 tabular-nums">
                        ${c.lifetimeValue.toFixed(2)}
                      </td>

                      {/* Points */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Gift size={11} className="text-amber-500/70 shrink-0" />
                          <span className="text-xs font-bold text-amber-400/90 tabular-nums">
                            {(c.reward_points ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-semibold tier-badge-3d ${gradientClass}`}
                        >
                          {label}
                        </span>
                      </td>

                      {/* Referral code */}
                      <td className="px-5 py-3.5">
                        {c.referral_code ? (
                          <span className="font-mono text-[10px] text-zinc-500 bg-zinc-950/60 border border-zinc-800 px-2 py-1 rounded-lg">
                            {c.referral_code}
                          </span>
                        ) : (
                          <span className="text-zinc-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Edit button */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setEditing(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.07] transition-all"
                        >
                          <Edit3 size={11} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ChevronUpIcon() {
  return <ChevronUp size={10} />;
}
function ChevronDownIcon() {
  return <ChevronDown size={10} />;
}
