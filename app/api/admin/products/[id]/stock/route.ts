import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const body = await req.json();
  const { data: product } = await supabase.from("products").select("stock").eq("id", params.id).single();
  const newStock = Math.max(0, (product?.stock ?? 0) + body.delta);
  await supabase.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", params.id);
  await supabase.from("stock_movements").insert({ product_id: params.id, delta: body.delta, reason: body.reason || "manual_adjust" });
  return NextResponse.json({ ok: true, stock: newStock });
}