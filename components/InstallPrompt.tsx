"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Share, Plus } from "lucide-react";

const DISMISS_KEY = "aas:install_prompt_dismissed_at";
const DISMISS_DAYS = 14;
const MIN_VISITS_BEFORE_PROMPT = 2;
const VISITS_KEY = "aas:visit_count";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone = (navigator as any).standalone === true;
  return isIos && !isStandalone && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((window.navigator as any).standalone === true) return true;
  return false;
}

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function bumpVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const prev = Number(localStorage.getItem(VISITS_KEY) ?? "0");
    const next = prev + 1;
    localStorage.setItem(VISITS_KEY, String(next));
    return next;
  } catch { return 0; }
}

/**
 * Bottom-sheet "Add to Home Screen" nudge for first-time mobile visitors.
 *
 * - Chrome/Edge/Android: catches the native beforeinstallprompt event and
 *   triggers it on tap (one-tap install).
 * - iOS Safari: walks the user through Share → Add to Home Screen since
 *   iOS has no programmatic install.
 * - Hides if already installed, recently dismissed, or fewer than
 *   MIN_VISITS_BEFORE_PROMPT lifetime visits (avoids ambushing first-time
 *   browsers who haven't even seen the page yet).
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isInstalled() || recentlyDismissed()) return;

    const visits = bumpVisitCount();
    const enoughVisits = visits >= MIN_VISITS_BEFORE_PROMPT;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (enoughVisits) setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    // iOS Safari — no install event, so we surface a walkthrough card after
    // the minimum-visits threshold.
    if (enoughVisits && isIosSafari()) {
      setShowIos(true);
      setOpen(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setOpen(false);
        } else {
          dismiss();
        }
      } catch (err) {
        console.error("[install]", err);
        dismiss();
      } finally {
        setDeferredPrompt(null);
      }
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="install-prompt"
        initial={{ y: "120%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "120%", opacity: 0 }}
        transition={{ type: "tween", duration: 0.3 }}
        className="md:hidden fixed inset-x-0 bottom-0 z-[110] px-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", paddingTop: "0.5rem" }}
      >
        <div className="relative rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 px-4 py-3.5 shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Sparkles size={18} className="text-[#D4AF37]" />
            </div>
            <div className="min-w-0 flex-1 pr-5">
              <p className="text-sm font-black text-white leading-tight">Install Arise & Shine</p>
              {showIos ? (
                <p className="text-[11px] text-zinc-400 leading-snug mt-1">
                  Tap <Share size={11} className="inline -mt-0.5" /> Share, then <strong className="text-zinc-200">Add to Home Screen</strong> for one-tap booking + offline access.
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 leading-snug mt-1">
                  One-tap booking, faster loads, works offline. No app store needed.
                </p>
              )}
              {!showIos && deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-black text-xs font-black uppercase tracking-wider active:scale-[0.97] transition-all shadow-[0_4px_14px_rgba(212,175,55,0.3)]"
                >
                  <Plus size={13} strokeWidth={3} /> Install Now
                </button>
              )}
              {showIos && (
                <p className="text-[10px] text-zinc-600 mt-2">
                  iOS only installs via the Share menu — we don't get a one-tap option here.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
