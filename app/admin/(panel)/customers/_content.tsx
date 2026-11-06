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
                      <span className="text-xs font-black text-iris">View →</span>
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
    </div>
  );
}