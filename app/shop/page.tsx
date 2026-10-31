import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import ProductCard from "@/components/store/ProductCard";
import { getProducts, getCategories, type StoreProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
  max?: string;
  featured?: string;
  inStock?: string;
}>;

export const metadata = {
  title: "Shop all gifts — Confetti Club",
  description:
    "Browse every gift: personalized, tech, cozy, under Rs 25 and more. Free shipping over Rs 50.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const filters = {
    q: sp.q?.slice(0, 60) || undefined,
    category: sp.category?.slice(0, 40) || undefined,
    sort: sp.sort || "featured",
    max: sp.max ? Number(sp.max) : undefined,
    featured: sp.featured === "1" || sp.featured === "true",
    inStock: sp.inStock === "1" || sp.inStock === "true",
  };

  const [products, categories] = await Promise.all([
    getProducts(filters),
    getCategories(),
  ]);

  const title = filters.category ?? (filters.featured ? "Bestsellers" : "All gifts");

  // Build a link with the given filter changes applied (others preserved).
  const linkWith = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: filters.q,
      category: filters.category,
      sort: filters.sort !== "featured" ? filters.sort : undefined,
      max: filters.max != null ? String(filters.max) : undefined,
      featured: filters.featured ? "1" : undefined,
      inStock: filters.inStock ? "1" : undefined,
      ...changes,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <>
      <StoreHeader />
      <main className="container-cc pb-20 pt-8 sm:pt-10">
        <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-ink">Home</Link>{" "}
          <span className="mx-1.5">/</span>{" "}
          <span className="text-ink">Shop</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
              {title}
            </h1>
            <p className="mt-2 text-sm font-bold text-ink/50">
              {products.length} gift{products.length === 1 ? "" : "s"} ready to ship
            </p>
          </div>
          <div className="flex w-full gap-2.5 sm:w-auto">
            <form method="GET" action="/shop" className="relative flex-1 sm:w-72">
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              <label className="relative block">
                <span className="sr-only">Search gifts</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Search “mug”, “personalized”…"
                  className="input pr-10"
                  autoComplete="off"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35">
                  🔎
                </span>
              </label>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* FILTERS */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <details open className="group rounded-[24px] border border-ink/8 bg-white p-5 shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display text-base font-extrabold">
                Filters <span className="text-ink/40 transition group-open:rotate-180">▾</span>
              </summary>

              <div className="mt-5">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink/40">
                  Category
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Link
                    href={linkWith({ category: undefined })}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition ${
                      !filters.category
                        ? "border-ink bg-ink text-white"
                        : "border-ink/10 text-ink/70 hover:border-ink/30"
                    }`}
                  >
                    All
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.name}
                      href={linkWith({ category: c.name })}
                      className={`rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition ${
                        filters.category === c.name
                          ? "border-ink bg-ink text-white"
                          : "border-ink/10 text-ink/70 hover:border-ink/30"
                      }`}
                    >
                      {c.name} <span className="opacity-50">{c.count}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                <Link
                  href={linkWith({ featured: filters.featured ? undefined : "1" })}
                  className={`flex cursor-pointer items-center gap-2.5 text-sm font-bold ${
                    filters.featured ? "text-iris" : "text-ink/70"
                  }`}
                >
                  <span
                    className={`grid h-4.5 w-4.5 place-items-center rounded border-2 ${
                      filters.featured ? "border-iris bg-iris text-white" : "border-ink/20"
                    }`}
                  >
                    {filters.featured ? "✓" : ""}
                  </span>
                  Bestsellers only
                </Link>
                <Link
                  href={linkWith({ inStock: filters.inStock ? undefined : "1" })}
                  className={`flex cursor-pointer items-center gap-2.5 text-sm font-bold ${
                    filters.inStock ? "text-iris" : "text-ink/70"
                  }`}
                >
                  <span
                    className={`grid h-4.5 w-4.5 place-items-center rounded border-2 ${
                      filters.inStock ? "border-iris bg-iris text-white" : "border-ink/20"
                    }`}
                  >
                    {filters.inStock ? "✓" : ""}
                  </span>
                  In stock only
                </Link>
              </div>

              <Link href="/shop" className="btn-outline btn-sm mt-6 block w-full text-center">
                Clear all
              </Link>
            </details>
          </aside>

          {/* RESULTS */}
          <section>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3 shadow-soft">
              <p className="hidden text-sm font-bold text-ink/55 sm:block">
                {products.length} result{products.length === 1 ? "" : "s"}
              </p>
              <form method="GET" action="/shop" className="ml-auto">
                {filters.category && <input type="hidden" name="category" value={filters.category} />}
                {filters.q && <input type="hidden" name="q" value={filters.q} />}
                {filters.featured && <input type="hidden" name="featured" value="1" />}
                {filters.inStock && <input type="hidden" name="inStock" value="1" />}
                {filters.max != null && <input type="hidden" name="max" value={String(filters.max)} />}
                <label className="flex items-center gap-2 text-sm font-bold text-ink/60">
                  Sort
                  <select
                    name="sort"
                    defaultValue={filters.sort}
                    className="rounded-full border-2 border-ink/10 bg-white px-3 py-2 text-sm font-extrabold text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="popular">Most loved</option>
                    <option value="newest">Newest</option>
                    <option value="price-asc">Price: low → high</option>
                    <option value="price-desc">Price: high → low</option>
                    <option value="rating">Top rated</option>
                  </select>
                  <button type="submit" className="sr-only">Apply</button>
                </label>
              </form>
            </div>

            {products.length === 0 ? (
              <div className="mt-6 rounded-[28px] border-2 border-dashed border-ink/15 p-12 text-center">
                <span className="text-5xl">🫥</span>
                <h2 className="mt-4 font-display text-2xl font-extrabold">Nothing matches that</h2>
                <p className="mt-2 text-sm font-semibold text-ink/55">
                  Try a different search, or clear the filters and browse everything.
                </p>
                <Link href="/shop" className="btn-lime mt-5 inline-block">
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                {products.map((p: StoreProduct) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
