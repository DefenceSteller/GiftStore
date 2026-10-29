/**
 * Shared storefront shell: announcement bar, sticky header, mobile menu, footer,
 * slide-over cart drawer, toasts, product cards, scroll reveals.
 * Included as a module by every storefront page.
 */
import { api, money, esc } from './api.js';
import { getCart, setQty, removeFromCart, addToCart } from './cart.js';

/* -------------------------------- config --------------------------------- */
let STORE_CONFIG = {
  free_shipping_threshold_cents: 5000,
  standard_shipping_cents: 599,
  express_shipping_cents: 1299,
  store_name: 'Confetti Club',
  announcement: 'FREE SHIPPING OVER Rs 50  ✦  NEW DROPS EVERY FRIDAY  ✦  30-DAY EASY RETURNS',
  currency: 'USD',
  delivery_days_standard: '5-7',
  delivery_days_express: '2-3'
};

export const config = () => STORE_CONFIG;

/* -------------------------------- helpers -------------------------------- */
const ANNOUNCEMENT = (text) => {
  const items = String(text || '').split('✦').map((s) => s.trim()).filter(Boolean);
  const chunk = (items.length ? items : ['Free shipping over Rs 50'])
    .map((t) => `<span class="mx-6 inline-flex items-center gap-3">${esc(t)} <span class="text-butter">✦</span></span>`)
    .join('');
  return `
  <div class="overflow-hidden bg-ink py-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-white sm:text-[12px]">
    <div class="flex w-max animate-marquee">
      <div class="flex shrink-0">${chunk}${chunk}</div>
      <div class="flex shrink-0" aria-hidden="true">${chunk}${chunk}</div>
    </div>
  </div>`;
};

const NAV_LINKS = [
  { href: '/shop', label: 'Shop all' },
  { href: '/shop?category=Personalized', label: 'Personalized' },
  { href: '/shop?featured=1', label: 'Bestsellers' },
  { href: '/track', label: 'Track order' }
];

function headerHtml() {
  const links = NAV_LINKS.map((l) =>
    `<a href="${l.href}" class="rounded-full px-4 py-2 font-bold text-ink/75 transition hover:bg-ink/5 hover:text-ink">${l.label}</a>`
  ).join('');
  return `
  <div id="cc-announcement">${ANNOUNCEMENT(STORE_CONFIG.announcement)}</div>
  <header class="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
    <div class="mx-auto max-w-[1240px] rounded-[22px] border border-ink/10 bg-white/85 shadow-soft backdrop-blur-xl">
      <div class="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
        <a href="/" class="flex items-center gap-2.5" aria-label="Confetti Club home">
          <span class="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-acid text-base shadow-sticker-sm">🎁</span>
          <span class="font-display text-lg font-extrabold tracking-tight">Confetti<span class="text-iris">Club</span></span>
        </a>
        <nav class="hidden items-center text-sm md:flex">${links}
          <button data-random class="ml-1 rounded-full bg-iris/10 px-4 py-2 font-bold text-iris transition hover:bg-iris hover:text-white" title="Show me something good">🎲 Surprise me</button>
        </nav>
        <div class="flex items-center gap-2">
          <a href="/shop" class="btn-outline btn-sm hidden sm:inline-flex" aria-label="Search gifts">🔎 <span class="hidden lg:inline">Search</span></a>
          <button data-cart-open class="btn-primary btn-sm relative" aria-label="Open bag">
            🛍️ <span class="hidden sm:inline">Bag</span>
            <span id="cc-cart-count" class="grid h-5 min-w-[20px] place-items-center rounded-full bg-acid px-1 text-[11px] font-black text-ink transition-transform">0</span>
          </button>
          <button data-menu-toggle class="grid h-10 w-10 place-items-center rounded-full border-2 border-ink/10 text-lg md:hidden" aria-label="Menu">☰</button>
        </div>
      </div>
      <div id="cc-mobile-menu" class="hidden border-t border-ink/8 px-4 py-3 md:hidden">
        <nav class="grid gap-1 text-sm font-bold">
          ${NAV_LINKS.map((l) => `<a href="${l.href}" class="rounded-xl px-3 py-2.5 hover:bg-ink/5">${l.label}</a>`).join('')}
          <button data-random class="rounded-xl px-3 py-2.5 text-left hover:bg-ink/5">🎲 Surprise me</button>
        </nav>
      </div>
    </div>
  </header>`;
}

