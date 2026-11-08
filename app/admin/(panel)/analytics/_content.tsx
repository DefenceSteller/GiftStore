"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

export default function AnalyticsContent() {
  const [period, setPeriod] = useState("7d");
  const [kpis, setKpis] = useState({ visits7d: 0, uniques7d: 0, addToCartRate: 0, checkoutRate: 0, purchaseRate: 0 });
  const [hourly, setHourly] = useState<{ hour: number; visits: number }[]>([]);
  const [sources, setSources] = useState<{ source: string; visits: number; uniques: number }[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await res.json();
      if (data.kpis) setKpis(data.kpis);
      if (data.hourly) setHourly(data.hourly);
      if (data.sources) setSources(data.sources);
      if (data.funnel) setFunnel(data.funnel);
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["1d", "3d", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`chip ${period === p ? "chip-active" : ""}`}
            >
              {p === "1d" ? "Last 24h" : p === "3d" ? "Last 3 days" : p === "7d" ? "Last 7 days" : "Last 30 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Visits", value: kpis.visits7d.toLocaleString(), icon: "👣" },
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
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular">{loading ? "—" : d.value}</p>
          </div>
        ))}
      </div>

      {/* Traffic by hour + Sources */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Traffic by hour</h2>
            <span className="text-[11px] font-black uppercase tracking-wide text-ink/45">
              {period === "1d" ? "Today · local time" : period === "3d" ? "Last 3 days · local time" : period === "7d" ? "Last 7 days · local time" : "Last 30 days · local time"}
            </span>
          </div>
          <div className="mt-4 h-56 flex items-end gap-1">
            {hourly.length === 0 ? (
              <div className="flex w-full items-center justify-center text-sm font-bold text-ink/40">No traffic data yet</div>
            ) : (
              hourly.map((h) => {
                const maxVisits = Math.max(1, ...hourly.map((x) => x.visits));
                const pct = (h.visits / maxVisits) * 100;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${h.hour % 2 === 0 ? "bg-iris" : "bg-iris/55"}`}
                      style={{ height: `${Math.max(2, pct)}%`, minHeight: h.visits > 0 ? "4px" : "0" }}
                    />
                    <span className="text-[10px] font-bold text-ink/40">{h.hour}:00</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Where they come from</h2>
          <div className="mt-5 space-y-2">
            {sources.length === 0 ? (
              <div className="text-sm font-bold text-ink/40">No traffic data yet</div>
            ) : (
              sources.map((s, i) => {
                const colors = ["#7C5CFF", "#D6FF3E", "#FF6B5E", "#7CE7FF", "#FFD84D", "#FF9BE1", "#6366F1", "#94A3B8"];
                return (
                  <div key={s.source} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
                    <span className="flex-1 font-bold text-ink/70 capitalize">{s.source || "unknown"}</span>
                    <span className="font-black tabular">{s.visits.toLocaleString()}</span>
                    <span className="w-16 text-right text-[11px] font-bold text-ink/40 tabular">{s.uniques.toLocaleString()} uniq</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-3">
          <h2 className="font-display text-lg font-extrabold">Conversion funnel</h2>
          <div className="mt-5 space-y-3">
            {funnel.length === 0 ? (
              <div className="text-sm font-bold text-ink/40">No conversion data yet</div>
            ) : (
              funnel.map((step, i) => {
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
