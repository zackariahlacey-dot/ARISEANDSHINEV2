const TIER_THRESHOLDS = [0, 500, 1000, 1500, 2000] as const;
const TIER_NAMES = ["Member", "Bronze", "Silver", "Gold", "Diamond"] as const;
const TIER_DISCOUNTS = [0, 5, 10, 15, 20] as const;

/**
 * Returns tier name and discount percentage based on lifetime points.
 * 500-999: Bronze (5%), 1000-1499: Silver (10%), 1500-1999: Gold (15%), 2000+: Diamond (20%).
 */
export function calculateLifetimeTier(lifetimePoints: number): {
  tier: string;
  discount: number;
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 2000) return { tier: "Diamond", discount: 20 };
  if (pts >= 1500) return { tier: "Gold", discount: 15 };
  if (pts >= 1000) return { tier: "Silver", discount: 10 };
  if (pts >= 500) return { tier: "Bronze", discount: 5 };
  return { tier: "Member", discount: 0 };
}

/**
 * Max points redeemable per booking by tier.
 * Standard (Member/Bronze): 1,000 pts ($100 off). Silver/Gold/Diamond: 500 pts ($50 off) in addition to lifetime % discount.
 */
export function getMaxRedeemPoints(tier: string): number {
  const t = tier?.trim() || "Member";
  if (t === "Silver" || t === "Gold" || t === "Diamond") return 500;
  return 1000;
}

/** Display tiers: 0-499 Member, 500-999 Bronze, 1000-1499 Silver, 1500-1999 Gold, 2000+ Diamond */
const DISPLAY_TIER_BOUNDS = [
  { label: "Member", start: 0, end: 500 },
  { label: "Bronze Member", start: 500, end: 1000 },
  { label: "Silver Member", start: 1000, end: 1500 },
  { label: "Gold Member", start: 1500, end: 2000 },
  { label: "Diamond", start: 2000, end: Infinity },
] as const;

/**
 * Display tier label for success modal / UI: Bronze (5%), Silver (10%), Gold (15%), Diamond (20%).
 */
export function getDisplayTierLabel(lifetimePoints: number): string {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 2000) return "Diamond";
  if (pts >= 1500) return "Gold Member";
  if (pts >= 1000) return "Silver Member";
  if (pts >= 500) return "Bronze Member";
  return "Member";
}

/** Success modal tier: progress to 500 (Bronze), 1000 (Silver), 1500 (Gold), 2000 (Diamond). Bar = progress within current tier. */
export function getSuccessTier(lifetimePoints: number): {
  tierLabel: string;
  nextTierGoal: number;
  percent: number;
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts < 500) {
    return {
      tierLabel: "Member",
      nextTierGoal: 500,
      percent: (pts / 500) * 100,
    };
  }
  if (pts < 1000) {
    return {
      tierLabel: "Bronze Member",
      nextTierGoal: 1000,
      percent: ((pts - 500) / 500) * 100,
    };
  }
  if (pts < 1500) {
    return {
      tierLabel: "Silver Member",
      nextTierGoal: 1500,
      percent: ((pts - 1000) / 500) * 100,
    };
  }
  if (pts < 2000) {
    return {
      tierLabel: "Gold Member",
      nextTierGoal: 2000,
      percent: ((pts - 1500) / 500) * 100,
    };
  }
  return {
    tierLabel: "Diamond",
    nextTierGoal: 2000,
    percent: 100,
  };
}

/**
 * Returns tier label and range for the success modal progress bar.
 * Bar fill = ((currentPoints - tierStart) / (tierEnd - tierStart)) * 100.
 * e.g. 710 pts → Bronze Member, start 500, end 1000 → (210/500)*100 = 42%.
 */
export function getDisplayTierRange(lifetimePoints: number): {
  tierLabel: string;
  tierStart: number;
  tierEnd: number;
  percent: number;
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  for (const tier of DISPLAY_TIER_BOUNDS) {
    if (pts < tier.end) {
      const range = tier.end === Infinity ? 500 : tier.end - tier.start;
      const percent =
        tier.end === Infinity
          ? 100
          : range > 0
            ? Math.min(100, ((pts - tier.start) / range) * 100)
            : 0;
      return {
        tierLabel: tier.label,
        tierStart: tier.start,
        tierEnd: tier.end === Infinity ? 2000 : tier.end,
        percent,
      };
    }
  }
  return {
    tierLabel: "Diamond",
    tierStart: 2000,
    tierEnd: 2000,
    percent: 100,
  };
}

/**
 * Four animated metallic tier badges (Bronze, Silver, Gold, Diamond).
 * Maps points to display label and CSS class: 500–999 Bronze (5%), 1000–1499 Silver (10%), 1500–1999 Gold (15%), 2000+ Diamond (20%).
 */
export function getTierBadgeDisplay(lifetimePoints: number): {
  label: string;
  gradientClass: "tier-badge-bronze" | "tier-badge-silver" | "tier-badge-gold" | "tier-badge-diamond";
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 2000) return { label: "Diamond", gradientClass: "tier-badge-diamond" };
  if (pts >= 1500) return { label: "Gold", gradientClass: "tier-badge-gold" };
  if (pts >= 1000) return { label: "Silver", gradientClass: "tier-badge-silver" };
  if (pts >= 500) return { label: "Bronze", gradientClass: "tier-badge-bronze" };
  return { label: "Member", gradientClass: "tier-badge-bronze" };
}

/**
 * Returns the next tier threshold and name for progress bar display.
 * If at Diamond (2000+), nextThreshold is 2000 and nextTierName is "Diamond" (max).
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
    nextTierName: "Diamond",
    pointsRemaining: 0,
    isMaxTier: true,
  };
}
