import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase auth session on every request and protect /admin routes.
 * Only role='admin' (from public.profiles) may access /admin/*.
 * (Next.js 16 renamed the middleware.ts convention to proxy.ts.)
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser() —
  // it can cause hard-to-debug session desync issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect admin routes: require a session AND role='admin' in public.profiles.
  // /admin/login is the dedicated admin login page — accessible to everyone.
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) {
      // Admin login page AND its server actions are open to all — skip
      // role check. (If the visitor is already an admin, the page component
      // redirects them to /admin.)
    } else if (!user) {
      // Not signed in -> send to the dedicated admin login.
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    } else {
      // Signed in -> verify the admin role. RLS lets a user read their own
      // profile (auth.uid() = id), so this returns the row for the current user.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        // Authenticated but not an admin -> send to the admin login.
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  // If signed in and heading to auth pages, send to home.
  // Exception: /auth/callback is the OAuth redirect target — it must run
  // even when a session is already present (e.g. re-authentication).
  if (user && pathname.startsWith("/auth/") && !pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
