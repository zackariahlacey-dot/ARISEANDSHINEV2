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

/** Display tiers: 0-499 Member, 500-999 Silver Member, 1000+ Gold Member */
const DISPLAY_TIER_BOUNDS = [
  { label: "Member", start: 0, end: 500 },
  { label: "Silver Member", start: 500, end: 1000 },
  { label: "Gold Member", start: 1000, end: 1500 },
] as const;

/**
 * Display tier label for success modal / UI: 500+ = Silver Member, 1000+ = Gold Member.
 */
export function getDisplayTierLabel(lifetimePoints: number): string {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 1000) return "Gold Member";
  if (pts >= 500) return "Silver Member";
  return "Member";
}

/** Success modal tier: Member (goal 500), Silver (goal 1000), Gold (goal 2500). Bar = (currentPoints / nextTierGoal) * 100 */
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
      tierLabel: "Silver Member",
      nextTierGoal: 1000,
      percent: Math.min(100, (pts / 1000) * 100),
    };
  }
  return {
    tierLabel: "Gold Member",
    nextTierGoal: 2500,
    percent: Math.min(100, (pts / 2500) * 100),
  };
}

/**
 * Returns tier label and range for the success modal progress bar.
 * Bar fill = ((currentPoints - tierStart) / (tierEnd - tierStart)) * 100.
 * e.g. 710 pts → Silver Member, start 500, end 1000 → (210/500)*100 = 42%.
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
      const range = tier.end - tier.start;
      const percent = range > 0 ? Math.min(100, ((pts - tier.start) / range) * 100) : 0;
      return {
        tierLabel: tier.label,
        tierStart: tier.start,
        tierEnd: tier.end,
        percent,
      };
    }
  }
  return {
    tierLabel: "Gold Member",
    tierStart: 1000,
    tierEnd: 1500,
    percent: 100,
  };
}

/**
 * Four animated metallic tier badges (Bronze, Silver, Gold, Diamond).
 * Maps points to display label and CSS class for shimmer badge.
 * 0–499 Member (bronze), 500–999 Silver, 1000–1999 Gold, 2000+ Diamond.
 */
export function getTierBadgeDisplay(lifetimePoints: number): {
  label: string;
  gradientClass: "tier-badge-bronze" | "tier-badge-silver" | "tier-badge-gold" | "tier-badge-diamond";
} {
  const pts = Math.max(0, Math.floor(lifetimePoints));
  if (pts >= 2000) return { label: "Diamond", gradientClass: "tier-badge-diamond" };
  if (pts >= 1000) return { label: "Gold", gradientClass: "tier-badge-gold" };
  if (pts >= 500) return { label: "Silver", gradientClass: "tier-badge-silver" };
  return { label: "Member", gradientClass: "tier-badge-bronze" };
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
