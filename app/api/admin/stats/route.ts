import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Revenue today & yesterday
  const [{ data: revToday }, { data: revYesterday }] = await Promise.all([
    supabase.from("orders").select("total_cents, orders: count")
      .gte("placed_at", todayStart)
      .not("status", "in", "('cancelled','refunded')"),
    supabase.from("orders").select("total_cents")
      .gte("placed_at", yesterdayStart).lt("placed_at", todayStart)
      .not("status", "in", "('cancelled','refunded')"),
  ]);

  const revenueToday = revToday?.reduce((s, o) => s + o.total_cents, 0) ?? 0;
  const revenueYesterday = revYesterday?.reduce((s, o) => s + o.total_cents, 0) ?? 0;
  const ordersToday = revToday?.length ?? 0;
  const ordersYesterday = revYesterday?.length ?? 0;

  // Revenue 30d
  const { data: rev30 } = await supabase.from("orders").select("total_cents")
    .gte("placed_at", d30).not("status", "in", "('cancelled','refunded')");
  const revenue30d = rev30?.reduce((s, o) => s + o.total_cents, 0) ?? 0;

  // Open orders
  const { count: openOrders } = await supabase.from("orders").select("*", { count: "exact", head: true })
    .in("status", ["pending", "paid", "packed"]);

  // Status breakdown
  const statuses = ["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
  const statusCounts: Record<string, number> = {};
  const statusRevenue: Record<string, number> = {};
  for (const s of statuses) {
    const { data } = await supabase.from("orders").select("total_cents").eq("status", s);
    statusCounts[s] = data?.length ?? 0;
    statusRevenue[s] = data?.reduce((sum, o) => sum + o.total_cents, 0) ?? 0;
  }

  // Recent orders
  const { data: recent } = await supabase.from("orders").select("*")
    .order("placed_at", { ascending: false }).limit(8);

  // Low stock
  const { data: lowStock } = await supabase.from("products").select("id, name, slug, emoji, stock, price_cents")
    .eq("is_active", true).lte("stock", 6).order("stock", { ascending: true }).limit(6);

  // Top products 30d
  const { data: topProducts } = await supabase.from("order_items").select("name, emoji, qty, line_total_cents")
    .gte("created_at", d30);

  return NextResponse.json({
    generatedAt: now.getTime(),
    kpi: {
      revenueToday,
      revenueDelta: revenueYesterday ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 1000) / 10 : (revenueToday > 0 ? 100 : 0),
      ordersToday,
      ordersDelta: ordersYesterday ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 1000) / 10 : (ordersToday > 0 ? 100 : 0),
      aovToday: ordersToday ? Math.round(revenueToday / ordersToday) : 0,
      aovDelta: 0,
      conversionRate: 0,
      conversionDelta: 0,
      visitsToday: 0,
      visitsDelta: 0,
      customersTotal: 0,
      newCustomersToday: 0,
      openOrders: openOrders ?? 0,
      lowStock: lowStock?.length ?? 0,
      revenue30d,
      orders30d: rev30?.length ?? 0,
      activeVisitors: 0
    },
    charts: {
      revenue: [],
      traffic: [],
      status: statuses.map(s => ({ status: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: statusCounts[s], revenue: statusRevenue[s] })),
      topProducts: [],
      funnel: []
    },
    recentOrders: recent?.map(o => ({
      id: o.id, orderNumber: o.order_number, name: o.name, email: o.email,
      totalCents: o.total_cents, status: o.status,
      placedAt: new Date(o.placed_at).getTime(), itemCount: o.item_count, emoji: "🎁", source: o.source
    })),
    activity: [],
    lowStockList: lowStock?.map(p => ({
      id: p.id, name: p.name, slug: p.slug, emoji: p.emoji, stock: p.stock, priceCents: p.price_cents
    }))
  });
}