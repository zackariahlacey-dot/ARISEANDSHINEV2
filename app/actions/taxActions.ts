"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTravelFee } from "@/lib/travelFee";
import type { ExpenseCategoryId } from "@/lib/mileage";

// ── Types ──────────────────────────────────────────────────────────────────────

export type MileageEntry = {
  id: string;
  booking_date: string;
  customer_name: string | null;
  service_name: string | null;
  service_address: string | null;
  distance_miles: number | null;
  total_price: number;
  status: string;
};

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategoryId;
  amount: number;
  vendor: string | null;
  description: string | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  notes: string | null;
  created_at: string;
};

export type TaxReportData = {
  year: number;
  mileage: {
    totalMiles: number;
    tripCount: number;
    missingCount: number;
  };
  expenses: {
    total: number;
    byCategory: { category: string; amount: number; count: number }[];
  };
};

// ── Mileage ────────────────────────────────────────────────────────────────────

export async function getMileageLog(year: number, month?: number): Promise<MileageEntry[]> {
  const supabase = createAdminClient();

  const start = month
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : `${year}-01-01`;
  const end = month
    ? new Date(year, month, 0).toISOString().slice(0, 10)
    : `${year}-12-31`;

  const { data } = await supabase
    .from("bookings")
    .select("id, booking_date, customer_name, service_name, service_address, distance_miles, total_price, status")
    .neq("status", "cancelled")
    .gte("booking_date", start)
    .lte("booking_date", end)
    .not("notes", "ilike", "%Personal Block%")
    .order("booking_date", { ascending: false });

  return (data ?? []) as MileageEntry[];
}

/**
 * Batch Distance Matrix call — up to 25 destinations in one API request.
 * Returns an array of distances (miles) in the same order as the input addresses.
 * Returns null for any address that couldn't be routed.
 */
async function batchGetDistances(addresses: string[]): Promise<(number | null)[]> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!key?.trim()) return addresses.map(() => null);

  const ORIGIN = "209 Porterwood Dr, Williston, VT";
  const params = new URLSearchParams({
    origins:      ORIGIN,
    destinations: addresses.join("|"),
    key:          key.trim(),
    units:        "imperial",
  });

  const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ariseandshinevt.com").replace(/\/$/, "");

  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
      // Include Referer so API keys with HTTP referrer restrictions work server-side
      { headers: { Referer: SITE } }
    );
    const data = await res.json();

    if (data.status !== "OK") {
      console.error("[batchGetDistances] API status:", data.status, data.error_message ?? "");
      return addresses.map(() => null);
    }

    const elements: any[] = data.rows?.[0]?.elements ?? [];
    return elements.map((el: any) => {
      if (el.status !== "OK") return null;
      const meters = el.distance?.value ?? 0;
      return meters > 0 ? Math.round((meters / 1609.34) * 100) / 100 : null;
    });
  } catch (err) {
    console.error("[batchGetDistances] fetch error:", err);
    return addresses.map(() => null);
  }
}

