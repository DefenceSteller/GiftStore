import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createServiceClient();
  const body = await req.json();
  const { error } = await supabase.from("products").update({
    name: body.name, description: body.description, category: body.category,
    price_cents: body.priceCents, compare_at_cents: body.compareAtCents,
    emoji: body.emoji, gradient: body.gradient, rating: body.rating,
    review_count: body.reviewCount, stock: body.stock, is_active: body.is_active,
    is_featured: body.is_featured, sort_order: body.sortOrder,
    image_url: body.imageUrl ?? null,
    updated_at: new Date().toISOString()
  } as any).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createServiceClient();
  await supabase.from("products").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", params.id);
  return NextResponse.json({ ok: true });
}