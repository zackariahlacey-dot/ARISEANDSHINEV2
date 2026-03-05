"use client";

import { useEffect, useState } from "react";
import Confetti from "react-confetti";

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
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl border border-[#D4AF37]/40 bg-zinc-900/95 backdrop-blur-md shadow-[0_0_24px_rgba(212,175,55,0.2)] transition-all duration-500"
          role="alert"
        >
          <p className="text-center text-[#D4AF37] font-bold text-lg">
            Congratulations! You reached a new Lifetime Tier!
          </p>
        </div>
      )}
    </>
  );
}
