import Link from "next/link";
import { notFound } from "next/navigation";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import ProductCard from "@/components/store/ProductCard";
import ProductPurchase from "@/components/cart/ProductPurchase";
import { getProductBySlug } from "@/lib/products";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);
  if (!product) return { title: "Not found — Confetti Club" };
  return {
    title: `${product.name} — Confetti Club`,
    description: product.tagline,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { product, related } = await getProductBySlug(slug);

  if (!product) notFound();

  const [c1, c2] = (product.gradient || "").split(",");
  const onSale = !!product.compareAtCents && product.compareAtCents > product.priceCents;

  return (
    <>
      <StoreHeader />
      <main className="container-cc pb-20 pt-8 sm:pt-10">
        <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-ink">Home</Link>{" "}
          <span className="mx-1.5">/</span>{" "}
          <Link href="/shop" className="transition hover:text-ink">Shop</Link>{" "}
          <span className="mx-1.5">/</span>{" "}
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Image */}
          <div
            className="relative overflow-hidden rounded-[28px] border border-ink/8 shadow-soft"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              width={1000}
              height={1000}
              className="h-full w-full object-cover"
            />
            {onSale && (
              <span className="sticker absolute left-4 top-4 bg-coral text-white">
                -{product.discountPct}%
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink/40">
              {product.category}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 text-base font-semibold text-ink/55">{product.tagline}</p>

            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-ink/50">
              <span className="text-butter">{"★".repeat(Math.round(product.rating))}</span>
              <span>{product.rating.toFixed(1)} · {product.reviewCount} reviews</span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <span className="font-display text-3xl font-extrabold">{money(product.priceCents)}</span>
              {product.compareAtCents && (
                <s className="mb-1 text-lg font-bold text-ink/35">{money(product.compareAtCents)}</s>
              )}
            </div>

            {product.description && (
              <p className="mt-5 leading-relaxed text-ink/70">{product.description}</p>
            )}

            <div className="mt-6">
              {product.inStock ? (
                <ProductPurchase
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    priceCents: product.priceCents,
                    emoji: product.emoji,
                    gradient: product.gradient,
                    image: product.image,
                    stock: product.stock,
                    maxQty: product.maxQty ?? Math.min(product.stock, 10),
                  }}
                />
              ) : (
                <span className="btn-outline block w-full cursor-not-allowed py-3 text-center opacity-60">
                  Sold out
                </span>
              )}
              {product.inStock && product.stock <= 10 && (
                <p className="mt-2 text-xs font-bold text-coral">
                  Only {product.stock} left — order soon!
                </p>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-extrabold">You might also like</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}
      </main>
      <StoreFooter />
    </>
  );
}
