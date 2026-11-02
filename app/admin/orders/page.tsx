"use client";

import AdminShell from "@/components/admin/AdminShell";
import OrdersContent from "./_content";

export default function AdminOrdersPage() {
  return (
    <AdminShell>
      <OrdersContent />
    </AdminShell>
  );
}