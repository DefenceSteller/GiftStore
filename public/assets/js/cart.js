/** Cart store — localStorage backed, synced across tabs, announced via events. */
const KEY = 'cc_cart_v2';
const MAX_QTY_PER_LINE = 10;

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (_) { /* storage full/blocked */ }
  window.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  try { BroadcastChannel && new BroadcastChannel('cc_cart').postMessage('sync'); } catch (_) { /* noop */ }
}

export function getCart() { return read().filter((i) => i && i.id && i.qty > 0); }
export const cartCount = () => getCart().reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = () => getCart().reduce((n, i) => n + i.priceCents * i.qty, 0);
export const findItem = (id) => getCart().find((i) => i.id === id) || null;

export function addToCart(product, qty = 1) {
  const items = getCart();
  const existing = items.find((i) => i.id === product.id);
  const max = Math.max(1, Math.min(product.maxQty || product.stock || 10, MAX_QTY_PER_LINE));
  if (existing) existing.qty = Math.min(existing.qty + qty, max);
  else items.push({
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    emoji: product.emoji,
    gradient: product.gradient,
    image: product.image,
    stock: product.stock || max,
    maxQty: max,
    qty: Math.min(qty, max)
  });
  write(items);
  return existing ? existing.qty : Math.min(qty, max);
}

export function setQty(id, qty) {
  const items = getCart();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  if (qty <= 0) return removeFromCart(id);
  item.qty = Math.min(qty, Math.min(item.maxQty || 10, MAX_QTY_PER_LINE));
  write(items);
}

export function removeFromCart(id) {
  write(getCart().filter((i) => i.id !== id));
}

export function clearCart() { write([]); }

/** Server-priced checkout payload: only ids + quantities ever leave the client. */
export function checkoutPayload() {
  return getCart().map((i) => ({ productId: i.id, qty: i.qty }));
}

export function clientToken() {
  let token = sessionStorage.getItem('cc_checkout_token');
  if (!token) {
    token = `tk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('cc_checkout_token', token);
  }
  return token;
}
export function rotateClientToken() { sessionStorage.removeItem('cc_checkout_token'); }

try {
  const channel = new BroadcastChannel('cc_cart');
  channel.onmessage = () => window.dispatchEvent(new CustomEvent('cart:change', { detail: read() }));
} catch (_) { /* BroadcastChannel unsupported — tabs still work independently */ }

window.addEventListener('storage', (e) => {
  if (e.key === KEY) window.dispatchEvent(new CustomEvent('cart:change', { detail: read() }));
});
