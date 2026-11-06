"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFD84D",
  paid: "#7CE7FF",
  packed: "#7C5CFF",
  shipped: "#6366F1",
  delivered: "#D6FF3E",
  cancelled: "#CBD5E1",
  refunded: "#FF6B5E"
};

const STATUS_META: Record<string, { label: string; pill: string }> = {
  pending: { label: "Awaiting payment", pill: "bg-butter text-ink" },
  paid: { label: "Paid", pill: "bg-aqua text-ink" },
  packed: { label: "Packed", pill: "bg-iris text-white" },
  shipped: { label: "Shipped", pill: "bg-indigo-500 text-white" },
  delivered: { label: "Delivered", pill: "bg-acid text-ink" },
  cancelled: { label: "Cancelled", pill: "bg-ink/10 text-ink/55" },
  refunded: { label: "Refunded", pill: "bg-coral text-white" }
};

export default function OrdersContent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadOrders();
  }, [page, status, search]);

  async function loadOrders() {
    const params = new URLSearchParams({
      status,
      q: search,
      page: String(page),
      limit: "20"
    });
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.items || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setStatusCounts(data.statusCounts || {});
  }

  const statusTabs = ["all", "open", "pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
  const statusLabels: Record<string, string> = {
    all: "All", open: "Open", pending: "Pending", paid: "Paid",
    packed: "Packed", shipped: "Shipped", delivered: "Delivered",
    cancelled: "Cancelled", refunded: "Refunded"
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((s) => {
              const count = s === "all"
                ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                : s === "open"
                ? (statusCounts.pending || 0) + (statusCounts.paid || 0) + (statusCounts.packed || 0) + (statusCounts.shipped || 0)
                : statusCounts[s] || 0;
              return (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`chip ${status === s ? "chip-active" : ""}`}
                >
                  {statusLabels[s]}
                  <span className="ml-1 text-[11px] font-black">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search order no, email, name…"
              className="input !py-2.5 w-full text-sm sm:w-72"
            />
            <a href="/api/admin/export/orders.csv" className="btn-outline btn-sm">⬇ CSV</a>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 bg-mist/60 text-[11px] font-black uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm font-bold text-ink/45">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-mist/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ink/70">#{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <span className="block font-extrabold text-ink">{o.name}</span>
                      <span className="block text-[11px] font-bold text-ink/45">{o.email}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-ink/55">{o.itemCount}</td>
                    <td className="px-4 py-3 font-black tabular">{money(o.totalCents)}</td>
                    <td className="px-4 py-3">
                      <span className={`status-pill ${STATUS_META[o.status]?.pill || "bg-ink/10 text-ink/60"}`}>
                        {STATUS_META[o.status]?.label || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-extrabold uppercase text-ink/60">{o.paymentMethod || "card"}</span>
                      <span className="block text-[11px] font-bold text-ink/45">{o.paymentStatus || ""}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-ink/55">
                      {new Date(o.placedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-4 py-3 text-sm font-bold text-ink/55">
          <span>
            {page > 0 && `Showing ${(page - 1) * 20 + 1}-${Math.min(page * 20, total)} of ${total}`}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-outline btn-sm"
            >
              ← Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
              className="btn-outline btn-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}