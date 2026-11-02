/**
 * Fix admin profile role.
 *
 * Root cause: seed had hardcoded UUID '0000...0001' for admin profile, but
 * Supabase Auth generates a random UUID at signup. The profile.id never matched
 * the auth.user.id, so getSessionUser() always returned role='customer'.
 *
 * This script:
 *   1. Finds the auth user by email.
 *   2. Creates/updates the public.profiles row with that real UUID and role='admin'.
 *
 * Run with: npx tsx scripts/fix-admin.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key for admin auth API access
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

async function main() {
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: find the auth user
  const { data: authUsers, error: authErr } = await sb.auth.admin.listUsers();
  if (authErr) {
    console.error("Auth error:", authErr.message);
    return;
  }

  const adminAuthUser = authUsers.users.find(
    (u) => u.email === "admin@confetticlub.shop"
  );

  if (!adminAuthUser) {
    console.error(
      "No auth user found for admin@confetticlub.shop. Create one first at /auth/signup"
    );
    return;
  }

  const adminId = adminAuthUser.id;
  console.log(`Found auth user: ${adminId}`);

  // Step 2: upsert the profiles row
  const { error: profileErr } = await sb.from("profiles").upsert(
    { id: adminId, email: adminAuthUser.email!, role: "admin" },
    { onConflict: "id" }
  );

  if (profileErr) {
    console.error("Profile upsert error:", profileErr.message);
    return;
  }

  console.log("✅ Admin profile fixed. Sign out and sign in again.");
}

main().catch(console.error);
