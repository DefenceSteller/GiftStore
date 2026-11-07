import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const supabase = createServiceClient();
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "7d";

  // Determine date ranges
  const now = new Date();
  const hours: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "30d": 30 };
  const days = hours[period] || 7;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // ── KPIs ────────────────────────────────────────────────────────
  const [{ count: visits7d }, { count: uniques7d }] = await Promise.all([
    supabase.from("traffic_events").select("*", { count: "exact", head: true }).gte("created_at", startDate),
    supabase.from("traffic_events").select("visitor_id", { count: "exact", head: true }).gte("created_at", startDate).neq("visitor_id", null),
  ]);

  const { data: cartEvents, error: cartErr } = await supabase
    .from("traffic_events").select("id").gte("created_at", startDate).eq("type", "add_to_cart");
  const { data: checkoutEvents } = await supabase
    .from("traffic_events").select("id").gte("created_at", startDate).eq("type", "checkout_start");
  const { data: orders30d } = await supabase
    .from("orders").select("id").gte("placed_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .not("status", "in", "('cancelled','refunded')");

  const addToCartRate = visits7d ? Math.round((cartEvents?.length ?? 0) / visits7d * 1000) / 10 : 0;
  const cartCount = cartEvents?.length ?? 0;
  const checkoutCount = checkoutEvents?.length ?? 0;
  const checkoutRate = cartCount > 0
    ? Math.round(checkoutCount / cartCount * 1000) / 10
    : 0;
  const purchaseRate = checkoutCount > 0
    ? Math.round(((orders30d?.length ?? 0)) / checkoutCount * 100) : 0;

  // ── Traffic by hour (aggregated across all days in period) ─────
  const { data: hourlyRows } = await supabase
    .from("traffic_events")
    .select("created_at")
    .gte("created_at", startDate)
    .eq("type", "pageview");

  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  for (const row of hourlyRows || []) {
    const hour = new Date(row.created_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  }
  const hourly = Array.from(hourlyMap.entries()).map(([hour, visits]) => ({ hour, visits }));

  // ── Traffic sources ────────────────────────────────────────────
  const { data: sourceRows } = await supabase
    .from("traffic_events")
    .select("source, visitor_id")
    .gte("created_at", startDate)
    .eq("type", "pageview");

  const sourceMap = new Map<string, { visits: number; uniques: Set<string> }>();
  for (const row of sourceRows || []) {
    const cur = sourceMap.get(row.source) ?? { visits: 0, uniques: new Set() };
    cur.visits++;
    if (row.visitor_id) cur.uniques.add(row.visitor_id);
    sourceMap.set(row.source, cur);
  }
  const sources = Array.from(sourceMap.entries())
    .map(([source, v]) => ({ source, visits: v.visits, uniques: v.uniques.size }))
    .sort((a, b) => b.visits - a.visits);

  // ── Conversion funnel ──────────────────────────────────────────
  const { data: pvData } = await supabase
    .from("traffic_events").select("id").gte("created_at", startDate).eq("type", "pageview");
  const { data: prodData } = await supabase
    .from("traffic_events").select("id").gte("created_at", startDate).eq("type", "product_view");
  const { data: cartData } = await supabase
    .from("traffic_events").select("id").gte("created_at", startDate).eq("type", "add_to_cart");
  const { data: coData } = await supabase
    .from("traffic_events").select("id").gte("created_at", startDate).eq("type", "checkout_start");

  const funnel = [
    { stage: "Sessions", count: pvData?.length ?? 0 },
    { stage: "Product views", count: prodData?.length ?? 0 },
    { stage: "Added to bag", count: cartData?.length ?? 0 },
    { stage: "Checkout started", count: coData?.length ?? 0 },
    { stage: "Orders", count: orders30d?.length ?? 0 },
  ];

  return NextResponse.json({
    kpis: {
      visits7d: visits7d ?? 0,
      uniques7d: uniques7d ?? 0,
      addToCartRate,
      checkoutRate,
      purchaseRate,
    },
    hourly,
    sources,
    funnel,
  });
}
