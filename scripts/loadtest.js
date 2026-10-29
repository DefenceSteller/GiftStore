'use strict';
/**
 * Confetti Club — load test.
 *
 * Simulates a crowd of concurrent shoppers against the live server:
 * browsing the catalog, opening product pages, tracking activity and
 * (optionally) checking out. Reports throughput, latency percentiles
 * and the status-code mix so you can see how the shop behaves with
 * 150–200 people on the floor at once.
 *
 *   node scripts/loadtest.js --users 180 --duration 30
 *
 * Tip: run the server with a raised rate-limit budget first, since every
 * virtual user shares one IP:
 *   PowerShell:  $env:RATE_MULTIPLIER='50'; npm start
 *   bash:        RATE_MULTIPLIER=50 npm start
 */

const BASE = process.env.BASE || 'http://localhost:3000';

/* --------------------------------- args ---------------------------------- */
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : fallback;
}
const USERS = Number(arg('users', 180));
const DURATION = Number(arg('duration', 30));
const CHECKOUT_RATIO = Number(arg('checkouts', 0.03)); // fraction of visits that buy
const THINK_MS = Number(arg('think', 40));             // pause between actions per user
const WARMUP_MS = 4000;

/* -------------------------------- metrics -------------------------------- */
const stats = {
  requests: 0,
  ok: 0,
  rateLimited: 0,
  clientErrors: 0,
  serverErrors: 0,
  networkErrors: 0,
  checkoutOk: 0,
  latencies: [],
  byEndpoint: new Map(),
  statusCodes: new Map(),
  slowest: null,
};

