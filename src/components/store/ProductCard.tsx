import Link from "next/link";
import type { StoreProduct } from "@/lib/products";
import { money } from "@/lib/format";
import AddToCartButton from "@/components/cart/AddToCartButton";

function Stars({ rating, count }: { rating: number; count: number }) {
  const full = Math.round(rating);
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-ink/45">
      <span className="tracking-tight text-butter">
        {"★".repeat(full)}
        <span className="text-ink/20">{"★".repeat(5 - full)}</span>
      </span>
      <span>({count})</span>
    </span>
  );
}

export default function ProductCard({ p }: { p: StoreProduct }) {
  const disabled = !p.inStock;
  const [c1, c2] = (p.gradient || "").split(",");

  const badges = (
    <>
      {p.discountPct > 0 && (
        <span className="sticker bg-coral text-white">-{p.discountPct}%</span>
      )}
      {p.featured && p.discountPct <= 0 && (
        <span className="sticker bg-acid">Bestseller</span>
      )}
      {!p.inStock && <span className="sticker bg-ink text-white">Sold out</span>}
    </>
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[28px] border border-ink/8 bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-ink/20 hover:shadow-lift">
      <Link
        href={`/product/${encodeURIComponent(p.slug)}`}
        className="relative block aspect-[4/3] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          width={800}
          height={800}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{badges}</div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">
            {p.category}
          </p>
          <Stars rating={p.rating} count={p.reviewCount} />
        </div>
        <h3 className="font-display text-[17px] font-bold leading-snug">
          <Link
            href={`/product/${encodeURIComponent(p.slug)}`}
            className="transition group-hover:text-iris"
          >
            {p.name}
          </Link>
        </h3>
        <p className="line-clamp-1 text-[13px] font-medium text-ink/50">{p.tagline}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <span className="font-display text-xl font-extrabold">
              {money(p.priceCents)}
            </span>
            {p.compareAtCents ? (
              <s className="ml-1.5 text-[13px] font-bold text-ink/35">
                {money(p.compareAtCents)}
              </s>
            ) : null}
          </div>
          {disabled ? (
            <span className="btn-outline btn-sm cursor-not-allowed opacity-60">
              Sold out
            </span>
          ) : (
            <AddToCartButton
              product={{
                id: p.id,
                slug: p.slug,
                name: p.name,
                priceCents: p.priceCents,
                emoji: p.emoji,
                gradient: p.gradient,
                image: p.image,
                stock: p.stock,
              }}
            />
          )}
        </div>
      </div>
    </article>
  );
}
