import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/schedule"); // Schedule is the most common entry point for daily ops
}
