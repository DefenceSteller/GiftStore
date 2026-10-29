'use strict';
/** Quick end-to-end smoke test of every critical path (run with server up). */
const BASE = process.env.BASE || 'http://localhost:3000';
let passed = 0, failed = 0;
const cookies = new Map();

function cookieHeader(name) {
  const v = cookies.get(name);
  return v ? { Cookie: `${name}=${v}` } : {};
}
function storeSetCookies(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const raw of list) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
async function call(label, method, path, { body, headers = {}, expect = 200, raw = false } = {}) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookies.size ? { Cookie: [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    storeSetCookies(res);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* html */ }
    const ok = res.status === expect;
    ok ? passed++ : failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} [${res.status}/${expect}] ${label}${ok ? '' : ` → ${text.slice(0, 300)}`}`);
    return raw ? { res, json, text } : json;
  } catch (err) {
    failed++;
    console.log(`FAIL [ERR] ${label} → ${err.message}`);
    return null;
  }
}

(async () => {
  await call('health', 'GET', '/api/health');
  const cats = await call('categories', 'GET', '/api/store/categories');
  const list = await call('product list', 'GET', '/api/store/products?limit=3');
  const first = list && list.items[0];
  if (first) await call(`product detail (${first.slug})`, 'GET', `/api/store/products/${first.slug}`);
  await call('promo lookup', 'GET', '/api/store/promo/GIFT10');
  await call('promo invalid', 'GET', '/api/store/promo/NOPE404', { expect: 404 });
  await call('unknown product 404', 'GET', '/api/store/products/does-not-exist', { expect: 404 });

  // tracking
  await call('track event', 'POST', '/api/track/event', { body: { type: 'pageview', path: '/', referrer: null } });
  await call('track bad event', 'POST', '/api/track/event', { body: { type: 'evil' }, expect: 400 });

  // checkout — invalid
  await call('checkout empty', 'POST', '/api/checkout', { body: { contact: {} }, expect: 400 });

  // checkout — valid card
  const productId = first ? first.id : 1;
  const checkout = await call('checkout (card)', 'POST', '/api/checkout', {
    body: {
      contact: { firstName: 'Test', lastName: 'Shopper', email: 'shopper@example.com', phone: '5551234567' },
      shipping: { address1: '123 Test St', city: 'Austin', state: 'TX', postal: '78701', country: 'US' },
      delivery: { method: 'standard' },
      items: [{ productId, qty: 2 }],
      promo: 'GIFT10',
      payment: { method: 'card', card: { number: '4242 4242 4242 4242', exp: '12/29', cvc: '123', name: 'Test Shopper' } },
      clientToken: `smoke-${Date.now()}`
    },
    expect: 201
  });

  // checkout — declined card
  await call('checkout (declined card)', 'POST', '/api/checkout', {
    body: {
      contact: { firstName: 'Test', lastName: 'Shopper', email: 'decline@example.com', phone: '5551234567' },
      shipping: { address1: '123 Test St', city: 'Austin', state: 'TX', postal: '78701', country: 'US' },
      delivery: { method: 'standard' },
      items: [{ productId, qty: 1 }],
      payment: { method: 'card', card: { number: '4000000000000002', exp: '12/29', cvc: '123', name: 'Test' } }
    },
    expect: 402
  });

  if (checkout && checkout.orderNumber) {
    await call('order tracking', 'GET', `/api/orders/${checkout.orderNumber}?email=shopper@example.com`);
    await call('order tracking wrong email', 'GET', `/api/orders/${checkout.orderNumber}?email=nobody@example.com`, { expect: 404 });
  }

  // admin auth
  await call('admin without session', 'GET', '/api/admin/stats', { expect: 401 });
  await call('admin login (wrong pw)', 'POST', '/api/admin/login', { body: { email: 'admin@confetticlub.shop', password: 'nope' }, expect: 401 });
  const login = await call('admin login', 'POST', '/api/admin/login', {
    body: { email: 'admin@confetticlub.shop', password: 'ChangeMe!2026' }
  });
  void login;

  const stats = await call('admin stats', 'GET', '/api/admin/stats');
  if (stats) console.log(`      KPIs: revenue=$${(stats.kpi.revenueToday / 100).toFixed(2)} orders=${stats.kpi.ordersToday} open=${stats.kpi.openOrders} lowStock=${stats.kpi.lowStock} conversion=${stats.kpi.conversionRate}%`);
  await call('admin live', 'GET', '/api/admin/stats/live');
  const orders = await call('admin orders', 'GET', '/api/admin/orders?limit=3');
  await call('admin analytics', 'GET', '/api/admin/analytics');
  await call('admin products', 'GET', '/api/admin/products?limit=3');
  await call('admin customers', 'GET', '/api/admin/customers?limit=3');
  await call('admin promos', 'GET', '/api/admin/promos');
  await call('admin settings', 'GET', '/api/admin/settings');
  await call('admin activity', 'GET', '/api/admin/activity');

  if (orders && orders.items && orders.items[0]) {
    const oid = orders.items[0].id;
    const detail = await call('admin order detail', 'GET', `/api/admin/orders/${oid}`);
    if (detail) {
      const next = (detail.order.allowedNext || [])[0];
      if (next) {
        await call(`admin status → ${next}`, 'PATCH', `/api/admin/orders/${oid}/status`, {
          body: { status: next, ...(next === 'shipped' ? { carrier: 'UPS', tracking: '1Z999AA10123456784' } : {}) }
        });
      }
      await call('admin invalid transition', 'PATCH', `/api/admin/orders/${oid}/status`, { body: { status: 'delivered' }, expect: 409 });
    }
  }

  // admin product create/update/stock/archive
  const created = await call('admin create product', 'POST', '/api/admin/products', {
    body: { name: 'Smoke Test Gift', category: 'Experiences', priceCents: 1999, stock: 5, emoji: '🧪', gradient: '#123456,#abcdef', description: 'Created by smoke test', tagline: 'test' },
    expect: 201
  });
  if (created) {
    await call('admin stock adjust', 'POST', `/api/admin/products/${created.id}/stock`, { body: { delta: -2, reason: 'manual' } });
    await call('admin archive product', 'DELETE', `/api/admin/products/${created.id}`);
  }
  await call('admin change password (weak)', 'POST', '/api/admin/password', { body: { current: 'x', next: 'short' }, expect: 400 });

  // pages
  const pages = ['/', '/shop', '/cart', '/checkout', '/track', '/admin', '/admin/login', '/404-missing'];
  for (const p of pages) {
    const r = await call(`page ${p}`, 'GET', p, { expect: p === '/404-missing' ? 404 : 200, raw: true });
    if (r && p !== '/404-missing' && r.res.status === 200 && !/<html/i.test(r.text)) console.log(`      note: ${p} returned non-HTML`);
  }

  // security headers
  const head = await call('security headers', 'GET', '/', { raw: true });
  if (head && head.res) {
    const csp = head.res.headers.get('content-security-policy');
    const nosniff = head.res.headers.get('x-content-type-options');
    console.log(`      CSP: ${csp ? csp.slice(0, 80) + '…' : 'MISSING'} | nosniff: ${nosniff} | powered-by: ${head.res.headers.get('x-powered-by')}`);
  }

  // CSRF: cross-origin POST must be rejected (raw http so the Origin header isn't filtered)
  await new Promise((resolve) => {
    const http = require('node:http');
    const payload = JSON.stringify({});
    const req = http.request({
      host: 'localhost', port: Number(new URL(BASE).port) || 3000, path: '/api/track/heartbeat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), Origin: 'https://evil.example.com' }
    }, (res2) => {
      const ok = res2.statusCode === 403;
      ok ? passed++ : failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'} [${res2.statusCode}/403] cross-origin POST blocked`);
      res2.resume();
      resolve();
    });
    req.on('error', () => { failed++; resolve(); });
    req.end(payload);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
