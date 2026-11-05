"use client";

/**
 * Client cart store — localStorage-backed, synced across tabs via the
 * `storage` event + BroadcastChannel, mirroring the original Express
 * storefront's cart.js semantics (max 10 per line).
 *
 * Carts are keyed per user (`cc_cart_v2:<userId>`), so two people on the site
 * at the same time never see each other's bag, and each user gets their own
 * bag back when they sign in. Signed-out visitors share the legacy guest key.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { takePendingAdd } from "@/components/auth/SignInPopout";
import { openCart } from "./CartDrawer";

const GUEST_KEY = "cc_cart_v2";
const MAX_QTY_PER_LINE = 10;

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  emoji: string;
  gradient: string;
  image: string;
  stock: number;
  maxQty: number;
  qty: number;
};

export type AddableProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  emoji: string;
  gradient: string;
  image: string;
  stock?: number;
  maxQty?: number;
};

function keyFor(userId: string | null | undefined): string {
  return userId ? `${GUEST_KEY}:${userId}` : GUEST_KEY;
}

function read(key: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(key: string, items: CartItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* storage full/blocked */
  }
}

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (product: AddableProduct, qty?: number) => number;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = keyFor(user?.id);

  // `ready` stays false until hydration on the client so server HTML matches.
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  if (typeof window !== "undefined") {
    (window as any).__CART_DEBUG = { user: user?.id, storageKey, ready };
  }

  // Hydrate from localStorage after mount, and re-hydrate whenever the signed
  // user changes so each account loads its own bag. Signed-out visitors cannot
  // add items (the Add gate routes them to the sign-in popout), so the bag
  // starts clean for a first-time visitor and any stale guest-cart data is
  // discarded rather than rendered.
  useEffect(() => {
    if (!user) {
      // Signed-out: bag starts clean (guests can't add via the gate; stale
      // guest-cart data is discarded rather than rendered).
      setItems([]);
      setReady(true);
      return;
    }
    setItems(read(storageKey));
    setReady(true);
  }, [storageKey, user]);

  // Sync across tabs/windows — only for this cart's own key, so another
  // account signing in elsewhere never bleeds into this one.
  useEffect(() => {
    if (!ready) return;
    const onChange = () => setItems(read(storageKey));
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) onChange();
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("cc_cart");
      channel.onmessage = onChange;
    } catch {
      /* BroadcastChannel unsupported */
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [storageKey, ready]);

  const commit = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      persist(storageKey, next);
      try {
        new BroadcastChannel("cc_cart").postMessage("sync");
      } catch {
        /* noop */
      }
    },
    [storageKey]
  );

  // After signing in, drop in whatever the user tried to add beforehand.
  useEffect(() => {
    if (!user || !ready) return;
    const pending = takePendingAdd();
    if (!pending) return;

    const current = read(storageKey);
    if (current.some((i) => i.id === pending.id)) {
      openCart();
      return;
    }
    const max = Math.max(
      1,
      Math.min(pending.maxQty || pending.stock || 10, MAX_QTY_PER_LINE)
    );
    current.push({
      id: pending.id,
      slug: pending.slug,
      name: pending.name,
      priceCents: pending.priceCents,
      emoji: pending.emoji,
      gradient: pending.gradient,
      image: pending.image,
      stock: pending.stock ?? max,
      maxQty: max,
      qty: 1,
    });
    commit(current);
    openCart();
  }, [user, ready, storageKey, commit]);

  const add = useCallback(
    (product: AddableProduct, qty = 1) => {
      const current = read(storageKey);
      const existing = current.find((i) => i.id === product.id);
      const max = Math.max(
        1,
        Math.min(product.maxQty || product.stock || 10, MAX_QTY_PER_LINE)
      );
      let nextQty: number;
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, max);
        nextQty = existing.qty;
      } else {
        nextQty = Math.min(qty, max);
        current.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          emoji: product.emoji,
          gradient: product.gradient,
          image: product.image,
          stock: product.stock ?? max,
          maxQty: max,
          qty: nextQty,
        });
      }
      commit(current);
      return nextQty;
    },
    [storageKey, commit]
  );

  const setQtyFn = useCallback(
    (id: string, qty: number) => {
      const current = read(storageKey);
      const item = current.find((i) => i.id === id);
      if (!item) return;
      if (qty <= 0) {
        commit(current.filter((i) => i.id !== id));
        return;
      }
      item.qty = Math.min(qty, Math.min(item.maxQty || 10, MAX_QTY_PER_LINE));
      commit(current);
    },
    [storageKey, commit]
  );

  const remove = useCallback(
    (id: string) => {
      commit(read(storageKey).filter((i) => i.id !== id));
    },
    [storageKey, commit]
  );

  const clear = useCallback(() => commit([]), [commit]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.priceCents * i.qty, 0);

  const value = useMemo(
    () => ({ items, ready, count, subtotal, add, setQty: setQtyFn, remove, clear }),
    [items, ready, count, subtotal, add, setQtyFn, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
