"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE — inline edit any CRM field
// ─────────────────────────────────────────────────────────────────────────────
export type ProfilePatch = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  loyalty_discount_pct?: number | null;
  reward_points?: number | null;
  tags?: string[] | null;
  do_not_contact?: boolean | null;
  lifecycle_stage?: "lead" | "active" | "lapsed" | "churned" | "vip" | null;
};

const ALLOWED_FIELDS = new Set([
  "first_name", "last_name", "phone", "email", "address", "notes",
  "loyalty_discount_pct", "reward_points", "tags", "do_not_contact",
  "lifecycle_stage",
]);

export async function updateProfileFields(
  profileId: string,
  patch: ProfilePatch,
): Promise<{ ok: boolean; error?: string }> {
  if (!profileId) return { ok: false, error: "Missing profile id." };
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (v === undefined) continue;
    clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return { ok: false, error: "Nothing to update." };

  // Normalize phone to 10 digits
  if (typeof clean.phone === "string") {
    const d = clean.phone.replace(/\D/g, "");
    clean.phone = (d.length === 11 && d.startsWith("1") ? d.slice(1) : d).slice(0, 10) || null;
  }
  if (typeof clean.email === "string") {
    clean.email = (clean.email as string).trim().toLowerCase() || null;
  }

  clean.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update(clean).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// TAGS — add / remove single
// ─────────────────────────────────────────────────────────────────────────────
export async function addProfileTag(profileId: string, tag: string): Promise<{ ok: boolean; tags?: string[]; error?: string }> {
  const clean = tag.trim();
  if (!clean) return { ok: false, error: "Empty tag." };
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("tags").eq("id", profileId).maybeSingle();
  const existing: string[] = Array.isArray(data?.tags) ? (data!.tags as string[]) : [];
  if (existing.includes(clean)) return { ok: true, tags: existing };
  const next = [...existing, clean];
  const { error } = await supabase.from("profiles").update({ tags: next, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, tags: next };
}

export async function removeProfileTag(profileId: string, tag: string): Promise<{ ok: boolean; tags?: string[]; error?: string }> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("tags").eq("id", profileId).maybeSingle();
  const existing: string[] = Array.isArray(data?.tags) ? (data!.tags as string[]) : [];
  const next = existing.filter(t => t !== tag);
  const { error } = await supabase.from("profiles").update({ tags: next, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, tags: next };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT TASKS — follow-ups
// ─────────────────────────────────────────────────────────────────────────────
export type ClientTask = {
  id: string;
  profile_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function listClientTasks(profileId: string): Promise<ClientTask[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_tasks")
    .select("*")
    .eq("profile_id", profileId)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as ClientTask[];
}

export async function listOpenTasksForToday(): Promise<(ClientTask & { profile: { first_name: string | null; last_name: string | null; phone: string | null } })[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("client_tasks")
    .select("*, profile:profile_id(first_name, last_name, phone)")
    .is("completed_at", null)
    .lte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(20);
  return (data ?? []) as any;
}

export async function addClientTask(
  profileId: string,
  payload: { title: string; notes?: string; due_date?: string | null },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!payload.title?.trim()) return { ok: false, error: "Title required." };
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_tasks")
    .insert({
      profile_id: profileId,
      title: payload.title.trim(),
      notes: payload.notes?.trim() || null,
      due_date: payload.due_date || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function toggleClientTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from("client_tasks")
    .select("completed_at")
    .eq("id", taskId)
    .maybeSingle();
  if (!current) return { ok: false, error: "Task not found." };
  const next = current.completed_at ? null : new Date().toISOString();
  const { error } = await supabase
    .from("client_tasks")
    .update({ completed_at: next, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteClientTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("client_tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS — list + pause/resume/cancel
// ─────────────────────────────────────────────────────────────────────────────
export type AdminSubscriptionRow = {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  payment_method: string;
  status: string;
  signup_date: string;
  stripe_subscription_id: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
};

export async function listProfileSubscriptions(profileId: string): Promise<AdminSubscriptionRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("monthly_subscriptions")
    .select("id, plan_id, plan_name, plan_price, payment_method, status, signup_date, stripe_subscription_id, vehicle_make, vehicle_model")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AdminSubscriptionRow[];
}

export async function adminPauseSubscription(subId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("stripe_subscription_id")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Subscription not found." };

  if (sub.stripe_subscription_id) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: { behavior: "void" },
      }).catch(err => console.error("[adminPauseSubscription]", err));
    }
  }
  const { error } = await supabase
    .from("monthly_subscriptions")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", subId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminResumeSubscription(subId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("stripe_subscription_id")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Subscription not found." };

  if (sub.stripe_subscription_id) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: null as any,
      }).catch(err => console.error("[adminResumeSubscription]", err));
    }
  }
  const { error } = await supabase
    .from("monthly_subscriptions")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", subId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminCancelSubscription(subId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("monthly_subscriptions")
    .select("stripe_subscription_id, profile_id")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Subscription not found." };

  if (sub.stripe_subscription_id) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
      await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(err => console.error("[adminCancelSubscription]", err));
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("monthly_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", subId);

  // Cancel future bookings tied to this plan
  if (sub.profile_id) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("user_id", sub.profile_id)
      .gte("booking_date", today)
      .ilike("notes", "%Monthly plan:%")
      .neq("status", "cancelled");
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL HISTORY — for the client modal History tab
// ─────────────────────────────────────────────────────────────────────────────
export type EmailHistoryRow = {
  id: string;
  event: string;
  to_email: string;
  subject: string | null;
  created_at: string;
};

export async function listClientEmailHistory(email: string | null): Promise<EmailHistoryRow[]> {
  if (!email) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_events")
    .select("id, event, to_email, subject, created_at")
    .ilike("to_email", email)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as EmailHistoryRow[];
}

// Lifecycle compute helper lives in adminActions.ts as `computeStage` since the
// "use server" directive bans synchronous exports. This file used to export a
// duplicate — removed to fix the Next.js build error.
