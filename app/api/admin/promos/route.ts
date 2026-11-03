import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

type PromoCode = Database["public"]["Tables"]["promo_codes"]["Row"];

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ items: data as PromoCode[] });
}

export async function POST(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { data, error } = await supabase.from("promo_codes").insert({
    code: body.code,
    type: body.type,
    value: body.value,
    min_subtotal_cents: body.minSubtotalCents ?? 0,
    active: body.active ?? true,
    description: body.description,
    expires_at: body.expiresAt ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, code: data.code });
}