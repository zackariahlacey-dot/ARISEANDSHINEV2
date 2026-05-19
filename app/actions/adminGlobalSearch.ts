"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SearchHit =
  | {
      kind: "booking";
      id: string;
      title: string;          // "Joe Smith · 2026 Honda Accord"
      subtitle: string;       // "Sat May 18 · 10:00 AM · Full Detail"
      href: string;           // /admin/schedule?date=YYYY-MM-DD
    }
  | {
      kind: "client";
      id: string;
      title: string;          // "Joe Smith"
      subtitle: string;       // "joe@... · (802) 555-..."
      href: string;           // /admin/clients?focus=ID
    }
  | {
      kind: "subscriber";
      id: string;
      title: string;          // "Joe Smith · Interior Refresh"
      subtitle: string;       // "Active · next pick Apr 14"
      href: string;
    }
  | {
      kind: "squeeze";
      id: string;
      title: string;
      subtitle: string;
      href: string;
    };

const MAX_PER_KIND = 5;

/** Cheap admin-side global search across bookings, profiles, monthly
 *  subscriptions, and squeeze requests. Always requires an authenticated
 *  user (the admin layout has already gated the route). */
export async function adminGlobalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const like = `%${q}%`;

  // Phone-friendly: collapse the query to digits if the user typed a phone
  const digits = q.replace(/\D/g, "");
  const phoneLike = digits.length >= 3 ? `%${digits}%` : null;

  // Run all queries in parallel.
  const [bookingsRes, profilesRes, monthlyRes, squeezeRes] = await Promise.all([
    admin
      .from("bookings")
      .select("id, booking_date, booking_time, service_name, customer_name, customer_phone, customer_email, vehicle_year, vehicle_make, vehicle_model, status")
      .neq("status", "cancelled")
      .or(
        [
          `customer_name.ilike.${like}`,
          `customer_email.ilike.${like}`,
          phoneLike ? `customer_phone.ilike.${phoneLike}` : null,
          `vehicle_make.ilike.${like}`,
          `vehicle_model.ilike.${like}`,
        ].filter(Boolean).join(",")
      )
      .order("booking_date", { ascending: false })
      .limit(MAX_PER_KIND),
    admin
      .from("profiles")
      .select("id, first_name, last_name, email, phone, saved_address")
      .or(
        [
          `first_name.ilike.${like}`,
          `last_name.ilike.${like}`,
          `email.ilike.${like}`,
          phoneLike ? `phone.ilike.${phoneLike}` : null,
        ].filter(Boolean).join(",")
      )
      .limit(MAX_PER_KIND),
    admin
      .from("monthly_subscriptions")
      .select("id, customer_name, customer_email, plan_id, status")
      .or(`customer_name.ilike.${like},customer_email.ilike.${like}`)
      .limit(MAX_PER_KIND),
    admin
      .from("squeeze_requests")
      .select("id, name, phone, email, service_type, urgency, status, created_at")
      .or(
        [
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          phoneLike ? `phone.ilike.${phoneLike}` : null,
        ].filter(Boolean).join(",")
      )
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(MAX_PER_KIND),
  ]);

  const hits: SearchHit[] = [];

  for (const b of bookingsRes.data ?? []) {
    const vehicle = [b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");
    const date = b.booking_date as string;
    let dateLabel = date;
    try {
      dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch {}
    hits.push({
      kind: "booking",
      id: b.id,
      title: `${b.customer_name ?? "—"}${vehicle ? ` · ${vehicle}` : ""}`,
      subtitle: `${dateLabel}${b.booking_time ? ` · ${b.booking_time}` : ""}${b.service_name ? ` · ${b.service_name}` : ""}`,
      href: `/admin/schedule?date=${date}`,
    });
  }

  for (const p of profilesRes.data ?? []) {
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "(no name)";
    const subParts: string[] = [];
    if (p.email) subParts.push(p.email);
    if (p.phone) subParts.push(p.phone);
    hits.push({
      kind: "client",
      id: p.id as string,
      title: fullName,
      subtitle: subParts.join(" · ") || "—",
      href: `/admin/clients?focus=${p.id}`,
    });
  }

  for (const s of monthlyRes.data ?? []) {
    hits.push({
      kind: "subscriber",
      id: s.id as string,
      title: `${s.customer_name ?? "—"}${s.plan_id ? ` · ${s.plan_id}` : ""}`,
      subtitle: s.status ?? "—",
      href: `/admin/monthly?focus=${s.id}`,
    });
  }

  for (const r of squeezeRes.data ?? []) {
    hits.push({
      kind: "squeeze",
      id: r.id as string,
      title: `${r.name ?? "—"} · ${r.service_type ?? ""}`,
      subtitle: `${r.urgency ?? ""} · ${r.status ?? ""}`,
      href: `/admin/squeeze?focus=${r.id}`,
    });
  }

  return hits;
}
