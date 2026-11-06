import AdminShell from "@/components/admin/AdminShell";
import OverviewContent from "./_overview";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <OverviewContent />
    </AdminShell>
  );
}