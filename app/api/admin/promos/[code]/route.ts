import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const body = await req.json();
  const { error } = await supabase.from("promo_codes").update({
    active: body.active,
    min_subtotal_cents: body.minSubtotalCents,
  }).eq("code", params.code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  await supabase.from("promo_codes").delete().eq("code", params.code);
  return NextResponse.json({ ok: true });
}