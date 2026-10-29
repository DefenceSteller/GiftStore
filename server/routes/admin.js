'use strict';
/**
 * Admin API — auth, live stats, orders, products, customers, promos, analytics, settings.
 * Every route except /login and /logout sits behind the JWT guard.
 */
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');

const config = require('../config');
const { q, tx } = require('../db');
const { HttpError, asyncHandler } = require('../lib/errors');
const { TtlCache, sanitize, sanitizeMultiline, isEmail, normalizeEmail, digitsOf, clampInt, escapeLike, orderNumber, randomToken } = require('../lib/helpers');
const { STATUSES, STATUS_META, STATUS_FLOW, canTransition, orderTimeline, estimatedDelivery } = require('../lib/orders');
const { getSettings, setSettings, DEFAULTS } = require('../lib/settings');
const { writeProductImage } = require('../lib/svg');
const traffic = require('../lib/traffic');
const payments = require('../services/payments');
const { loginLimiter } = require('../middleware/rateLimits');
const { avgLatencyMs, p95LatencyMs } = require('../middleware/visitors');
const { issueToken, setAdminCookie, clearAdminCookie, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DUMMY_HASH = bcrypt.hashSync(randomToken(24), 12);
const statsCache = new TtlCache(5000, 4);
const analyticsCache = new TtlCache(6000, 4);

/* -------------------------------- helpers -------------------------------- */
function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
}

function pctDelta(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function labelFor(dayKeyStr) {
  const [y, m, d] = dayKeyStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fillSeries(rows, days, key = 'date') {
  const map = new Map(rows.map((r) => [r[key], r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(dayStart(-i));
    out.push(map.get(k) || { date: k, label: labelFor(k), visits: 0, revenue: 0, orders: 0 });
  }
  return out;
}

let dbSizeCache = { at: 0, mb: 0 };
function dbSizeMb() {
  if (Date.now() - dbSizeCache.at < 30000 && dbSizeCache.mb) return dbSizeCache.mb;
  let bytes = 0;
  for (const suffix of ['', '-wal', '-shm']) {
    try { bytes += fs.statSync(config.dbFile + suffix).size; } catch (_) { /* missing file */ }
  }
  dbSizeCache = { at: Date.now(), mb: Math.round((bytes / (1024 * 1024)) * 10) / 10 };
  return dbSizeCache.mb;
}

/* --------------------------------- auth ---------------------------------- */
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email || '');
  const password = String(body.password || '');
  if (!isEmail(email) || password.length < 1 || password.length > 200) {
    throw new HttpError(400, 'Enter your email and password.', 'validation');
  }
  const admin = q.get('SELECT * FROM admins WHERE email = ?', email);
  const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
  if (!ok || !admin) {
    traffic.activity('auth.login_failed', `Failed sign-in attempt for ${email}`, null, email);
    throw new HttpError(401, 'Email or password is incorrect.', 'invalid_credentials');
  }
  setAdminCookie(res, issueToken(admin));
  q.run('UPDATE admins SET last_login_at = ? WHERE id = ?', Date.now(), admin.id);
  traffic.activity('auth.login', `${admin.name} signed in`, null, admin.email);
  res.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
}));

router.post('/logout', (req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.use(requireAdmin);

router.get('/me', (req, res) => res.json({ admin: req.admin }));

router.post('/password', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const current = String(body.current || '');
  const next = String(body.next || '');
  if (next.length < 10) throw new HttpError(400, 'New password must be at least 10 characters.', 'weak_password');
  const admin = q.get('SELECT * FROM admins WHERE id = ?', req.admin.id);
  const ok = await bcrypt.compare(current, admin.password_hash);
  if (!ok) throw new HttpError(400, 'Your current password is wrong.', 'invalid_password');
  q.run('UPDATE admins SET password_hash = ? WHERE id = ?', bcrypt.hashSync(next, 12), admin.id);
  traffic.activity('auth.password', 'Admin password changed', null, admin.email);
  res.json({ ok: true });
}));

/* ------------------------------ live stats ------------------------------- */
function buildLiveStats() {
  const today = dayStart(0);
  const snapshot = traffic.liveSnapshot();
  const todayOrders = q.get(
    "SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS rev FROM orders WHERE placed_at >= ? AND status NOT IN ('cancelled','refunded')",
    today
  );
  return {
    ...snapshot,
    ordersToday: Number(todayOrders.n),
    revenueTodayCents: Number(todayOrders.rev),
    system: {
      uptimeSec: Math.round(process.uptime()),
      avgLatencyMs: avgLatencyMs(),
      p95LatencyMs: p95LatencyMs(),
      node: process.version,
      dbSizeMb: dbSizeMb()
    }
  };
}

router.get('/stats/live', (req, res) => {
  const payload = buildLiveStats();
  res.set('Cache-Control', 'no-store');
  res.json(payload);
});

