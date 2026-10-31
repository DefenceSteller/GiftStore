import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, anon);

async function check(label, table) {
  try {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ ${table}: code=${error.code} msg="${error.message}" details="${error.details}" hint="${error.hint}"`);
      return;
    }
    console.log(`✅ ${table}: ${count} rows`);
  } catch (e) {
    console.log(`❌ ${table}: threw ${JSON.stringify(e)}`);
  }
}

async function main() {
  console.log("🔗 Project URL:", url);
  await check("products", "products");
  await check("promo_codes", "promo_codes");
  await check("profiles", "profiles");
  await check("orders", "orders");

  // Test anon auth (should be able to reach auth endpoint)
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log(error ? `❌ auth endpoint: ${error.message}` : "✅ auth endpoint reachable");
  } catch (e) {
    console.log(`❌ auth endpoint: ${e.message}`);
  }
}

main();
