import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { getProducts } from "@/lib/products";
import { redirect } from "next/navigation";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SurprisePage() {
  const products = await getProducts({ inStock: true });
  if (!products.length) {
    redirect("/shop");
  }
  const pick = products[Math.floor(Math.random() * products.length)];

  return (
    <div className="min-h-screen bg-mist flex flex-col">
      <StoreHeader />
      <main className="flex-1 container-cc py-16 flex items-center justify-center">
        <div className="mx-auto max-w-lg w-full rounded-[36px] border-2 border-ink bg-white p-8 sm:p-10 text-center shadow-sticker">
          <span className="inline-grid h-20 w-20 place-items-center rounded-3xl border-2 border-ink bg-acid text-4xl shadow-sticker-sm animate-bounce">
            🎲
          </span>
          <h1 className="mt-6 font-display text-3xl font-extrabold sm:text-4xl tracking-tight">
            Surprise!
          </h1>
          <p className="mt-2 text-sm text-ink/65 max-w-xs mx-auto">
            We spun the wheel and found something special just for you.
          </p>

          <div className="mt-8 rounded-[26px] border-2 border-ink bg-mist p-6 text-left shadow-soft transition hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="sticker bg-iris text-white text-xs">
                {pick.category}
              </span>
              <span className="font-display font-extrabold text-lg text-iris">
                {money(pick.priceCents)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl">{pick.emoji}</span>
              <div>
                <h3 className="font-display text-xl font-extrabold text-ink">
                  {pick.name}
                </h3>
                <p className="text-xs text-ink/60 mt-0.5 line-clamp-2">
                  {pick.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/surprise"
              className="btn-outline flex-1 text-center py-3.5"
            >
              🎲 Spin again
            </Link>
            <Link
              href={`/product/${encodeURIComponent(pick.slug)}`}
              className="btn-primary flex-1 text-center py-3.5"
            >
              View gift →
            </Link>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
