import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const upserts = Object.entries(body).map(([key, value]) =>
    supabase.from("settings").upsert({ key, value: String(value), updated_at: new Date().toISOString() })
  );
  await Promise.all(upserts);
  return NextResponse.json({ ok: true });
}