/* ------------------------------ dashboard -------------------------------- */
function buildStats() {
  const now = Date.now();
  const today = dayStart(0);
  const dayMs = 86400000;
  const d14 = dayStart(-13);
  const d30 = dayStart(-29);
  const d7 = dayStart(-6);

  const revenueSql = `
    SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS rev
    FROM orders WHERE placed_at >= ? AND placed_at < ? AND status NOT IN ('cancelled','refunded')`;

  const revCur = q.get(revenueSql, today, now);
  const revPrev = q.get(revenueSql, today - dayMs, now - dayMs);
  const rev30 = q.get(`SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS rev FROM orders
    WHERE placed_at >= ? AND status NOT IN ('cancelled','refunded')`, d30);

  const ordersToday = Number(revCur.n);
  const ordersPrev = Number(revPrev.n);
  const revenueToday = Number(revCur.rev);
  const revenuePrev = Number(revPrev.rev);

  const pvCur = Number(q.get("SELECT COUNT(*) AS n FROM analytics_events WHERE type='pageview' AND created_at >= ? AND created_at < ?", today, now).n);
  const pvPrev = Number(q.get("SELECT COUNT(*) AS n FROM analytics_events WHERE type='pageview' AND created_at >= ? AND created_at < ?", today - dayMs, now - dayMs).n);
  const conversionCur = pvCur ? (ordersToday / pvCur) * 100 : 0;
  const conversionPrev = pvPrev ? (ordersPrev / pvPrev) * 100 : 0;

  const customers = q.get('SELECT COUNT(*) AS total, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new_today FROM customers', today);
  const lowStock = Number(q.get('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock <= 5').n);
  const openOrders = Number(q.get("SELECT COUNT(*) AS n FROM orders WHERE status IN ('pending','paid','packed')").n);

  const statusRows = q.all('SELECT status, COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS rev FROM orders GROUP BY status');
  const statusMap = Object.fromEntries(statusRows.map((r) => [r.status, { count: Number(r.n), revenue: Number(r.rev) }]));

  const revenueSeries = q.all(`
    SELECT strftime('%Y-%m-%d', placed_at/1000,'unixepoch','localtime') AS date,
           COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total_cents END),0) AS revenue,
           COUNT(*) AS orders
    FROM orders WHERE placed_at >= ? GROUP BY date`, d14);

  const trafficSeries = q.all(`
    SELECT strftime('%Y-%m-%d', created_at/1000,'unixepoch','localtime') AS date, COUNT(*) AS visits
    FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY date`, d7);

  const topProducts = q.all(`
    SELECT oi.name, oi.emoji, oi.gradient, SUM(oi.qty) AS qty, SUM(oi.line_total_cents) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.placed_at >= ? AND o.status NOT IN ('cancelled','refunded')
    GROUP BY oi.product_id, oi.name ORDER BY revenue DESC LIMIT 6`, d30);

  const recentOrders = q.all(`
    SELECT o.id, o.order_number, o.name, o.email, o.total_cents, o.status, o.placed_at, o.item_count, o.source,
           (SELECT emoji FROM order_items WHERE order_id = o.id LIMIT 1) AS emoji
    FROM orders o ORDER BY o.placed_at DESC LIMIT 8`);

  const activity = q.all('SELECT id, kind, message, meta, actor, created_at FROM activity_log ORDER BY id DESC LIMIT 10');
  const lowStockList = q.all(`
    SELECT id, name, slug, emoji, stock, price_cents FROM products
    WHERE is_active = 1 AND stock <= 6 ORDER BY stock ASC, name ASC LIMIT 6`);

  const funnelRows = q.all("SELECT type, COUNT(*) AS n FROM analytics_events WHERE created_at >= ? GROUP BY type", d7);
  const funnel = Object.fromEntries(funnelRows.map((r) => [r.type, Number(r.n)]));

  return {
    generatedAt: now,
    kpi: {
      revenueToday,
      revenueDelta: pctDelta(revenueToday, revenuePrev),
      ordersToday,
      ordersDelta: pctDelta(ordersToday, ordersPrev),
      aovToday: ordersToday ? Math.round(revenueToday / ordersToday) : 0,
      aovDelta: pctDelta(
        ordersToday ? revenueToday / ordersToday : 0,
        ordersPrev ? revenuePrev / ordersPrev : 0
      ),
      conversionRate: Math.round(conversionCur * 10) / 10,
      conversionDelta: pctDelta(conversionCur, conversionPrev),
      visitsToday: pvCur,
      visitsDelta: pctDelta(pvCur, pvPrev),
      customersTotal: Number(customers.total),
      newCustomersToday: Number(customers.new_today || 0),
      openOrders,
      lowStock,
      revenue30d: Number(rev30.rev),
      orders30d: Number(rev30.n),
      activeVisitors: traffic.activeVisitors()
    },
    charts: {
      revenue: fillSeries(revenueSeries.map((r) => ({ ...r, revenue: Number(r.revenue), orders: Number(r.orders) })), 14),
      traffic: fillSeries(trafficSeries.map((r) => ({ ...r, visits: Number(r.visits) })), 7),
      status: STATUSES.map((s) => ({
        status: s,
        label: STATUS_META[s].label,
        count: statusMap[s] ? statusMap[s].count : 0,
        revenue: statusMap[s] ? statusMap[s].revenue : 0
      })),
      topProducts: topProducts.map((p) => ({
        name: p.name, emoji: p.emoji, qty: Number(p.qty), revenue: Number(p.revenue)
      })),
      funnel: [
        { stage: 'Product views', count: funnel.product_view || 0 },
        { stage: 'Added to bag', count: funnel.add_to_cart || 0 },
        { stage: 'Checkout started', count: funnel.checkout_start || 0 },
        { stage: 'Purchased', count: funnel.purchase || 0 }
      ]
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id, orderNumber: o.order_number, name: o.name, email: o.email,
      totalCents: Number(o.total_cents), status: o.status, statusLabel: STATUS_META[o.status].label,
      placedAt: Number(o.placed_at), itemCount: o.item_count, emoji: o.emoji, source: o.source
    })),
    activity: activity.map((a) => ({
      id: a.id, kind: a.kind, message: a.message, actor: a.actor, at: Number(a.created_at)
    })),
    lowStockList: lowStockList.map((p) => ({
      id: p.id, name: p.name, slug: p.slug, emoji: p.emoji, stock: p.stock, priceCents: Number(p.price_cents)
    }))
  };
}

