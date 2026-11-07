"use client";

import { useCart } from "./CartProvider";
import { openCart } from "./CartDrawer";

export default function CartButton() {
  const { count, ready } = useCart();

  return (
    <button
      onClick={openCart}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink/10 text-ink transition hover:border-ink sm:flex sm:w-auto sm:gap-1.5 sm:px-3"
      aria-label="Open bag"
    >
      <span className="text-base">🛍️</span>
      <span className="hidden text-sm font-extrabold sm:inline">Bag</span>
      <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-acid px-1 text-[11px] font-black text-ink">
        {ready && count > 99 ? "99+" : ready ? count : 0}
      </span>
    </button>
  );
}
