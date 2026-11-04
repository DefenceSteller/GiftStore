# Migration Progress — Confetti Club

## Status: Auth-gated per-user carts — done ✅

Express + SQLite → Next.js 16 + TypeScript + Supabase Cloud (`ppolhziswextahhjfggi`).

### What's done
- Foundation: Next 16.4.3, React 19.3.1, `@supabase/ssr`, build + typecheck green (28 routes).
- Supabase clients (anon server, browser, service role), auth, admin auth, `proxy.ts` role guard.
- Storefront: home / shop / product / cart / checkout / surprise / track / order-success.
- Admin shell + pages: dashboard, orders, products, customers, promos, settings, activity, analytics.
- Admin API routes all use `createServiceClient()` (bypasses RLS) — orders, stats, customers, promos, settings, export/orders.csv, products/[id]/stock.
- 26 products, 3 promo codes (GIFT10, FREESHIP, WELCOME5), order lifecycle, Stripe + demo payments.
- `is_featured` boolean (migration 018); storefront falls back to `sort_order <= 6`.
- Reveal animation fix ported as `RevealInit.tsx` in root layout.
- CSS: rebuilt `public/assets/css/styles.css` after adding `.tsx` to `tailwind.config.js` content globs. Verified additive-only (0 declarations lost, 54 new classes).
- **Auth-gated per-user carts** (commit `3de89f3`):
  - `AuthProvider.tsx`: server-seeded `initialUser`, `usePathname()` soft-nav sync, `onAuthStateChange`, `visibilitychange`/`pageshow`, and continuous cookie polling for sign-in redirects that land on the same path.
  - `SignInPopout.tsx`: modal shown when a signed-out visitor clicks Add; stashes the product in `sessionStorage` (`cc_pending_add`) and carries the return path as `next`.
  - `CartProvider.tsx`: per-user key `cc_cart_v2:<userId>` (guest = `cc_cart_v2`); re-hydrates on user change; auto-adds the pending product after sign-in and opens the drawer.
  - `AddToCartButton.tsx` / `ProductPurchase.tsx`: gate on signed-out click → popout instead of add.
  - `app/layout.tsx`: passes `initialUser` from `getSessionUser()`; mounts `AuthProvider` → `CartProvider` → `SignInPopout`.
  - `scripts/e2e-auth-cart.js`: 15/15 checks pass (signed-out → popout → sign in → return → scoped cart → auto-add → drawer open).

### Known issues
- **Postal code validation mismatch**: client (`app/checkout/page.tsx`) uses `min(3).max(12)`, server action (`app/checkout/actions.ts`) uses `min(3).max(12)`, but `app/api/checkout/route.tsx` still enforces `^[0-9]{6}$`. Needs relaxing to match.