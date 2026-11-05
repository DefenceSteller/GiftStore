"use client";

/**
 * Client-side auth state.
 *
 * The server knows the real answer (cookie session) and passes it down as
 * `initialUser` from the root layout, so there is no signed-out flash on first
 * paint. Three triggers keep us in sync:
 *
 * 1. `usePathname()` — sign-in/sign-out happen in server actions that call
 *    `redirect()`, which is a soft navigation: the root layout is NOT re-run,
 *    so `initialUser` never gets re-read and the only way to notice the
 *    session changed is to react to the pathname change.
 *
 * 2. `onAuthStateChange` — catches client-side events (OAuth popup, token
 *    refresh, another tab signing in) that don't change the pathname.
 *
 * 3. Cookie polling — sign-in redirects soft-navigate back to the same path
 *    they started on, so neither (1) nor (2) reliably fires. When we're
 *    signed out but a session cookie is present, we poll until we reconcile.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
};

type AuthContextValue = {
  user: AuthUser | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  refresh: async () => {},
});

async function userFromSession(
  supabase: ReturnType<typeof createClient>,
  u: { id: string; email?: string | null } | null
): Promise<AuthUser | null> {
  if (!u) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", u.id)
    .maybeSingle();
  // A session user is always returned — a failed profile read defaults to
  // "customer" rather than null, because null means "signed out" to the cart
  // (it switches the storage key and clears the bag). The server-side role
  // read in getSessionUser() uses the service client and is the source of
  // truth for admin access control.
  return {
    id: u.id,
    email: u.email ?? "",
    role: profile?.role === "admin" ? "admin" : "customer",
  };
}

function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /sb-[^=]+=/.test(document.cookie);
}

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: ReactNode;
}) {
  // Seed from the server so the first paint is already correct.
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const next = await userFromSession(supabase, data.session?.user ?? null);
      // `userFromSession` returns null only when there is genuinely no session
      // (sign-out). A signed-in user is always returned, so the bag's storage
      // key stays stable and the add-to-bag gate stays open.
      setUser(next);
    } catch {
      /* session read failed — keep current state */
    }
  }, []);

  // Re-check the session on every soft navigation. Server actions that
  // sign in or out call redirect() — the layout never re-renders, so the
  // cookie changes without any client-side auth event.
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    refresh();
  }, [pathname, refresh]);

  // Client-side auth events (OAuth, token refresh, cross-tab).
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(await userFromSession(supabase, session?.user ?? null));
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // The page becomes visible again after a sign-in redirect completes.
  // Soft navigation back to the same path doesn't fire pathname or auth
  // events, so this is a trigger for "I just signed in".
  useEffect(() => {
    const onVisible = () => {
      if (user || !hasSessionCookie()) return;
      refresh();
    };
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [user, refresh]);

  // Safety net: when we're signed out but a session cookie is present
  // (e.g. a sign-in redirect that soft-navigated back to the same path),
  // poll until React state catches up or the cookie disappears. Runs
  // continuously while signed out so a cookie that appears mid-flight is
  // noticed even if no pathname/auth event fires.
  useEffect(() => {
    if (user) return;
    let active = true;
    let tries = 0;
    const tick = async () => {
      if (!active) return;
      if (!hasSessionCookie()) {
        if (tries >= 40) return;
        tries++;
        setTimeout(tick, 500);
        return;
      }
      tries++;
      await refresh();
      if (user || tries >= 20) return;
      setTimeout(tick, 500);
    };
    const id = setTimeout(tick, 1000);
    return () => {
      active = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (typeof window !== "undefined") (window as any).__AUTH_USER = user;

  return (
    <AuthContext.Provider value={{ user, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}