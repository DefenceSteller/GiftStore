import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();

  // Middleware already guards /admin, but double-check here (defense in depth).
  if (!user) redirect("/auth/signin");
  if (user.role !== "admin") redirect("/");

  const supabase = await createClient();

  const [{ count: productCount }, { count: orderCount }, { data: recentOrders }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id, order_number, status, total_cents, placed_at")
        .order("placed_at", { ascending: false })
        .limit(5),
    ]);

  const stats = [
    { label: "Products", value: productCount ?? 0 },
    { label: "Orders", value: orderCount ?? 0 },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "#f8f9fa",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#1a1a2e" }}>
            🎉 Admin Dashboard
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "#495057", fontSize: "0.875rem" }}>
            Signed in as {user.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #dee2e6",
              background: "#fff",
              color: "#495057",
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            View store
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ color: "#495057", fontSize: "0.875rem" }}>{s.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#7C5CFF" }}>
              {s.value}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          background: "#fff",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", color: "#1a1a2e" }}>
          Recent orders
        </h2>
        {!recentOrders || recentOrders.length === 0 ? (
          <p style={{ color: "#868e96", margin: 0 }}>No orders yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#495057" }}>
                <th style={{ padding: "0.5rem 0" }}>Order</th>
                <th style={{ padding: "0.5rem 0" }}>Status</th>
                <th style={{ padding: "0.5rem 0" }}>Total</th>
                <th style={{ padding: "0.5rem 0" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid #f1f3f5" }}>
                  <td style={{ padding: "0.5rem 0" }}>{o.order_number}</td>
                  <td style={{ padding: "0.5rem 0" }}>{o.status}</td>
                  <td style={{ padding: "0.5rem 0" }}>
                    {(o.total_cents / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: "0.5rem 0" }}>
                    {new Date(o.placed_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
