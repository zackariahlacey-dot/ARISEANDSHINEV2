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
    id: "interior_elite",
    name: "Interior Elite",
    price: 110,
    cashPrice: 100,
    durationMins: 120,
    tagline: "Deep clean + conditioning.",
    description: "Everything in Refresh plus leather conditioning, deep crevice clean, UV dash protectant, and odor neutralizer.",
    features: [
      "Everything in Interior Refresh",
      "Leather conditioning & treatment",
      "Deep crevice clean",
      "UV dash protectant",
      "Odor neutralizer spray",
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
  {
    id: "full_elite",
    name: "Full Elite",
    price: 165,
    cashPrice: 155,
    durationMins: 180,
    tagline: "Showroom condition, guaranteed.",
    description: "Exterior hand wash + spray sealant protection combined with the full Interior Elite package.",
    features: [
      "Exterior hand wash & dry",
      "Spray sealant (paint protection)",
      "Tire shine",
      "Everything in Interior Elite",
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
  "Interior Elite":   120,
  "Full Maintenance": 150,
  "Full Elite":       180,
};
