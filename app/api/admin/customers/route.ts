import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Admin customers list.
 *
 * Per-customer LTV / order count / last order are computed from the orders
 * table, NOT hardcoded. Revenue excludes cancelled and refunded orders —
 * matching the convention used by the stats route and the "excluding
 * cancellations" label on the customers page.
 */
export async function GET(req: Request) {
  const supabase = createServiceClient();
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");

  // 1) Paginated profile list (the source of truth for "who is a customer").
  let query = supabase.from("profiles").select("id, email, created_at", { count: "exact" });
  if (q) query = query.or(`email.ilike.%${q}%`);

  const { data: profiles, count, error: profErr } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  // 2) All orders, grouped by customer_id in JS. Filtering out cancelled /
  //    refunded keeps LTV consistent with the stats route and the page label.
  const { data: orders, error: ordErr } = await supabase
    .from("orders")
    .select("customer_id, total_cents, placed_at, status");

  if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 });

  const byCustomer = new Map<string, { count: number; ltv: number; last: string | null }>();
  for (const o of orders ?? []) {
    if (o.status === "cancelled" || o.status === "refunded") continue;
    const cur = byCustomer.get(o.customer_id) ?? { count: 0, ltv: 0, last: null };
    cur.count += 1;
    cur.ltv += o.total_cents;
    if (!cur.last || (o.placed_at && o.placed_at > cur.last)) cur.last = o.placed_at;
    byCustomer.set(o.customer_id, cur);
  }

  // 3) Join the customers table for name + city (profiles has neither).
  const ids = (profiles ?? []).map((p) => p.id);
  const { data: customers } = ids.length
    ? await supabase.from("customers").select("profiles_id, name, city").in("profiles_id", ids)
    : { data: [] };

  const custMap = new Map((customers ?? []).map((c) => [c.profiles_id, c]));

  const items = (profiles ?? []).map((p) => {
    const agg = byCustomer.get(p.id) ?? { count: 0, ltv: 0, last: null };
    const c = custMap.get(p.id);
    return {
      id: p.id,
      email: p.email,
      name: c?.name || "",
      city: c?.city || "",
      createdAt: new Date(p.created_at).getTime(),
      orders: agg.count,
      ltvCents: agg.ltv,
      lastOrderAt: agg.last ? new Date(agg.last).getTime() : null,
    };
  });

  // Total revenue across all customers (excludes cancelled/refunded).
  const totalRevenue = Array.from(byCustomer.values()).reduce((s, a) => s + a.ltv, 0);

  return NextResponse.json({
    items,
    total: count ?? 0,
    page,
    limit,
    pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    totals: { customers: count ?? 0, revenue: totalRevenue },
  });
}