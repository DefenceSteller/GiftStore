import { api, esc, money } from '../api.js';
import { registerProducts, renderProductGrid, productCard, initReveal, stars } from '../store.js';
import { track, startHeartbeat } from '../track.js';

startHeartbeat();
track('pageview');
initReveal();

const categoryEmoji = {
  'Home & Cozy': '🛋️', 'Tech & Gadgets': '⚡', 'Personalized': '🪪', 'For Him': '🪒',
  'For Her': '💅', 'Self-Care': '🛁', 'Experiences': '🎈', 'Under Rs 25': '💸'
};

async function loadCategories() {
  const holder = document.getElementById('home-categories');
  try {
    const data = await api('/store/categories');
    holder.innerHTML = data.items.map((c) => `
      <a href="/shop?category=${encodeURIComponent(c.name)}" class="chip shrink-0 sm:shrink">
        <span>${categoryEmoji[c.name] || '🎁'}</span> ${esc(c.name)}
        <span class="text-ink/35">${c.count}</span>
      </a>`).join('');
  } catch (_) {
    holder.innerHTML = `<a href="/shop" class="chip">🎁 All gifts</a>`;
  }
}

function heroCard(product, style, rotate) {
  const [c1, c2] = String(product.gradient || '').split(',');
  return `
  <a href="/product/${encodeURIComponent(product.slug)}" class="absolute block w-[58%] overflow-hidden rounded-[26px] border-2 border-ink bg-white shadow-sticker transition hover:-translate-y-2 hover:shadow-lift"
     style="${style}; transform: rotate(${rotate}deg); --r:${rotate}deg">
    <div class="relative aspect-[4/3] overflow-hidden" style="background:linear-gradient(135deg, ${esc(c1)}, ${esc(c2 || c1)})">
      <img src="${esc(product.image)}" alt="${esc(product.name)}" class="h-full w-full object-cover" width="800" height="800" />
      <span class="absolute left-3 top-3 sticker bg-white">${product.discountPct > 0 ? `-${product.discountPct}%` : 'Hot 🔥'}</span>
    </div>
    <div class="flex items-center justify-between gap-2 p-3.5">
      <div class="min-w-0">
        <p class="truncate text-sm font-extrabold">${esc(product.name)}</p>
        <p class="text-xs font-bold text-ink/45">${money(product.priceCents)}</p>
      </div>
      ${stars(product.rating)}
    </div>
  </a>`;
}

async function loadHero() {
  const stage = document.getElementById('hero-stage');
  try {
    const data = await api('/store/products?limit=6&sort=featured&inStock=1');
    registerProducts(data.items);
    const picks = data.items.slice(0, 3);
    if (!picks.length) { stage.innerHTML = ''; return; }
    const layouts = [
      { style: 'left:0; top:6%; z-index:3', rotate: -5 },
      { style: 'right:0; top:30%; z-index:2', rotate: 6 },
      { style: 'left:8%; bottom:0; z-index:4', rotate: -2 }
    ];
    stage.innerHTML = `
      <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-iris/20 blur-3xl"></div>
      ${picks.map((p, i) => heroCard(p, layouts[i].style, layouts[i].rotate)).join('')}
      <span class="absolute right-2 top-4 z-10 sticker rotate-6 border-ink bg-coral text-white shadow-sticker-sm">New drop</span>
      <span class="absolute left-0 bottom-8 z-10 sticker -rotate-6 border-ink bg-acid shadow-sticker-sm">under Rs 50</span>`;
    stage.querySelectorAll('a').forEach((el, i) => {
      el.style.animation = `float ${6 + i}s ease-in-out ${i * 0.6}s infinite`;
    });
  } catch (_) {
    stage.innerHTML = '';
  }
}

async function loadTrending() {
  const grid = document.getElementById('trending-grid');
  try {
    const data = await api('/store/products?limit=8&sort=popular');
    registerProducts(data.items);
    renderProductGrid(grid, data.items);
  } catch (_) {
    grid.innerHTML = `<p class="col-span-full rounded-3xl border border-dashed border-ink/20 p-8 text-center font-bold text-ink/50">Could not load the drop — refresh to retry.</p>`;
  }
}

async function loadUnder25() {
  const row = document.getElementById('under25-row');
  try {
    const data = await api('/store/products?limit=4&sort=price-asc&max=2500');
    registerProducts(data.items);
    row.innerHTML = data.items.map((p) => `<div class="w-64 shrink-0 snap-start sm:w-auto">${productCard(p)}</div>`).join('');
    if (!data.items.length) row.innerHTML = '<p class="text-sm font-bold text-ink/50">Nothing under Rs 25 right now.</p>';
  } catch (_) {
    row.innerHTML = '';
  }
}

loadCategories();
loadHero();
loadTrending();
loadUnder25();

// Replay reveals once injected sections land
setTimeout(initReveal, 400);