export async function backfillDistances(): Promise<{ processed: number; failed: number; remaining: number; error?: string }> {
  const supabase = createAdminClient();

  // Fetch ALL bookings with a service address — select distance_miles so we can filter in JS.
  // Avoid .or() filters on distance_miles to prevent silent PostgREST failures.
  const { data: allBookings, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, service_address, distance_miles")
    .not("service_address", "is", null)
    .neq("status", "cancelled")
    .not("notes", "ilike", "%Personal Block%")
    .limit(1000);

  if (fetchErr) {
    console.error("[backfillDistances] fetch error:", fetchErr.message);
    return { processed: 0, failed: 0, remaining: 0, error: fetchErr.message };
  }

  // Filter in JS: only entries that are missing or have 0 (a previous failed run stored 0)
  const bookings = (allBookings ?? []).filter(b => !b.distance_miles || Number(b.distance_miles) === 0);

  if (!bookings.length) return { processed: 0, failed: 0, remaining: 0 };

  let processed = 0;
  let failed    = 0;
  const BATCH   = 25;

  for (let i = 0; i < bookings.length; i += BATCH) {
    const chunk     = bookings.slice(i, i + BATCH);
    const addresses = chunk.map(b => b.service_address as string);
    const distances = await batchGetDistances(addresses);

    for (let j = 0; j < chunk.length; j++) {
      const dist = distances[j];
      if (dist !== null && dist > 0) {
        const { error: upErr } = await supabase
          .from("bookings")
          .update({ distance_miles: dist })
          .eq("id", chunk[j].id);
        if (upErr) {
          console.error("[backfillDistances] update error:", upErr.message);
          failed++;
        } else {
          processed++;
        }
      } else {
        failed++; // unroutable — leave null so it can be retried
      }
    }
  }

  const remaining = bookings.length - processed;
  return { processed, failed, remaining };
}

// ── Expenses ───────────────────────────────────────────────────────────────────

export async function getExpenses(year: number, month?: number, category?: string): Promise<Expense[]> {
  const supabase = createAdminClient();

  const start = month
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : `${year}-01-01`;
  const end = month
    ? new Date(year, month, 0).toISOString().slice(0, 10)
    : `${year}-12-31`;

  let q = supabase
    .from("business_expenses")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false });

  if (category && category !== "all") {
    q = q.eq("category", category);
  }

  const { data } = await q;
  return (data ?? []) as Expense[];
}

export async function createExpense(data: {
  date: string;
  category: ExpenseCategoryId;
  amount: number;
  vendor?: string;
  description?: string;
  receipt_url?: string;
  receipt_filename?: string;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  const { data: result, error } = await supabase
    .from("business_expenses")
    .insert({
      date:             data.date,
      category:         data.category,
      amount:           data.amount,
      vendor:           data.vendor || null,
      description:      data.description || null,
      receipt_url:      data.receipt_url || null,
      receipt_filename: data.receipt_filename || null,
      notes:            data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: result.id };
}

export async function updateExpense(
  id: string,
  data: Partial<{
    date: string;
    category: ExpenseCategoryId;
    amount: number;
    vendor: string;
    description: string;
    notes: string;
  }>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("business_expenses")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("business_expenses")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadReceipt(
  formData: FormData
): Promise<{ ok: boolean; url?: string; filename?: string; error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "No file provided" };

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const storageName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("receipts")
    .upload(storageName, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(storageName);
  return { ok: true, url: urlData.publicUrl, filename: file.name };
}

// ── Tax Report ─────────────────────────────────────────────────────────────────

export async function getTaxReport(year: number): Promise<TaxReportData> {
  const supabase = createAdminClient();

  const [{ data: bookings }, { data: expenses }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, distance_miles, service_address")
      .neq("status", "cancelled")
      .gte("booking_date", `${year}-01-01`)
      .lte("booking_date", `${year}-12-31`)
      .not("notes", "ilike", "%Personal Block%"),
    supabase
      .from("business_expenses")
      .select("category, amount")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`),
  ]);

  const withAddress = (bookings ?? []).filter(b => b.service_address);
  const tripCount   = withAddress.length;
  const missingCount = withAddress.filter(b => b.distance_miles === null || b.distance_miles === undefined).length;
  const totalMiles  = withAddress.reduce((sum, b) => sum + (Number(b.distance_miles) || 0), 0);

  const expTotal = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  const catMap   = new Map<string, { amount: number; count: number }>();
  for (const e of expenses ?? []) {
    const cur = catMap.get(e.category) ?? { amount: 0, count: 0 };
    catMap.set(e.category, { amount: cur.amount + Number(e.amount), count: cur.count + 1 });
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.amount - a.amount);

  return {
    year,
    mileage: { totalMiles: Math.round(totalMiles * 100) / 100, tripCount, missingCount },
    expenses: { total: expTotal, byCategory },
  };
}
