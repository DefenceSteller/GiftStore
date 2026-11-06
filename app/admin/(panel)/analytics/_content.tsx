"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

export default function AnalyticsContent() {
  const [period, setPeriod] = useState("7d");
  const [kpis, setKpis] = useState({ visits7d: 0, uniques7d: 0, addToCartRate: 0, checkoutRate: 0, purchaseRate: 0 });
  const [hourly, setHourly] = useState<{ hour: number; visits: number }[]>([]);
  const [sources, setSources] = useState<{ source: string; visits: number; uniques: number }[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    // Note: Analytics API would need to be built with more complex aggregation
    // For now, show placeholder data
    setKpis({ visits7d: 142, uniques7d: 98, addToCartRate: 12.5, checkoutRate: 4.2, purchaseRate: 2.1 });
    setHourly(Array.from({ length: 24 }, (_, i) => ({ hour: i, visits: Math.floor(Math.random() * 20) })));
    setSources([
      { source: "organic", visits: 65, uniques: 48 },
      { source: "direct", visits: 32, uniques: 28 },
      { source: "social", visits: 28, uniques: 22 },
      { source: "referral", visits: 17, uniques: 14 }
    ]);
    setFunnel([
      { stage: "Sessions", count: 142 },
      { stage: "Product views", count: 386 },
      { stage: "Added to bag", count: 42 },
      { stage: "Checkout started", count: 18 },
      { stage: "Orders", count: 8 }
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Visits · 7d", value: kpis.visits7d.toLocaleString(), icon: "👣" },
          { label: "Unique visitors", value: kpis.uniques7d.toLocaleString(), icon: "🧑‍💻" },
          { label: "Add-to-bag rate", value: `${kpis.addToCartRate}%`, icon: "🛍️" },
          { label: "Checkout rate", value: `${kpis.checkoutRate}%`, icon: "💳" },
          { label: "Purchase rate", value: `${kpis.purchaseRate}%`, icon: "🎉" }
        ].map((d) => (
          <div key={d.label} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">{d.label}</p>
              <span className="text-base">{d.icon}</span>
            </div>
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular">{d.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Traffic by hour</h2>
            <span className="text-[11px] font-black uppercase tracking-wide text-ink/45">Last 7 days · local time</span>
          </div>
          <div className="mt-4 h-56 flex items-end gap-1">
            {hourly.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t ${h.hour % 2 === 0 ? "bg-iris" : "bg-iris/55"}`}
                  style={{ height: `${(h.visits / Math.max(...hourly.map(x => x.visits))) * 100}%`, minHeight: h.visits > 0 ? "4px" : "0" }}
                />
                <span className="text-[10px] font-bold text-ink/40">{h.hour}:00</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Where they come from</h2>
          <div className="mt-5 space-y-2">
            {sources.map((s, i) => {
              const colors = ["#7C5CFF", "#D6FF3E", "#FF6B5E", "#7CE7FF", "#FFD84D", "#FF9BE1", "#6366F1", "#94A3B8"];
              return (
                <div key={s.source} className="flex items-center gap-2.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
                  <span className="flex-1 font-bold text-ink/70 capitalize">{s.source}</span>
                  <span className="font-black tabular">{s.visits.toLocaleString()}</span>
                  <span className="w-16 text-right text-[11px] font-bold text-ink/40 tabular">{s.uniques.toLocaleString()} uniq</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Conversion funnel</h2>
          <div className="mt-5 space-y-3">
            {funnel.map((step, i) => {
              const pct = Math.round((step.count / Math.max(1, funnel[0].count)) * 100);
              const colors = ["#7C5CFF", "#A78BFA", "#F472B6", "#38BDF8", "#8ACD2A"];
              return (
                <div key={step.stage}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-extrabold text-ink/75">{step.stage}</span>
                    <span className="font-black tabular">{step.count.toLocaleString()} <span className="text-[11px] font-bold text-ink/40">{pct}%</span></span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(2, pct)}%`, background: colors[i % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}