'use client'
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  useEffect(() => {;
    ;(async () => {;
      const { data } = await getSessionUser();
      setUser(data);
    })();
  }, []);;

  if (!user) redirect("/auth/signin");
  if (user.role !== "admin") redirect("/");

  const supabase = createClient();
  const [period, setPeriod] = useState("30d"); // 30d, 7d, 24h
  const [periodLabel, setPeriodLabel] = useState("Last 30 Days");

  // State for metrics
  const [visits, setVisits] = useState({ total: 0, unique: 0 });
  const [orders, setOrders] = useState({ total: 0, last30d: 0 });
  const [revenue, setRevenue] = useState({ total: 0, last30d: 0 });
  const [aov, setAOV] = useState({ total: 0, last30d: 0 });

  // Funnel data
  const [funnel, setFunnel] = useState({
    sessions: 0,
    productViews: 0,
    addToCart: 0,
    checkoutStart: 0,
    purchase: 0,
  });

  // Source breakdown
  const [sourceBreakdown, setSourceBreakdown] = useState<
    Array<{ source: string; count: number }>
  >([]);

  // Top pages
  const [topPages, setTopPages] = useState<
    Array<{ path: string; views: number }>
  >([]);

  // Hourly breakdown
  const [hourlyBreakdown, setHourlyBreakdown] = useState<
    Array<{ hour: number; visitors: number }>
  >([]);

  // Fetch all analytics data
  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    // Set period label
    const labels: Record<string, string> = {
      "30d": "Last 30 Days",
      "7d": "Last 7 Days",
      "24h": "Last 24 Hours",
    };
    setPeriodLabel(labels[period] || "Last 30 Days");

    // Run queries in parallel
    const [
      metrics,
      funnelData,
      sources,
      pages,
      hourly,
    ] = await Promise.all([
      // Main metrics from orders + traffic_events
      supabase
        .from("orders")
        .select("*, traffic_events!inner(type)", { count: "exact" })
        .gte("placed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      // Funnel from order_events
      supabase
        .from("order_events")
        .select("type"),
      // Source breakdown from traffic_events
      supabase
        .from("traffic_events")
        .select("source"),
      // Top pages from traffic_events
      supabase
        .from("traffic_events")
        .select("path"),
      // Hourly breakdown from traffic_events
      supabase
        .from("traffic_events")
        .select("created_at"),
    ]);

    // Process metrics
    if (metrics.data) {
      const totalOrders = metrics.data.length;
      const last30dOrders = metrics.data.filter(
        (o: any) =>
          new Date(o.placed_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length;

      const totalRevenue = metrics.data.reduce(
        (sum: number, o: any) => sum + (o.total_cents || 0),
        0
      );
      const last30dRevenue = metrics.data
        .filter(
          (o: any) =>
            new Date(o.placed_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
        )
        .reduce(
          (sum: number, o: any) => sum + (o.total_cents || 0),
          0
        );

      const totalVisits = metrics.data.length + (metrics?.data?.length || 0);
      // Simplified: use traffic_events count for visits

      setOrders({ total: totalOrders, last30d: last30dOrders });
      setRevenue({
        total: Math.round(totalRevenue / 100),
        last30d: Math.round(last30dRevenue / 100),
      });

      // AOV
      const aovValue =
        totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
      setAOV({ total: aovValue, last30d: aovValue });
    }

    // Process funnel
    if (funnelData.data) {
      const counts = funnelData.data.reduce(
        (acc: any, cur: any) => {
          acc[cur.type] = (acc[cur.type] || 0) + 1;
          return acc;
        },
        {}
      );
      setFunnel({
        sessions: counts.sessions || 0,
        productViews: counts.product_view || 0,
        addToCart: counts.add_to_cart || 0,
        checkoutStart: counts.checkout_start || 0,
        purchase: counts.purchase || 0,
      });
    }

    // Process sources
    if (sources.data) {
      const sourceCounts: Record<string, number> = {};
      sources.data.forEach((se: any) => {
        sourceCounts[se.source] = (sourceCounts[se.source] || 0) + 1;
      });
      setSourceBreakdown(
        Object.entries(sourceCounts).map(([source, count]) => ({
          source,
          count,
        }))
      );
    }

    // Process top pages
    if (pages.data) {
      const pageCounts: Record<string, number> = {};
      pages.data.forEach((pe: any) => {
        pageCounts[pe.path] = (pageCounts[pe.path] || 0) + 1;
      });
      setTopPages(
        Object.entries(pageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([path, views]) => ({ path, views }))
      );
    }

    // Process hourly breakdown
    if (hourly.data) {
      const hourlyCounts: Record<number, number> = {};
      hourly.data.forEach((he: any) => {
        const hour = new Date(he.created_at).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
      });
      setHourlyBreakdown(
        Object.entries(hourlyCounts)
          .sort((a, b) => a[0] - b[0])
          .map(([hour, visitors]) => ({
            hour: parseInt(hour),
            visitors,
          }))
      );
    }
  }

  // Initial fetch
  ;(async () => {
    await fetchAnalytics();
  })();

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/admin" className="transition hover:text-ink">Admin</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Analytics</span>
      </nav>

      <div className="mt-6">
        {/* Period selector */}
        <div className="flex gap-2 mb-4">
          ["30d", "7d", "24h"].map((period) => {
            const isActive = period === period;
            return (
              <button
                key={period}
                onClick={() => setPeriod(period)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-iris to-acid text-white"
                    : "border border-ink/50 text-ink/70 hover:text-ink"
                }`}
              >
                {period === "30d"
                  ? "30d"
                  : period === "7d"
                  ? "7d"
                  : "24h"}
              </button>
            );
          })
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-[26x] p-4 shadow-soft">
            <div className="text-ink/60 text-xs font-bold">Visits</div>
            <div className="font-display text-3xl font-extrabold">{visits.total}</div>
            <div className="text-ink/40 text-sm">unique visitors</div>
          </div>
          <div className="bg-white rounded-[26x] p-4 shadow-soft">
            <div className="text-ink/60 text-xs font-bold">Orders</div>
            <div className="font-display text-3xl font-extrabold">{orders.last30d}</div>
            <div className="text-ink/40 text-sm">last 30 days</div>
          </div>
          <div className="bg-white rounded-[26x] p-4 shadow-soft">
            <div className="text-ink/60 text-xs font-bold">Revenue</div>
            <div className="font-display text-3xl font-extrabold">${money(
              revenue.last30d
            )}</div>
            <div className="text-ink/40 text-sm">last 30 days</div>
          </div>
          <div className="bg-white rounded-[26x] p-4 shadow-soft">
            <div className="text-ink/60 text-xs font-bold">AOV</div>
            <div className="font-display text-3xl font-extrabold">${money(
              aov.last30d
            )}</div>
            <div className="text-ink/40 text-sm">last 30 days</div>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="bg-white rounded-[26x] p-4 shadow-soft mb-6">
          <h2 className="font-display text-lg font-extrabold mb-4">
            Conversion Funnel
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between mb-1">
              <span>Sessions</span>
              <span>{funnel.sessions}</span>
            </div>
            <div>
              <div
                className={`h-4 w-full rounded-full bg-ink/10 overflow-hidden`}
                style={{ height: `${(funnel.sessions / Math.max(1, funnel.sessions + funnel.purchase)) * 100}%`, width: "100%" }}
              >
                <div
                  className={`h-full rounded-full bg-acid transition-all duration-500`}
                  style={{ width: `${(funnel.productViews / Math.max(1, funnel.sessions)) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between mb-1">
              <span>Product Views</span>
              <span>{funnel.productViews}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Add to Cart</span>
              <span>{funnel.addToCart}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Checkout Start</span>
              <span>{funnel.checkoutStart}</span>
            </div>
            <div className="flex justify-between">
              <span>Purchase</span>
              <span>{funnel.purchase}</span>
            </div>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-white rounded-[26x] p-4 shadow-soft mb-6">
          <h2 className="font-display text-lg font-extrabold mb-4">
            Traffic by Source
          </h2>
          <div className="space-y-1">
            {sourceBreakdown.map((sb) => (
              <div key={sb.source} className="flex justify-between text-xs">
                <span>{sb.source}</span>
                <span>{sb.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-[26x] p-4 shadow-soft mb-6">
          <h2 className="font-display text-lg font-extrabold mb-4">
            Top Pages
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-ink/60 border-b border-ink/8">
                  <th>Page</th>
                  <th>Views</th>
                </thead>
                <tbody>
                  {topPages.map((tp) => (
                    <tr key={tp.path} className="border-b border-ink/5">
                      <td>{tp.path}</td>
                      <td>{tp.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Hourly Breakdown */}
        <div className="bg-white rounded-[26x] p-4 shadow-soft">
          <h2 className="font-display text-lg font-extrabold mb-4">
            Hourly Visitors (Last 24h)
          </h2>
          <div className="space-y-1">
            {hourlyBreakdown.map((hb) => {
              const hourLabel = hb.hour % 12 === 0 ? 12 : hb.hour % 12;
              return (
                <div key={hb.hour} className="flex text-xs justify-between">
                  <span>{hourLabel > 12 ? hourLabel - 12 : hourLabel} {hb.hour >= 12 ? "PM" : "AM"}</span>
                  <div
                    className={`h-2 w-24 rounded-full bg-ink/10 overflow-hidden`}
                    style={{
                      width: `${(hb.visitors / Math.max(1, hourlyBreakdown.reduce((s, c) => s + c.visitors, 0))) * 100}%`,
                    }}
                  >
<div
                  className={`h-2 rounded-full bg-acid transition-all duration-500`}
                  style={{ width: "100%" }}
                >
                </div>
                  </div>
                  <span>{hb.visitors}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}