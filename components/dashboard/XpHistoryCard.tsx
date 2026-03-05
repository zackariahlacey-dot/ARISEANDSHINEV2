import { History } from "lucide-react";
import type { PointTransactionRow } from "@/app/actions/getRecentPointTransactions";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function XpHistoryCard({
  transactions,
}: {
  transactions: PointTransactionRow[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/80 backdrop-blur-sm p-6 md:p-8 mb-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-zinc-800/80 border border-white/5 flex items-center justify-center">
          <History size={20} className="text-[#D4AF37]" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37] mb-0.5">
            XP History
          </p>
          <h3 className="text-lg font-bold text-zinc-100">
            Recent point activity
          </h3>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-zinc-500">No transactions yet.</p>
      ) : (
        <ul className="space-y-3">
          {transactions.map((tx, i) => (
            <li
              key={`${tx.created_at}-${i}`}
              className="flex items-center justify-between gap-4 py-2.5 border-b border-white/5 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200 truncate">
                  {tx.description || "Point adjustment"}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatDate(tx.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  tx.amount >= 0 ? "text-[#D4AF37]" : "text-zinc-400"
                }`}
              >
                {tx.amount >= 0 ? "+" : ""}
                {tx.amount} pts
                <span className="block text-[10px] font-normal text-zinc-500 mt-0.5">
                  {tx.amount >= 0 ? "Points Earned" : "Points Redeemed"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
