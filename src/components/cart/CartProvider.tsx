"use client";

/**
 * Client cart store — localStorage-backed, synced across tabs via the
 * `storage` event + BroadcastChannel, mirroring the original Express
 * storefront's cart.js semantics (cc_cart_v2 key, max 10 per line).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const KEY = "cc_cart_v2";
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

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
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
  // `ready` stays false until hydration on the client so server HTML matches.
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    setItems(read());
    setReady(true);
  }, []);

  // Sync across tabs/windows.
  useEffect(() => {
    const onChange = () => setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) onChange();
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
  }, []);

  const commit = useCallback((next: CartItem[]) => {
    setItems(next);
    persist(next);
    try {
      new BroadcastChannel("cc_cart").postMessage("sync");
    } catch {
      /* noop */
    }
  }, []);

  const add = useCallback(
    (product: AddableProduct, qty = 1) => {
      const current = read();
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
    [commit]
  );

  const setQtyFn = useCallback(
    (id: string, qty: number) => {
      const current = read();
      const item = current.find((i) => i.id === id);
      if (!item) return;
      if (qty <= 0) {
        commit(current.filter((i) => i.id !== id));
        return;
      }
      item.qty = Math.min(qty, Math.min(item.maxQty || 10, MAX_QTY_PER_LINE));
      commit(current);
    },
    [commit]
  );

  const remove = useCallback(
    (id: string) => {
      commit(read().filter((i) => i.id !== id));
    },
    [commit]
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
