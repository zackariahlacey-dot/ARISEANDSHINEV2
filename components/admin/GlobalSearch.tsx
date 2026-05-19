"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, Crown, Zap, Search, X, Loader2 } from "lucide-react";
import { adminGlobalSearch, type SearchHit } from "@/app/actions/adminGlobalSearch";

/**
 * Cmd-K / Ctrl-K omnibar for the admin. Searches bookings, profiles,
 * monthly subscriptions, and squeeze requests in parallel. Lives in the
 * AdminShell so every admin page can summon it.
 *
 * Keyboard:
 *   ⌘K / Ctrl-K — open
 *   /          — open (when focus is not in an input)
 *   Esc        — close
 *   ↑ / ↓      — move selection
 *   Enter      — open the selected hit
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement | null)?.tagName?.match(/^(INPUT|TEXTAREA)$/);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (!open && !isInput && e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (open && e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setHits([]);
      setSel(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await adminGlobalSearch(q);
        setHits(r);
        setSel(0);
      } catch (e) {
        console.error("[global search]", e);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const grouped = useMemo(() => {
    const groups: Record<SearchHit["kind"], SearchHit[]> = {
      booking:    [],
      client:     [],
      subscriber: [],
      squeeze:    [],
    };
    for (const h of hits) groups[h.kind].push(h);
    return groups;
  }, [hits]);

  // Flat list for arrow nav (groups appear in the same order as rendering).
  const flat = useMemo(() => [
    ...grouped.booking,
    ...grouped.client,
    ...grouped.subscriber,
    ...grouped.squeeze,
  ], [grouped]);

  const goTo = useCallback((hit: SearchHit) => {
    setOpen(false);
    router.push(hit.href);
  }, [router]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(flat.length - 1, s + 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[sel];
      if (hit) goTo(hit);
    }
  };

  const ICONS = {
    booking:    Calendar,
    client:     Users,
    subscriber: Crown,
    squeeze:    Zap,
  } as const;
  const GROUP_LABELS = {
    booking:    "Bookings",
    client:     "Clients",
    subscriber: "Subscribers",
    squeeze:    "Squeeze",
  } as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 sm:pt-32 px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            key="search-card"
            initial={{ scale: 0.97, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.65)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <Search size={16} className="text-zinc-500 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search bookings, clients, subscribers, squeeze…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              />
              {loading && <Loader2 size={14} className="text-zinc-600 animate-spin" />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-600 hover:text-white p-1 rounded"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {q.trim().length < 2 ? (
                <div className="px-4 py-6 text-center text-[11px] text-zinc-600">
                  Type at least 2 characters · <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.04] text-[10px]">↑↓</kbd> to nav · <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.04] text-[10px]">Enter</kbd> to open · <kbd className="px-1 rounded bg-white/[0.06] border border-white/[0.04] text-[10px]">Esc</kbd> to close
                </div>
              ) : flat.length === 0 && !loading ? (
                <div className="px-4 py-6 text-center text-[11px] text-zinc-600">
                  No matches for "<span className="text-zinc-400">{q}</span>"
                </div>
              ) : (
                <div className="py-1">
                  {(["booking", "client", "subscriber", "squeeze"] as const).map(kind => {
                    const list = grouped[kind];
                    if (list.length === 0) return null;
                    const Icon = ICONS[kind];
                    return (
                      <div key={kind} className="py-1">
                        <p className="px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                          {GROUP_LABELS[kind]}
                        </p>
                        {list.map((hit) => {
                          const idx = flat.indexOf(hit);
                          const isSel = idx === sel;
                          return (
                            <button
                              key={hit.id}
                              type="button"
                              onMouseEnter={() => setSel(idx)}
                              onClick={() => goTo(hit)}
                              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                                isSel ? "bg-amber-500/15" : "hover:bg-white/[0.03]"
                              }`}
                            >
                              <Icon size={14} className={isSel ? "text-amber-400" : "text-zinc-600"} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-semibold truncate ${isSel ? "text-amber-300" : "text-zinc-200"}`}>
                                  {hit.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate">{hit.subtitle}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
