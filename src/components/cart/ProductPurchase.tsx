"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { openCart } from "./CartDrawer";
import { money } from "@/lib/format";

type ProductInfo = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  emoji: string;
  gradient: string;
  image: string;
  stock: number;
  maxQty: number;
};

/** Product-detail purchase row: functional quantity stepper + add-to-bag. */
export default function ProductPurchase({ product }: { product: ProductInfo }) {
  const { add } = useCart();
  const max = Math.max(1, Math.min(product.maxQty || product.stock || 10, 10));
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const bump = (delta: number) =>
    setQty((q) => Math.min(Math.max(1, q + delta), max));

  const handleAdd = () => {
    add(product, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    openCart();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-full border-2 border-ink/10">
        <button
          onClick={() => bump(-1)}
          className="px-4 py-2 text-lg font-bold text-ink/60"
          aria-label="Decrease"
        >
          −
        </button>
        <span className="px-2 font-display text-lg font-extrabold tabular">
          {qty}
        </span>
        <button
          onClick={() => bump(1)}
          className="px-4 py-2 text-lg font-bold text-ink/60"
          aria-label="Increase"
        >
          ＋
        </button>
      </div>
      <button
        onClick={handleAdd}
        className={`flex-1 py-3 text-base ${
          justAdded ? "btn-primary" : "btn-lime"
        }`}
      >
        {justAdded
          ? `✓ Added ${qty}`
          : `Add to bag · ${money(product.priceCents * qty)}`}
      </button>
    </div>
  );
}
