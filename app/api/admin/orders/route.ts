import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const supabase = createServiceClient();
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

  // Fetch order_items for every order on this page (one query, then group)
  const orderIds = (data || []).map(o => o.id);
  const { data: allItems } = await supabase
    .from("order_items")
    .select("id, order_id, name, slug, qty, unit_price_cents, line_total_cents, emoji")
    .in("order_id", orderIds.length ? orderIds : ["__none__"]);

  const itemsByOrder: Record<string, any[]> = {};
  for (const it of allItems || []) {
    if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
    itemsByOrder[it.order_id].push({
      id: it.id,
      name: it.name,
      slug: it.slug || "",
      emoji: it.emoji || "🎁",
      qty: it.qty,
      unitPriceCents: it.unit_price_cents ?? 0,
      lineTotalCents: it.line_total_cents ?? 0,
    });
  }

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
      itemCount: o.item_count, source: o.source, trackingNumber: o.tracking_number, carrier: o.carrier, emoji: "🎁",
      items: itemsByOrder[o.id] || [],
    })) ?? [],
    total: count ?? 0, page, limit,
    pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    statusCounts
  });
}