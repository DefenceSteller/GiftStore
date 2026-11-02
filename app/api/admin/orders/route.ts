import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  let query = supabase.from("orders").select("*", { count: "exact" });

  if (status !== "all") {
    if (status === "open") {
      query = query.in("status", ["pending", "paid", "packed", "shipped"]);
    } else {
      query = query.eq("status", status);
    }
  }

  if (q) {
    query = query.or(`order_number.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, count, error } = await query
    .order("placed_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Status counts
  const statuses = ["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
  const statusCounts: Record<string, number> = {};
  for (const s of statuses) {
    const { count: c } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", s);
    statusCounts[s] = c ?? 0;
  }

  return NextResponse.json({
    items: data?.map(o => ({
      id: o.id, orderNumber: o.order_number, name: o.name, email: o.email,
      totalCents: o.total_cents, status: o.status, paymentMethod: o.payment_method,
      paymentStatus: o.payment_status, placedAt: new Date(o.placed_at).getTime(),
      itemCount: o.item_count, source: o.source, trackingNumber: o.tracking_number, carrier: o.carrier, emoji: "🎁"
    })) ?? [],
    total: count ?? 0, page, limit,
    pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    statusCounts
  });
}