export const MONTHLY_PLANS = [
  {
    id: "interior_refresh",
    name: "Interior Refresh",
    price: 75,
    cashPrice: 65,
    durationMins: 90,
    tagline: "The essentials, every month.",
    description: "Vacuum all surfaces, wipe dash / console / door panels, interior glass, trash removal.",
    features: [
      "Full vacuum (seats, carpet, cargo)",
      "Dash, console & door panel wipe-down",
      "Interior glass clean",
      "Trash removal",
    ],
  },
  {
    id: "full_maintenance",
    name: "Full Maintenance",
    price: 120,
    cashPrice: 110,
    durationMins: 150,
    tagline: "Inside and out, every month.",
    description: "Exterior hand wash + dry + tire shine combined with a full Interior Refresh.",
    features: [
      "Exterior hand wash & dry",
      "Tire shine",
      "Everything in Interior Refresh",
    ],
  },

] as const;

export type MonthlyPlanId = typeof MONTHLY_PLANS[number]["id"];
export type MonthlyPlan   = typeof MONTHLY_PLANS[number];

export function getPlanById(id: string): MonthlyPlan | undefined {
  return MONTHLY_PLANS.find(p => p.id === id);
}

/** Duration map for checkAvailability calls */
export const MONTHLY_PLAN_DURATIONS: Record<string, number> = {
  "Interior Refresh": 90,
  "Full Maintenance": 150,
};
