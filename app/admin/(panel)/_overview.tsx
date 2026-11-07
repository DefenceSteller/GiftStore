"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

export default function OverviewContent() {
  const [stats, setStats] = useState<any>(null);
  const [live, setLive] = useState<any>(null);

  useEffect(() => {
    loadStats();
    loadLive();
    const timer = setInterval(() => { loadStats(); loadLive(); }, 15000);
    return () => clearInterval(timer);
  }, []);

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  }

  async function loadLive() {
    try {
      const res = await fetch("/api/admin/stats/live");
      const data = await res.json();
      setLive(data);
    } catch (e) { console.error(e); }
  }

  const kpis = stats?.kpi || { revenueToday: 0, ordersToday: 0, aovToday: 0, openOrders: 0, revenue30d: 0, orders30d: 0, lowStock: 0 };
  const dailyRevenue = stats?.charts?.dailyRevenue ?? [];
  const dailyVisitors = stats?.charts?.dailyVisitors ?? [];
  const topProducts = stats?.charts?.topProducts ?? [];
  const recentOrders = stats?.recentOrders ?? [];
  const lowStockList = stats?.lowStockList ?? [];
  const statusCounts = stats?.charts?.status ?? [];

  // Peak for bar chart scaling
  const maxDailyRev = Math.max(1, ...dailyRevenue.map((d: any) => d.revenueCents));
  const maxDailyVis = Math.max(1, ...dailyVisitors);

  return (
    <div className="space-y-4">
      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div id="kpi-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">Revenue today</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{money(kpis.revenueToday)}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">💸</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
            <span className={`rounded-full px-2 py-0.5 font-extrabold ${kpis.revenueDelta >= 0 ? "bg-acid/40 text-ink" : "bg-coral/30 text-coral"}`}>
              {kpis.revenueDelta >= 0 ? `+${kpis.revenueDelta}%` : `${kpis.revenueDelta}%`}
            </span>
            <span>vs yesterday</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">Orders today</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{kpis.ordersToday}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">📦</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
            <span className="rounded-full bg-butter/40 px-2 py-0.5 text-ink font-extrabold">{kpis.openOrders} open</span>
            <span>awaiting fulfillment</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">Avg order value</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{money(kpis.aovToday)}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">🧾</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
            <span>per completed order</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">30-Day Revenue</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{money(kpis.revenue30d)}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">✨</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ink/45">
            <span>{kpis.orders30d} orders total</span>
          </div>
        </div>
      </div>

      {/* ── Revenue & Orders chart + Order Pipeline ───────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Revenue &amp; orders · last 14 days</h2>
            <span className="rounded-full bg-ink/5 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-ink/50">By day</span>
          </div>
          <div className="mt-4 h-64 flex items-end gap-1.5">
            {dailyRevenue.length === 0 ? (
              <div className="flex w-full items-center justify-center text-sm font-bold text-ink/40">No order data yet</div>
            ) : (
              dailyRevenue.map((dp: any, i: number) => {
                const revH = Math.max(4, (dp.revenueCents / maxDailyRev) * 100);
                const visH = Math.max(4, (dailyVisitors[i] / maxDailyVis) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 relative group">
                    <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden whitespace-nowrap rounded-lg border border-ink/10 bg-white px-2 py-1 text-[11px] font-bold text-ink shadow-sticker-sm group-hover:block" style={{ transform: "translateX(-50%)" }}>
                      {dp.label}: {money(dp.revenueCents)} · {dp.orderCount} orders · {dailyVisitors[i]} visitors
                    </div>
                    <div className="w-full rounded-t bg-iris" style={{ height: `${revH}%`, minHeight: dp.revenueCents > 0 ? "4px" : "0" }} title={`Revenue: ${money(dp.revenueCents)}`} />
                    <div className="w-full rounded-t bg-butter/60" style={{ height: `${visH}%`, minHeight: dailyVisitors[i] > 0 ? "4px" : "0" }} title={`Visitors: ${dailyVisitors[i]}`} />
                    <span className="mt-1 text-[9px] font-bold text-ink/40">{dp.label.split("/")[1]}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-2 flex items-center justify-end gap-4 text-[11px] font-black text-ink/50">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-iris" /> Revenue</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-butter/60" /> Visitors</span>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Order pipeline</h2>
          <div className="relative mx-auto mt-4 h-44 w-44 rounded-full border-8 border-mist flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-3xl font-extrabold tabular">{kpis.orders30d}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-ink/45">all orders</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {([
              { label: "Pending", count: 0, color: "bg-butter/70" },
              { label: "Paid", count: 0, color: "bg-aqua/70" },
              { label: "Packed", count: 0, color: "bg-iris" },
              { label: "Shipped", count: 0, color: "bg-indigo-500" },
              { label: "Delivered", count: 0, color: "bg-acid" },
              { label: "Cancelled", count: 0, color: "bg-ink/20" },
              { label: "Refunded", count: 0, color: "bg-coral/60" },
            ] as const).map(s => {
              const found = statusCounts.find((x: any) => x.status === s.label.toLowerCase());
              return (
                <div key={s.label} className="flex items-center gap-2.5 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.color}`} />
                  <span className="flex-1 font-bold text-ink/70 capitalize">{s.label}</span>
                  <span className="font-black tabular">{found?.count ?? 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right Now + Recent Orders ─────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Right now</h2>
            <span className="h-2 w-2 animate-pulse rounded-full bg-iris" />
          </div>
          <div id="live-panel" className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-ink/8 pb-2">
              <span className="text-xs font-bold text-ink/55">Active visitors</span>
              <span className="font-display text-xl font-extrabold tabular">{live?.activeVisitors ?? 0}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ink/8 pb-2">
              <span className="text-xs font-bold text-ink/55">Orders today</span>
              <span className="font-display text-xl font-extrabold tabular">{live?.ordersToday ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink/55">Revenue today</span>
              <span className="font-display text-xl font-extrabold tabular">{money(live?.revenueTodayCents ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Recent orders</h2>
            <a href="/admin/orders" className="text-xs font-extrabold text-iris transition hover:text-ink">View all →</a>
          </div>
          <div id="recent-orders" className="mt-4 space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-sm font-bold text-ink/45">No recent orders.</p>
            ) : (
              recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-ink/8 p-3 hover:bg-mist/60 transition">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-sm">{o.emoji || "🎁"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">{o.name}</p>
                    <p className="truncate text-[11px] font-bold text-ink/45">#{o.orderNumber} · {o.itemCount} items</p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-base font-extrabold tabular">{money(o.totalCents)}</span>
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase ${
                      o.status === "delivered" ? "bg-acid/30 text-ink" :
                      o.status === "cancelled" || o.status === "refunded" ? "bg-ink/10 text-ink/55" :
                      "bg-butter/30 text-ink"
                    }`}>{o.status}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Top Products + Stock Alerts ───────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Top products · 30 days</h2>
          <div id="top-products" className="mt-4 space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm font-bold text-ink/45">No product sales yet this month.</p>
            ) : (
              topProducts.map((p: any) => {
                const maxRev = topProducts[0]?.revenueCents ?? 1;
                return (
                  <div key={p.name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-mist text-xs">{p.emoji || "🎁"}</span>
                        <span className="min-w-0 truncate font-extrabold text-ink">{p.name}</span>
                      </span>
                      <span className="shrink-0 font-black tabular">{money(p.revenueCents)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-iris to-acid transition-all" style={{ width: `${Math.max(2, (p.revenueCents / maxRev) * 100)}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] font-bold text-ink/45">{p.qtySold} sold</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Stock alerts</h2>
            <a href="/admin/products" className="text-xs font-extrabold text-iris transition hover:text-ink">Manage →</a>
          </div>
          <div id="low-stock" className="mt-4 space-y-2">
            {lowStockList.length === 0 ? (
              <p className="text-sm font-bold text-ink/45">Every shelf is happy. Nothing low on stock.</p>
            ) : (
              lowStockList.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-ink/8 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-sm">{p.emoji || "🎁"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">{p.name}</p>
                    <p className="truncate text-[11px] font-bold text-ink/45">{money(p.priceCents)}</p>
                  </div>
                  <span className="status-pill bg-butter text-ink font-extrabold">{p.stock} left</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
