import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import ClearCartAfterOrder from "@/components/cart/ClearCartAfterOrder";
import PurchaseTracker from "@/components/traffic/PurchaseTracker";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order confirmed — Confetti Club",
  description: "Your gift is on its way. Confetti deployed.",
};

async function SuccessContent({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <PurchaseTracker orderNumber={sp.orderNumber} />
      <main className="container-cc pb-24 pt-8 text-center">
      <div className="mx-auto max-w-xl">
        {/* Confetti burst */}
        <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-iris/20 blur-2xl" />
          <span className="relative grid h-24 w-24 place-items-center rounded-[28px] border-2 border-ink bg-acid text-5xl shadow-sticker">
            🎉
          </span>
        </div>

        <span className="sticker rotate-2 bg-iris text-white">Order confirmed</span>
        <h1 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
          You just made someone{" "}
          <span className="text-gradient">really</span> happy.
        </h1>
        <p className="mt-3 text-lg font-medium leading-relaxed text-ink/60">
          Your order is packed, sealed, and heading out the door. Keep an eye on your
          inbox — tracking lands there first.
        </p>

        <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-6 py-4 shadow-soft">
          <span className="text-sm font-bold text-ink/45">Order number</span>
          <span
            id="order-number"
            className="font-display text-2xl font-extrabold tabular text-iris"
          >
            {sp.orderNumber || "—"}
          </span>
        </div>

        <p className="mt-4 text-xs font-bold text-ink/40">
          Save that number — you can track anytime with it.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-lime text-base">
            🏠 Back to home
          </Link>
          <Link
            href="/track"
            className="btn-outline text-base"
          >
            Track this order →
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-ink/8 bg-white p-5 text-left shadow-soft">
            <span className="text-2xl">📦</span>
            <p className="mt-2 text-sm font-extrabold">Packed with care</p>
            <p className="mt-1 text-xs font-bold text-ink/45">
              Every order ships in our signature confetti box.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/8 bg-white p-5 text-left shadow-soft">
            <span className="text-2xl">💌</span>
            <p className="mt-2 text-sm font-extrabold">Handwritten note</p>
            <p className="mt-1 text-xs font-bold text-ink/45">
              We include a note with every gift — no wrapping stress.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/8 bg-white p-5 text-left shadow-soft">
            <span className="text-2xl">↩️</span>
            <p className="mt-2 text-sm font-extrabold">30-day returns</p>
            <p className="mt-1 text-xs font-bold text-ink/45">
              Returns are easy, no drama, always.
            </p>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

export default function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  return (
    <>
      <StoreHeader />
      <Suspense fallback={<div className="container-cc pb-24 pt-8 text-center"><div className="skeleton mx-auto h-64 w-full max-w-xl rounded-[28px]" /></div>}>
        <ClearCartAfterOrder />
        <SuccessContent searchParams={searchParams} />
      </Suspense>
      <StoreFooter />
    </>
  );
}