function record(label, status, ms, ok) {
  stats.requests += 1;
  if (status == null) stats.networkErrors += 1;
  else {
    stats.statusCodes.set(status, (stats.statusCodes.get(status) || 0) + 1);
    if (status === 429) stats.rateLimited += 1;
    else if (status >= 500) stats.serverErrors += 1;
    else if (status >= 400) stats.clientErrors += 1;
    else if (ok) stats.ok += 1;
  }
  if (!stats.slowest || ms > stats.slowest.ms) stats.slowest = { label, ms, status };

  let bucket = stats.byEndpoint.get(label);
  if (!bucket) {
    bucket = { n: 0, err: 0, total: 0, max: 0, lats: [] };
    stats.byEndpoint.set(label, bucket);
  }
  bucket.n += 1;
  bucket.total += ms;
  bucket.max = Math.max(bucket.max, ms);
  if (status == null || status >= 400) bucket.err += 1;
  bucket.lats.push(ms);
  if (status != null && status < 400) stats.latencies.push(ms);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/* ------------------------------- http tools ------------------------------ */
async function hit(label, path, { method = 'GET', body, timeout = 10000 } = {}) {
  const started = process.hrtime.bigint();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    await res.arrayBuffer().catch(() => {});
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    record(label, res.status, ms, res.status < 400);
    return res;
  } catch (err) {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    record(label, null, ms, false);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ------------------------------- scenarios ------------------------------- */
let products = [];
let categories = [];

async function bootstrap() {
  const res = await fetch(`${BASE}/api/store/products?limit=40`);
  if (!res.ok) throw new Error(`Server not reachable at ${BASE} (${res.status})`);
  const data = await res.json();
  products = data.items || [];
  const cats = await fetch(`${BASE}/api/store/categories`).then((r) => r.json()).catch(() => null);
  categories = (cats && cats.items) ? cats.items : [];
  if (!products.length) throw new Error('No products — run `npm run seed` first.');
  console.log(`➜ target      ${BASE}`);
  console.log(`➜ crowd       ${USERS} concurrent shoppers for ${DURATION}s (+${WARMUP_MS}ms warm-up)`);
  console.log(`➜ catalog     ${products.length} products, ${categories.length} categories`);
  console.log(`➜ checkouts   ~${Math.round(CHECKOUT_RATIO * 100)}% of visits will place an order\n`);
}

async function browseHome() { await hit('GET /', '/'); }

async function browseShop() {
  const path = categories.length ? `/shop?category=${encodeURIComponent(pick(categories))}` : '/shop';
  await hit('GET / (shop)', path);
  await hit('GET /api/store/products', `/api/store/products?limit=24&page=${1 + Math.floor(Math.random() * 2)}`);
}

async function browseProduct() {
  const p = pick(products);
  const slug = encodeURIComponent(p.slug);
  await hit('GET /product/:slug', `/product/${slug}`);
  await hit('GET /api/store/products/:slug', `/api/store/products/${slug}`);
}

async function browseCart() { await hit('GET / (cart)', '/cart'); }

async function trackVisit() {
  await hit('POST /api/track/event', '/api/track/event', {
    method: 'POST',
    body: { type: 'pageview', path: '/', referrer: null },
  });
  await hit('POST /api/track/heartbeat', '/api/track/heartbeat', { method: 'POST', body: { path: '/track' } });
}

async function lookupPromo() {
  await hit('GET /api/store/promo', `/api/store/promo/${pick(['GIFT10', 'FREESHIP', 'WELCOME5'])}`);
}

async function checkout() {
  const p = pick(products);
  const n = Date.now().toString(36);
  const res = await hit('POST /api/checkout', '/api/checkout', {
    method: 'POST',
    body: {
      contact: { firstName: 'Load', lastName: 'Tester', email: `load-${n}@example.com`, phone: '5550001111' },
      shipping: { address1: '1 Load Ave', city: 'Austin', state: 'TX', postal: '78701', country: 'US' },
      delivery: { method: 'standard' },
      items: [{ productId: p.id, qty: 1 }],
      payment: { method: 'card', card: { number: '4242 4242 4242 4242', exp: '12/34', cvc: '123', name: 'Load Tester' } },
      clientToken: `load-${n}`,
    },
  });
  if (res && res.status === 201) stats.checkoutOk += 1;
}

const SCENARIOS = [
  { weight: 24, run: browseHome },
  { weight: 26, run: browseShop },
  { weight: 24, run: browseProduct },
  { weight: 6, run: browseCart },
  { weight: 10, run: trackVisit },
  { weight: 6, run: lookupPromo },
];

function nextScenario() {
  const total = SCENARIOS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SCENARIOS) {
    r -= s.weight;
    if (r <= 0) return s.run;
  }
  return browseHome;
}

/* --------------------------------- run ----------------------------------- */
let stopAt = 0;
let activeUsers = 0;

async function virtualUser(id) {
  activeUsers += 1;
  // Small staggered start so the ramp feels like a real crowd arriving.
  await sleep((id % USERS) * (WARMUP_MS / USERS));
  let checkedOut = false;
  while (Date.now() < stopAt) {
    const task = Math.random() < CHECKOUT_RATIO && !checkedOut ? checkout : nextScenario();
    if (task === checkout) checkedOut = true;
    try {
      await task();
    } catch (_) { /* recorded inside hit() */ }
    await sleep(THINK_MS + Math.random() * 120);
  }
  activeUsers -= 1;
}

function progress(startedAt) {
  const elapsed = (Date.now() - startedAt) / 1000;
  const rps = Math.round(stats.requests / Math.max(0.001, elapsed));
  const lats = [...stats.latencies].sort((a, b) => a - b);
  const p95 = Math.round(percentile(lats, 95));
  process.stdout.write(
    `\r  ${elapsed.toFixed(0)}s · ${String(activeUsers).padStart(3)} users · ${String(rps).padStart(4)} req/s · p95 ${String(p95).padStart(4)} ms · ok ${stats.ok} · 5xx ${stats.serverErrors} · 429 ${stats.rateLimited}   `
  );
}

async function main() {
  await bootstrap();

  console.log('Warm-up…');
  await Promise.all([hit('GET / (warmup)', '/'), hit('GET /api (warmup)', '/api/store/products?limit=12')]);

  const startedAt = Date.now();
  stopAt = startedAt + WARMUP_MS + DURATION * 1000;
  const ticker = setInterval(() => progress(startedAt + WARMUP_MS), 1000);

  await Promise.all(Array.from({ length: USERS }, (_, i) => virtualUser(i)));
  clearInterval(ticker);
  process.stdout.write('\n\n');

  report((Date.now() - startedAt - WARMUP_MS) / 1000);
}

function report(seconds) {
  const lats = [...stats.latencies].sort((a, b) => a - b);
  const total = stats.requests;
  const errors = stats.serverErrors + stats.networkErrors;
  const errorRate = total ? (errors / total) * 100 : 0;
  const rps = Math.round(total / Math.max(0.001, seconds));
  const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;

  console.log('━━━━━━━━━━━━━━━━━━━━  RESULTS  ━━━━━━━━━━━━━━━━━━━━');
  console.log(`  duration        ${seconds.toFixed(1)}s at ${USERS} concurrent users`);
  console.log(`  requests        ${total}  (${rps} req/s)`);
  console.log(`  successful      ${stats.ok}  (${((stats.ok / Math.max(1, total)) * 100).toFixed(1)}%)`);
  console.log(`  checkouts       ${stats.checkoutOk} paid orders created`);
  console.log(`  rate limited    ${stats.rateLimited}  (429 — raise RATE_MULTIPLIER to remove)`);
  console.log(`  client errors   ${stats.clientErrors}  (4xx other than 429)`);
  console.log(`  server errors   ${stats.serverErrors}  · network ${stats.networkErrors}`);
  console.log(`  latency         avg ${avg}ms · p50 ${percentile(lats, 50)}ms · p90 ${percentile(lats, 90)}ms · p95 ${percentile(lats, 95)}ms · p99 ${percentile(lats, 99)}ms · max ${lats.length ? Math.round(lats[lats.length - 1]) : 0}ms`);

  if (stats.slowest) console.log(`  slowest         ${stats.slowest.label} — ${Math.round(stats.slowest.ms)}ms (status ${stats.slowest.status ?? 'net'})`);

  console.log('\n  by endpoint:');
  const rows = [...stats.byEndpoint.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [label, b] of rows) {
    const p95 = percentile([...b.lats].sort((x, y) => x - y), 95);
    console.log(
      `    ${label.padEnd(30)} ${String(b.n).padStart(6)} req  avg ${String(Math.round(b.total / b.n)).padStart(4)}ms  p95 ${String(Math.round(p95)).padStart(4)}ms  max ${String(Math.round(b.max)).padStart(5)}ms  ${b.err ? `${b.err} err` : ''}`
    );
  }

  console.log('\n  status codes:');
  for (const [code, n] of [...stats.statusCodes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code}  ${n}`);
  }

  const pass = errorRate < 1 && percentile(lats, 95) < 800;
  console.log(`\n  verdict: ${pass ? 'PASS' : 'FAIL'} — ${errorRate.toFixed(2)}% hard-error rate, p95 ${percentile(lats, 95)}ms (target: <1% and <800ms)`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n[loadtest] ${err.message}`);
  process.exit(1);
});
