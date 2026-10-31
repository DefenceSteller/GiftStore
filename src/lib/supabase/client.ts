import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Create a Supabase client for Client Components (browser).
 * Uses the Next.js public env vars.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
