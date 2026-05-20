import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listJobPhotos } from "@/app/actions/jobPhotoActions";
import { JobExecutionShell } from "@/components/contractor/JobExecutionShell";
import { buildPhotoChecklist } from "@/lib/jobPhotos";

async function ContractorJobPage({ id }: { id: string }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/protected/jobs/${id}`);

  const admin = createAdminClient();
  const { data: roleRow } = await admin
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  const role = (roleRow as { role?: string } | null)?.role;
  if (role !== "contractor") {
    redirect("/protected");
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id, booking_date, booking_time, service_name, customer_name, customer_phone, service_address, vehicle_year, vehicle_make, vehicle_model, vehicle_size, total_price, addons_json, additional_vehicles_json, status, assigned_to, accepted_at, on_my_way_at, arrived_at, started_at, job_completed_at, photo_review_status, base_commission_cents, tip_cents, notes")
    .eq("id", id)
    .maybeSingle();

  if (!booking) notFound();
  if ((booking as any).assigned_to !== user.id) {
    // Wrong contractor — back to dashboard
    redirect("/protected");
  }

  const photos = await listJobPhotos(id);
  const checklist = buildPhotoChecklist((booking as any).service_name as string);

  return (
    <JobExecutionShell
      booking={booking as any}
      photos={photos}
      checklist={checklist}
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <Resolver params={params} />
    </Suspense>
  );
}

async function Resolver({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractorJobPage id={id} />;
}