router.get('/stats', (req, res) => {
  const payload = statsCache.wrap('stats', async () => buildStats());
  payload.then((data) => res.json(data));
});

/* ------------------------------- analytics ------------------------------- */
function buildAnalytics() {
  const now = Date.now();
  const d7 = dayStart(-6);
  const d30 = dayStart(-29);

  const hourlyRows = q.all(`
    SELECT CAST(strftime('%H', created_at/1000,'unixepoch','localtime') AS INTEGER) AS hour, COUNT(*) AS n
    FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY hour`, d7);
  const hourlyMap = new Map(hourlyRows.map((r) => [Number(r.hour), Number(r.n)]));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, visits: hourlyMap.get(hour) || 0 }));

  const sources = q.all(`
    SELECT COALESCE(NULLIF(source,''),'direct') AS source, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS uniques
    FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY 1 ORDER BY n DESC LIMIT 8`, d30)
    .map((r) => ({ source: r.source, visits: Number(r.n), uniques: Number(r.uniques) }));

  const pages = q.all(`
    SELECT path, COUNT(*) AS n FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY path ORDER BY n DESC LIMIT 8`, d7)
    .map((r) => ({ path: r.path, visits: Number(r.n) }));

  const funnelRows = q.all('SELECT type, COUNT(*) AS n FROM analytics_events WHERE created_at >= ? GROUP BY type', d7);
  const funnel = Object.fromEntries(funnelRows.map((r) => [r.type, Number(r.n)]));

  const visits7 = funnel.pageview || 0;
  const ordersBySource = q.all(`
    SELECT COALESCE(NULLIF(source,''),'direct') AS source, COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS rev
    FROM orders WHERE placed_at >= ? AND status NOT IN ('cancelled','refunded') GROUP BY 1 ORDER BY rev DESC`, d30)
    .map((r) => ({ source: r.source, orders: Number(r.n), revenue: Number(r.rev) }));

  const dailyRows = q.all(`
    SELECT strftime('%Y-%m-%d', created_at/1000,'unixepoch','localtime') AS date, COUNT(*) AS visits,
           COUNT(DISTINCT visitor_id) AS uniques
    FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY date`, d7);

  const deviceRows = q.all(`
    SELECT CASE
             WHEN path LIKE '%/admin%' THEN 'admin'
             ELSE 'storefront'
           END AS area, COUNT(*) AS n
    FROM analytics_events WHERE created_at >= ? GROUP BY area`, d7);

  return {
    generatedAt: now,
    hourly,
    sources,
    pages,
    daily: fillSeries(dailyRows.map((r) => ({ ...r, visits: Number(r.visits), uniques: Number(r.uniques) })), 7),
    funnel: [
      { stage: 'Sessions', count: visits7 },
      { stage: 'Product views', count: funnel.product_view || 0 },
      { stage: 'Added to bag', count: funnel.add_to_cart || 0 },
      { stage: 'Checkout started', count: funnel.checkout_start || 0 },
      { stage: 'Orders', count: funnel.purchase || 0 }
    ],
    ordersBySource,
    kpis: {
      visits7d: visits7,
      uniques7d: Number(q.get('SELECT COUNT(DISTINCT visitor_id) AS n FROM analytics_events WHERE type = ? AND created_at >= ?', 'pageview', d7).n),
      addToCartRate: visits7 ? Math.round(((funnel.add_to_cart || 0) / visits7) * 1000) / 10 : 0,
      checkoutRate: visits7 ? Math.round(((funnel.checkout_start || 0) / visits7) * 1000) / 10 : 0,
      purchaseRate: visits7 ? Math.round(((funnel.purchase || 0) / visits7) * 1000) / 10 : 0,
      areas: deviceRows.map((r) => ({ area: r.area, n: Number(r.n) }))
    }
  };
}

router.get('/analytics', (req, res) => {
  const payload = analyticsCache.wrap('analytics', async () => buildAnalytics());
  payload.then((data) => res.json(data));
});

