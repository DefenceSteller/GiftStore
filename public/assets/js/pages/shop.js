import { api, debounce, esc, qs } from '../api.js';
import { registerProducts, initReveal } from '../store.js';
import { renderProductGrid, skeletonGrid } from '../store.js';
import { track, startHeartbeat } from '../track.js';

startHeartbeat();
track('pageview');

const state = {
  q: qs('q') || '',
  category: qs('category') || '',
  sort: qs('sort') || 'featured',
  max: qs('max') ? Number(qs('max')) : 13000,
  featured: qs('featured') === '1',
  inStock: qs('inStock') === '1',
  page: Number(qs('page') || 1)
};

const els = {
  grid: document.getElementById('product-grid'),
  empty: document.getElementById('empty-state'),
  count: document.getElementById('result-count'),
  summary: document.getElementById('active-summary'),
  pagination: document.getElementById('pagination'),
  search: document.getElementById('search-input'),
  sort: document.getElementById('sort-select'),
  cats: document.getElementById('category-filters'),
  price: document.getElementById('price-range'),
  priceLabel: document.getElementById('price-label'),
  inStock: document.getElementById('in-stock-only'),
  featured: document.getElementById('featured-only'),
  title: document.getElementById('shop-title')
};

function syncUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.sort !== 'featured') params.set('sort', state.sort);
  if (state.max < 13000) params.set('max', String(state.max));
  if (state.featured) params.set('featured', '1');
  if (state.inStock) params.set('inStock', '1');
  if (state.page > 1) params.set('page', String(state.page));
  history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`);
}

function applyState({ resetPage = true } = {}) {
  if (resetPage) state.page = 1;
  syncUrl();
  load();
}

function queryString() {
  const params = new URLSearchParams();
  params.set('limit', '12');
  params.set('page', String(state.page));
  params.set('sort', state.sort);
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.max < 13000) params.set('max', String(state.max));
  if (state.featured) params.set('featured', '1');
  if (state.inStock) params.set('inStock', '1');
  return params.toString();
}

let loading = false;
async function load() {
  if (loading) return;
  loading = true;
  skeletonGrid(els.grid, 6);
  els.empty.classList.add('hidden');
  try {
    const data = await api(`/store/products?${queryString()}`);
    registerProducts(data.items);
    renderProductGrid(els.grid, data.items);
    els.count.textContent = data.total;
    els.grid.classList.toggle('hidden', data.total === 0);
    els.empty.classList.toggle('hidden', data.total !== 0);

    const bits = [];
    if (state.q) bits.push(`“${state.q}”`);
    if (state.category) bits.push(state.category);
    if (state.max < 13000) bits.push(`under $${(state.max / 100).toFixed(0)}`);
    if (state.featured) bits.push('bestsellers');
    if (state.inStock) bits.push('in stock');
    els.summary.textContent = bits.length ? `Filtering: ${bits.join(' · ')}` : 'Showing everything';
    els.title.textContent = state.category || (state.q ? `“${state.q}”` : 'All gifts');

    renderPagination(data.page, data.pages);
    initReveal(els.grid);
  } catch (err) {
    els.grid.innerHTML = `<p class="col-span-full rounded-3xl border-2 border-dashed border-ink/15 p-10 text-center font-bold text-ink/55">${esc(err.message)}</p>`;
  } finally {
    loading = false;
  }
}

function renderPagination(page, pages) {
  if (pages <= 1) { els.pagination.innerHTML = ''; return; }
  const button = (label, target, disabled = false, active = false) => `
    <button data-page="${target}" ${disabled ? 'disabled' : ''}
      class="grid h-10 min-w-10 place-items-center rounded-full border-2 px-3 text-sm font-extrabold transition
      ${active ? 'border-ink bg-ink text-white shadow-sticker-sm' : 'border-ink/10 bg-white hover:border-ink'}
      disabled:cursor-not-allowed disabled:opacity-35">${label}</button>`;
  let html = button('←', page - 1, page === 1);
  const windowed = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) windowed.push(i);
    else if (windowed[windowed.length - 1] !== '…') windowed.push('…');
  }
  html += windowed.map((i) => (i === '…' ? '<span class="px-1 text-ink/40">…</span>' : button(i, i, false, i === page))).join('');
  html += button('→', page + 1, page === pages);
  els.pagination.innerHTML = html;
}

els.pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-page]');
  if (!btn || btn.disabled) return;
  state.page = Number(btn.dataset.page);
  syncUrl();
  load();
  window.scrollTo({ top: 180, behavior: 'smooth' });
});

async function loadCategories() {
  try {
    const data = await api('/store/categories');
    const all = [{ name: '', count: data.items.reduce((n, c) => n + c.count, 0) }, ...data.items];
    els.cats.innerHTML = all.map((c) => `
      <button data-cat="${esc(c.name)}" class="chip ${state.category === c.name ? 'chip-active' : ''}">
        ${c.name ? esc(c.name) : 'All'} <span class="${state.category === c.name ? 'text-white/50' : 'text-ink/35'}">${c.count}</span>
      </button>`).join('');
    const priceMax = data.priceRange.max || 13000;
    if (els.price.max !== String(priceMax)) {
      els.price.max = String(Math.max(priceMax, 1000));
      els.price.value = String(state.max);
    }
  } catch (_) { /* filters are optional */ }
}

els.cats.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  state.category = btn.dataset.cat;
  els.cats.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('chip-active', b === btn));
  applyState();
});

els.search.value = state.q;
els.search.addEventListener('input', debounce(() => {
  state.q = els.search.value.trim().slice(0, 60);
  applyState();
}, 320));

els.sort.value = state.sort;
els.sort.addEventListener('change', () => { state.sort = els.sort.value; applyState(); });

els.price.value = String(state.max);
els.priceLabel.textContent = state.max >= 13000 ? 'Any price' : `Up to $${(state.max / 100).toFixed(0)}`;
els.price.addEventListener('input', () => {
  els.priceLabel.textContent = Number(els.price.value) >= 13000 ? 'Any price' : `Up to $${(Number(els.price.value) / 100).toFixed(0)}`;
});
els.price.addEventListener('change', () => { state.max = Number(els.price.value); applyState(); });

els.inStock.checked = state.inStock;
els.inStock.addEventListener('change', () => { state.inStock = els.inStock.checked; applyState(); });
els.featured.checked = state.featured;
els.featured.addEventListener('change', () => { state.featured = els.featured.checked; applyState(); });

function clearAll() {
  Object.assign(state, { q: '', category: '', sort: 'featured', max: 13000, featured: false, inStock: false, page: 1 });
  els.search.value = '';
  els.sort.value = 'featured';
  els.price.value = '13000';
  els.priceLabel.textContent = 'Any price';
  els.inStock.checked = false;
  els.featured.checked = false;
  loadCategories();
  applyState();
}
document.getElementById('clear-filters').addEventListener('click', clearAll);
document.getElementById('empty-clear').addEventListener('click', clearAll);

loadCategories().then(load);
