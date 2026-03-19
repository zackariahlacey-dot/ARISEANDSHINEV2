import { AdminShell } from "@/components/admin_v2/AdminShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <AdminShell>
        {children}
      </AdminShell>
    </div>
  );
}
