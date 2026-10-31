import { createClient } from "@/lib/supabase/server";

/** Product shape surfaced to the storefront UI (camelCase). */
export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  priceCents: number;
  compareAtCents: number | null;
  discountPct: number;
  emoji: string;
  gradient: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  inStock: boolean;
  stock: number;
  image: string;
  description?: string;
  maxQty?: number;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  price_cents: number;
  compare_at_cents: number | null;
  emoji: string | null;
  gradient: string;
  rating: number | null;
  review_count: number;
  is_active: boolean;
  stock: number;
  sort_order: number;
};

/** Map a raw DB row to the UI shape. `description` doubles as the tagline. */
function mapProduct(row: ProductRow): StoreProduct {
  const discountPct =
    row.compare_at_cents && row.compare_at_cents > row.price_cents
      ? Math.round((1 - row.price_cents / row.compare_at_cents) * 100)
      : 0;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.description ?? "",
    category: row.category,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents || null,
    discountPct,
    emoji: row.emoji ?? "",
    gradient: row.gradient,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count,
    // No is_featured column; treat the first few by sort_order as bestsellers.
    featured: row.sort_order <= 6,
    inStock: row.stock > 0,
    stock: row.stock,
    image: `/assets/img/products/${row.slug}.svg`,
  };
}

export type ProductFilters = {
  q?: string;
  category?: string;
  sort?: string;
  max?: number;
  featured?: boolean;
  inStock?: boolean;
};

const SORTS: Record<string, { column: string; ascending: boolean }> = {
  featured: { column: "sort_order", ascending: true },
  newest: { column: "created_at", ascending: false },
  "price-asc": { column: "price_cents", ascending: true },
  "price-desc": { column: "price_cents", ascending: false },
  rating: { column: "rating", ascending: false },
  popular: { column: "review_count", ascending: false },
};

/** Fetch the active catalog with optional filters. */
export async function getProducts(
  filters: ProductFilters = {}
): Promise<StoreProduct[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at"
    )
    .eq("is_active", true);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.max != null) query = query.lte("price_cents", filters.max);
  if (filters.featured) query = query.lte("sort_order", 6);
  if (filters.inStock) query = query.gt("stock", 0);
  if (filters.q) {
    const like = `%${filters.q}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  const sort = SORTS[filters.sort ?? "featured"] ?? SORTS.featured;
  query = query.order(sort.column, { ascending: sort.ascending });

  const { data, error } = await query;
  if (error) {
    console.error("getProducts error:", error.message);
    return [];
  }
  return (data as ProductRow[]).map(mapProduct);
}

/** Fetch a single active product by slug, plus a few related items. */
export async function getProductBySlug(slug: string): Promise<{
  product: StoreProduct | null;
  related: StoreProduct[];
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return { product: null, related: [] };

  const product = mapProduct(data as ProductRow);
  product.description = (data as ProductRow).description ?? "";
  product.maxQty = Math.min(product.stock, 10);

  const { data: relatedRows } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at"
    )
    .eq("is_active", true)
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(4);

  return {
    product,
    related: (relatedRows as ProductRow[] | null)?.map(mapProduct) ?? [],
  };
}

/** Distinct categories with counts (for the filter sidebar). */
export async function getCategories(): Promise<
  { name: string; count: number }[]
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true);

  if (!data) return [];
  const counts = new Map<string, number>();
  for (const row of data as { category: string }[]) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
