# 🎨 Phase 5: Features to Port

**Status:** Starting  
**Started:** 2026-08-28  
**Estimated completion:** 2026-09-10

## 5.1 Storefront Features (Already Complete in Express — Port to Next.js)

### 5.1.1 Home Page (`app/` or `app/home/page.tsx`)

**Keep visual design identical:**
- Hero section with gradient cards (ink/iris/acid palette)
- Category grid with shadcn/ui chips
- Featured products grid
- Price displays in Rs (PKR) — inherited from `money()` function adaptation

**Data fetching (Server Component):**
```ts
export const products = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true)
  .order('sort_order', { ascending: true })
```

### 5.1.2 Shop Page (`app/shop/page.tsx`)

**Filters & Search:**
- Category filter: `?category=category-name`
- Price range: `?min=1000&max=5000`
- Search query: `?q=keyword` (matches name, tagline, description)
- Sort: `?sort=featured|newest|price-asc|price-desc|rating|popular`
- Pagination: `?page=1&limit=12`

**Visual design preserved:**
- Same category emojis as original
- Same "Under $25" → "Under Rs 25" mapping
- Responsive grid (2 columns mobile, 3 tablet, 4 desktop)

### 5.1.3 Product Page (`app/product/[slug]/page.tsx`)

**Components:**
- Product image (from Supabase Storage or local `public/assets/img/products/`)
- Price display: `price_cents` → `Rs X,XXX` via helper
- "Compare at" price (strikethrough if > price)
- "Add to cart" button — adds to cart state (client or linked to `auth.user`)
- "Related products" section (4 items from same category, `is_active = true`)
- Stock display: `X in stock` or "Out of stock"

**Server Component data:**
- Product by `slug`
- In-stock status
- 4 related products (same category, different id)

### 5.1.3 Cart Drawer (`cart.tsx` — Client Component or Route Handler)

**State management:**
- Cart stored in `localStorage` or Supabase `storage` (if user signed in)
- Or simple state variable if anonymous

**Cart items:**
- Product info (fetched from DB on render)
- Quantity inputs (+/- buttons)
- Remove button per item
- Subtotal, discount, shipping, tax, total — all recalculated server-side on submit

**Visual match to original:**
- Drawer slides from right
- "Proceed to checkout" button
- Free shipping threshold: `Rs 50` (original: `$50`)
- "X Rs X away from free shipping" message

### 5.1.4 Checkout (`app/checkout/page.tsx`)

**Keeping pricing server-side only:**

**Form fields:**
- Contact: name, email, phone
- Shipping: address1, address2, city, state, postal_code, country
- Delivery: standard (free over Rs 50), express (additional cost)

**Pricing calculated server-side:**
- Subtotal: `sum of (price_cents × qty)`
- Discount: promo code validation (`place_order` RPC handles this)
- Shipping: `0` if subtotal ≥ free_shipping_threshold_cents (Rs 50), else `standard_shipping_cents`
- Tax: `tax_rate_bps` (e.g., 5% = 500 bps) × subtotal
- Total: subtotal - discount + shipping + tax

**Payment:**
- **Stripe Checkout** integration:
  - `POST /api/stripe/checkout` — creates Stripe Session
  - Redirect to Stripe Hosted Page
  - Webhook `POST /api/stripe/webhook` — verifies signature, fulfills order on `checkout.session.completed`
- **Demo provider** still works for testing:
  - Card `4242 4242 4242 4242` → success
  - Card `4000 0000 0000 0002` → 402 decline

**Visual match:**
- Order summary card
- Payment card fields (or Stripe Elements)
- Review total before Stripe redirect
- Order number display after success

### 5.1.5 Order Tracking (`app/track/[orderNumber]/page.tsx`)

**Features:**
- Order number lookup (CC-XXXXX format)
- Email verification (match order.email)
- Order timeline: packed → shipped → delivered
- Itemized list with prices (Rs)
- Status badges (pending/packed/shipped/delivered)
- Contact info displayed (name, address)

