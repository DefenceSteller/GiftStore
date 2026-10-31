'use client'
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import { money, type Promo } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export default function AdminCustomersPage() {
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
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select(
          `
        *,
        orders!inner(id, total_cents, status, placed_at)
      `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query.range(
        (page - 1) * pageSize,
        page * pageSize - 1
      );

      if (error) console.error("Error fetching customers:", error);
      setCustomers(data || []);
      setTotalCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  // Export to CSV
  const exportCSV = () => {
    const headers = "Name,Email,City,Lifetime Value,Orders Count,Last Order Date\n";
    const rows = customers
      .map(
        (c) => {
          const lifetimeValue = c.orders
            .filter(
              (o: any) => o.status !== "cancelled" && o.status !== "refunded"
            )
            .reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);
          const ordersCount = c.orders.length;
          const lastOrder = c.orders
            .sort((a: any, b: any) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())[0];
          const lastOrderDate = lastOrder
            ? new Date(lastOrder.placed_at).toLocaleDateString()
            : "";
          return `"${c.name}","${c.email}","${c.city}",${lifetimeValue},${ordersCount},"${lastOrderDate}"`;
        }
      )
      .join("\n");
    const csv = headers + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "customers.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initial fetch
  ;(async () => {
    await fetchCustomers();
  })();

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/admin" className="transition hover:text-ink">Admin</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Customers</span>
      </nav>

      <div className="mt-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <div className="rounded-[26px] border border-ink/8 bg-white p-3 shadow-soft">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers… (name, email, city)"
                className="input w-full bg-transparent outline-none"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <button
              onClick={exportCSV}
              className="btn-outline sm:px-4 px-3 py-2 text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-[26px] overflow-hidden shadow-soft">
          {loading ? (
            <p className="text-ink/60 pt-8 text-center">Loading customers…</p>
          ) : customers.length === 0 && totalCount === 0 ? (
            <p className="text-ink/60 pt-8 text-center">No customers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-ink/60 border-b border-ink/8">
                    <th>Name</th>
                    <th style={{ width: "25%" }}>Email</th>
                    <th style={{ width: "15%" }}>City</th>
                    <th style={{ width: "12%" }}>Lifetime Value</th>
                    <th style={{ width: "10%" }}>Orders</th>
                    <th style={{ width: "20%" }}>Last Order</th>
                    <th style={{ width: "15%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const lifetimeValue = c.orders
                      .filter(
                        (o: any) => o.status !== "cancelled" && o.status !== "refunded"
                      )
                      .reduce(
                        (sum: number, o: any) => sum + (o.total_cents || 0),
                        0
                      );
                    const ordersCount = c.orders.length;
                    const lastOrder = c.orders
                      .sort(
                        (a: any, b: any) =>
                          new Date(b.placed_at).getTime() -
                          new Date(a.placed_at).getTime()
                      )[0];
                    const lastOrderDate = lastOrder
                      ? new Date(lastOrder.placed_at).toLocaleDateString()
                      : "—";

                    return (
                      <tr key={c.id} className="border-b border-ink/5">
                        <td className="font-bold text-ink">{c.name || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.city || "—"}</td>
                        <td>{money(lifetimeValue)}</td>
                        <td>{ordersCount}</td>
                        <td>{lastOrderDate}</td>
                        <td className="flex gap-1">
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="btn-outline btn-xs"
                          >
                            View
                          </Link>
                        </td>
                    );
                  })}

                  {customers.length < totalCount && (
                    <tfoot>
                      <tr>
                        <td colSpan={7}>
                          <div className="flex justify-between">
                            <span className="text-ink/60">
                              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="mt-6 flex justify-center">
            {/* Pagination controls would go here */}
            <span className="text-ink/60">
              Page {page} of {Math.ceil(totalCount / pageSize)}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}