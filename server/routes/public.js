'use strict';
/**
 * Public storefront API.
 * Catalog, promo validation, checkout (re-priced server-side), order tracking, analytics beacons.
 */
const express = require('express');
const { q, tx } = require('../db');
const { HttpError, asyncHandler } = require('../lib/errors');
const { priceCart } = require('../lib/pricing');
const { numericSettings } = require('../lib/settings');
const { orderTimeline, estimatedDelivery } = require('../lib/orders');
const payments = require('../services/payments');
const traffic = require('../lib/traffic');
const {
  TtlCache, orderNumber, sanitize, isEmail, normalizeEmail, digitsOf,
  clampInt, escapeLike, sourceFromReferrer, validExpiry, luhn
} = require('../lib/helpers');
const { trackLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.use('/track', trackLimiter);

const listCache = new TtlCache(4000, 300);
const configCache = new TtlCache(8000, 4);

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.name, p.tagline, p.category, p.price_cents, p.compare_at_cents,
  p.emoji, p.gradient, p.rating, p.review_count, p.is_featured, p.sort_order,
  (p.stock > 0) AS in_stock, p.stock`;

const SORTS = {
  featured: 'p.is_featured DESC, p.sort_order ASC, p.id ASC',
  newest: 'p.created_at DESC, p.id DESC',
  'price-asc': 'p.price_cents ASC, p.id ASC',
  'price-desc': 'p.price_cents DESC, p.id ASC',
  rating: 'p.rating DESC, p.review_count DESC',
  popular: 'p.review_count DESC, p.id DESC'
};

function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    category: row.category,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents || null,
    discountPct: row.compare_at_cents && row.compare_at_cents > row.price_cents
      ? Math.round((1 - row.price_cents / row.compare_at_cents) * 100)
      : 0,
    emoji: row.emoji,
    gradient: row.gradient,
    rating: row.rating,
    reviewCount: row.review_count,
    featured: !!row.is_featured,
    inStock: !!row.in_stock,
    image: `/assets/img/products/${row.slug}.svg`
  };
}

/* ------------------------------- health -------------------------------- */
router.get('/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), ts: Date.now() });
});

/* ------------------------------ storefront ------------------------------ */
router.get('/store/config', (req, res) => {
  const value = configCache.wrap('cfg', async () => numericSettings());
  value.then((s) => res.json(s));
});

router.get('/store/categories', (req, res) => {
  const key = 'cats';
  const hit = listCache.get(key);
  if (hit) return res.json(hit);
  const rows = q.all(`
    SELECT category, COUNT(*) AS count, MIN(price_cents) AS min_price, MAX(price_cents) AS max_price
    FROM products WHERE is_active = 1 GROUP BY category ORDER BY count DESC
  `);
  const out = {
    items: rows.map((r) => ({ name: r.category, count: r.count, minPriceCents: r.min_price, maxPriceCents: r.max_price })),
    priceRange: {
      min: Math.min(...rows.map((r) => r.min_price), 0),
      max: Math.max(...rows.map((r) => r.max_price), 0)
    }
  };
  listCache.set(key, out);
  res.json(out);
});

router.get('/store/products', (req, res) => {
  const q1 = typeof req.query.q === 'string' ? sanitize(req.query.q, 60) : '';
  const category = typeof req.query.category === 'string' ? sanitize(req.query.category, 40) : '';
  const sort = SORTS[req.query.sort] ? req.query.sort : 'featured';
  const min = clampInt(req.query.min, 0, 10000000, null);
  const max = clampInt(req.query.max, 0, 10000000, null);
  const page = clampInt(req.query.page, 1, 1000, 1);
  const limit = clampInt(req.query.limit, 1, 48, 12);
  const featured = req.query.featured === '1' || req.query.featured === 'true';
  const inStockOnly = req.query.inStock === '1' || req.query.inStock === 'true';
  const key = `p|${q1}|${category}|${sort}|${min}|${max}|${page}|${limit}|${featured}|${inStockOnly}`;

  const cached = listCache.get(key);
  if (cached) return res.json(cached);

  const where = ['p.is_active = 1'];
  const params = [];
  if (category) { where.push('p.category = ?'); params.push(category); }
  if (q1) {
    const like = `%${escapeLike(q1)}%`;
    where.push("(p.name LIKE ? ESCAPE '\\' OR p.tagline LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')");
    params.push(like, like, like);
  }
  if (min != null) { where.push('p.price_cents >= ?'); params.push(min); }
  if (max != null) { where.push('p.price_cents <= ?'); params.push(max); }
  if (featured) where.push('p.is_featured = 1');
  if (inStockOnly) where.push('p.stock > 0');

  const whereSql = where.join(' AND ');
  const total = Number(q.get(`SELECT COUNT(*) AS n FROM products p WHERE ${whereSql}`, ...params)?.n || 0);
  const rows = q.all(
    `SELECT ${PRODUCT_COLUMNS} FROM products p WHERE ${whereSql} ORDER BY ${SORTS[sort]} LIMIT ? OFFSET ?`,
    ...params, limit, (page - 1) * limit
  );

  const payload = {
    items: rows.map(mapProduct),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit))
  };
  listCache.set(key, payload);
  res.json(payload);
});

router.get('/store/products/:slug', (req, res) => {
  const slug = sanitize(req.params.slug, 80);
  const row = q.get(`SELECT ${PRODUCT_COLUMNS}, p.description, p.is_active FROM products p WHERE p.slug = ?`, slug);
  if (!row || !row.is_active) throw new HttpError(404, 'This gift has vanished.', 'not_found');
  const related = q.all(
    `SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.is_active = 1 AND p.category = ? AND p.id <> ? ORDER BY p.is_featured DESC, p.review_count DESC LIMIT 4`,
    row.category, row.id
  );
  const onSale = row.compare_at_cents && row.compare_at_cents > row.price_cents;
  res.json({
    product: { ...mapProduct(row), description: row.description, maxQty: Math.min(row.stock, 10) },
    related: related.map(mapProduct),
    onSale: !!onSale
  });
});

/* -------------------------------- promos -------------------------------- */
router.get('/store/promo/:code', (req, res) => {
  const code = sanitize(req.params.code, 24).toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) throw new HttpError(400, 'That code does not look right.', 'invalid_code');
  const promo = q.get('SELECT * FROM promotions WHERE code = ?', code);
  if (!promo || !promo.active) throw new HttpError(404, 'That code is not active.', 'promo_invalid');
  if (promo.expires_at && promo.expires_at < Date.now()) throw new HttpError(404, 'That code has expired.', 'promo_expired');
  res.json({
    code: promo.code,
    type: promo.type,
    value: promo.value,
    description: promo.description,
    minSubtotalCents: promo.min_subtotal_cents
  });
});

/* ------------------------------- checkout ------------------------------- */
router.post('/checkout', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const contact = body.contact || {};
  const shipping = body.shipping || {};
  const payment = body.payment || {};
  const errors = {};

  const firstName = sanitize(contact.firstName, 60);
  const lastName = sanitize(contact.lastName, 60);
  const email = normalizeEmail(contact.email || '');
  const phone = digitsOf(contact.phone);

  if (firstName.length < 1) errors.firstName = 'First name is required.';
  if (lastName.length < 1) errors.lastName = 'Last name is required.';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (phone.length < 7 || phone.length > 15) errors.phone = 'Enter a valid phone number.';

  const address1 = sanitize(shipping.address1, 120);
  const address2 = sanitize(shipping.address2, 120);
  const city = sanitize(shipping.city, 60);
  const state = sanitize(shipping.state, 40);
  const postal = sanitize(shipping.postal, 12);
  const country = sanitize(shipping.country || 'US', 2) .toUpperCase();
  if (address1.length < 3) errors.address1 = 'Street address is required.';
  if (city.length < 2) errors.city = 'City is required.';
  if (state.length < 2) errors.state = 'State is required.';
  if (postal.length < 3) errors.postal = 'ZIP / postal code is required.';

  const deliveryMethod = body.delivery && body.delivery.method === 'express' ? 'express' : 'standard';
  const paymentMethod = body.payment && body.payment.method === 'cod' ? 'cod' : 'card';
  const promoCode = sanitize(body.promo || '', 24).toUpperCase();
  const clientToken = sanitize(body.clientToken || '', 64) || null;

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  if (!rawItems.length) errors.items = 'Your bag is empty.';
  const quantities = new Map();
  if (rawItems.length) {
    for (const item of rawItems) {
      const productId = Number.parseInt(item && item.productId, 10);
      const qty = Number.parseInt(item && item.qty, 10);
      if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(qty) || qty < 1 || qty > 10) {
        errors.items = 'Your bag contains an invalid item.';
        break;
      }
      quantities.set(productId, (quantities.get(productId) || 0) + qty);
    }
  }

  if (Object.keys(errors).length) {
    throw new HttpError(400, 'Please fix the highlighted fields.', 'validation', errors);
  }

  // Idempotency: a double-submitted checkout returns the original order.
  if (clientToken) {
    const existing = q.get('SELECT order_number, status, total_cents FROM orders WHERE client_token = ?', clientToken);
    if (existing) {
      return res.json({ orderNumber: existing.order_number, status: existing.status, totalCents: existing.total_cents, duplicate: true });
    }
  }

  // Server-side pricing — client prices are never trusted.
  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => '?').join(',');
  const products = q.all(
    `SELECT id, slug, name, emoji, gradient, price_cents, stock, is_active FROM products WHERE id IN (${placeholders})`,
    ...ids
  );
  if (products.length !== ids.length) throw new HttpError(400, 'One of the items in your bag no longer exists.', 'bad_items');
  const stockErrors = [];
  for (const p of products) {
    if (!p.is_active) stockErrors.push(`${p.name} is no longer available.`);
    else if (p.stock < quantities.get(p.id)) stockErrors.push(`Only ${p.stock} left of ${p.name}.`);
  }
  if (stockErrors.length) throw new HttpError(409, stockErrors[0], 'out_of_stock');

  let promo = null;
  if (promoCode) {
    promo = q.get('SELECT * FROM promotions WHERE code = ?', promoCode);
    if (!promo || !promo.active || (promo.expires_at && promo.expires_at < Date.now())) {
      throw new HttpError(400, `Code ${promoCode} is not valid.`, 'promo_invalid', { promo: 'That code is not valid.' });
    }
  }

  const settings = numericSettings();
  const pricing = priceCart({ products, quantities, deliveryMethod, promo, settings });

  // --- payment authorisation (outside the DB transaction; see services/payments.js) ---
  let charge = null;
  if (paymentMethod === 'card') {
    const card = payment.card || {};
    try {
      payments.assertCardPayload(card);
      if (!validExpiry(card.exp)) throw new payments.PaymentError('That card has expired.');
      if (!luhn(card.number)) throw new payments.PaymentError('That card number is not valid.');
      charge = await payments.process({
        amountCents: pricing.totalCents,
        currency: pricing.currency,
        card,
        orderNumber: 'pre-auth'
      });
    } catch (err) {
      traffic.activity('checkout.declined', `Card declined for ${email}`, { amount: pricing.totalCents });
      throw new HttpError(err.status || 402, err.message || 'Payment could not be processed.', err.code || 'card_error');
    }
  }

  const source = (req.cookies && req.cookies.cc_src) || sourceFromReferrer(req.headers.referer, req.query.src);
  const name = `${firstName} ${lastName}`;
  const now = Date.now();

  let order;
  try {
    order = tx(() => {
      // Re-check stock inside the transaction so two shoppers can't oversell the same item.
      for (const p of products) {
        const live = q.get('SELECT stock, name FROM products WHERE id = ?', p.id);
        if (!live || live.stock < quantities.get(p.id)) {
          throw new HttpError(409, `${live ? live.name : 'An item'} just sold out — please update your bag.`, 'out_of_stock');
        }
      }

      let customerId;
      const customer = q.get('SELECT id FROM customers WHERE email = ?', email);
      if (customer) {
        q.run('UPDATE customers SET name = ?, phone = ?, city = ? WHERE id = ?', name, phone, city, customer.id);
        customerId = customer.id;
      } else {
        const createdCustomer = q.run('INSERT INTO customers (email, name, phone, city, created_at) VALUES (?, ?, ?, ?, ?)',
          email, name, phone, city, now);
        customerId = createdCustomer.lastInsertRowid;
      }

      let number = orderNumber();
      for (let attempt = 0; attempt < 4; attempt++) {
        if (!q.get('SELECT 1 AS x FROM orders WHERE order_number = ?', number)) break;
        number = orderNumber();
      }

      const paid = paymentMethod === 'card';
      const inserted = q.run(`
        INSERT INTO orders (
          order_number, client_token, customer_id, email, name, phone,
          address1, address2, city, state, postal_code, country,
          subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency,
          status, payment_method, payment_status, payment_ref, payment_brand, payment_last4,
          promo_code, source, item_count, delivery_method, placed_at, updated_at, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        number, clientToken, customerId, email, name, phone,
        address1, address2 || null, city, state, postal, country,
        pricing.subtotalCents, pricing.discountCents, pricing.shippingCents, pricing.taxCents, pricing.totalCents, pricing.currency,
        paid ? 'paid' : 'pending', paymentMethod, paid ? 'succeeded' : 'due',
        charge ? charge.reference : null, charge ? charge.brand : null, charge ? charge.last4 : null,
        pricing.promoCode, source, [...quantities.values()].reduce((a, b) => a + b, 0),
        deliveryMethod, now, now, paid ? now : null
      );

      const orderId = inserted.lastInsertRowid;
      for (const p of products) {
        const qty = quantities.get(p.id);
        const line = p.price_cents * qty;
        q.run(`
          INSERT INTO order_items (order_id, product_id, name, slug, emoji, gradient, unit_price_cents, qty, line_total_cents)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, orderId, p.id, p.name, p.slug, p.emoji, p.gradient, p.price_cents, qty, line);
        q.run('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?', qty, now, p.id);
        q.run('INSERT INTO stock_movements (product_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)',
          p.id, -qty, 'order', number, now);
      }

      if (pricing.promoCode) q.run('UPDATE promotions SET uses = uses + 1 WHERE code = ?', pricing.promoCode);

      traffic.recordEvent({ type: 'purchase', path: '/checkout', source, visitorId: req.cookies && req.cookies.vcid, revenueCents: pricing.totalCents });
      traffic.activity('order.placed', `${number} — ${name} · $${(pricing.totalCents / 100).toFixed(2)}`, {
        orderNumber: number, total: pricing.totalCents, status: paid ? 'paid' : 'pending'
      }, 'storefront');

      return {
        id: orderId,
        orderNumber: number,
        status: paid ? 'paid' : 'pending',
        totalCents: pricing.totalCents,
        paymentBrand: charge ? charge.brand : null,
        paymentLast4: charge ? charge.last4 : null
      };
    });
  } catch (err) {
    if (charge) { try { await payments.voidPayment({ reference: charge.reference }); } catch (_) { /* noop */ } }
    throw err;
  }

  listCache.clear();
  res.status(201).json({
    ok: true,
    orderNumber: order.orderNumber,
    status: order.status,
    totalCents: order.totalCents,
    email,
    payment: order.paymentBrand ? { brand: order.paymentBrand, last4: order.paymentLast4 } : { method: 'cod' },
    eta: estimatedDelivery({ placed_at: now, delivery_method: deliveryMethod })
  });
}));

/* ------------------------------ order lookup ----------------------------- */
const ORDER_NUMBER_RE = /^CC-[A-Z2-9]{7}$/;

router.get('/orders/:orderNumber', (req, res) => {
  const orderNumberValue = sanitize(req.params.orderNumber, 16).toUpperCase();
  const email = normalizeEmail(req.query.email || '');
  if (!ORDER_NUMBER_RE.test(orderNumberValue) || !isEmail(email)) {
    throw new HttpError(400, 'Enter your order number and the email you used.', 'bad_request');
  }
  const order = q.get('SELECT * FROM orders WHERE order_number = ?', orderNumberValue);
  if (!order || order.email !== email) {
    throw new HttpError(404, 'No order matches those details.', 'not_found');
  }
  const items = q.all('SELECT name, emoji, gradient, unit_price_cents, qty, line_total_cents FROM order_items WHERE order_id = ?', order.id);
  res.json({
    order: {
      orderNumber: order.order_number,
      status: order.status,
      statusLabel: null,
      placedAt: order.placed_at,
      name: order.name,
      email: order.email,
      address: [order.address1, order.address2, order.city, order.state, order.postal_code].filter(Boolean).join(', '),
      subtotalCents: order.subtotal_cents,
      discountCents: order.discount_cents,
      shippingCents: order.shipping_cents,
      taxCents: order.tax_cents,
      totalCents: order.total_cents,
      paymentMethod: order.payment_method,
      paymentBrand: order.payment_brand,
      paymentLast4: order.payment_last4,
      promoCode: order.promo_code,
      carrier: order.carrier,
      trackingNumber: order.tracking_number,
      deliveryMethod: order.delivery_method
    },
    items: items.map((i) => ({
      name: i.name, emoji: i.emoji, gradient: i.gradient,
      unitPriceCents: i.unit_price_cents, qty: i.qty, lineTotalCents: i.line_total_cents
    })),
    timeline: orderTimeline(order),
    eta: estimatedDelivery(order)
  });
});

/* ------------------------------- analytics ------------------------------- */
const EVENT_TYPES = new Set(['pageview', 'product_view', 'add_to_cart', 'checkout_start', 'search']);

router.post('/track/event', (req, res) => {
  const body = req.body || {};
  const type = String(body.type || '');
  if (!EVENT_TYPES.has(type)) return res.status(400).json({ error: 'Unknown event type.', code: 'bad_event' });
  traffic.recordEvent({
    type,
    path: sanitize(body.path || '/', 200),
    referrer: sanitize(body.referrer || '', 300) || null,
    source: (req.cookies && req.cookies.cc_src) || null,
    visitorId: req.cookies && req.cookies.vcid
  });
  res.json({ ok: true });
});

router.post('/track/heartbeat', (req, res) => {
  const vcid = req.cookies && req.cookies.vcid;
  traffic.touchVisitor(vcid, (req.body && sanitize(req.body.path, 200)) || null);
  res.json({ ok: true });
});

module.exports = router;
