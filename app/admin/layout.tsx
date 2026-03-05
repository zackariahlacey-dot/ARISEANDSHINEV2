import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

const ADMIN_EMAILS = [
  "zackariahlacey@gmail.com",
  "zackariahlacey04@gmail.com",
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    redirect("/");
  }

  return (
    <AdminShell adminEmail={user.email!}>
      {children}
    </AdminShell>
  );
}
