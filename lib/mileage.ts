/** Business mileage helpers for tax tracking */

export const BUSINESS_ORIGIN = "209 Porterwood Dr, Williston, VT";

/** IRS standard mileage rates by tax year */
export const IRS_RATES: Record<number, number> = {
  2023: 0.655,
  2024: 0.67,
  2025: 0.70,
};

export function getIrsRate(year: number): number {
  return IRS_RATES[year] ?? 0.70;
}

export function formatMiles(miles: number): string {
  return miles.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const EXPENSE_CATEGORIES = [
  { id: "fuel",       label: "Fuel / Gas",         color: "#f97316" },
  { id: "chemicals",  label: "Chemicals & Supplies", color: "#3b82f6" },
  { id: "equipment",  label: "Equipment",            color: "#a855f7" },
  { id: "vehicle",    label: "Vehicle Maintenance",  color: "#6b7280" },
  { id: "insurance",  label: "Insurance",            color: "#10b981" },
  { id: "other",      label: "Other",                color: "#71717a" },
] as const;

export type ExpenseCategoryId = typeof EXPENSE_CATEGORIES[number]["id"];

export function getCategoryMeta(id: string) {
  return EXPENSE_CATEGORIES.find(c => c.id === id) ?? { id: "other", label: "Other", color: "#71717a" };
}
