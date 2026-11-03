import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { count: activeVisitors },
    { data: todayOrders },
    { data: recentEvents },
  ] = await Promise.all([
    // Active visitors = unique visitor_ids in traffic_events in last 5m
    supabase.from("traffic_events").select("visitor_id", { count: "exact", head: true })
      .gte("created_at", new Date(now.getTime() - 5 * 60 * 1000).toISOString()),
    // Orders today
    supabase.from("orders").select("total_cents")
      .gte("placed_at", todayStart)
      .not("status", "in", "('cancelled','refunded')"),
    // Recent activity stream
    supabase.from("traffic_events").select("type, path, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const ordersToday = todayOrders?.length ?? 0;
  const revenueTodayCents = todayOrders?.reduce((sum, o) => sum + o.total_cents, 0) ?? 0;

  return NextResponse.json({
    activeVisitors: activeVisitors ?? 0,
    requestsPerMinute: 0, // Mock for now
    pageviews5m: activeVisitors ?? 0,
    ordersToday,
    revenueTodayCents,
    recent: recentEvents?.map(e => ({
      type: e.type,
      path: e.path,
      at: new Date(e.created_at).getTime()
    })),
    system: {
      uptimeSec: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      node: "v20.0.0",
      dbSizeMb: 0
    }
  });
}