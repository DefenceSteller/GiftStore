import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  // Return distinct categories currently in use by active products
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true)
    .order("category");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const cats = [...new Set((data || []).map((r: any) => r.category))].filter(Boolean).sort();
  return NextResponse.json({ categories: cats });
}
