import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const supabase = await createServiceClient();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");

  let query = supabase.from("products").select("*", { count: "exact" });

  if (status === "active") query = query.eq("is_active", true);
  else if (status === "archived") query = query.eq("is_active", false);
  else if (status === "low") query = query.eq("is_active", true).lte("stock", 5);

  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`);

  const { data, count } = await query.order("sort_order", { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  const counts: Record<string, number> = {};
  for (const key of ["all", "active", "archived", "low"]) {
    let c = supabase.from("products").select("*", { count: "exact", head: true });
    if (key === "active") c = c.eq("is_active", true);
    else if (key === "archived") c = c.eq("is_active", false);
    else if (key === "low") c = c.eq("is_active", true).lte("stock", 5);
    const { count: n } = await c;
    counts[key] = n ?? 0;
  }

  return NextResponse.json({
    items: data?.map((p: any) => ({
      id: p.id, slug: p.slug, name: p.name, tagline: p.description, category: p.category,
      priceCents: p.price_cents, compareAtCents: p.compare_at_cents, stock: p.stock,
      emoji: p.emoji, gradient: p.gradient, rating: p.rating, reviewCount: p.review_count,
      active: p.is_active, featured: p.is_featured ?? (p.sort_order <= 6), sortOrder: p.sort_order,
      image: `/assets/img/products/${p.slug}.svg`, description: p.description
    })) ?? [],
    total: count ?? 0, page, limit,
    pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    counts
  });
}

export async function POST(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();
  
  // Generate unique slug
  let slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let slugExists = true;
  let slugCounter = 2;
  
  while (slugExists) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    
    if (!existing || !existing.id) {
      slugExists = false;
    } else {
      slug = `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${slugCounter}`;
      slugCounter++;
    }
  }
  
  const { data, error } = await supabase.from("products").insert({
    slug,
    name: body.name,
    description: body.description || body.tagline || "",
    category: body.category,
    price_cents: body.priceCents,
    compare_at_cents: body.compareAtCents || null,
    emoji: body.emoji || "🎁",
    gradient: body.gradient || "#7C5CFF,#D3FF52",
    rating: body.rating ?? 4.5,
    review_count: body.reviewCount ?? 0,
    stock: body.stock ?? 0,
    is_active: body.is_active ?? true,
    is_featured: body.is_featured ?? false,
    sort_order: body.sortOrder ?? 0
  } as any).select().single();
  
  if (error) {
    console.error("Product create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, id: data.id, slug });
}