"use client";

import { useState, useEffect } from "react";
import { money } from "@/lib/format";

export default function CustomersContent() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState(1);
  const [totals, setTotals] = useState({ customers: 0, revenue: 0 });

  // Customer detail modal state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  async function loadCustomers() {
    const params = new URLSearchParams({
      q: search,
      page: String(page),
      limit: "25"
    });
    const res = await fetch(`/api/admin/customers?${params}`);
    const data = await res.json();
    setCustomers(data.items || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setTotals(data.totals || { customers: 0, revenue: 0 });
  }

  async function openCustomerDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (data.customer) {
        setSelectedCustomer(data.customer);
        setCustomerOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Failed to load customer detail", e);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">Customers</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{totals.customers.toLocaleString()}</p>
              <p className="mt-1 text-[11px] font-bold text-ink/45">all time</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">👥</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">Store revenue</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">{money(totals.revenue)}</p>
              <p className="mt-1 text-[11px] font-bold text-ink/45">excluding cancellations</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">💰</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-ink/45">Avg. LTV</p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular">
                {totals.customers > 0 ? money(Math.round(totals.revenue / totals.customers)) : money(0)}
              </p>
              <p className="mt-1 text-[11px] font-bold text-ink/45">per customer</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-ink/8 bg-mist text-lg">🧾</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-4 py-3">
          <h2 className="font-display text-base font-extrabold">All customers</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, city…"
            className="input !py-2.5 w-full text-sm sm:w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 bg-mist/60 text-[11px] font-black uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Lifetime value</th>
                <th className="px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm font-bold text-ink/45">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-mist/60 transition">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iris text-[11px] font-black text-white">
                          {c.email.split("@")[0].slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-ink">{c.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-ink/60">{c.city || "—"}</td>
                    <td className="px-4 py-3 text-sm font-black tabular">{c.orders}</td>
                    <td className="px-4 py-3 text-sm font-black tabular">{money(c.ltvCents)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openCustomerDetail(c.id)}
                        disabled={loadingDetail}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-iris/30 bg-iris/5 px-3 py-1 text-xs font-black uppercase tracking-wide text-iris transition hover:border-iris hover:bg-iris hover:text-white disabled:opacity-50"
                      >
                        View
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-4 py-3 text-sm font-bold text-ink/55">
          <span>{`Showing ${(page - 1) * 25 + 1}-${Math.min(page * 25, total)} of ${total}`}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline btn-sm">← Prev</button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-outline btn-sm">Next →</button>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-sticker max-h-[80vh] overflow-y-auto no-scrollbar">
            <div className="sticky top-0 bg-white border-b border-ink/8 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-black text-base text-ink">
                  Customer <span className="font-mono text-iris">{selectedCustomer.email}</span>
                </h2>
                <p className="text-[11px] font-bold text-ink/50 mt-1">
                  Member since {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink/10 hover:border-ink text-ink/50 hover:text-ink transition">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer info */}
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-iris text-white font-black text-sm">
                  {selectedCustomer.email.split("@")[0].slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="font-extrabold text-ink">{selectedCustomer.name || selectedCustomer.email}</div>
                  <div className="text-xs font-bold text-ink/60">{selectedCustomer.email}</div>
                  {(selectedCustomer.city || selectedCustomer.phone) && (
                    <div className="mt-1 text-xs font-bold text-ink/50">
                      {selectedCustomer.city && <span>{selectedCustomer.city}</span>}
                      {selectedCustomer.city && selectedCustomer.phone && <span> · </span>}
                      {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-mist/40 p-3 text-center">
                  <div className="font-black text-2xl text-ink tabular">{selectedCustomer.orderCount}</div>
                  <div className="text-[11px] font-bold text-ink/50 uppercase tracking-wide">Total Orders</div>
                </div>
                <div className="rounded-xl bg-mist/40 p-3 text-center">
                  <div className="font-black text-2xl text-iris tabular">{money(selectedCustomer.ltvCents)}</div>
                  <div className="text-[11px] font-bold text-ink/50 uppercase tracking-wide">LTV</div>
                </div>
              </div>

              {/* Order history */}
              <div>
                <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-ink/45">Order History ({customerOrders.length})</div>
                {customerOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink/20 p-4 text-center">
                    <div className="text-sm font-bold text-ink/45">No orders yet</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between rounded-xl border border-ink/10 px-3 py-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-ink/70">#{order.orderNumber}</div>
                          <div className="text-[11px] font-bold text-ink/45">
                            {new Date(order.placedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-ink tabular">{money(order.totalCents)}</div>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            order.status === "delivered" ? "bg-acid/30 text-ink" :
                            order.status === "cancelled" || order.status === "refunded" ? "bg-ink/10 text-ink/55" :
                            "bg-butter/30 text-ink"
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}