**Data fetching:**
```ts
const { data: order } = await supabase
  .from('orders')
  .select('*, customers(name, phone)')
  .eq('order_number', orderNumber)
  .eq('email', email)
  .single()
```

## 5.2 Admin Features

### 5.2.1 Admin Dashboard Overview (`app/admin/page.tsx`)

**KPI Cards:**
- Revenue Today (`sum total_cents where status not in (cancelled, refunded) and placed_at >= today`)
- Orders Today (`count where placed_at >= today`)
- AOV (AOV = revenue / orders)
- Conversion Rate (`orders / visitors` — tracked via traffic_events)

**Live View via Supabase Realtime:**
- Channel: `admin-dashboard`
- Events: new orders, status changes, low stock alerts
- Polling fallback if Realtime not available

**Visual match:**
- Same KPI card design (bg-acid, bg-ink, etc.)
- Delta badges (green/red for up/down)
- Same layout as original

### 5.2.2 Admin Orders (`app/admin/orders/page.tsx`)

**Features:**
- Status tabs: all / pending / paid / packed / shipped / delivered / cancelled / refunded
- Full-text search: order number, customer name, email
- Pagination (10-20 per page)
- Order drawer on row click (or row expansion)

**Order Drawer Contents:**
- Customer info (name, email, phone, city)
- Itemized list with prices (Rs)
- Payment method + last 4 cards (masked)
- Status badge + transition buttons
- Progress timeline (packed → shipped → delivered)
- Audit notes (if any)
- Buttons: `Cancel Order` (restocks), `Refund Order`, `Ship Order`

**Status transition rules** (same as Express):
- pending → paid → packed → shipped → delivered
- Cancel at any stage → restock, status = 'cancelled'
- Refund at packed/shipped/delivered → status = 'refunded'

### 5.2.3 Admin Products (`app/admin/products/page.tsx`)

**Tabs:**
- All / Active / Low Stock / Archived

**Product Form (Modal):**
- Name, tagline, description
- Category select
- Price (cents), Compare at price
- Stock count
- Image upload → Supabase Storage `product-images/` folder
- Gradient input (hex, matches original design)
- Featured toggle
- Active/Archived toggle

**Actions:**
- Create new product
- Update stock (increase/decrease)
- Toggle active/archived
- Delete (soft: set `is_active = false`)

**Image upload:**
```ts
const { data: { publicUrl } } = await supabase.storage
  .from('product-images')
  .upload(`${productId}.png`, file, { cacheControl: 'max-age=31536000' })
const { data: { path } } = await supabase.storage
  .from('product-images')
  .getPublicUrl(filepath)
```

### 5.2.4 Admin Customers (`app/admin/customers/page.tsx`)

**Features:**
- List with: name, email, city, lifetime value, orders count, last order date
- Search: name, email, city
- Per-customer order list (link to `/admin/orders?customer_id=XX`)
- Export to CSV button

**Lifetime value calculation:**
```sql
select sum(total_cents) from orders where customer_id = auth.uid() and status not in ('cancelled','refunded')
```

### 5.2.5 Admin Analytics (`app/admin/analytics/page.tsx`)

**Traffic Overview:**
- Visits (unique + total) — last 30 days
- Orders (last 30 days)
- Revenue (last 30 days)
- AOV (last 30 days)

**Funnel:**
- Sessions → Product Views → Add to Cart → Checkout Start → Purchase
- Conversion rates between each step

**By Source:**
- Direct, Organic Search, Social, Email, Paid Ads, Referral
- `source` column from `traffic_events`

**Top Pages:**
- Most visited paths from `traffic_events`
- Heatmap-style list

**Hourly Breakdown:**
- Visitors per hour for last 24 hours

**Visual match to original:**
- Same chart types (bar for hourly, donut for source, line for funnel)
- Same color palette (ink/iris/acid)
- Same KPI layout (revenue, orders, AOV, conversion)