function footerHtml() {
  const year = new Date().getFullYear();
  return `
  <footer class="mt-16 bg-ink text-white sm:mt-24">
    <div class="container-cc py-14 sm:py-16">
      <div class="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-xl border-2 border-white/20 bg-acid text-base text-ink">🎁</span>
            <span class="font-display text-lg font-extrabold">Confetti<span class="text-acid">Club</span></span>
          </div>
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            The gift shop for people who scroll fast and care harder. Curated drops, personalization, and packaging that looks good on camera.
          </p>
          <div class="mt-5 flex gap-2 text-lg">
            <a href="/" class="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-acid hover:text-acid" aria-label="Instagram">📸</a>
            <a href="/" class="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-acid hover:text-acid" aria-label="TikTok">🎵</a>
            <a href="/" class="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-acid hover:text-acid" aria-label="YouTube">▶️</a>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">Shop</h4>
          <ul class="mt-4 space-y-2.5 text-sm font-semibold text-white/70">
            <li><a class="transition hover:text-acid" href="/shop">All gifts</a></li>
            <li><a class="transition hover:text-acid" href="/shop?featured=1">Bestsellers</a></li>
            <li><a class="transition hover:text-acid" href="/shop?max=2500">Under Rs 25</a></li>
            <li><a class="transition hover:text-acid" href="/shop?category=Personalized">Personalized</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">Help</h4>
          <ul class="mt-4 space-y-2.5 text-sm font-semibold text-white/70">
            <li><a class="transition hover:text-acid" href="/track">Track my order</a></li>
            <li><a class="transition hover:text-acid" href="/track">Shipping & returns</a></li>
            <li><a class="transition hover:text-acid" href="/shop">Gift cards</a></li>
            <li><a class="transition hover:text-acid" href="mailto:hey@confetticlub.shop">Contact us</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">Get the drops first</h4>
          <form data-newsletter class="mt-4 flex gap-2">
            <input type="email" required placeholder="you@email.com" class="min-w-0 flex-1 rounded-full border-2 border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:border-acid focus:outline-none" />
            <button class="btn-lime btn-sm px-4" aria-label="Subscribe">→</button>
          </form>
          <p class="mt-3 text-xs text-white/40">No spam, just the good stuff. Unsubscribe anytime.</p>
        </div>
      </div>
      <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row">
        <p>© ${year} Confetti Club — gifts that hit different.</p>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <span class="rounded-md border border-white/15 px-2.5 py-1 font-bold tracking-wide">VISA</span>
          <span class="rounded-md border border-white/15 px-2.5 py-1 font-bold tracking-wide">MASTERCARD</span>
          <span class="rounded-md border border-white/15 px-2.5 py-1 font-bold tracking-wide">AMEX</span>
          <span class="rounded-md border border-white/15 px-2.5 py-1 font-bold tracking-wide">APPLE PAY</span>
        </div>
      </div>
    </div>
  </footer>`;
}

