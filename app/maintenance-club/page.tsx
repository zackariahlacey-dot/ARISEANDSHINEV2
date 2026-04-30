import { redirect } from "next/navigation";

export default function MaintenanceClubRedirect() {
  redirect("/protected");
}
