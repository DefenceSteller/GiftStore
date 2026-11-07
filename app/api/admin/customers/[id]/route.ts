import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createServiceClient();
  const id = params.id;

  // 1) Profile
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, email, created_at")
    .eq("id", id)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 2) Customers table row (name, city, phone)
  const { data: custRow } = await supabase
    .from("customers")
    .select("name, city, phone")
    .eq("profiles_id", id)
    .maybeSingle();

  // 3) All orders for this customer
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total_cents, status, placed_at, payment_method, payment_status")
    .eq("customer_id", id)
    .order("placed_at", { ascending: false });

  const orderList = orders ?? [];
  const ltv = orderList
    .filter((o: any) => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((s: number, o: any) => s + o.total_cents, 0);

  return NextResponse.json({
    customer: {
      id: profile.id,
      email: profile.email,
      name: custRow?.name || "",
      city: custRow?.city || "",
      phone: custRow?.phone || "",
      createdAt: new Date(profile.created_at).getTime(),
      orderCount: orderList.length,
      ltvCents: ltv,
    },
    orders: orderList.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      totalCents: o.total_cents,
      status: o.status,
      placedAt: new Date(o.placed_at).getTime(),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
    })),
  });
}