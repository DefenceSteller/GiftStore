# 🎁 Confetti Club — gift shop

A modern, fully self-hosted gift shop: fast storefront, cart, checkout and a
real-time admin dashboard backed by a real database.

**Brand:** Confetti Club — playful gift shop with an ink / iris / acid design system.

---

## ✨ What's inside

### Storefront
- Home, Shop, Product, Cart, Checkout, Tracking pages (custom design system).
- Cart drawer + full cart page, quantity editing, promo codes.
- Checkout: server-authoritative pricing (price history, promo, shipping, tax),
  card payment via a pluggable provider.
- Live order tracking timeline.

### Admin dashboard (`/admin`)
- **Overview** — revenue / orders / AOV / conversion KPIs (delta badges),
  14-day revenue chart, order pipeline donut, live traffic panel, recent orders,
  top products, low-stock alerts.
- **Live now** — active visitors, req/min, views/5m, orders today, revenue today, p95,
  recent activity stream (polling every 3 s, dashboard stats every 5 s).
- **Orders** — status tabs with counts, full-text search, pagination, detail
  drawer (items, pricing, customer, payment, logistics, progress timeline, audit
  trail), status transitions, carrier + tracking capture, refund flow, cancel
  with restock.
- **Products** — list with tabs (all / active / low / archived), search, create /
  edit modal, stock adjustments, archive/restore.
- **Customers** — lifetime value, orders, last order, new-today stats, per-customer orders.
- **Analytics** — visits/uniques, add-to-bag / checkout / purchase rates,
  traffic-by-hour, sources, funnel, visits, orders by channel, top pages.
- **Settings** — store settings, security (password), system info, promo codes
  (create / enable / disable / delete).

### Backend
- Node 24 + Express 4 + **built-in SQLite** (`node:sqlite`), no native addons.
- Helmet + CSP + HSTS + nosniff, compression, JSON-only mutations, CORS
  same-origin only, rate limiting, visitor tracking, security headers.
- Server-side order lifecycle with timestamps, audit log, restock-on-cancel.
- Payments behind an interface: `demo` provider today, Stripe slot reserved.

---

## 🚀 Getting started

```bash
npm install

# first run: build assets, generate product images, seed the database
npm run setup

# dev
npm run dev

# production-style single server
npm start
```

- Storefront: http://localhost:3000
- Admin:      http://localhost:3000/admin
- Login:      admin@confetticlub.shop / ChangeMe!2026

## 🔐 Admin login

```
email:    admin@confetticlub.shop
password: ChangeMe!2026
```

Sessions: httpOnly, SameSite=Strict, JWT cookie (`cc_admin`).

## 💳 Payments

| Provider | Status |
|---|---|
| `demo`   | ✅ Active — `4242 4242 4242 4242` approves, `4000 0000 0000 0002` declines. |
| `stripe` | ⏳ Reserved — swap via `PAYMENT_PROVIDER=stripe` in `.env`; payment service keeps the interface. |

## ⚡ Performance & load

With the SQLite backend, a single Node process comfortably serves **150–200
concurrent shoppers** (static pages are cached, DB is in WAL mode, queries use
prepared statements, stats cached).

Check the behavior under load:

```bash
node scripts/loadtest.js --users 180 --duration 30
```

Raise the per-IP rate budget before load testing (all visitors share an IP):

```bash
RATE_MULTIPLIER=50 npm start
node scripts/loadtest.js --users 180 --duration 30
```

## 🧪 Smoke tests

```bash
node scripts/smoke-test.js
```

---

## 📁 Structure

```
server/            Express backend
  config.js        central config, secret, env overrides
  db.js            SQLite bootstrap (WAL, prepared stmt cache, tx)
  seed.js          demo catalog + 14 days of orders/traffic
  index.js         app entry, security headers, static, routes
  lib/             helpers, orders, pricing, settings, traffic, errors, svg
  middleware/      security, auth, rate limits, visitors
  routes/          public + admin API
  services/        payments
public/            static storefront + admin (built Tailwind CSS)
scripts/           smoke-test, loadtest, copy-vendor, gen-images
src/               Tailwind source styles
tailwind.config.js design tokens
```

## 📜 License

MIT-style demo store — build your own confetti.
