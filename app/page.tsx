"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { money } from "@/lib/format";
import { getProducts, getCategories } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [visibleProducts, setVisibleProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    const data = await getProducts({ sort: "featured", limit: 12 });
    setProducts(data.items || []);
    setVisibleProducts(data.items || []);
  }

  useEffect(() => {
    // Initialize reveals after content lands
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );
    revealElements.forEach((el) => revealObserver.observe(el));
  }, []);

  async function fetchCategories() {
    const data = await getCategories();
    setCategories(data.items || []);
  }

  // Category emojis from original Express design
  const categoryEmoji = {
    "Home & Cozy": "🛋️", "Tech & Gadgets": "⚡", "Personalized": "🪪",
    "For Him": "🪒", "For Her": "💅", "Self-Care": "🛁", "Experiences": "🎈", "Under Rs 25": "💸"
  };

  // Render category chips matching original Express design
  function renderCategoryChips() {
    return categoryEmoji && Object.keys(categoryEmoji).length > 0 ? (
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(categoryEmoji).map(([name, emoji]) => (
          <Link
            key={name}
            href={`/shop?category=${name}`}
            className="inline-flex items-center rounded-full border border-ink/10 bg-ink/5 px-3 py-1.5 text-sm font-bold text-ink/60 hover:text-ink"
          >
            <span className="mr-1.5">{emoji}</span> {name}
          </Link>
        ))}
      </div>
    ) : (
      <div className="mb-6">
        <Link href="/shop" className="underline">Shop all gifts</Link>
      </div>
    );
  }

  // Render hero product cards EXACT matching original Express design
  function renderHeroProducts() {
    if (!visibleProducts.length) return null;
    const picks = visibleProducts.slice(0, 3);
    const layouts = [
      { left: '0', top: '6%', zIndex: '3', rotate: '-5' },
      { left: 'right', top: '30%', zIndex: '2', rotate: '6' },
      { left: '8%', bottom: '0', zIndex: '4', rotate: '-2' }
    ];

    return (
      <div
        id="hero-stage"
        className="relative pt-6 pb-8"
      >
        {/* Stage background div from original */}
        <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-iris/20 blur-3xl" />

        {picks.map((p, i) => {
          const [c1, c2] = String(p.gradient || '').split(',');
          const layout = layouts[i];
          const style = {
            left: layout.left,
            top: layout.top,
            zIndex: layout.zIndex,
            transform: `rotate(${layout.rotate}deg)`
          };

          return (
            <a
              key={p.id}
              href={`/product/${encodeURIComponent(p.slug)}`}
              className="absolute hero-product block w-[58%] overflow-hidden rounded-[26px] border-2 border-ink bg-white shadow-sticker transition hover:-translate-y-2 hover:shadow-lift"
              style={style}
              title={p.name}
            >
              <div
                class="relative aspect-[4/3] overflow-hidden"
                style={`
                  background:linear-gradient(135deg, ${c1}, ${c2 || c1})
                `}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <span class="absolute left-3 top-3 sticker bg-white">
                  {p.discountPct > 0 ? `-${p.discountPct}%` : 'Hot 🔥'}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 p-3.5">
                <div class="min-w-0">
                  <p class="truncate text-sm font-extrabold">{p.name}</p>
                  <p class="text-xs font-bold text-ink/45">{money(p.priceCents)}</p>
                </div>
              </div>
            </a>
          );
        })}

        {/* "New drop" sticker - exact from original */}
        <span className="absolute right-2 top-4 z-10 sticker rotate-6 border-2 border-ink bg-coral text-white shadow-sticker-sm">
          New drop
        </span>

        {/* "under Rs 50" sticker - exact from original */}
        <span className="absolute left-0 bottom-8 z-10 sticker -rotate-6 border-2 border-ink bg-acid shadow-sticker-sm">
          under Rs 50
        </span>
      </div>
    );
  }

  // Render product grid
  function renderProductGrid() {
    if (!visibleProducts.length) return null;
    return (
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {visibleProducts.map((p) => (
          <ProductCard p={p} />
        ))}
      </div>
    );
  }

  // Render "Under Rs 25" section matching original
  function renderUnder25() {
    const under25Products = visibleProducts.filter((p) => p.priceCents <= 2500);
    if (!under25Products.length) return null;
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-extrabold">Under Rs 25</h2>
          <Link href="/shop?price-asc=1" className="text-ink/60 text-sm hover:text-underline">
            See all discounted
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {under25Products.slice(0, 4).map((p) => (
            <ProductCard p={p} smaller={true} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-ink">Home</Link>
      </nav>

      <div className="max-w-7xl mx-auto">
        {/* Hero Section - exact match from original Express home */}
        <section className="pt-6 pb-8">
          {renderHeroProducts()}
          {renderCategoryChips()}
        </section>

        {/* Featured Products Grid */}
        <section className="mt-8">
          <h2 className="font-display text-2xl font-extrabold font-bold sm:text-3xl mb-4">
            Bestsellers this week
          </h2>
          <p className="text-ink/50 mb-6">
            The gifts everyone's adding to their bag.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.slice(0, 8).map((p) => (
              <ProductCard p={p} />
            ))}
          </div>
        </section>

        {/* Trending Section */}
        <section className="mt-8">
          <h2 className="font-display text-2xl font-extrabold mb-4">
            Trending this week
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleProducts.slice(4, 12).map((p) => (
              <ProductCard p={p} />
            ))}
          </div>
        </section>

        {/* Under Rs 25 Section */}
        {renderUnder25()}
      </div>
    </main>
  );
}