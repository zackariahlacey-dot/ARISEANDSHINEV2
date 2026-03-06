import { redirect } from "next/navigation";

/**
 * Customer dashboard (points/rewards) — redirects to the main rewards page.
 * "View Points" from the Booking Confirmed modal links here.
 */
export default function DashboardPage() {
  redirect("/protected");
}
