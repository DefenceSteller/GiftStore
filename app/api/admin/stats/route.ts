import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // ── KPIs: revenue today / yesterday / 30d, open orders ──────────────────────
  const [{ data: revToday }, { data: revYesterday }, { data: rev30 }, { count: openOrders }] = await Promise.all([
    supabase.from("orders").select("total_cents").gte("placed_at", todayStart).not("status", "in", "('cancelled','refunded')"),
    supabase.from("orders").select("total_cents").gte("placed_at", yesterdayStart).lt("placed_at", todayStart).not("status", "in", "('cancelled','refunded')"),
    supabase.from("orders").select("total_cents").gte("placed_at", d30).not("status", "in", "('cancelled','refunded')"),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "paid", "packed"]),
  ]);

  const revenueToday = revToday?.reduce((s: number, o: any) => s + o.total_cents, 0) ?? 0;
  const revenueYesterday = revYesterday?.reduce((s: number, o: any) => s + o.total_cents, 0) ?? 0;
  const ordersToday = revToday?.length ?? 0;
  const ordersYesterday = revYesterday?.length ?? 0;
  const revenue30d = rev30?.reduce((s: number, o: any) => s + o.total_cents, 0) ?? 0;
  const orders30d = rev30?.length ?? 0;

  // ── Recent orders (last 8) + low-stock products ────────────────────────────
  const [{ data: recent }, { data: lowStock }] = await Promise.all([
    supabase.from("orders").select("id, order_number, total_cents, status, item_count, placed_at, name, source")
      .order("placed_at", { ascending: false }).limit(8),
    supabase.from("products").select("id, name, slug, emoji, stock, price_cents")
      .eq("is_active", true).lte("stock", 6).order("stock", { ascending: true }).limit(6),
  ]);

  // ── Status breakdown ────────────────────────────────────────────────────────
  const statuses = ["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
  const statusResults = await Promise.all(
    statuses.map(s => supabase.from("orders").select("id").eq("status", s))
  );
  const statusCounts = Object.fromEntries(statuses.map((s, i) => [s, statusResults[i]?.data?.length ?? 0]));

  // ── Top products (30d aggregate from order_items) ───────────────────────────
  const { data: oiData } = await supabase
    .from("order_items").select("name, emoji, qty, line_total_cents").gte("created_at", d30);
  const topMap = new Map<string, { name: string; emoji: string; revenueCents: number; qtySold: number }>();
  for (const item of oiData ?? []) {
    const k = item.name || "Unknown";
    const cur = topMap.get(k) ?? { name: k, emoji: item.emoji || "🎁", revenueCents: 0, qtySold: 0 };
    cur.revenueCents += item.line_total_cents ?? 0;
    cur.qtySold += item.qty ?? 0;
    if (item.emoji) cur.emoji = item.emoji;
    topMap.set(k, cur);
  }
  const topProducts = Array.from(topMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  // ── Daily revenue & orders for last 14 days (single query, grouped client-side)
  const { data: dailyOrders } = await supabase
    .from("orders")
    .select("total_cents, placed_at, status")
    .gte("placed_at", d14)
    .not("status", "in", "('cancelled','refunded')");
  const dailyMap = new Map<string, { revenueCents: number; orderCount: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { revenueCents: 0, orderCount: 0 });
  }
  for (const o of dailyOrders ?? []) {
    const key = o.placed_at.slice(0, 10);
    const bucket = dailyMap.get(key) ?? { revenueCents: 0, orderCount: 0 };
    bucket.revenueCents += o.total_cents;
    bucket.orderCount += 1;
    dailyMap.set(key, bucket);
  }
  const dailyRevenue = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({ label, ...v }));

  // ── Traffic events per day (pageviews) ─────────────────────────────────────
  const { data: pvRows } = await supabase
    .from("traffic_events")
    .select("created_at")
    .gte("created_at", d14)
    .eq("type", "pageview");
  const pvDaily = new Map<string, number>();
  for (const row of pvRows ?? []) {
    const key = row.created_at.slice(0, 10);
    pvDaily.set(key, (pvDaily.get(key) ?? 0) + 1);
  }

  return NextResponse.json({
    generatedAt: now.getTime(),
    kpi: {
      revenueToday,
      revenueDelta: revenueYesterday ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 1000) / 10 : (revenueToday > 0 ? 100 : 0),
      ordersToday,
      ordersDelta: ordersYesterday ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 1000) / 10 : (ordersToday > 0 ? 100 : 0),
      aovToday: ordersToday ? Math.round(revenueToday / ordersToday) : 0,
      openOrders: openOrders ?? 0,
      lowStock: lowStock?.length ?? 0,
      revenue30d,
      orders30d,
    },
    charts: {
      dailyRevenue,
      dailyVisitors: dailyRevenue.map(dp => pvDaily.get(dp.label) ?? 0),
      status: statuses.map(s => ({ status: s, count: statusCounts[s] })),
      topProducts,
    },
    recentOrders: (recent ?? []).map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      name: o.name,
      totalCents: o.total_cents,
      status: o.status,
      placedAt: new Date(o.placed_at).getTime(),
      itemCount: o.item_count,
      emoji: "🎁",
      source: o.source,
    })),
    lowStockList: (lowStock ?? []).map(p => ({
      id: p.id, name: p.name, slug: p.slug, emoji: p.emoji, stock: p.stock, priceCents: p.price_cents
    }))
  });
}
