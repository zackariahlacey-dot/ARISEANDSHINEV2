const TIER_THRESHOLDS = [0, 500, 1000, 1500, 2000] as const;
const TIER_NAMES = ["Member", "Bronze", "Silver", "Gold", "Platinum"] as const;
const TIER_DISCOUNTS = [0, 5, 10, 15, 20] as const;

/**
 * Returns tier name and discount percentage based on lifetime points.
 * Used for loyalty tier display and applying tier discounts.
 */
export function calculateLifetimeTier(lifetimePoints: number): {
  tier: string;
  discount: number;
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 2000) return { tier: "Platinum", discount: 20 };
  if (pts >= 1500) return { tier: "Gold", discount: 15 };
  if (pts >= 1000) return { tier: "Silver", discount: 10 };
  if (pts >= 500) return { tier: "Bronze", discount: 5 };
  return { tier: "Member", discount: 0 };
}

/**
 * Max points redeemable per booking by tier.
 * Standard (Member/Bronze): 1,000 pts ($100 off). Silver/Gold/Platinum: 500 pts ($50 off) in addition to lifetime % discount.
 */
export function getMaxRedeemPoints(tier: string): number {
  const t = tier?.trim() || "Member";
  if (t === "Silver" || t === "Gold" || t === "Platinum") return 500;
  return 1000;
}

/**
 * Returns the next tier threshold and name for progress bar display.
 * If at Platinum (2000+), nextThreshold is 2000 and nextTierName is "Platinum" (max).
 */
export function getNextTierProgress(lifetimePoints: number): {
  nextThreshold: number;
  nextTierName: string;
  pointsRemaining: number;
  isMaxTier: boolean;
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  for (let i = 1; i < TIER_THRESHOLDS.length; i++) {
    if (pts < TIER_THRESHOLDS[i]) {
      return {
        nextThreshold: TIER_THRESHOLDS[i],
        nextTierName: TIER_NAMES[i],
        pointsRemaining: TIER_THRESHOLDS[i] - pts,
        isMaxTier: false,
      };
    }
  }
  return {
    nextThreshold: 2000,
    nextTierName: "Platinum",
    pointsRemaining: 0,
    isMaxTier: true,
  };
}
