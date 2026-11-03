import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("orders").select("order_number, name, email, status, payment_method, payment_status, total_cents, carrier, tracking_number, placed_at").order("placed_at", { ascending: false }).limit(5000);

  const header = "Order,Customer,Email,Status,Payment,Payment Status,Total (USD),Carrier,Tracking,Placed\n";
  const rows = (data ?? []).map(r => [
    r.order_number, r.name, r.email, r.status, r.payment_method, r.payment_status,
    (r.total_cents / 100).toFixed(2), r.carrier || "", r.tracking_number || "",
    new Date(r.placed_at).toLocaleDateString()
  ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(header + rows, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"confetti-orders.csv\"" }
  });
}