import { Suspense } from "react";
import { listFleetInquiries } from "@/app/actions/adminFleetActions";
import { FleetInquiryAdminClient } from "./_client";

// Auth is handled by the parent admin layout — no need to re-gate here.
export const dynamic = "force-dynamic";

export default async function AdminFleetPage() {
  const inquiries = await listFleetInquiries();
  return (
    <Suspense>
      <FleetInquiryAdminClient initialInquiries={inquiries} />
    </Suspense>
  );
}
