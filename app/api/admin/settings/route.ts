import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();
  const upserts = Object.entries(body).map(([key, value]) =>
    supabase.from("settings").upsert({ key, value: String(value), updated_at: new Date().toISOString() })
  );
  await Promise.all(upserts);
  return NextResponse.json({ ok: true });
}