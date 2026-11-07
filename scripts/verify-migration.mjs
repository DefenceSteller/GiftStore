import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  // 1. Check image_url column exists
  const { data: columns, error: colErr } = await supabase
    .from("products")
    .select("image_url")
    .limit(1);
  
  if (colErr) {
    console.log("⚠️  Could not query image_url column:", colErr.message);
  } else {
    console.log("✅ Column exists:", columns.length > 0 ? `first row = ${JSON.stringify(columns[0])}` : "empty table");
  }

  // 2. Test categories endpoint
  const catRes = await fetch(`${url}/rest/v1/products?select=category&is_active=eq.true`, {
    headers: {
      "apikey": serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    }
  });
  if (!catRes.ok) throw new Error(`HTTP ${catRes.status}`);
  const cats = await catRes.json();
  const unique = [...new Set(cats.map((r: any) => r.category))].filter(Boolean).sort();
  console.log("✅ Categories in DB:", unique);
}

main().catch(e => { console.error(e.message); process.exit(1); });
