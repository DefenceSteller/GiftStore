"use client";

import { useState } from "react";
import { useCart, type AddableProduct } from "./CartProvider";
import { openCart } from "./CartDrawer";

/** Add-to-bag button wired to the cart context; opens the drawer on add. */
export default function AddToCartButton({
  product,
  className = "btn-lime btn-sm",
  label = "＋ Add",
  openAfter = true,
}: {
  product: AddableProduct;
  className?: string;
  label?: string;
  openAfter?: boolean;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const disabled = !product.stock || product.stock <= 0;

  if (disabled) {
    return (
      <span className="btn-outline btn-sm cursor-not-allowed opacity-60">
        Sold out
      </span>
    );
  }

  const handleClick = () => {
    add(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    if (openAfter) openCart();
  };

  return (
    <button
      onClick={handleClick}
      className={justAdded ? `${className} !bg-ink !text-acid` : className}
      aria-label={`Add ${product.name} to bag`}
    >
      {justAdded ? "✓ Added" : label}
    </button>
  );
}