function drawerHtml() {
  return `
  <div id="cc-drawer" class="fixed inset-0 z-[70] hidden" aria-hidden="true">
    <div class="absolute inset-0 bg-ink/50 opacity-0 backdrop-blur-sm transition-opacity duration-300" data-cart-close></div>
    <aside id="cc-drawer-panel" class="absolute right-0 top-0 flex h-full w-full max-w-[430px] translate-x-full flex-col bg-paper shadow-lift transition-transform duration-300 ease-[cubic-bezier(.2,.8,.3,1)]">
      <div class="flex items-center justify-between border-b border-ink/8 px-5 py-4">
        <h2 class="font-display text-xl font-extrabold">Your bag <span id="cc-drawer-count" class="text-ink/40"></span></h2>
        <button data-cart-close class="grid h-10 w-10 place-items-center rounded-full border-2 border-ink/10 text-lg transition hover:border-ink" aria-label="Close bag">✕</button>
      </div>
      <div class="border-b border-ink/8 bg-white px-5 py-4">
        <div class="flex items-center justify-between text-[13px] font-bold">
          <span id="cc-ship-label" class="text-ink/60">Add items for free shipping</span>
          <span id="cc-ship-amount" class="text-ink"></span>
        </div>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div id="cc-ship-bar" class="h-full w-0 rounded-full bg-gradient-to-r from-iris to-acid transition-all duration-500"></div>
        </div>
      </div>
      <div id="cc-drawer-items" class="flex-1 overflow-y-auto px-5 py-4"></div>
      <div class="border-t border-ink/8 bg-white px-5 py-5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-ink/60">Subtotal</span>
          <span id="cc-drawer-subtotal" class="font-display text-2xl font-extrabold">Rs 0.00</span>
        </div>
        <p class="mt-1 text-xs font-semibold text-ink/45">Shipping & tax calculated at checkout.</p>
        <a href="/checkout" class="btn-primary mt-4 w-full">Checkout →</a>
        <button data-cart-close class="btn-ghost mt-1 w-full">Keep browsing</button>
      </div>
    </aside>
  </div>`;
}

/* ------------------------------ toasts ----------------------------------- */
let toastRoot;
export function toast(message, emoji = '✨') {
  if (!toastRoot) {
    toastRoot = document.createElement('div');
    toastRoot.className = 'pointer-events-none fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2';
    document.body.appendChild(toastRoot);
  }
  const el = document.createElement('div');
  el.className = 'pointer-events-auto flex items-center gap-2.5 rounded-full border-2 border-ink bg-white px-5 py-3 text-sm font-extrabold shadow-sticker animate-slide-up';
  el.innerHTML = `<span>${emoji}</span><span></span>`;
  el.lastElementChild.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all .3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(() => el.remove(), 320);
  }, 2400);
}

/* --------------------------- product registry ---------------------------- */
const REGISTRY = new Map();
export function registerProducts(list) {
  (list || []).forEach((p) => REGISTRY.set(p.id, { ...p, maxQty: p.maxQty || p.stock || 10 }));
  return list;
}

export function stars(rating, reviewCount) {
  const value = Number(rating || 0).toFixed(1);
  return `<span class="inline-flex items-center gap-1 rounded-full bg-butter/25 px-2 py-0.5 text-[11px] font-black text-ink/80">★ ${value}${reviewCount ? ` <span class="font-bold text-ink/45">(${esc(reviewCount)})</span>` : ''}</span>`;
}

export function productCard(p) {
  const disabled = !p.inStock;
  const badges = [
    p.discountPct > 0 ? `<span class="sticker bg-coral text-white">-${p.discountPct}%</span>` : '',
    p.featured && p.discountPct <= 0 ? `<span class="sticker bg-acid">Bestseller</span>` : '',
    !p.inStock ? `<span class="sticker bg-ink text-white">Sold out</span>` : ''
  ].filter(Boolean).join('');
  return `
  <article class="group relative flex flex-col overflow-hidden rounded-[28px] border border-ink/8 bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-ink/20 hover:shadow-lift">
    <a href="/product/${encodeURIComponent(p.slug)}" class="relative block aspect-[4/3] overflow-hidden" style="background:linear-gradient(135deg, ${esc((p.gradient || '').split(',')[0])}, ${esc((p.gradient || '').split(',')[1] || '#000')})">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="800" height="800" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div class="absolute left-3 top-3 flex flex-wrap gap-1.5">${badges}</div>
    </a>
    <div class="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">${esc(p.category)}</p>
        ${stars(p.rating, p.reviewCount)}
      </div>
      <h3 class="font-display text-[17px] font-bold leading-snug">
        <a href="/product/${encodeURIComponent(p.slug)}" class="transition group-hover:text-iris">${esc(p.name)}</a>
      </h3>
      <p class="line-clamp-1 text-[13px] font-medium text-ink/50">${esc(p.tagline || '')}</p>
      <div class="mt-auto flex items-end justify-between gap-3 pt-3">
        <div>
          <span class="font-display text-xl font-extrabold">${money(p.priceCents)}</span>
          ${p.compareAtCents ? `<s class="ml-1.5 text-[13px] font-bold text-ink/35">${money(p.compareAtCents)}</s>` : ''}
        </div>
        ${disabled
          ? `<span class="btn-outline btn-sm cursor-not-allowed opacity-60">Sold out</span>`
          : `<button data-add="${p.id}" class="btn-lime btn-sm">＋ Add</button>`}
      </div>
    </div>
  </article>`;
}

