"use client";

/**
 * Sort dropdown that applies immediately on change.
 * Kept as a client component so it can submit without a visible button.
 * Preserves the current filters via hidden inputs.
 */
export default function SortForm({
  sort,
  q,
  category,
  featured,
  inStock,
  max,
}: {
  sort?: string;
  q?: string;
  category?: string;
  featured?: boolean;
  inStock?: boolean;
  max?: number | undefined;
}) {
  return (
    <form method="GET" action="/shop" className="flex w-full flex-wrap items-center gap-2 sm:ml-auto">
      {category && <input type="hidden" name="category" value={category} />}
      {q && <input type="hidden" name="q" value={q} />}
      {featured && <input type="hidden" name="featured" value="1" />}
      {inStock && <input type="hidden" name="inStock" value="1" />}
      {max != null && <input type="hidden" name="max" value={String(max)} />}
      <label className="flex items-center gap-2 text-sm font-bold text-ink/60">
        Sort
        <select
          name="sort"
          defaultValue={sort ?? "featured"}
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (form) form.submit();
          }}
          className="cursor-pointer rounded-full border-2 border-ink/10 bg-white px-3 py-2 text-sm font-extrabold text-ink focus:border-ink focus:outline-none"
        >
          <option value="featured">Featured</option>
          <option value="popular">Most loved</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="rating">Top rated</option>
        </select>
      </label>
    </form>
  );
}
