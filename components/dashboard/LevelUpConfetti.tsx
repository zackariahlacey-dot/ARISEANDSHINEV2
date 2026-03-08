"use client";

import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { Trophy, X } from "lucide-react";

const TIER_THRESHOLDS = [500, 1000, 1500, 2000] as const;
const STORAGE_KEY = "lastSeenTier";
const CONFETTI_DURATION_MS = 5000;

function getCurrentTierThreshold(lifetimePoints: number): number {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 2000) return 2000;
  if (pts >= 1500) return 1500;
  if (pts >= 1000) return 1000;
  if (pts >= 500) return 500;
  return 0;
}

export function LevelUpConfetti({ lifetimePoints }: { lifetimePoints: number }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    setWindowSize({ width: w, height: h });

    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentThreshold = getCurrentTierThreshold(lifetimePoints);
    if (currentThreshold === 0) return;

    const lastSeen = parseInt(
      window.localStorage.getItem(STORAGE_KEY) ?? "0",
      10
    );
    if (currentThreshold <= lastSeen) return;

    window.localStorage.setItem(STORAGE_KEY, String(currentThreshold));
    setShowConfetti(true);
    setShowToast(true);

    const t1 = setTimeout(() => setShowConfetti(false), CONFETTI_DURATION_MS);
    const t2 = setTimeout(() => setShowToast(false), CONFETTI_DURATION_MS + 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [lifetimePoints]);

  return (
    <>
      {showConfetti && windowSize.width > 0 && windowSize.height > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={400}
          run={showConfetti}
        />
      )}
      {showToast && (
        <div
          className="fixed top-4 left-1/2 z-[100] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-300"
          role="alert"
          aria-live="polite"
        >
          <div className="relative rounded-2xl border border-yellow-500/30 bg-black/80 px-5 py-4 pr-8 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="absolute top-3 right-3 cursor-pointer text-gray-400 transition-colors hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/20">
                <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-0.5 pr-2">
                <p className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text font-bold text-base text-transparent">
                  Congratulations! You reached a new Lifetime Tier!
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  Keep earning points to unlock even greater rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
