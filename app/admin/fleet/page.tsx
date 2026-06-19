import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listFleetInquiries } from "@/app/actions/adminFleetActions";
import { FleetInquiryAdminClient } from "./_client";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "zackariahlacey@gmail.com";

export default async function AdminFleetPage() {
  // Admin gate — same pattern as other admin pages
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const inquiries = await listFleetInquiries();
  return (
    <Suspense>
      <FleetInquiryAdminClient initialInquiries={inquiries} />
    </Suspense>
  );
}