### 5.2.6 Admin Settings (`app/admin/settings/page.tsx`)

**Store Settings:**
- Store name (was: "Confetti Club")
- Announcement banner (was: "FREE SHIPPING OVER $50..." → "FREE SHIPPING OVER Rs 50...")
- Currency: USD | PKR | [other] (stored as 3-letter code)
- Delivery days: standard (default 5), express (default 2)

**Security:**
- Password change for admin (Supabase Auth handles this, or custom change-password page)
- Old password verification before new password set

**Visual match:**
- Same form layout
- Same input styles (shadcn/ui)
- Same announcement banner preview

### 5.2.7 Admin Promos (`app/admin/promos/page.tsx`)

**Features:**
- List all promos: code, type, value, min_subtotal, active, uses
- Create new promo modal:
  - Code (unique, uppercase)
  - Type: percent / fixed / free_shipping
  - Value (10 for 10%, 500 for Rs 5, etc.)
  - Min subtotal (in cents)
  - Active toggle
  - Uses limit (optional)
- Edit: toggle active, change value/min_subtotal, change uses limit
- Delete: soft delete (set `active = false`)

**Promo validation (RPC `place_order`):**
- Check code exists and `active = true`
- Check `min_subtotal_cents` met
- Apply discount % or fixed amount
- Increment `uses` counter

### 5.2.8 Audit Log (`app/admin/activity/page.tsx`)

**Features:**
- List all audit events: kind, message, actor, created_at
- Filter by kind: order.created, order.status, product.created, setting.updated
- Pagination
- Export CSV

**Events tracked:**
- `order.created` — on successful order placement
- `order.status` — on status transition (cancel/refund/ship/deliver)
- `product.created` — on new product add
- `setting.updated` — on config change
- `promo.used` — on promo code redemption

---

## 5.3 Payments Integration

### 5.3.1 Pluggable Provider Interface (Preserved)

`services/payments.ts` (TypeScript port):

```ts
export type PaymentMethod = 'card' | 'cod';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'voided';

export interface CardDetails {
  number: string;
  expiry: string; // MM/YY
  cvc: string;
  name: string;
}

export interface PaymentResult {
  success: boolean;
  orderNumber: string;
  status: PaymentStatus;
  amountCents: number;
  brand?: string;
  last4?: string;
}

/** Demo provider (always available) */
export const processDemoPayment = (amountCents: number, card: CardDetails) => {
  // Luhn + expiry check
  if (card.number === '4242 4242 4242 4242' && validExpiry(card.expiry)) {
    return { success: true, orderNumber: 'CC-' + Math.random().toString(36).substring(2, 9).toUpperCase(), status: 'succeeded', amountCents };
  }
  if (card.number === '4000 0000 0000 0002') {
    return { success: false, status: 'failed', amountCents };
  }
  return { success: false, status: 'invalid' };
};

/** Stripe provider (requires keys) */
export const processStripePayment = async (amountCents: number, card: CardDetails) => {
  const { data, error } = await supabase.functions
    .invoke('stripe-checkout', { body: { amount: amountCents, card } });
  return data;
};
```

### 5.3.2 Stripe Checkout Integration

**Route Handler:** `app/api/stripe/checkout/route.tsx`

```ts
export async function POST(request: Request) {
  const { amount, currency = 'usd', card } = await request.json()
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price_data: { currency, unit_amount: amount, product_data: { name: 'Confetti Club Order' } } }],
    mode: 'payment',
    success_url: `${request.headers.get('origin')}/order-success`,
    cancel_url: `${request.headers.get('origin')}/cart`,
  })
  
  return new Response(JSON.stringify({ url: session.url }))
```

**Webhook:** `app/api/stripe/webhook/route.tsx`

```ts
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  let event
  
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
  }
  
  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    // Fulfill order: create order in DB, send email, etc.
    await fulfillOrder(session.client_reference_id)
  }
  
  return new Response(null, { status: 200 })
}
```

### 5.3.3 Demo Provider Keeps Working

