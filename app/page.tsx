import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import ProductCard from "@/components/store/ProductCard";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await getProducts({ sort: "featured" });
  const bestsellers = featured.filter((p) => p.featured).slice(0, 4);
  const picks = (bestsellers.length ? bestsellers : featured).slice(0, 4);

  return (
    <>
      <StoreHeader />

      <main className="pb-20">
        {/* Hero */}
        <section className="container-cc pt-10 sm:pt-14">
          <div className="relative overflow-hidden rounded-[32px] border border-ink/10 bg-ink px-8 py-14 text-white sm:px-14 sm:py-20">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-iris/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-acid/20 blur-3xl" />
            <div className="relative max-w-2xl">
              <span className="sticker inline-block bg-acid text-ink">✨ New drops every Friday</span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
                Gifts that actually{" "}
                <span className="text-iris">land.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base font-semibold text-white/70 sm:text-lg">
                The gift shop for people who scroll fast and care harder.
                Personalized, tech, and cozy finds — gift-ready in our signature
                confetti box.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/shop" className="btn-lime px-6 py-3 text-base">
                  Shop all gifts
                </Link>
                <Link
                  href="/shop?featured=1"
                  className="rounded-full border-2 border-white/20 px-6 py-3 font-bold text-white transition hover:border-acid hover:text-acid"
                >
                  Bestsellers
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="container-cc mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { emoji: "🚚", title: "Free shipping over Rs 50", body: "Fast, tracked delivery in 5–7 days." },
            { emoji: "🎀", title: "Gift-ready packaging", body: "Arrives in our signature confetti box." },
            { emoji: "↩️", title: "30-day easy returns", body: "Changed your mind? No stress." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-[24px] border border-ink/8 bg-white p-6 shadow-soft"
            >
              <span className="text-3xl">{f.emoji}</span>
              <h3 className="mt-3 font-display text-lg font-extrabold">{f.title}</h3>
              <p className="mt-1 text-sm font-semibold text-ink/55">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Featured products */}
        <section className="container-cc mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                Bestsellers this week
              </h2>
              <p className="mt-1 text-sm font-bold text-ink/50">
                The gifts everyone&apos;s adding to their bag.
              </p>
            </div>
            <Link href="/shop" className="btn-outline btn-sm shrink-0">
              View all →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {picks.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* Promo band */}
        <section className="container-cc mt-14">
          <div className="rounded-[32px] border border-ink/10 bg-gradient-to-br from-iris to-iris-deep px-8 py-12 text-center text-white sm:px-14">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Use code <span className="text-acid">GIFT10</span> for 10% off
            </h2>
            <p className="mx-auto mt-3 max-w-md font-semibold text-white/80">
              Ten percent off orders over Rs 30. Your future self (and your
              recipient) will thank you.
            </p>
            <Link
              href="/shop"
              className="btn-lime mt-6 inline-block px-6 py-3 text-base"
            >
              Start gifting
            </Link>
          </div>
        </section>
      </main>

      <StoreFooter />
    </>
  );
}
