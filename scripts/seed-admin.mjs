/**
 * One-time admin seed for Supabase Auth.
 *
 * Creates (or reuses) a Supabase Auth user for the admin and reconciles the
 * public.profiles row so its id matches the auth user's real UID — required
 * because orders.customer_id -> profiles(id).
 *
 * Usage:
 *   node --env-file=.env scripts/seed-admin.mjs
 *
 * Override credentials via env:
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *
 * IMPORTANT: This uses the SERVICE ROLE key. Never expose it client-side.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = (process.env.ADMIN_EMAIL || "admin@confetticlub.shop").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe!2026";

if (!url || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  console.log(`🔧 Seeding admin auth user: ${adminEmail}`);

  // 1) Find or create the auth user
  let user = await findAuthUserByEmail(adminEmail);
  if (user) {
    console.log(`   • Auth user already exists (id=${user.id}). Reusing.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // admin accounts are pre-confirmed; no email loop
    });
    if (error) throw new Error(`createUser failed: ${error.message}`);
    user = data.user;
    console.log(`   • Created auth user (id=${user.id}).`);
  }

  // 2) Reconcile the profiles row so id == auth uid and role == 'admin'.
  const { data: existing, error: fetchErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", adminEmail)
    .maybeSingle();
  if (fetchErr) throw new Error(`profiles fetch failed: ${fetchErr.message}`);

  if (!existing) {
    const { error: insErr } = await admin
      .from("profiles")
      .insert({ id: user.id, email: adminEmail, role: "admin" });
    if (insErr) throw new Error(`profiles insert failed: ${insErr.message}`);
    console.log("   • Inserted new admin profile linked to auth uid.");
  } else if (existing.id !== user.id) {
    // Placeholder profile (hardcoded UUID) exists -> repoint it to the real auth uid.
    // Safe here because there are no orders referencing the placeholder id yet.
    const { error: updErr } = await admin
      .from("profiles")
      .update({ id: user.id, role: "admin" })
      .eq("email", adminEmail);
    if (updErr) throw new Error(`profiles update failed: ${updErr.message}`);
    console.log("   • Repointed existing profile id -> auth uid, role=admin.");
  } else if (existing.role !== "admin") {
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);
    if (roleErr) throw new Error(`profiles role update failed: ${roleErr.message}`);
    console.log("   • Updated profile role -> admin.");
  } else {
    console.log("   • Profile already linked and set to admin. Nothing to do.");
  }

  console.log("\n✅ Admin ready.");
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log("   (Change the password after first sign-in.)");
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
