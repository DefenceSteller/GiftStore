"use client";

import { useCart } from "./CartProvider";
import { openCart } from "./CartDrawer";

/** Header bag button — shows the live count and opens the drawer. */
export default function CartButton() {
  const { count, ready } = useCart();

  return (
    <button
      onClick={openCart}
      className="btn-primary btn-sm relative"
      aria-label="Open bag"
    >
      🛍️ <span className="hidden sm:inline">Bag</span>
      <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-acid px-1 text-[11px] font-black text-ink transition-transform">
        {ready && count > 99 ? "99+" : ready ? count : 0}
      </span>
    </button>
  );
}