- The `processDemoPayment` function is always available
- Used by default when `PAYMENT_PROVIDER=demo` in env
- Stripe can be swapped in via env var: `PAYMENT_PROVIDER=stripe`

---

## 5.4 Checklist: Phase 5 Complete When

**Storefront:**
- [ ] Home page with same visual design, product grid
- [ ] Shop page with category filters, price range, search, sort, pagination
- [ ] Product page with image, price, "Add to cart", related products
- [ ] Cart drawer with quantity adjustments, free shipping threshold
- [ ] Checkout with pricing (subtotal/discount/shipping/tax total), Stripe + demo provider
- [ ] Order tracking page with email verification + timeline

**Admin:**
- [ ] Dashboard overview KPI cards with live Realtime
- [ ] Orders list with status tabs, search, drawer with transitions
- [ ] Products CRUD with image upload to Supabase Storage
- [ ] Customers list with lifetime value, order link
- [ ] Analytics: traffic, funnel, sources, hourly, top pages
- [ ] Settings: store name/announcement/currency/delivery days
- [ ] Promos: create/edit/delete, validation via RPC
- [ ] Audit log list with filter/export

**Payments:**
- [ ] Demo provider: 4242 4242 4242 4242 → success, 4000...0002 → decline
- [ ] Stripe Checkout integration (Route Handler + Webhook)
- [ ] `PAYMENT_PROVIDER` env var switches between demo/stripe
- [ ] Webhook fulfills order on `checkout.session.completed`

---

## 📦 Phase 5 Deliverables

- [ ] All storefront pages (home, shop, product, cart, checkout, track)
- [ ] All admin pages (dashboard, orders, products, customers, analytics, settings, promos, activity)
- [ ] Payment provider: demo + Stripe Checkout + webhook
- [ ] Zod schemas for all forms (15+ schemas)
- [ ] Supabase Realtime channels for live dashboard
- [ ] Cart state management (client + optional Supabase-linked)
- [ ] Image upload to Supabase Storage for product images
- [ ] TypeScript types for all forms & RPC calls

---

## 📦 Full Feature Parity Checklist (Express → Next.js)

| Feature | Express | Next.js | Status |
|---|---|---|---|
| Home page | ✅ | ✅ (Phase 5) | |
| Shop page with filters | ✅ | ✅ (Phase 5) | |
| Product page | ✅ | ✅ (Phase 5) | |
| Cart drawer | ✅ | ✅ (Phase 5) | |
| Checkout (demo + Stripe) | ✅ | ✅ (Phase 5) | |
| Order tracking | ✅ | ✅ (Phase 5) | |
| Admin dashboard KPIs | ✅ | ✅ (Phase 5) | |
| Orders list + drawer | ✅ | ✅ (Phase 5) | |
| Products CRUD + images | ✅ | ✅ (Phase 5) | |
| Customers + lifetime value | ✅ | ✅ (Phase 5) | |
| Analytics (funnel, sources) | ✅ | ✅ (Phase 5) | |
| Settings + password | ✅ | ✅ (Phase 5) | |
| Promo codes | ✅ | ✅ (Phase 5) | |
| Audit log | ✅ | ✅ (Phase 5) | |
| Payments (demo) | ✅ | ✅ (Phase 5) | |
| Payments (Stripe) | ⏳ | ⏳ (Phase 5) | |

---

## 📦 Phase 5 Summary

**Porting scope:** 100% of Express features mapped to Next.js + Supabase.

**Key differences:**
- Server Components for SEO (home, shop, product)
- RLS replaces custom auth middleware
- Supabase Realtime replaces polling for live dashboard
- Stripe Checkout replaces custom payment processing
- Image upload via Supabase Storage vs local `public/assets/img/`
- Zod validation replaces custom validation helpers

**Backward compatibility:**
- Old Express app remains running alongside new Next.js app
- Both can share the same Supabase database
- Migration completed when Next.js reaches 100% feature parity, then Express is decommissioned.

---