export function renderProductGrid(container, items) {
  container.innerHTML = items.map(productCard).join('');
}

export function skeletonGrid(container, count = 8) {
  container.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton aspect-[3/4] w-full"></div>`).join('');
}

/* ------------------------------- reveals --------------------------------- */
export function initReveal(scope = document) {
  const targets = scope.querySelectorAll('.reveal:not(.is-in)');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = Number(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('is-in'), delay);
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
}

/* ------------------------------- drawer ---------------------------------- */
const drawer = { root: null, panel: null, backdrop: null };

function renderDrawer() {
  const items = getCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.priceCents * i.qty, 0);

  const countEl = document.getElementById('cc-cart-count');
  if (countEl) {
    countEl.textContent = count > 99 ? '99+' : String(count);
    countEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320 });
  }
  const drawerCount = document.getElementById('cc-drawer-count');
  if (drawerCount) drawerCount.textContent = count ? `(${count})` : '';
  const subtotalEl = document.getElementById('cc-drawer-subtotal');
  if (subtotalEl) subtotalEl.textContent = money(subtotal);

  const threshold = STORE_CONFIG.free_shipping_threshold_cents;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  const bar = document.getElementById('cc-ship-bar');
  if (bar) bar.style.width = `${pct}%`;
  const label = document.getElementById('cc-ship-label');
  const amount = document.getElementById('cc-ship-amount');
  if (label) {
    label.textContent = remaining > 0
      ? `${money(remaining)} away from free shipping 🚚`
      : 'You unlocked free shipping 🎉';
  }
  if (amount) amount.textContent = `${pct}%`;

  const list = document.getElementById('cc-drawer-items');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = `
      <div class="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
        <span class="text-5xl">🛒</span>
        <p class="font-display text-lg font-extrabold">Your bag is empty</p>
        <p class="max-w-[240px] text-sm font-medium text-ink/50">Fix that. Future you (and whoever gets the gift) will say thanks.</p>
        <a href="/shop" data-cart-close class="btn-lime btn-sm mt-1">Shop the drop</a>
      </div>`;
    return;
  }
  list.innerHTML = items.map((item) => `
    <div class="mb-3 flex gap-3 rounded-3xl border border-ink/8 bg-white p-3 shadow-soft">
      <a href="/product/${encodeURIComponent(item.slug || '')}" data-cart-close class="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl" style="background:linear-gradient(135deg, ${esc((item.gradient || '').split(',')[0])}, ${esc((item.gradient || '').split(',')[1] || '#000')})">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" class="h-full w-full object-cover" loading="lazy" />
      </a>
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-start justify-between gap-2">
          <p class="truncate text-sm font-extrabold">${esc(item.name)}</p>
          <button data-remove="${item.id}" class="text-ink/35 transition hover:text-coral" aria-label="Remove ${esc(item.name)}">✕</button>
        </div>
        <p class="text-xs font-bold text-ink/45">${money(item.priceCents)}</p>
        <div class="mt-auto flex items-center justify-between pt-1.5">
          <div class="flex items-center gap-1 rounded-full border-2 border-ink/10 p-0.5">
            <button data-dec="${item.id}" class="grid h-7 w-7 place-items-center rounded-full text-sm font-black transition hover:bg-ink/5" aria-label="Decrease">−</button>
            <span class="w-6 text-center text-sm font-black tabular">${item.qty}</span>
            <button data-inc="${item.id}" class="grid h-7 w-7 place-items-center rounded-full text-sm font-black transition hover:bg-ink/5" aria-label="Increase">＋</button>
          </div>
          <span class="text-sm font-extrabold">${money(item.priceCents * item.qty)}</span>
        </div>
      </div>
    </div>`).join('');
}

