import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Returns the comma-separated allowlist of admin emails. Defaults to the
 * owner's address. Env override: ADMIN_EMAILS="a@b.com,c@d.com" or single
 * ADMIN_EMAIL="a@b.com".
 */
function adminAllowlist(): string[] {
  const multi = process.env.ADMIN_EMAILS;
  if (multi) return multi.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const single = process.env.ADMIN_EMAIL ?? "zackariahlacey04@gmail.com";
  return [single.trim().toLowerCase()];
}

async function userIsAdmin(): Promise<{ ok: boolean; reason: "no-session" | "not-admin" | "ok" }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no-session" };

  // 1. profiles.role === 'admin' wins if the column exists. Read via admin
  //    client so missing-column errors don't blow up before the column is
  //    migrated in (employee portal step).
  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (row as { role?: string } | null)?.role?.toLowerCase();
    if (role === "admin") return { ok: true, reason: "ok" };
  } catch {
    // role column may not exist yet — fall through to email allowlist
  }

  // 2. Fallback: email allowlist (works today without a migration).
  const email = user.email?.trim().toLowerCase();
  if (email && adminAllowlist().includes(email)) return { ok: true, reason: "ok" };
  return { ok: false, reason: "not-admin" };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const check = await userIsAdmin();
  if (check.reason === "no-session") {
    redirect("/auth/login?redirect=/admin");
  }
  if (check.reason === "not-admin") {
    redirect("/protected");
  }
  return <AdminShell>{children}</AdminShell>;
}
