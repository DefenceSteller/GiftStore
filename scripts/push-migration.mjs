import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Missing env vars");
  process.exit(1);
}

async function main() {
  const sql = "alter table public.products add column if not exists image_url text null;";
  const res = await fetch(`${url}/rest/v1/`, {
    method: "POST",
    headers: {
      "apikey": serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  console.log("✅ Migration applied!");
}

main().catch(e => { console.error(e.message); process.exit(1); });
