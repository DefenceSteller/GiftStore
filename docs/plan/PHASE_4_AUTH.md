# 🔐 Phase 4: Authentication

**Status:** Starting  
**Started:** 2026-08-26  
**Estimated completion:** 2026-08-28

## 4.1 Supabase Auth Setup

- **Method:** Supabase Auth (email / password)
- **No more hard-coded default admin** — first admin created via one-time seed command
- **Profiles table** links `auth.users.id` → `public.profiles.role` (customer | admin)

### 4.1.1 Auth Configuration

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=__SUPABASE_PROJECT_URL__
NEXT_PUBLIC_SUPABASE_ANON_KEY=__SUPABASE_ANON_KEY__
SUPABASE_SERVICE_ROLE_KEY=__SUPABASE_SERVICE_ROLE_KEY__
```

```ts
// src/lib/supabase/browser.ts
import { createClient } from '@supabase/ssr'

export const createBrowserClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// src/lib/supabase/server.ts
import { createClient } from '@supabase/ssr'
import { NextFetchEvent, NextRequest } from 'next/server'

export const createServerClient = (req: NextRequest, res: NextResponse, event: NextFetchEvent) =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: (name) => req.cookies[name],
    }
  )
```

### 4.1.2 Auth Routes (App Router)

**`app/auth/signup/route.tsx`** — Server Action:

```ts
export async function POST(request: Request) {
  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email'),
    password: formData.get('password'),
    options: {
      email: formData.get('email'), // optional custom email
      data: { onboard: false } // optional metadata
    }
  })

  if (error) return new Response(error.message, { status: 400 })

  // Create corresponding profile
  await supabase.from('profiles').insert({
    id: data.user?.id,
    role: 'customer',
    email: data.user?.email
  })

  return new Response(JSON.stringify({ user: data.user }), { status: 200 })
}
```

**`app/auth/signin/route.tsx`** — Server Action:

```ts
export async function POST(request: Request) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password')
  })

  if (error) return new Response(error.message, { status: 400 })

  // Set session cookie / redirect
  return new Response(JSON.stringify({ user: data.user, session: data.session }), { status: 200 })
}
```

**`app/auth/reset-password/route.tsx`** — Server Action for magic link:

```ts
export async function POST(request: Request) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: formData.get('email'),
    options: { emailRedirectTo: '/auth/callback' }
  })

  if (error) return new Response(error.message, { status: 400 })

  return new Response(JSON.stringify({ session: data.session }), { status: 200 })
}
```

### 4.1.3 Auth Middleware (Protect /admin)

```ts
// middleware.ts
import { withAuth } from '@supabase/ssr'

export default withAuth(
  function middleware(request) {
    // Public routes that don't need auth
    const publicRoutes = ['/', '/shop', '/product', '/auth', '/api']

    const { data: { user } } = await supabase.getSession()

    if (!user && !publicRoutes.some((r) => request.nextUrl.pathname.startsWith(r))) {
      const url = new URL('/auth/signin', request.nextUrl.origin)
      url.searchParams.set('callback_url', request.nextUrl.pathname)
      return new Response.redirect(url, 302)
    }

    // Role-based access for /admin
    if (request.nextUrl.pathname.startsWith('/admin') && user?.role !== 'admin') {
      return new Response.redirect(new URL('/auth/signin', request.nextUrl.origin), 302)
    }

    return NextResponse.next()
  },
  {
    // Skip reauth on localhost / during develop
    skipAuth: '/_next/' === request.nextUrl.pathname?.prefix,
    // New session cookie on every request
    sessionExpiresIn: 30 * 24 * 60 * 60, // 30 days
  }
)
```

### 4.1.4 First Admin Creation (One-Time Seed)

```ts
// scripts/seed-admin.ts
import { createClient } from '@supabase/ssr'
import { encode } from '@supabase/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// One-time: create the first admin
await supabase.auth.signUp({
  email: 'admin@confetticlub.shop',
  password: 'ChangeMe!2026'
})

// Then promote to admin role
await supabase.from('profiles').insert({
  id: (await supabase.auth.getUser()).data.user?.id,
  role: 'admin'
})
```

Run once: `npx ts-node scripts/seed-admin.ts`

### 4.1.5 Customer Sign-Up & "My Orders"

- `app/orders/page.tsx` — Server Component listing user's orders
- `app/products/[slug]/page.tsx` — Product page with "Add to cart" (no auth required for browsing)
- Cart can be anonymous (sessionStorage) or linked to `auth.user.id` after sign-in
- "My orders" page shows only customer's orders via `select * from orders where customer_id = auth.uid()`

### 4.2 Session Management

- **Supabase session cookie** (`sb`) stored in browser
- **Refresh via** `supabase.auth.getSession()` on every app load
- **Session persistence** — 30 days by default, configurable
- **Logout** — `supabase.auth.signOut()` clears cookie, redirects to `/`

### 4.3 Password Security

- Supabase handles bcrypt-style password hashing internally
- No custom bcrypt cost 12 needed (Supabase manages it)
- Password complexity can be configured in Supabase Dashboard → Auth → Security
- Optionally add Zod validation on the sign-up form before calling Supabase

### 4.4 Social Auth (Optional)

- Can add Google/GitHub later via Supabase Providers
- Not required for MVP — email/password only
- If added: configure in Supabase Dashboard → Authentication → Providers

### 4.5 Auth Checklist: Phase 4 Complete When

- [ ] Supabase project created with email/password auth
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.example`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` for server-side operations
- [ ] `withAuth` middleware protects `/admin`, redirects non-admin users
- [ ] `app/auth/signup/route.tsx` — Server Action + profile creation
- [ ] `app/auth/signin/route.tsx` — Server Action
- [ ] `app/auth/reset-password/route.tsx` — OTp flow
- [ ] First admin created via one-time seed script
- [ ] Customer sign-up works, profile auto-created with role='customer'
- [ ] "My orders" page filters by `customer_id = auth.uid()`
- [ ] Logout clears session, redirects to `/`
- [ ] Password complexity configured in Supabase Dashboard
- [ ] (Optional) Social providers configured if needed

---

## 📦 Phase 4 Deliverables

- [ ] `src/lib/supabase/browser.ts` — client Supabase instance
- [ ] `src/lib/supabase/server.ts` — server Supabase instance
- [ ] `middleware.ts` — role-based protection
- [ ] `app/auth/signup/route.tsx` — signup Server Action
- [ ] `app/auth/signin/route.tsx` — signin Server Action
- [ ] `app/auth/reset-password/route.tsx` — reset/OTp Server Action
- [ ] `scripts/seed-admin.ts` — one-time admin creation
- [ ] `.env.example` — Supabase env vars
- [ ] Profile model: `role` (customer | admin)
- [ ] Auth middleware tested on `/admin` and public routes
- [ ] Session persistence verified (30 days)

---

**Ready to proceed to Phase 5: Features to Port** upon approval and successful auth implementation.  
**Old Express code:** Will remain untouched until new Next.js app reaches feature parity.

---