/* -------------------------------- orders --------------------------------- */
router.get('/orders', (req, res) => {
  const status = sanitize(req.query.status || 'all', 20);
  const q1 = typeof req.query.q === 'string' ? sanitize(req.query.q, 60) : '';
  const page = clampInt(req.query.page, 1, 1000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 20);

  const where = [];
  const params = [];
  if (STATUSES.includes(status)) {
    where.push('o.status = ?');
    params.push(status);
  } else if (status === 'open') {
    where.push("o.status IN ('pending','paid','packed','shipped')");
  }
  if (q1) {
    const like = `%${escapeLike(q1)}%`;
    where.push("(o.order_number LIKE ? ESCAPE '\\' OR o.name LIKE ? ESCAPE '\\' OR o.email LIKE ? ESCAPE '\\' OR o.phone LIKE ? ESCAPE '\\' OR o.tracking_number LIKE ? ESCAPE '\\')");
    params.push(like, like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(q.get(`SELECT COUNT(*) AS n FROM orders o ${whereSql}`, ...params).n);
  const rows = q.all(`
    SELECT o.id, o.order_number, o.name, o.email, o.city, o.total_cents, o.status, o.payment_method,
           o.payment_status, o.placed_at, o.item_count, o.source, o.tracking_number, o.carrier,
           (SELECT emoji FROM order_items WHERE order_id = o.id LIMIT 1) AS emoji
    FROM orders o ${whereSql} ORDER BY o.placed_at DESC LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit);

  const summary = q.all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status');
  const statusCounts = Object.fromEntries(summary.map((r) => [r.status, Number(r.n)]));

  res.json({
    items: rows.map((o) => ({
      id: o.id, orderNumber: o.order_number, name: o.name, email: o.email, city: o.city,
      totalCents: Number(o.total_cents), status: o.status, statusLabel: STATUS_META[o.status].label,
      paymentMethod: o.payment_method, paymentStatus: o.payment_status, placedAt: Number(o.placed_at),
      itemCount: o.item_count, source: o.source, trackingNumber: o.tracking_number, carrier: o.carrier, emoji: o.emoji
    })),
    total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), statusCounts
  });
});

router.get('/orders/:id', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const order = q.get('SELECT * FROM orders WHERE id = ?', id);
  if (!order) throw new HttpError(404, 'Order not found.', 'not_found');
  const items = q.all('SELECT * FROM order_items WHERE order_id = ?', order.id);
  const timeline = q.all('SELECT kind, message, created_at FROM activity_log WHERE meta LIKE ? ORDER BY created_at DESC LIMIT 20', `%${order.order_number}%`);
  const history = Number(q.get('SELECT COUNT(*) AS n FROM orders WHERE email = ?', order.email).n);

  res.json({
    order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      statusLabel: STATUS_META[order.status].label,
      allowedNext: STATUS_FLOW[order.status] || [],
      customer: {
        name: order.name, email: order.email, phone: order.phone,
        address: [order.address1, order.address2, order.city, order.state, order.postal_code, order.country]
          .filter(Boolean).join(', '),
        city: order.city, state: order.state, postal: order.postal_code, country: order.country,
        previousOrders: history
      },
      pricing: {
        subtotalCents: Number(order.subtotal_cents), discountCents: Number(order.discount_cents),
        shippingCents: Number(order.shipping_cents), taxCents: Number(order.tax_cents),
        totalCents: Number(order.total_cents), currency: order.currency, promoCode: order.promo_code
      },
      payment: {
        method: order.payment_method, status: order.payment_status, ref: order.payment_ref,
        brand: order.payment_brand, last4: order.payment_last4
      },
      fulfillment: {
        carrier: order.carrier, trackingNumber: order.tracking_number,
        deliveryMethod: order.delivery_method, note: order.note
      },
      source: order.source,
      placedAt: Number(order.placed_at),
      updatedAt: Number(order.updated_at),
      paidAt: order.paid_at ? Number(order.paid_at) : null,
      packedAt: order.packed_at ? Number(order.packed_at) : null,
      shippedAt: order.shipped_at ? Number(order.shipped_at) : null,
      deliveredAt: order.delivered_at ? Number(order.delivered_at) : null,
      cancelledAt: order.cancelled_at ? Number(order.cancelled_at) : null,
      eta: estimatedDelivery(order)
    },
    items: items.map((i) => ({
      id: i.id, productId: i.product_id, name: i.name, slug: i.slug, emoji: i.emoji, gradient: i.gradient,
      unitPriceCents: Number(i.unit_price_cents), qty: i.qty, lineTotalCents: Number(i.line_total_cents)
    })),
    customerTimeline: timeline.map((t) => ({ kind: t.kind, message: t.message, at: Number(t.created_at) })),
    customerView: orderTimeline(order)
  });
});

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL', 'Royal Mail', 'Other'];

router.patch('/orders/:id/status', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const body = req.body || {};
  const next = sanitize(body.status || '', 20);
  const order = q.get('SELECT * FROM orders WHERE id = ?', id);
  if (!order) throw new HttpError(404, 'Order not found.', 'not_found');
  if (!canTransition(order.status, next)) {
    throw new HttpError(409, `Cannot move an order from "${STATUS_META[order.status].label}" to "${STATUS_META[next] ? STATUS_META[next].label : next}".`, 'invalid_transition');
  }

  const now = Date.now();
  const updates = ['status = ?', 'updated_at = ?'];
  const params = [next, now];

  if (next === 'paid') { updates.push('paid_at = COALESCE(paid_at, ?)'); params.push(now); updates.push('payment_status = ?'); params.push(order.payment_method === 'cod' ? 'captured' : 'succeeded'); }
  if (next === 'packed') { updates.push('packed_at = COALESCE(packed_at, ?)'); params.push(now); if (!order.paid_at) { updates.push('paid_at = COALESCE(paid_at, ?)'); params.push(now); } }
  if (next === 'shipped') {
    const carrier = CARRIERS.includes(body.carrier) ? body.carrier : null;
    const tracking = sanitize(body.tracking || '', 40);
    if (!carrier) throw new HttpError(400, 'Choose a carrier before marking as shipped.', 'carrier_required', { carrier: 'Required' });
    if (tracking.length < 6) throw new HttpError(400, 'Enter a valid tracking number.', 'tracking_required', { tracking: 'At least 6 characters' });
    updates.push('shipped_at = COALESCE(shipped_at, ?)', 'carrier = ?', 'tracking_number = ?');
    params.push(now, carrier, tracking);
  }
  if (next === 'delivered') { updates.push('delivered_at = COALESCE(delivered_at, ?)'); params.push(now); if (order.payment_method === 'cod') { updates.push('payment_status = ?'); params.push('succeeded'); } }
  if (next === 'cancelled') {
    updates.push('cancelled_at = COALESCE(cancelled_at, ?)'); params.push(now);
    if (order.payment_status === 'succeeded') { updates.push('payment_status = ?'); params.push('refunded'); }
    else if (order.payment_status !== 'refunded') { updates.push('payment_status = ?'); params.push('voided'); }
  }
  if (next === 'refunded') { updates.push('cancelled_at = COALESCE(cancelled_at, ?)'); params.push(now); updates.push('payment_status = ?'); params.push('refunded'); }

  const note = sanitizeMultiline(body.note || '', 500);
  if (note) { updates.push('note = ?'); params.push(note); }

  params.push(id);
  tx(() => {
    q.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, ...params);

    // Restock inventory when an order is cancelled before shipping.
    if (next === 'cancelled' && !order.shipped_at) {
      const items = q.all('SELECT product_id, qty FROM order_items WHERE order_id = ?', order.id);
      for (const item of items) {
        if (!item.product_id) continue;
        q.run('UPDATE products SET stock = stock + ? WHERE id = ?', item.qty, item.product_id);
        q.run('INSERT INTO stock_movements (product_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)',
          item.product_id, item.qty, 'restock_cancel', order.order_number, now);
      }
    }

    traffic.activity('order.status', `${order.order_number}: ${STATUS_META[order.status].label} → ${STATUS_META[next].label}`, {
      orderNumber: order.order_number, from: order.status, to: next, tracking: body.tracking || null
    }, req.admin.email);
  });

  // Refund through the payment provider abstraction when money already moved.
  if (next === 'refunded' && order.payment_ref && order.payment_status === 'succeeded') {
    payments.refund({ reference: order.payment_ref, amountCents: order.total_cents })
      .catch((err) => console.error('[payments] refund failed:', err.message));
  }

  statsCache.clear();
  const updated = q.get('SELECT * FROM orders WHERE id = ?', id);
  res.json({
    ok: true,
    order: {
      id: updated.id, status: updated.status, statusLabel: STATUS_META[updated.status].label,
      allowedNext: STATUS_FLOW[updated.status], carrier: updated.carrier, trackingNumber: updated.tracking_number,
      updatedAt: Number(updated.updated_at)
    }
  });
});

/* ------------------------------- products -------------------------------- */
const PRODUCT_FIELDS = {
  name: (v) => sanitize(v, 100),
  tagline: (v) => sanitize(v, 140),
  description: (v) => sanitizeMultiline(v, 4000),
  category: (v) => sanitize(v, 40),
  emoji: (v) => sanitize(v, 8),
  gradient: (v) => sanitize(v, 60)
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'gift';
}

function uniqueSlug(base, excludeId = null) {
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const clash = q.get('SELECT id FROM products WHERE slug = ?', slug);
    if (!clash || clash.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${randomToken(3)}`;
}

function validGradient(value) {
  const parts = String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => /^#[0-9a-fA-F]{3,8}$/.test(p))) return `${parts[0]},${parts[1]}`;
  return null;
}

router.get('/products', (req, res) => {
  const search = typeof req.query.q === 'string' ? sanitize(req.query.q, 60) : '';
  const status = sanitize(req.query.status || 'all', 20);
  const page = clampInt(req.query.page, 1, 1000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 25);

  const where = [];
  const params = [];
  if (status === 'active') where.push('is_active = 1');
  if (status === 'archived') where.push('is_active = 0');
  if (status === 'low') where.push('is_active = 1 AND stock <= 5');
  if (search) {
    const like = `%${escapeLike(search)}%`;
    where.push("(name LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')");
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(q.get(`SELECT COUNT(*) AS n FROM products ${whereSql}`, ...params).n);
  const rows = q.all(`SELECT * FROM products ${whereSql} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit);

  res.json({
    items: rows.map((p) => ({
      id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, category: p.category,
      priceCents: Number(p.price_cents), compareAtCents: p.compare_at_cents ? Number(p.compare_at_cents) : null,
      stock: p.stock, emoji: p.emoji, gradient: p.gradient, rating: p.rating, reviewCount: p.review_count,
      active: !!p.is_active, featured: !!p.is_featured, sortOrder: p.sort_order,
      image: `/assets/img/products/${p.slug}.svg`, description: p.description
    })),
    total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
    counts: {
      all: Number(q.get('SELECT COUNT(*) AS n FROM products').n),
      active: Number(q.get('SELECT COUNT(*) AS n FROM products WHERE is_active = 1').n),
      archived: Number(q.get('SELECT COUNT(*) AS n FROM products WHERE is_active = 0').n),
      low: Number(q.get('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock <= 5').n)
    }
  });
});

function readProductPayload(body, existing = null) {
  const out = {};
  const errors = {};

  for (const [field, transform] of Object.entries(PRODUCT_FIELDS)) {
    if (body[field] !== undefined) {
      const value = transform(body[field]);
      if (value.length < (field === 'description' || field === 'tagline' ? 0 : 2)) errors[field] = 'Too short.';
      out[field] = value;
    } else if (!existing) {
      out[field] = transform('');
      if (field !== 'tagline' && field !== 'description' && field !== 'emoji' && field !== 'gradient') {
        if (!out[field]) errors[field] = 'Required.';
      }
    }
  }
  if (!existing) {
    if (!out.name) errors.name = 'Product name is required.';
    if (!out.category) errors.category = 'Pick or type a category.';
    if (out.emoji && out.emoji.length < 1) errors.emoji = 'Add an emoji.';
  }
  if (out.name !== undefined && out.name.length < 2) errors.name = 'Name is too short.';

  if (body.priceCents !== undefined) {
    const price = clampInt(body.priceCents, 1, 10000000);
    if (price == null) errors.priceCents = 'Enter a valid price.';
    else out.price_cents = price;
  } else if (!existing) errors.priceCents = 'Price is required.';

  if (body.compareAtCents !== undefined) {
    const compare = clampInt(body.compareAtCents, 0, 10000000, 0);
    out.compare_at_cents = compare > 0 ? compare : null;
  }

  if (body.stock !== undefined) {
    const stock = clampInt(body.stock, 0, 1000000);
    if (stock == null) errors.stock = 'Stock must be a whole number.';
    else out.stock = stock;
  } else if (!existing) out.stock = 0;

  if (body.gradient !== undefined) {
    const gradient = validGradient(body.gradient);
    if (!gradient) errors.gradient = 'Use two hex colors, e.g. #7C5CFF,#D3FF52';
    else out.gradient = gradient;
  } else if (existing) delete out.gradient;

  if (body.rating !== undefined) {
    const rating = Number(body.rating);
    out.rating = Number.isFinite(rating) ? Math.min(5, Math.max(0, Math.round(rating * 10) / 10)) : (existing ? existing.rating : 4.5);
  }
  if (body.reviewCount !== undefined) out.review_count = clampInt(body.reviewCount, 0, 999999, 0);
  if (body.is_active !== undefined) out.is_active = body.is_active ? 1 : 0;
  if (body.is_featured !== undefined) out.is_featured = body.is_featured ? 1 : 0;
  if (body.sortOrder !== undefined) out.sort_order = clampInt(body.sortOrder, -9999, 9999, 0) ?? 0;
  if (body.slug !== undefined && body.slug) {
    const candidate = slugify(String(body.slug));
    out.slug = uniqueSlug(candidate, existing ? existing.id : null);
  }

  if (Object.keys(errors).length) throw new HttpError(400, 'Check the product form.', 'validation', errors);
  return out;
}

router.post('/products', (req, res) => {
  const body = req.body || {};
  const payload = readProductPayload(body);
  const now = Date.now();
  if (!payload.slug) payload.slug = uniqueSlug(slugify(payload.name || 'gift'));
  if (!payload.tagline) payload.tagline = null;

  const created = tx(() => {
    const result = q.run(`
      INSERT INTO products (slug, name, tagline, description, category, price_cents, compare_at_cents,
        stock, emoji, gradient, rating, review_count, is_active, is_featured, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      payload.slug, payload.name, payload.tagline, payload.description || '', payload.category,
      payload.price_cents, payload.compare_at_cents || null, payload.stock ?? 0,
      payload.emoji || '🎁', payload.gradient || '#7C5CFF,#D3FF52',
      payload.rating ?? 4.5, payload.review_count ?? 0,
      payload.is_active ?? 1, payload.is_featured ?? 0, payload.sort_order ?? 0, now, now);
    writeProductImage({ slug: payload.slug, name: payload.name, emoji: payload.emoji || '🎁', gradient: payload.gradient || '#7C5CFF,#D3FF52', id: result.lastInsertRowid });
    traffic.activity('product.created', `New product “${payload.name}”`, { slug: payload.slug, price: payload.price_cents }, req.admin.email);
    return result.lastInsertRowid;
  });

  statsCache.clear();
  res.status(201).json({ ok: true, id: created, slug: payload.slug });
});

router.patch('/products/:id', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const existing = q.get('SELECT * FROM products WHERE id = ?', id);
  if (!existing) throw new HttpError(404, 'Product not found.', 'not_found');

  const payload = readProductPayload(req.body || {}, existing);
  const now = Date.now();
  payload.updated_at = now;

  const keys = Object.keys(payload);
  if (!keys.length) return res.json({ ok: true, unchanged: true });

  const setSql = keys.map((k) => `${k} = ?`).join(', ');
  const params = keys.map((k) => payload[k]);

  tx(() => {
    q.run(`UPDATE products SET ${setSql} WHERE id = ?`, ...params, id);
    const fresh = q.get('SELECT * FROM products WHERE id = ?', id);
    if (payload.slug || payload.name || payload.emoji || payload.gradient) {
      writeProductImage({ slug: fresh.slug, name: fresh.name, emoji: fresh.emoji, gradient: fresh.gradient, id: fresh.id });
    }
    traffic.activity('product.updated', `Updated “${fresh.name}”`, { id, fields: keys }, req.admin.email);
  });

  statsCache.clear();
  res.json({ ok: true, id, slug: existing.slug });
});

router.delete('/products/:id', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const existing = q.get('SELECT * FROM products WHERE id = ?', id);
  if (!existing) throw new HttpError(404, 'Product not found.', 'not_found');
  q.run('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?', Date.now(), id);
  traffic.activity('product.archived', `Archived “${existing.name}”`, { id }, req.admin.email);
  statsCache.clear();
  res.json({ ok: true, archived: true });
});

router.post('/products/:id/stock', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const body = req.body || {};
  const delta = clampInt(body.delta, -100000, 100000);
  const reason = sanitize(body.reason || 'manual_adjust', 40);
  if (delta == null || delta === 0) throw new HttpError(400, 'Enter a non-zero stock change.', 'bad_delta');
  const product = q.get('SELECT * FROM products WHERE id = ?', id);
  if (!product) throw new HttpError(404, 'Product not found.', 'not_found');

  const newStock = Math.max(0, product.stock + delta);
  const actualDelta = newStock - product.stock;
  tx(() => {
    q.run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', newStock, Date.now(), id);
    if (actualDelta !== 0) {
      q.run('INSERT INTO stock_movements (product_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)',
        id, actualDelta, reason, null, Date.now());
    }
    traffic.activity('product.stock', `${product.name}: ${actualDelta > 0 ? '+' : ''}${actualDelta} → ${newStock} in stock`, { id, newStock }, req.admin.email);
  });
  statsCache.clear();
  res.json({ ok: true, id, stock: newStock });
});

/* ------------------------------- customers ------------------------------- */
router.get('/customers', (req, res) => {
  const search = typeof req.query.q === 'string' ? sanitize(req.query.q, 60) : '';
  const page = clampInt(req.query.page, 1, 1000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 25);

  const where = [];
  const params = [];
  if (search) {
    const like = `%${escapeLike(search)}%`;
    where.push("(c.name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.city LIKE ? ESCAPE '\\')");
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(q.get(`SELECT COUNT(*) AS n FROM customers c ${whereSql}`, ...params).n);
  const rows = q.all(`
    SELECT c.id, c.email, c.name, c.phone, c.city, c.created_at,
           COUNT(o.id) AS orders,
           COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','refunded') THEN o.total_cents END), 0) AS ltv,
           MAX(o.placed_at) AS last_order
    FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
    ${whereSql} GROUP BY c.id ORDER BY COALESCE(MAX(o.placed_at), c.created_at) DESC LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit);

  res.json({
    items: rows.map((c) => ({
      id: c.id, email: c.email, name: c.name, phone: c.phone, city: c.city,
      createdAt: Number(c.created_at), orders: Number(c.orders), ltvCents: Number(c.ltv),
      lastOrderAt: c.last_order ? Number(c.last_order) : null
    })),
    total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
    totals: {
      customers: total,
      revenue: Number(q.get("SELECT COALESCE(SUM(total_cents),0) AS rev FROM orders WHERE status NOT IN ('cancelled','refunded')").rev)
    }
  });
});

/* --------------------------------- promos -------------------------------- */
router.get('/promos', (req, res) => {
  const rows = q.all('SELECT * FROM promotions ORDER BY created_at DESC');
  res.json({
    items: rows.map((p) => ({
      id: p.id, code: p.code, type: p.type, value: Number(p.value),
      minSubtotalCents: Number(p.min_subtotal_cents), active: !!p.active, uses: p.uses,
      description: p.description, expiresAt: p.expires_at ? Number(p.expires_at) : null, createdAt: Number(p.created_at)
    }))
  });
});

router.post('/promos', (req, res) => {
  const body = req.body || {};
  const code = sanitize(body.code || '', 24).toUpperCase();
  const type = ['percent', 'fixed', 'free_shipping'].includes(body.type) ? body.type : 'percent';
  const value = clampInt(body.value, 0, 1000000, 0);
  const min = clampInt(body.minSubtotalCents, 0, 10000000, 0) || 0;
  const description = sanitize(body.description || '', 140);
  const expiresAt = body.expiresAt ? Date.parse(body.expiresAt) : null;
  const errors = {};
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) errors.code = '3–24 letters, numbers, - or _.';
  else if (q.get('SELECT 1 AS x FROM promotions WHERE code = ?', code)) errors.code = 'That code already exists.';
  if (type === 'percent' && (value < 1 || value > 90)) errors.value = 'Percent must be 1–90.';
  if (type === 'fixed' && value < 1) errors.value = 'Amount must be at least Rs 1 (cents).';
  if (body.expiresAt && Number.isNaN(expiresAt)) errors.expiresAt = 'Invalid date.';
  if (Object.keys(errors).length) throw new HttpError(400, 'Check the promo form.', 'validation', errors);

  const result = q.run(`
    INSERT INTO promotions (code, type, value, min_subtotal_cents, active, uses, description, expires_at, created_at)
    VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)`,
    code, type, value, min, description || null, expiresAt || null, Date.now());
  traffic.activity('promo.created', `Promo ${code} created`, { type, value }, req.admin.email);
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

router.patch('/promos/:id', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const promo = q.get('SELECT * FROM promotions WHERE id = ?', id);
  if (!promo) throw new HttpError(404, 'Promo not found.', 'not_found');
  const body = req.body || {};
  const active = body.active === undefined ? promo.active : (body.active ? 1 : 0);
  const min = body.minSubtotalCents === undefined ? promo.min_subtotal_cents : (clampInt(body.minSubtotalCents, 0, 10000000, promo.min_subtotal_cents));
  q.run('UPDATE promotions SET active = ?, min_subtotal_cents = ? WHERE id = ?', active, min, id);
  traffic.activity('promo.updated', `Promo ${promo.code} ${active ? 'activated' : 'deactivated'}`, null, req.admin.email);
  res.json({ ok: true });
});

router.delete('/promos/:id', (req, res) => {
  const id = clampInt(req.params.id, 1, 1e9);
  const promo = q.get('SELECT * FROM promotions WHERE id = ?', id);
  if (!promo) throw new HttpError(404, 'Promo not found.', 'not_found');
  q.run('DELETE FROM promotions WHERE id = ?', id);
  traffic.activity('promo.deleted', `Promo ${promo.code} deleted`, null, req.admin.email);
  res.json({ ok: true });
});

/* -------------------------------- settings ------------------------------- */
router.get('/settings', (req, res) => res.json({ settings: getSettings(), defaults: DEFAULTS }));

router.patch('/settings', (req, res) => {
  const body = req.body || {};
  const numericKeys = ['free_shipping_threshold_cents', 'standard_shipping_cents', 'express_shipping_cents', 'tax_rate_bps'];
  const textKeys = ['store_name', 'announcement', 'currency', 'delivery_days_standard', 'delivery_days_express', 'support_email'];
  const clean = {};
  const errors = {};
  for (const key of numericKeys) {
    if (body[key] !== undefined) {
      const value = clampInt(body[key], 0, 10000000, null);
      if (value == null) errors[key] = 'Enter a whole number.';
      else clean[key] = value;
    }
  }
  for (const key of textKeys) {
    if (body[key] !== undefined) {
      const value = sanitize(body[key], key === 'announcement' ? 300 : 120);
      if (!value) errors[key] = 'Cannot be empty.';
      else clean[key] = value;
    }
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Check the settings form.', 'validation', errors);
  if (clean.currency && !/^[A-Z]{3}$/.test(clean.currency)) throw new HttpError(400, 'Currency must be a 3-letter code.', 'validation', { currency: 'e.g. USD' });

  setSettings(clean);
  traffic.activity('settings.updated', `Settings updated: ${Object.keys(clean).join(', ')}`, null, req.admin.email);
  res.json({ ok: true, settings: getSettings() });
});

/* -------------------------------- activity ------------------------------- */
router.get('/activity', (req, res) => {
  const since = clampInt(req.query.since, 0, 1e15, 0);
  const rows = q.all('SELECT id, kind, message, meta, actor, created_at FROM activity_log WHERE id > ? ORDER BY id DESC LIMIT 50', since);
  res.json({
    items: rows.map((a) => ({
      id: a.id, kind: a.kind, message: a.message, actor: a.actor,
      meta: a.meta ? (() => { try { return JSON.parse(a.meta); } catch (_) { return null; } })() : null,
      at: Number(a.created_at)
    }))
  });
});

/* ------------------------------ order export ----------------------------- */
router.get('/export/orders.csv', (req, res) => {
  const rows = q.all(`
    SELECT order_number, name, email, status, payment_method, payment_status, total_cents,
           carrier, tracking_number, datetime(placed_at/1000,'unixepoch','localtime') AS placed
    FROM orders ORDER BY placed_at DESC LIMIT 5000`);
  const header = 'Order,Customer,Email,Status,Payment,Payment Status,Total (USD),Carrier,Tracking,Placed\n';
  const body = rows.map((r) => [
    r.order_number, r.name, r.email, r.status, r.payment_method, r.payment_status,
    (r.total_cents / 100).toFixed(2), r.carrier || '', r.tracking_number || '', r.placed
  ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  traffic.activity('orders.exported', `Exported ${rows.length} orders to CSV`, null, req.admin.email);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="confetti-orders.csv"');
  res.send(header + body);
});

module.exports = router;
