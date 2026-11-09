import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import ProductCard from "@/components/store/ProductCard";
import { getProducts, getCategories } from "@/lib/products";
import { money } from "@/lib/format";
import { getServerStoreConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";

// Floating hero product card — matches main branch heroCard() JS
function HeroFloatingCard({
  product,
  left,
  right,
  top,
  bottom,
  zIndex,
  rotate,
}: {
  product: { slug: string; name: string; priceCents: number; gradient: string; discountPct: number; rating: number };
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  zIndex?: number;
  rotate: number;
}) {
  const [c1, c2] = (product.gradient || "").split(",");
  return (
    <a
      href={`/product/${encodeURIComponent(product.slug)}`}
      className="absolute block w-[58%] overflow-hidden rounded-[26px] border-2 border-ink bg-white shadow-sticker transition hover:-translate-y-2 hover:shadow-lift"
      style={{
        left,
        right,
        top,
        bottom,
        zIndex,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || c1})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/assets/img/products/${product.slug}.svg`}
          alt={product.name}
          className="h-full w-full object-cover"
          width={800}
          height={800}
        />
        <span className="absolute left-3 top-3 sticker bg-white">
          {product.discountPct > 0 ? `-${product.discountPct}%` : "Hot 🔥"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 p-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{product.name}</p>
          <p className="text-xs font-bold text-ink/45">{money(product.priceCents)}</p>
        </div>
        <div className="flex items-center gap-0.5 text-butter text-[11px]">
          {"★".repeat(Math.round(product.rating))}
          {"☆".repeat(5 - Math.round(product.rating))}
        </div>
      </div>
    </a>
  );
}

export default async function HomePage() {
  const [featured, categoriesData, storeConfig] = await Promise.all([
    getProducts({ sort: "featured", inStock: true }),
    getCategories(),
    getServerStoreConfig(),
  ]);
  const sym = storeConfig.currency === "USD" ? "$" : "Rs";

  // Featured products for hero (up to 6)
  const heroProducts = featured.slice(0, 3);
  // Featured products for trending grid (up to 8)
  const trending = featured.slice(0, 8);
  // Under Rs 25 products
  const under25 = featured.filter((p) => p.priceCents <= 2500).slice(0, 4);

  // Hero floating card layouts (same as main branch)
  const heroLayouts = [
    { left: "0", top: "6%", zIndex: 3, rotate: -5 },
    { right: "0", top: "30%", zIndex: 2, rotate: 6 },
    { left: "8%", bottom: "0", zIndex: 4, rotate: -2 },
  ];

  // Category emoji map (same as main branch)
  const categoryEmoji: Record<string, string> = {
    "Home & Cozy": "🛋️",
    "Tech & Gadgets": "⚡",
    "Personalized": "🪪",
    "For Him": "🪒",
    "For Her": "💅",
    "Self-Care": "🛁",
    "Experiences": "🎈",
    "Under Rs 25": "💸",
  };

  return (
    <>
      <StoreHeader />

      <main>
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-iris/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-40 h-80 w-80 rounded-full bg-acid/30 blur-3xl" />

          <div className="container-cc grid items-center gap-10 pb-10 pt-10 sm:pb-16 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            {/* Left: text */}
            <div>
              <span className="sticker animate-pop bg-acid">🎁 New drop every Friday</span>

              <h1 className="mt-5 font-display text-[clamp(2.7rem,7vw,4.7rem)] font-extrabold leading-[0.94]">
                Gifts that<br />
                <span className="text-gradient">hit different</span>.
              </h1>

              <p className="mt-5 max-w-lg text-lg font-medium leading-relaxed text-ink/60">
                Curated, customizable and packed with actual confetti. Find the one thing they&apos;ll screenshot, keep, and use every day.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/shop" className="btn-lime text-base">
                  Shop the drop →
                </Link>
                <Link href="/surprise" className="btn-outline text-base">
                  🎲 Surprise me
                </Link>
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <div className="rounded-2xl border border-ink/8 bg-white p-3.5 shadow-soft">
                  <dt className="font-display text-2xl font-extrabold">4.9★</dt>
                  <dd className="mt-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">
                    12k gifters
                  </dd>
                </div>
                <div className="rounded-2xl border border-ink/8 bg-white p-3.5 shadow-soft">
                  <dt className="font-display text-2xl font-extrabold">{sym} 50</dt>
                  <dd className="mt-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">
                    free shipping
                  </dd>
                </div>
                <div className="rounded-2xl border border-ink/8 bg-white p-3.5 shadow-soft">
                  <dt className="font-display text-2xl font-extrabold">30d</dt>
                  <dd className="mt-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/45">
                    easy returns
                  </dd>
                </div>
              </dl>
            </div>

            {/* Right: floating hero cards */}
            <div className="relative mx-auto h-[380px] w-full max-w-[520px] sm:h-[460px] overflow-hidden">
              <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-iris/20 blur-3xl" />
              {heroProducts.map((p, i) => (
                <HeroFloatingCard
                  key={p.id}
                  product={{
                    slug: p.slug,
                    name: p.name,
                    priceCents: p.priceCents,
                    gradient: p.gradient,
                    discountPct: p.discountPct,
                    rating: p.rating,
                  }}
                  left={heroLayouts[i]?.left}
                  right={heroLayouts[i]?.right}
                  top={heroLayouts[i]?.top}
                  bottom={heroLayouts[i]?.bottom}
                  zIndex={heroLayouts[i]?.zIndex}
                  rotate={heroLayouts[i]?.rotate ?? 0}
                />
              ))}
              {/* Sticker badges on hero stage */}
              <span className="absolute right-2 top-4 z-10 sticker rotate-6 border-ink bg-coral text-white shadow-sticker-sm">
                New drop
              </span>
              <span className="absolute left-0 bottom-8 z-10 sticker -rotate-6 border-ink bg-acid shadow-sticker-sm">
                under {sym} 50
              </span>
            </div>
          </div>
        </section>

        {/* ─── CATEGORIES ─── */}
        <section className="container-cc pb-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-extrabold sm:text-2xl">
              Shop by vibe
            </h2>
            <Link href="/shop" className="text-sm font-extrabold text-iris transition hover:text-ink">
              See everything →
            </Link>
          </div>
          <div className="no-scrollbar mt-4 flex gap-2.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
            {categoriesData.map((cat) => (
              <Link
                key={cat.name}
                href={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="chip shrink-0 sm:shrink"
              >
                <span>{categoryEmoji[cat.name] || "🎁"}</span>
                {cat.name}
                <span className="text-ink/35">{cat.count}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── TRENDING ─── */}
        <section className="container-cc section pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="sticker bg-bubble">🔥 Trending this week</span>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                Everyone&apos;s adding these
              </h2>
            </div>
            <Link href="/shop?sort=popular" className="btn-outline btn-sm">
              View all bestsellers
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {trending.slice(0, 4).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* ─── BENTO ─── */}
        <section className="container-cc section pt-0">
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {/* Large dark card — spans 2 cols + 2 rows on md */}
            <div className="reveal rounded-[32px] bg-ink p-7 text-white md:col-span-2 md:row-span-2 md:flex md:flex-col md:justify-between md:p-9">
              <span className="sticker w-fit border-white/25 bg-white/10 text-white">
                ⚡ Shipping that&apos;s actually fast
              </span>
              <div className="mt-6 md:mt-0">
                <p className="font-display text-4xl font-extrabold leading-none sm:text-5xl">
                  1–2 days
                </p>
                <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-white/60">
                  Orders placed before 4pm ship the same day from our own warehouse.
                  Standard delivery lands in 5–7 days, express in 2–3 — with live
                  tracking the whole way.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-wide">
                  <span className="rounded-full bg-acid px-3 py-1.5 text-ink">
                    Same-day dispatch
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">
                    Live tracking
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">
                    Free over {sym} 50
                  </span>
                </div>
              </div>
            </div>

            {/* Gift-ready card */}
            <div className="reveal rounded-[32px] border border-ink/8 bg-white p-6 shadow-soft">
              <span className="text-3xl">🎀</span>
              <h3 className="mt-3 font-display text-xl font-extrabold">
                Gift-ready, always
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/55">
                Every order arrives in our signature confetti box with a handwritten-style note. No wrapping stress.
              </p>
            </div>

            {/* Personalization card */}
            <div className="reveal rounded-[32px] border border-ink/8 bg-acid p-6 shadow-soft">
              <span className="text-3xl">✂️</span>
              <h3 className="mt-3 font-display text-xl font-extrabold">
                Make it theirs
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/70">
                Names, dates, pet faces, inside jokes — the personalization shelf turns a good gift into a &quot;how did you know?&quot; gift.
              </p>
            </div>
          </div>
        </section>

        {/* ─── MARQUEE STRIP ─── */}
        <section className="overflow-hidden border-y-2 border-ink bg-iris py-4 text-white">
          <div className="flex w-max animate-marquee-fast whitespace-nowrap font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
            <span className="shrink-0 px-4">
              No boring gifts <span className="text-acid">✦</span> Made to be opened <span className="text-acid">✦</span> Packed with confetti <span className="text-acid">✦</span> Ships same day <span className="text-acid">✦</span> Returns without drama <span className="text-acid">✦</span>
            </span>
            <span className="shrink-0 px-4" aria-hidden="true">
              No boring gifts <span className="text-acid">✦</span> Made to be opened <span className="text-acid">✦</span> Packed with confetti <span className="text-acid">✦</span> Ships same day <span className="text-acid">✦</span> Returns without drama <span className="text-acid">✦</span>
            </span>
          </div>
        </section>

        {/* ─── UNDER $25 ─── */}
        <section className="container-cc section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="sticker bg-aqua">💸 Tiny budget, big energy</span>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                Under {sym} 25
              </h2>
            </div>
            <Link href="/shop?max=2500" className="btn-outline btn-sm">
              Shop under {sym} 25
            </Link>
          </div>
          <div className="no-scrollbar mt-8 flex snap-x gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            {under25.map((p) => (
              <div key={p.id} className="w-64 shrink-0 snap-start sm:w-auto">
                <ProductCard p={p} />
              </div>
            ))}
            {under25.length === 0 && (
              <p className="text-sm font-bold text-ink/50">Nothing under Rs 25 right now.</p>
            )}
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="section bg-mist">
          <div className="container-cc">
            <div className="mx-auto max-w-2xl text-center">
              <span className="sticker bg-white">💌 The group chat approves</span>
              <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
                12,000+ gifters can&apos;t be wrong
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  initials: "JM",
                  bg: "bg-iris",
                  name: "Jess M.",
                  location: "Austin, TX · verified buyer",
                  quote:
                    "Ordered the cloud lamp Tuesday, it showed up Thursday with actual confetti in the box. My sister cried. 10/10 emotional damage.",
                },
                {
                  initials: "AK",
                  bg: "bg-coral",
                  name: "Amara K.",
                  location: "Brooklyn, NY · verified buyer",
                  quote:
                    "The custom pet socks were a gamble. He wears them every single week. Never speaking to you again, confetti club.",
                },
                {
                  initials: "DR",
                  bg: "bg-acid",
                  name: "Diego R.",
                  location: "Seattle, WA · verified buyer",
                  quote:
                    "Checkout took 40 seconds and tracking updated in real time. I had it bookmarked before the confirmation email landed.",
                },
              ].map((t, i) => (
                <figure
                  key={t.name}
                  className={`reveal card p-6`}
                  data-delay={i * 110}
                >
                  <div className="text-butter">★★★★★</div>
                  <blockquote className="mt-3 text-[15px] font-medium leading-relaxed text-ink/70">
                    &quot;{t.quote}&quot;
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full ${t.bg} font-display text-sm font-extrabold text-white`}
                    >
                      {t.initials}
                    </span>
                    <div>
                      <span className="text-sm font-extrabold">{t.name}</span>
                      <span className="block text-xs font-bold text-ink/45">
                        {t.location}
                      </span>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ─── NEWSLETTER ─── */}
        <section className="container-cc section">
          <div className="reveal relative overflow-hidden rounded-[36px] border-2 border-ink bg-butter p-8 shadow-sticker sm:p-12">
            <div className="pointer-events-none absolute -right-10 -top-10 text-[140px] opacity-15 select-none">🎁</div>
            <div className="relative grid items-center gap-6 md:grid-cols-2">
              <div>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                  Get Rs 5 off your<br />first unboxing.
                </h2>
                <p className="mt-3 max-w-md text-sm font-semibold text-ink/65">
                  Join the list for early access to drops, restock alerts, and a welcome code that actually works.
                </p>
              </div>
              <form className="flex flex-wrap gap-2.5 sm:justify-end">
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="input max-w-xs flex-1 border-ink/20"
                  aria-label="Email address"
                />
                <button className="btn-primary h-[50px]" type="submit">
                  Send my code
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <StoreFooter />
    </>
  );
}