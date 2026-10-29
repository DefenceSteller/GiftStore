import { api, esc, money, qs } from '../api.js';
import { addToCart, findItem } from '../cart.js';
import { registerProducts, renderProductGrid, stars, toast, config } from '../store.js';
import { track, startHeartbeat } from '../track.js';

startHeartbeat();
track('pageview');

const slug = decodeURIComponent(location.pathname.split('/').pop() || '');
const els = {
  loading: document.getElementById('product-loading'),
  notFound: document.getElementById('product-not-found'),
  view: document.getElementById('product-view'),
  crumb: document.getElementById('breadcrumb'),
  image: document.getElementById('p-image'),
  imageWrap: document.getElementById('p-image-wrap'),
  badges: document.getElementById('p-badges'),
  category: document.getElementById('p-category'),
  name: document.getElementById('p-name'),
  rating: document.getElementById('p-rating'),
  price: document.getElementById('p-price'),
  tagline: document.getElementById('p-tagline'),
  stockNote: document.getElementById('p-stock-note'),
  description: document.getElementById('p-description'),
  qtyValue: document.getElementById('qty-value'),
  qtyMinus: document.getElementById('qty-minus'),
  qtyPlus: document.getElementById('qty-plus'),
  addBtn: document.getElementById('add-btn'),
  buyBtn: document.getElementById('buy-btn'),
  maxNote: document.getElementById('p-max-note'),
  shipNote: document.getElementById('p-ship-note'),
  related: document.getElementById('related-grid'),
  title: document.title
};

let product = null;
let qty = 1;

function setQty(next) {
  if (!product) return;
  const max = product.maxQty || 10;
  qty = Math.max(1, Math.min(next, max));
  els.qtyValue.textContent = qty;
  els.qtyMinus.disabled = qty <= 1;
  els.qtyPlus.disabled = qty >= max;
}

function render() {
  const p = product;
  const [c1, c2] = String(p.gradient || '').split(',');
  els.imageWrap.style.background = `linear-gradient(135deg, ${c1 || '#7C5CFF'}, ${c2 || c1 || '#000'})`;
  els.image.src = p.image;
  els.image.alt = p.name;
  els.category.textContent = p.category;
  els.name.textContent = p.name;
  document.title = `${p.name} — Confetti Club`;
  els.rating.innerHTML = `${stars(p.rating, p.reviewCount)} <span class="text-xs font-bold text-ink/45">${p.reviewCount} reviews</span>`;
  els.price.innerHTML = `
    <span class="font-display text-4xl font-extrabold">${money(p.priceCents)}</span>
    ${p.compareAtCents ? `<s class="text-lg font-bold text-ink/35">${money(p.compareAtCents)}</s>` : ''}
    ${p.discountPct > 0 ? `<span class="sticker bg-coral text-white">Save ${p.discountPct}%</span>` : ''}`;
  els.tagline.textContent = p.tagline || '';
  els.description.textContent = p.description || '';

  const badges = [];
  if (p.featured) badges.push('<span class="sticker bg-acid shadow-sticker-sm">Bestseller</span>');
  if (p.discountPct > 0) badges.push(`<span class="sticker bg-coral text-white shadow-sticker-sm">-${p.discountPct}%</span>`);
  if (!p.inStock) badges.push('<span class="sticker bg-ink text-white shadow-sticker-sm">Sold out</span>');
  els.badges.innerHTML = badges.join('');

  if (p.inStock && p.stock <= 8 && p.stock > 0) {
    els.stockNote.classList.remove('hidden');
    els.stockNote.textContent = `Only ${p.stock} left — people are adding this to the bag right now 👀`;
  } else {
    els.stockNote.classList.add('hidden');
  }

  if (!p.inStock) {
    els.addBtn.disabled = true;
    els.addBtn.textContent = 'Sold out';
    els.buyBtn.disabled = true;
    els.maxNote.textContent = 'Restocking soon — check back Friday for the next drop.';
  } else {
    els.maxNote.textContent = `Max ${p.maxQty} per order · ships in 1–2 business days`;
    const inCart = findItem(p.id);
    els.addBtn.textContent = inCart ? `In bag (${inCart.qty}) — add more` : 'Add to bag';
  }

  const cfg = config();
  els.shipNote.textContent = `Standard arrives in ${cfg.delivery_days_standard} days · express ${cfg.delivery_days_express} days.`;
  setQty(1);
}

function renderRelated(items) {
  registerProducts(items);
  renderProductGrid(els.related, items);
}

els.qtyMinus.addEventListener('click', () => setQty(qty - 1));
els.qtyPlus.addEventListener('click', () => setQty(qty + 1));

els.addBtn.addEventListener('click', () => {
  if (!product || !product.inStock) return;
  addToCart(product, qty);
  toast(`${qty} × ${product.name} added`, '🛍️');
  els.addBtn.textContent = `In bag (${(findItem(product.id) || {}).qty || qty}) — add more`;
  track('add_to_cart');
});

els.buyBtn.addEventListener('click', () => {
  if (!product || !product.inStock) return;
  addToCart(product, qty);
  track('add_to_cart');
  location.href = '/checkout';
});

async function load() {
  try {
    const data = await api(`/store/products/${encodeURIComponent(slug)}`);
    product = { ...data.product, maxQty: data.product.maxQty || 10 };
    registerProducts([product]);
    els.loading.classList.add('hidden');
    els.view.classList.remove('hidden');
    els.crumb.innerHTML = `
      <a href="/" class="transition hover:text-ink">Home</a> <span class="mx-1.5">/</span>
      <a href="/shop" class="transition hover:text-ink">Shop</a> <span class="mx-1.5">/</span>
      <a href="/shop?category=${encodeURIComponent(product.category)}" class="transition hover:text-ink">${esc(product.category)}</a>
      <span class="mx-1.5">/</span> <span class="text-ink">${esc(product.name)}</span>`;
    render();
    renderRelated(data.related);
    track('product_view');
  } catch (err) {
    els.loading.classList.add('hidden');
    if (err.status === 404) {
      els.notFound.classList.remove('hidden');
    } else {
      els.notFound.classList.remove('hidden');
      els.notFound.querySelector('h1').textContent = 'Something went wrong';
      els.notFound.querySelector('p').textContent = err.message;
    }
  }
}

load();
void qs;
