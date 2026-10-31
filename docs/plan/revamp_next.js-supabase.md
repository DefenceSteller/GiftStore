You are a senior full-stack engineer. Migrate the existing project "GiftStore / Confetti Club"
(Express + SQLite + static HTML/Tailwind gift shop with admin dashboard) to
Next.js (App Router, TypeScript) + Supabase. Keep all existing features and the visual design.

## Step 1 – Analyze first (no code yet)
Read the whole repo: server/routes, server/lib (orders, pricing, settings, traffic),
server/services/payments, middleware, db.js schema, seed.js, public/ pages, tailwind.config.js.
Output: (a) list of tables and columns, (b) every API endpoint with its purpose,
(c) business rules (pricing, promo, tax, shipping, stock/restock, order status transitions,
refund/cancel), (d) a feature checklist. Wait for my approval of this summary.

## Step 2 – Target architecture
- Next.js 15 App Router, TypeScript, Tailwind (reuse the existing design tokens),
  shadcn/ui for forms, dialogs, selects and date pickers.
- Supabase: Postgres, Auth, Storage, Realtime. Use @supabase/ssr for server and client.
- Server Components for storefront pages (SEO); Server Actions or Route Handlers for mutations.
- Zod validation on every input. No fixed max-width caps; layouts fill the screen
  and use responsive grids.
- Folder layout: src/app (routes), src/modules/<feature>/{components,services,schemas,types},
  src/lib/supabase, supabase/migrations.

## Step 3 – Database (Supabase migrations in supabase/migrations)
Convert the SQLite schema to Postgres: products, product_images, categories,
orders, order_items, order_events (status history), customers (profiles),
promo_codes, settings, audit_log, traffic_events.
- uuid PKs, timestamptz, numeric(10,2) money (or integer cents), enums for order status.
- Enable RLS on every table:
  public can read active products and categories; customers can read only their own
  orders; admins (profiles.role = 'admin') can do everything.
- Postgres functions (RPC) for the atomic operations: place_order (price + stock
  decrement in one transaction), cancel_order (restock), refund_order.
- Seed script with the demo catalog.

## Step 4 – Auth
Supabase Auth (email/password). A profiles table with role (customer | admin).
Middleware protects /admin. Remove the hard-coded default admin; create the first
admin through a one-time seed command. Add optional customer sign-up and "my orders".

## Step 5 – Features to port
Storefront: home, shop with filters, product page, cart drawer, checkout, order tracking.
Pricing stays server-side only (promo, shipping, tax).
Admin: overview KPIs and charts, live view via Supabase Realtime (replacing polling),
orders (status transitions, refund, cancel with restock), products and stock with
image upload to Supabase Storage, customers, analytics (traffic, funnel, sources),
settings and promo codes. Keep the audit log.
Payments: keep the pluggable provider interface; the demo provider works, and
implement Stripe Checkout plus a webhook route as the real provider.

## Step 6 – Quality and deploy
Rate limiting on public mutation routes, security headers in next.config,
unit tests for pricing and order-state logic, a Playwright smoke test of the
checkout flow, .env.example, and a README with local setup
(supabase start, db reset) and Vercel + Supabase deployment steps.

## Rules
Work in phases and stop after each for review. Do not delete the old Express code until the
new app reaches feature parity. Short, clear commit messages. No placeholder or mock data
outside the seed.