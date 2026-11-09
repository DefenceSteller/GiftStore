// Verify analytics numbers against the real Supabase DB.
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/\/$/, "");
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function q(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { error: t }; }
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function periodReport(label, days) {
  const start = daysAgo(days);
  const rows = await q(
    `traffic_events?select=type,created_at,source,visitor_id&created_at=gte.${encodeURIComponent(start)}`
  );
  if (!Array.isArray(rows)) return console.log(label, "ERROR", rows);

  const visits = rows.length;
  const uniques = new Set(rows.map(r => r.visitor_id).filter(Boolean)).size;
  const byType = {};
  for (const r of rows) byType[r.type] = (byType[r.type] || 0) + 1;

  const cart = byType.add_to_cart || 0;
  const checkout = byType.checkout_start || 0;
  const addToCartRate = visits ? Math.round((cart / visits) * 1000) / 10 : 0;
  const checkoutRate = cart ? Math.round((checkout / cart) * 1000) / 10 : 0;

  // sources (pageviews only, matching API)
  const srcMap = new Map();
  for (const r of rows.filter(r => r.type === "pageview")) {
    const s = r.source || "unknown";
    const cur = srcMap.get(s) || { visits: 0, uniq: new Set() };
    cur.visits++;
    if (r.visitor_id) cur.uniq.add(r.visitor_id);
    srcMap.set(s, cur);
  }
  const sources = [...srcMap.entries()]
    .map(([s, v]) => `${s}: ${v.visits} (${v.uniq.size} uniq)`)
    .join(" | ");

  // orders in period
  const orders = await q(
    `orders?select=id,status,placed_at&placed_at=gte.${encodeURIComponent(start)}&status=not.in.(cancelled,refunded)`
  );
  const orderCount = Array.isArray(orders) ? orders.length : 0;
  const purchaseRate = checkout ? Math.round((orderCount / checkout) * 100) : 0;

  console.log(`\n=== ${label} (last ${days}d) ===`);
  console.log(`Visits: ${visits}  Uniques: ${uniques}`);
  console.log(`By type:`, JSON.stringify(byType));
  console.log(`Add-to-bag rate: ${addToCartRate}%  Checkout rate: ${checkoutRate}%  Purchase rate: ${purchaseRate}%`);
  console.log(`Funnel: sessions(pageview)=${byType.pageview || 0} product_view=${byType.product_view || 0} add_to_cart=${cart} checkout_start=${checkout} orders=${orderCount}`);
  console.log(`Sources: ${sources || "(none)"}`);
}

await periodReport("LAST 24H", 1);
await periodReport("LAST 3 DAYS", 3);
await periodReport("LAST 7 DAYS", 7);
await periodReport("LAST 30 DAYS", 30);
