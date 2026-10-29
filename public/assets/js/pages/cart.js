import { api, esc, money } from '../api.js';
import { getCart, cartCount, cartSubtotal, setQty, removeFromCart, clearCart } from '../cart.js';
import { config, toast, initReveal } from '../store.js';
import { track, startHeartbeat } from '../track.js';

startHeartbeat();
track('pageview');

const els = {
  empty: document.getElementById('cart-empty'),
  layout: document.getElementById('cart-layout'),
  items: document.getElementById('cart-items'),
  count: document.getElementById('bag-count'),
  subtotal: document.getElementById('sum-subtotal'),
  discountRow: document.getElementById('sum-discount-row'),
  discount: document.getElementById('sum-discount'),
  promoCode: document.getElementById('sum-promo-code'),
  shipping: document.getElementById('sum-shipping'),
  total: document.getElementById('sum-total'),
  promoForm: document.getElementById('promo-form'),
  promoInput: document.getElementById('promo-input'),
  promoMessage: document.getElementById('promo-message'),
  bar: document.getElementById('ship-progress-bar'),
  barLabel: document.getElementById('ship-progress-label'),
  barPct: document.getElementById('ship-progress-pct')
};

let promo = null;

function savedPromo() {
  try { return JSON.parse(sessionStorage.getItem('cc_promo')); } catch (_) { return null; }
}
function persistPromo(value) {
  if (value) sessionStorage.setItem('cc_promo', JSON.stringify(value));
  else sessionStorage.removeItem('cc_promo');
}
promo = savedPromo();

function discountFor(subtotal) {
  if (!promo) return 0;
  if (promo.type === 'percent') return Math.round((subtotal * promo.value) / 100);
  if (promo.type === 'fixed') return Math.min(promo.value, subtotal);
  return 0;
}

function render() {
  const items = getCart();
  const count = cartCount();
  const subtotal = cartSubtotal();
  const discount = discountFor(subtotal);
  const afterDiscount = Math.max(0, subtotal - discount);
  const cfg = config();
  const freeShip = promo && promo.type === 'free_shipping';
  const shipping = freeShip ? 0 : (afterDiscount >= cfg.free_shipping_threshold_cents ? 0 : cfg.standard_shipping_cents);

  els.count.textContent = `${count} item${count === 1 ? '' : 's'}`;
  const isEmpty = items.length === 0;
  els.empty.classList.toggle('hidden', !isEmpty);
  els.layout.classList.toggle('hidden', isEmpty);
  if (isEmpty) {
    persistPromo(null);
    return;
  }

  els.items.innerHTML = items.map((item) => `
    <article class="flex gap-4 rounded-[26px] border border-ink/8 bg-white p-4 shadow-soft sm:gap-5 sm:p-5">
      <a href="/product/${encodeURIComponent(item.slug || '')}" class="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-ink/10 sm:h-32 sm:w-32"
         style="background:linear-gradient(135deg, ${esc((item.gradient || '').split(',')[0])}, ${esc((item.gradient || '').split(',')[1] || '#000')})">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" class="h-full w-full object-cover" loading="lazy" />
      </a>
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">Gift</p>
            <h2 class="truncate font-display text-lg font-extrabold sm:text-xl">
              <a href="/product/${encodeURIComponent(item.slug || '')}" class="transition hover:text-iris">${esc(item.name)}</a>
            </h2>
            <p class="mt-0.5 text-sm font-bold text-ink/50">${money(item.priceCents)} each</p>
          </div>
          <button data-remove-item="${item.id}" class="text-ink/35 transition hover:text-coral" aria-label="Remove">✕</button>
        </div>
        <div class="mt-auto flex items-center justify-between gap-3 pt-3">
          <div class="flex items-center gap-1 rounded-full border-2 border-ink/10 p-1">
            <button data-cart-dec="${item.id}" class="grid h-8 w-8 place-items-center rounded-full font-black transition hover:bg-ink/5" aria-label="Decrease">−</button>
            <span class="w-7 text-center font-extrabold tabular">${item.qty}</span>
            <button data-cart-inc="${item.id}" class="grid h-8 w-8 place-items-center rounded-full font-black transition hover:bg-ink/5" aria-label="Increase">＋</button>
          </div>
          <span class="font-display text-xl font-extrabold tabular">${money(item.priceCents * item.qty)}</span>
        </div>
      </div>
    </article>`).join('');

  els.subtotal.textContent = money(subtotal);
  const hasDiscount = discount > 0 || (promo && promo.type === 'free_shipping');
  els.discountRow.classList.toggle('hidden', !hasDiscount);
  els.discount.textContent = `-${money(discount)}`;
  els.promoCode.textContent = promo ? promo.code : '';
  els.shipping.textContent = shipping === 0 ? (freeShip ? 'FREE (code)' : 'FREE') : money(shipping);
  els.total.textContent = money(afterDiscount + shipping);

  const pct = Math.min(100, Math.round((afterDiscount / cfg.free_shipping_threshold_cents) * 100));
  els.bar.style.width = `${pct}%`;
  els.barPct.textContent = `${pct}%`;
  const remaining = Math.max(0, cfg.free_shipping_threshold_cents - afterDiscount);
  els.barLabel.textContent = remaining > 0 ? `${money(remaining)} to free shipping` : 'Free shipping unlocked 🎉';
}

els.items.addEventListener('click', (e) => {
  const inc = e.target.closest('[data-cart-inc]');
  const dec = e.target.closest('[data-cart-dec]');
  const remove = e.target.closest('[data-remove-item]');
  if (inc) setQty(Number(inc.dataset.cartInc), (getCart().find((i) => i.id === Number(inc.dataset.cartInc))?.qty || 0) + 1);
  if (dec) setQty(Number(dec.dataset.cartDec), (getCart().find((i) => i.id === Number(dec.dataset.cartDec))?.qty || 0) - 1);
  if (remove) { removeFromCart(Number(remove.dataset.removeItem)); toast('Removed from bag', '🗑️'); }
});

els.promoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = els.promoInput.value.trim().toUpperCase();
  if (!code) return;
  els.promoMessage.className = 'mt-2 text-xs font-extrabold text-ink/50';
  els.promoMessage.textContent = 'Checking…';
  els.promoMessage.classList.remove('hidden');
  try {
    const data = await api(`/store/promo/${encodeURIComponent(code)}`);
    promo = data;
    persistPromo(data);
    els.promoMessage.textContent = `✓ ${data.description || `${code} applied`}`;
    els.promoMessage.className = 'mt-2 text-xs font-extrabold text-iris';
    toast('Promo applied', '🏷️');
    render();
  } catch (err) {
    promo = null;
    persistPromo(null);
    els.promoMessage.textContent = err.message;
    els.promoMessage.className = 'mt-2 text-xs font-extrabold text-coral';
    render();
  }
});

// keep the applied code visible if the shopper returns
if (promo) els.promoInput.value = promo.code;

window.addEventListener('cart:change', render);
render();
initReveal();
void clearCart;