function openDrawer() {
  if (!drawer.root) return;
  drawer.root.classList.remove('hidden');
  drawer.root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    drawer.backdrop.classList.remove('opacity-0');
    drawer.panel.classList.remove('translate-x-full');
  });
}

function closeDrawer() {
  if (!drawer.root) return;
  drawer.root.setAttribute('aria-hidden', 'true');
  drawer.backdrop.classList.add('opacity-0');
  drawer.panel.classList.add('translate-x-full');
  document.body.style.overflow = '';
  setTimeout(() => drawer.root.classList.add('hidden'), 300);
}

/* ---------------------------- shell mounting ------------------------------ */
function mountShell() {
  document.body.insertAdjacentHTML('afterbegin', headerHtml());
  document.body.insertAdjacentHTML('beforeend', footerHtml() + drawerHtml());
  drawer.root = document.getElementById('cc-drawer');
  drawer.panel = document.getElementById('cc-drawer-panel');
  drawer.backdrop = drawer.root.firstElementChild;

  document.addEventListener('click', (event) => {
    const openBtn = event.target.closest('[data-cart-open]');
    if (openBtn) { event.preventDefault(); renderDrawer(); openDrawer(); return; }

    if (event.target.closest('[data-cart-close]')) { closeDrawer(); return; }

    const menuBtn = event.target.closest('[data-menu-toggle]');
    if (menuBtn) {
      const menu = document.getElementById('cc-mobile-menu');
      if (menu) menu.classList.toggle('hidden');
      return;
    }

    const addBtn = event.target.closest('[data-add]');
    if (addBtn && !addBtn.disabled) {
      event.preventDefault();
      const product = REGISTRY.get(Number(addBtn.dataset.add));
      if (!product) return;
      const qty = Number(addBtn.dataset.qty || 1);
      addToCart(product, qty);
      toast(`${product.name} added to bag`, '🛍️');
      addBtn.classList.add('scale-95');
      setTimeout(() => addBtn.classList.remove('scale-95'), 160);
      return;
    }

    const inc = event.target.closest('[data-inc]');
    if (inc) { setQty(Number(inc.dataset.inc), (findQty(Number(inc.dataset.inc)) || 0) + 1); return; }
    const dec = event.target.closest('[data-dec]');
    if (dec) { setQty(Number(dec.dataset.dec), (findQty(Number(dec.dataset.dec)) || 0) - 1); return; }
    const remove = event.target.closest('[data-remove]');
    if (remove) { removeFromCart(Number(remove.dataset.remove)); toast('Removed from bag', '🗑️'); return; }

    if (event.target.closest('[data-random]')) { randomProduct(); return; }

    const newsletter = event.target.closest('[data-newsletter] button');
    if (newsletter) {
      event.preventDefault();
      const form = newsletter.closest('form');
      if (form && form.checkValidity()) {
        toast("You're on the list 🎉", '💌');
        form.reset();
      } else if (form) form.reportValidity();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  window.addEventListener('cart:change', renderDrawer);
  renderDrawer();
}

function findQty(id) {
  const item = getCart().find((i) => i.id === id);
  return item ? item.qty : 0;
}

async function randomProduct() {
  try {
    const data = await api('/store/products?limit=48&sort=popular&inStock=1');
    if (!data.items.length) return;
    const pick = data.items[Math.floor(Math.random() * data.items.length)];
    location.href = `/product/${encodeURIComponent(pick.slug)}`;
  } catch (_) {
    location.href = '/shop';
  }
}

async function loadConfig() {
  try {
    STORE_CONFIG = { ...STORE_CONFIG, ...(await api('/store/config')) };
    const holder = document.getElementById('cc-announcement');
    if (holder) holder.innerHTML = ANNOUNCEMENT(STORE_CONFIG.announcement);
  } catch (_) { /* keep defaults */ }
  renderDrawer();
}

mountShell();
loadConfig();

export { openDrawer, closeDrawer, mountShell };
